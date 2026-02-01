import dotenv from 'dotenv';
import * as nodeCrypto from 'crypto';
import { AccountFCMService } from './account-fcm.service';
import { WebhookConfig, webhookService, BankTransactionInfo } from './webhook.service';
import { SessionRepository } from '../repositories/session.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { sequelize } from '../db/sequelize';
import { startWorkflowForSession } from './workflow.service';

dotenv.config();

const VPB_CONTEXT_PATH = process.env.VPBANK_CONTEXT_PATH || 'https://neo.vpbank.com.vn';

export interface VpbankSession {
  keyShare: string;
  pinShare: string;
  jwt: string;
  accountNumber?: string;
  name?: string;
  createdAt?: number;
  status?: string;
  lastListenerActivity?: number;
  runId?: string;
}

export interface VpbankValidateResult {
  status: string;
  jwt?: string;
  raw: any;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

type DashboardStats = {
  totalVolume: number;
  totalTransactions: number;
  todayVolume: number;
  avgTransactionValue: number;
  dailyData: { date: string; amount: number; count: number }[];
  hourlyStats: { hour: number; amount: number; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  webhookStats: {
    total: number;
    success: number;
    failed: number;
    errorBreakdown: { type: string; count: number }[];
  };
};

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  totalVolume: 0,
  totalTransactions: 0,
  todayVolume: 0,
  avgTransactionValue: 0,
  dailyData: [],
  hourlyStats: [],
  topKeywords: [],
  webhookStats: { total: 0, success: 0, failed: 0, errorBreakdown: [] }
};

function toDate(ms?: number): Date | undefined {
  return typeof ms === 'number' ? new Date(ms) : undefined;
}

function isNonDefaultKeyShare(keyShare?: string) {
  return !!keyShare && keyShare !== 'default' && keyShare !== 'all';
}

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isWithin(d: Date, start: Date, end: Date) {
  return d >= start && d <= end;
}

function safeAmount(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function extractKeywords(note: string): string[] {
  return note
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function incMap<K>(map: Map<K, number>, key: K, inc = 1) {
  map.set(key, (map.get(key) ?? 0) + inc);
}

function aggregateDaily(
  txs: Array<{ transactionDate: any; amountValue?: any }>
): DashboardStats['dailyData'] {
  const m = new Map<string, { amount: number; count: number }>();

  for (const t of txs) {
    const d = new Date(t.transactionDate);
    const key = dateKeyUTC(d);
    const prev = m.get(key) ?? { amount: 0, count: 0 };
    m.set(key, { amount: prev.amount + safeAmount(t.amountValue), count: prev.count + 1 });
  }

  return [...m.entries()]
    .map(([date, v]) => ({ date, amount: v.amount, count: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateHourly(
  txs: Array<{ transactionDate: any; amountValue?: any }>
): DashboardStats['hourlyStats'] {
  const m = new Map<number, { amount: number; count: number }>();

  for (const t of txs) {
    const d = new Date(t.transactionDate);
    const hour = d.getHours();
    const prev = m.get(hour) ?? { amount: 0, count: 0 };
    m.set(hour, { amount: prev.amount + safeAmount(t.amountValue), count: prev.count + 1 });
  }

  return [...m.entries()]
    .map(([hour, v]) => ({ hour, amount: v.amount, count: v.count }))
    .sort((a, b) => a.hour - b.hour);
}

function computeTodayVolume(
  txs: Array<{ transactionDate: any; amountValue?: any }>
): number {
  const { start, end } = getTodayRange();
  let sum = 0;

  for (const t of txs) {
    const d = new Date(t.transactionDate);
    if (isWithin(d, start, end)) sum += safeAmount(t.amountValue);
  }
  return sum;
}

function computeTopKeywords(
  txs: Array<{ note?: string | null }>
): DashboardStats['topKeywords'] {
  const counts = new Map<string, number>();

  for (const t of txs) {
    if (!t.note) continue;
    for (const w of extractKeywords(t.note)) incMap(counts, w, 1);
  }

  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function resolveSessionIds(params: {
  userId: string;
  keyShare?: string;
  sessionRepo: {
    findByKeyShare: (keyShare: string, q: { userId: string }) => Promise<{ id: string } | null>;
    findAll: (q: { userId: string }) => Promise<Array<{ id: string }>>;
  };
}): Promise<string | string[] | null> {
  const { userId, keyShare, sessionRepo } = params;

  if (isNonDefaultKeyShare(keyShare)) {
    const s = await sessionRepo.findByKeyShare(keyShare!, { userId });
    return s?.id ?? null;
  }

  const sessions = await sessionRepo.findAll({ userId });
  return sessions.length ? sessions.map(s => s.id) : null;
}

export class VpbankService {
  private baseUrl: string;

  private sessionRepo: SessionRepository;
  private transactionRepo: TransactionRepository;
  private webhookRepo: WebhookRepository;

  constructor() {
    this.baseUrl = VPB_CONTEXT_PATH;
    this.sessionRepo = new SessionRepository();
    this.transactionRepo = new TransactionRepository();
    this.webhookRepo = new WebhookRepository();
  }

  async init() {
    const sessions = await this.sessionRepo.findAll();

    if (sessions.length > 0) {
      console.log(`[VPBankService] Found ${sessions.length} saved session(s). Restoring workflows...`);

      try {
        for (const session of sessions) {
          if (session.status === 'active') {
            let fcmToken = '';
            try {
              const fcm = new AccountFCMService(session.keyShare);
              const creds = await fcm.getCredentials();
              fcmToken = creds.fcm.token;
            } catch { }

            const sessionForWorkflow = {
              keyShare: session.keyShare,
              pinShare: session.pinShare,
              jwt: session.jwt || '',
              accountNumber: session.accountNumber || '',
              name: session.name || '',
              status: session.status,
              fcmToken,
            };
            await startWorkflowForSession(sessionForWorkflow);
            console.log(`[VPBankService] Restored workflow for account: ${session.keyShare}`);
          } else {
            console.log(`[VPBankService] Skipping restore for ${session.keyShare} (Status: ${session.status})`);
          }
        }
      } catch (e) {
        console.error('[VPBankService] Failed to restore sessions:', e);
      }
    } else {
      console.log('[VPBankService] No active sessions found in DB.');
    }
  }

  async validateShare(keyShare: string, pinShare: string, tokenFb?: string): Promise<VpbankValidateResult> {
    const url = `${this.baseUrl}/cb/odata/ns/authenticationservice/ValidationNonSecureNotificationShare?KeyShare='${encodeURIComponent(
      keyShare
    )}'&PinShare='${encodeURIComponent(pinShare)}'`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    let effectiveToken = tokenFb;
    if (!effectiveToken) {
      try {
        const fcm = new AccountFCMService(keyShare);
        const creds = await fcm.getCredentials();
        effectiveToken = creds.fcm.token;
      } catch (e) {
        console.warn('[VPBankService] Failed to fetch default FCM token for validation:', e);
      }
    }

    if (effectiveToken) {
      headers.TokenFB = effectiveToken;
    }

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      return { status: 'error', raw: await safeJson(res) };
    }
    const json = (await res.json()) as any;
    const d = json?.d;
    return {
      status: d?.Status ?? 'error',
      jwt: d?.Jwt,
      raw: json,
    };
  }

  async getNotifications(authKey: string, keyShare: string, pinShare: string, accountNumber: string) {
    const url = `${this.baseUrl}/cb/odata/ns/authenticationservice/GetNonSecureNotificationShare?KeyShare='${encodeURIComponent(keyShare)}'&PinShare='${encodeURIComponent(pinShare)}'&AccountNumber='${encodeURIComponent(accountNumber)}'`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        AuthKey: authKey,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });

    if (!res.ok) return { ok: false, raw: await safeJson(res) };
    const json = (await res.json()) as any;
    return { ok: true, raw: json };
  }

  async registerListener(keyShare: string, pinShare: string, webhookConfigs?: WebhookConfig[], jwt?: string, accountNumber?: string, name?: string, userId?: string) {
    if (!userId) throw new Error('User ID required for registration');

    console.log('[VPBankService] Starting listener registration...');

    let activeJwt = jwt;
    let tokenFb = '';

    try {
      const fcm = new AccountFCMService(keyShare);
      const creds = await fcm.getCredentials();
      tokenFb = creds.fcm.token;
    } catch { }

    if (!activeJwt) {
      const validation = await this.validateShare(keyShare, pinShare, tokenFb);
      if (validation.status !== '1' || !validation.jwt) {
        throw new Error(`VPBank Registration Failed: Status=${validation.status} Raw=${JSON.stringify(validation.raw)}`);
      }
      activeJwt = validation.jwt;
    }

    let finalAcc = accountNumber;
    let finalName = name;

    const session = await sequelize.transaction(async (t) => {
      let s = await this.sessionRepo.findByKeyShare(keyShare, { transaction: t, userId });

      if (s) {
        await this.sessionRepo.update(keyShare, {
          jwt: activeJwt,
          pinShare,
          status: 'active'
        }, { transaction: t, userId });
        s = await this.sessionRepo.findByKeyShare(keyShare, { transaction: t, userId });
      } else {
        s = await this.sessionRepo.create({
          userId,
          keyShare,
          pinShare,
          jwt: activeJwt,
          accountNumber: finalAcc || 'Unknown',
          name: finalName || 'Unknown',
          status: 'active'
        }, { transaction: t });
      }

      if (webhookConfigs && s) {
        const where: any = {};
        await this.webhookRepo.deleteBySession(s.id, { transaction: t });

        for (const c of webhookConfigs) {
          const configObj: any = {
            authType: c.authType,
            triggerType: c.triggerType,
            headers: c.headers,
            authHeader: c.authHeader, // legacy?
            authToken: c.authToken, // legacy?
            ignoreNoPaymentCode: c.ignoreNoPaymentCode,
            paymentCodeRegex: c.paymentCodeRegex,
            filterAccount: c.filterAccount,
            name: c.name,
            type: c.type
          };

          if (c.type === 'telegram') {
            configObj.bot_token = (c as any).authVal;
          } else {
            configObj.auth_value = (c as any).authVal;
          }

          const finalUrl = c.type === 'telegram' ? (c.url ?? '') : c.url;

          await this.webhookRepo.create({
            sessionId: s.id,
            url: finalUrl,
            config: configObj,
            isActive: c.enabled
          }, { transaction: t });
        }
      }
      return s;
    });

    console.log('[VPBankService] VPBank Registration Success! JWT obtained.');

    try {
      const sessionForWorkflow = {
        keyShare: session!.keyShare,
        pinShare: session!.pinShare,
        jwt: session!.jwt || '',
        accountNumber: session!.accountNumber || '',
        name: session!.name || '',
        status: session!.status,
        fcmToken: tokenFb
      };

      const runId = await startWorkflowForSession(sessionForWorkflow);
      console.log(`[VPBankService] Temporal workflow started for session. RunID: ${runId}`);

      await this.sessionRepo.updateRunId(keyShare, runId, { userId });

    } catch (err) {
      console.error('[VPBankService] Failed to start temporal workflow:', err);
      throw err;
    }

    return {
      success: true,
      status: 'ready',
      message: 'Listener registration successful',
      keyShare,
      accountNumber: session?.accountNumber,
      name: session?.name
    };
  }

  /** Update webhook configs for a session. Session must belong to userId (ownership check). */
  async updateWebhookConfigs(configs: WebhookConfig[], sessionId: string, userId: string) {
    if (!configs) return;
    if (!sessionId) throw new Error('sessionId is required');

    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Session not found or access denied');
    }

    const { Webhook: WebhookModel } = await import('../models/webhook.model');
    await WebhookModel.destroy({ where: { sessionId } });

    for (const c of configs) {
      await this.webhookRepo.create({
        sessionId,
        url: c.url,
        config: {
          authType: c.authType,
          triggerType: c.triggerType,
          authHeader: c.authHeader,
          authToken: c.authToken,
          ignoreNoPaymentCode: c.ignoreNoPaymentCode,
          paymentCodeRegex: c.paymentCodeRegex,
          filterAccount: c.filterAccount
        },
        isActive: c.enabled
      });
    }
  }

  async removeSession(keyShare: string, userId: string) {
    await this.sessionRepo.delete(keyShare, { userId });
  }

  async getTransactionHistory(
    page: number = 1,
    pageSize: number = 20,
    account: string,
    search?: string,
    sort?: string,
    sortBy?: string,
    startDate?: string,
    endDate?: string,
    userId?: string
  ) {
    let sessionId: string | string[] | undefined;
    if (!userId) throw new Error('User ID required');

    if (account && account !== 'all' && account !== 'default') {
      const s = await this.sessionRepo.findByKeyShare(account, { userId });
      if (s) {
        sessionId = s.id;
      } else {
        return { data: [], total: 0, page, pageSize };
      }
    } else {
      const sessions = await this.sessionRepo.findAll({ userId });
      if (sessions.length === 0) return { data: [], total: 0, page, pageSize };
      sessionId = sessions.map(s => s.id);
    }

    const result = await this.transactionRepo.find({
      sessionId,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort: sort as 'asc' | 'desc',
      sortBy
    });

    return {
      data: result.data.map(t => ({
        bankTransactionId: t.bankTransactionId,
        id: t.id,
        accountNumber: t.session?.accountNumber || null,
        keyShare: t.session?.keyShare || null,
        date: t.transactionDate ? (t.transactionDate instanceof Date ? t.transactionDate.toISOString() : t.transactionDate) : null,
        amount: t.amountValue,
        currency: t.currency,
        note: t.note,
        createdAt: t.createdAt
      })),
      total: result.total,
      page,
      pageSize
    };
  }

  async getSessions(userId: string) {
    return await this.sessionRepo.findAll({ userId });
  }

  async getSession(keyShare: string, userId: string) {
    const s = await this.sessionRepo.findByKeyShare(keyShare, { userId });
    console.log(`[VPBankService] getSession: ${JSON.stringify(s)}`)
    if (!s) return null;
    return {
      id: s.id,
      keyShare: s.keyShare,
      pinShare: s.pinShare,
      jwt: s.jwt,
      accountNumber: s.accountNumber,
      name: s.name,
      createdAt: s.createdAt.getTime(),
      status: s.status,
      lastListenerActivity: Number(s.lastListenerActivity),
      runId: s.runId
    };
  }

  async getAllWebhooks(userId: string) {
    // FIX: Scope by user
    const hooks = await this.webhookRepo.findAllByUserId(userId);
    return hooks.map(h => ({
      id: h.id,
      url: h.url,
      enabled: h.isActive,
      type: h.config.type || 'http', // Default to http if missing
      name: h.config.name, // Dont overwrite name
      ...h.config
    }));
  }

  async checkSound(keyShare: string, pinShare: string) {
    return { status: 'success' };
  }

  async toggleSound(keyShare: string, pinShare: string, accountNumber: string, enabled: boolean) {
    return { status: 'success' };
  }

  async exportTransactions(account: string, search?: string, startDate?: string, endDate?: string, userId?: string) {
    const { data } = await this.getTransactionHistory(1, 10000, account, search, 'desc', 'date', startDate, endDate, userId);
    // Added Bank Transaction ID to header
    const header = 'ID,Bank Transaction ID,Date,Amount,Currency,Note,Account\n';
    // Added Bank Transaction ID to row
    const rows = data.map(t =>
      `${t.id},${t.bankTransactionId || ''},${t.date},${t.amount},${t.currency},"${(t.note || '').replace(/"/g, '""')}",${t.accountNumber}`
    ).join('\n');
    return header + rows;
  }

  async getWebhookLogs(limit: number, configId?: string, transactionId?: string, accountNumber?: string, userId?: string) {
    if (!userId) throw new Error('User required');

    let sessionId: string | undefined;
    if (accountNumber && accountNumber !== 'default' && accountNumber !== 'all') {
      const s = await this.sessionRepo.findByKeyShare(accountNumber, { userId });
      if (s) sessionId = s.id;
    }

    // FIX: Ensure if configId is provided, it belongs to user
    let webhookIds: string[] = [];

    if (configId) {
      const webhook = await this.webhookRepo.findById(configId);
      if (webhook) {
        const session = await this.sessionRepo.findById(webhook.sessionId);
        if (!session || session.userId !== userId) {
          return [];
        }
        webhookIds = [configId];
      } else {
        return [];
      }
    } else {
      const userWebhooks = await this.webhookRepo.findAllByUserId(userId);
      if (userWebhooks.length === 0) return [];
      webhookIds = userWebhooks.map(w => w.id);
    }

    const result = await this.webhookRepo.findLogs({
      limit,
      webhookId: webhookIds
    });

    return result.data.map((log: any) => {
      const plainLog = log.dataValues || log;
      const webhook = plainLog.webhook || {};
      let finalWebhookUrl = webhook.url;
      const conf = webhook.config?.config || webhook.config || {};
      const token = conf.botToken || conf.bot_token;
      const configType = webhook.config?.type === 'telegram';

      if (token && configType) {
        finalWebhookUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      }

      return {
        ...plainLog,
        status: (plainLog.errorMessage || (plainLog.statusCode && plainLog.statusCode >= 400)) ? 'failed' : 'success',
        configName: webhook.config?.name || 'Untyped',
        webhookUrl: finalWebhookUrl,
        createdAt: new Date(plainLog.dispatchedAt).getTime(),
        transactionId: plainLog.transactionId || ''
      };
    });
  }

  async createWebhook(data: any) {
    return await this.webhookRepo.create({
      url: data.url,
      sessionId: data.sessionId,
      config: {
        ...data.config,
        authType: data.authType,
        triggerType: data.triggerType,
        headers: data.headers,
        ignoreNoPaymentCode: data.ignoreNoPaymentCode,
        paymentCodeRegex: data.paymentCodeRegex,
        filterAccount: data.filterAccount,
        name: data.name,
        type: data.type
      },
      isActive: !!data.enabled
    });
  }

  async updateWebhook(id: string, data: any, userId: string) {
    const existing = await this.webhookRepo.findById(id);
    if (!existing) throw new Error('Webhook not found');

    const session = await this.sessionRepo.findById(existing.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const updateData: any = {
      url: data.url,
      isActive: data.enabled !== undefined ? data.enabled : true,
    };

    const configUpdates: any = {};
    if (data.authType !== undefined) configUpdates.authType = data.authType;
    if (data.triggerType !== undefined) configUpdates.triggerType = data.triggerType;
    if (data.headers !== undefined) configUpdates.headers = data.headers;
    if (data.ignoreNoPaymentCode !== undefined) configUpdates.ignoreNoPaymentCode = data.ignoreNoPaymentCode;
    if (data.paymentCodeRegex !== undefined) configUpdates.paymentCodeRegex = data.paymentCodeRegex;
    if (data.filterAccount !== undefined) configUpdates.filterAccount = data.filterAccount;
    if (data.name !== undefined) configUpdates.name = data.name;
    if (data.type !== undefined) configUpdates.type = data.type;

    if (data.config) {
      Object.assign(configUpdates, data.config);
    }

    const newConfig = { ...existing.config, ...configUpdates };
    updateData.config = newConfig;
    await this.webhookRepo.update(updateData, { where: { id } });
  }

  async deleteWebhook(id: string, userId: string) {
    const existing = await this.webhookRepo.findById(id);
    if (!existing) return; // Already deleted or not found

    const session = await this.sessionRepo.findById(existing.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await this.webhookRepo.delete({ id });
  }

  async getDashboardStats(
    keyShare?: string,
    startDate?: number,
    endDate?: number,
    userId?: string
  ): Promise<DashboardStats> {
    if (!userId) throw new Error('User ID required');

    const sessionId = await resolveSessionIds({
      userId,
      keyShare,
      sessionRepo: this.sessionRepo
    });

    if (!sessionId) return EMPTY_DASHBOARD_STATS;

    const start = toDate(startDate);
    const end = toDate(endDate);

    const [basicStats, transactionsResult] = await Promise.all([
      this.transactionRepo.getStats(sessionId, start, end),
      this.transactionRepo.find({
        sessionId,
        startDate: start,
        endDate: end,
        limit: 10000,
        offset: 0
      })
    ]);

    const transactions = transactionsResult.data ?? [];

    const totalTransactions = Number(basicStats.totalTransactions) || 0;
    const totalVolume = safeAmount(basicStats.totalVolume);
    const avgTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    const todayVolume = computeTodayVolume(transactions);
    const dailyData = aggregateDaily(transactions);
    const hourlyStats = aggregateHourly(transactions);
    const topKeywords = computeTopKeywords(transactions);

    const webhookStats = EMPTY_DASHBOARD_STATS.webhookStats;

    return {
      totalVolume,
      totalTransactions,
      todayVolume,
      avgTransactionValue,
      dailyData,
      hourlyStats,
      topKeywords,
      webhookStats
    };
  }

  async deleteWorkflow(workflowId: string, userId: string) {
    if (!workflowId.startsWith('vpbank-account-')) {
      return;
    }

    // Resolve session by userId and workflowId (prevents cross-account data wipe)
    const sessions = await this.getSessions(userId);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);
    if (!session) {
      throw new Error('Workflow/Session not found or access denied');
    }
    const { keyShare, id: sessionId } = session;

    const { getTemporalClient } = await import('../temporal/client');
    const client = await getTemporalClient();
    try {
      const handle = client.workflow.getHandle(workflowId);
      await handle.terminate('User deleted workflow via UI');
    } catch (e) {
      console.log(`[Delete] Workflow ${workflowId} not running`);
    }

    try {
      const fcm = new AccountFCMService(keyShare);
      await fcm.removeCredentials();
    } catch (e) {
      console.warn(`[Delete] Failed to remove credentials for ${keyShare}`, e);
    }

    await sequelize.transaction(async (t) => {
      await this.transactionRepo.delete({ sessionId }, { transaction: t });
      await this.webhookRepo.delete({ sessionId }, { transaction: t });
      await this.webhookRepo.deleteLogs({ sessionId }, { transaction: t });
      await this.sessionRepo.delete(keyShare, { userId, transaction: t });
    });
  }

  async streamAudio(url: string, token?: string) {
    if (!url) throw new Error('URL required');

    try {
      const parsed = new URL(url);
      const allowedDomains = ['.vpbank.com.vn', 'vpbank.com.vn', 'asia-east2-vpbank-online-new---prod.cloudfunctions.net'];
      const isAllowed = allowedDomains.some(d => parsed.hostname.endsWith(d));

      if (!isAllowed) {
        console.warn(`[StreamAudio] Blocked potential SSRF to: ${parsed.hostname}`);
        throw new Error('Invalid audio source domain');
      }
    } catch (e) {
      throw new Error('Invalid URL');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://neo.vpbank.com.vn',
      'Referer': 'https://neo.vpbank.com.vn/',
    };

    if (token) {
      headers['x-api-token'] = token;
    }

    const proxied = await fetch(url, { headers });
    return proxied;
  }

  private safeParseVpbMessage(raw: string | null | undefined): Record<string, string[]> {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private extractPaymentCodeFromNote(note: string): string | null {
    if (!note) return null;
    const match = note.match(/\b(MM[A-Z0-9]{6,12})\b/i);
    return match ? match[1].toUpperCase() : null;
  }

  async syncTransactions(
    sessionData: VpbankSession
  ): Promise<{ newTransactions: any[]; status: string; error?: string }> {
    try {
      const { jwt, keyShare, pinShare } = sessionData;
      const accountNumber = sessionData.accountNumber || 'all';

      const res = await this.getNotifications(jwt, keyShare, pinShare, accountNumber);

      if (!res.ok) {
        const rawStr = JSON.stringify(res.raw || {});
        if (
          rawStr.includes('401') ||
          rawStr.includes('Unauthorized') ||
          rawStr.includes('Session expired')
        ) {
          return { newTransactions: [], status: 'AUTH_FAILED', error: 'API returned 401/Unauthorized' };
        }
        return { newTransactions: [], status: 'ERROR', error: `API Error: ${rawStr}` };
      }

      const json = res.raw;
      if (!json?.d) {
        return { newTransactions: [], status: 'SUCCESS' };
      }

      const rawMap = this.safeParseVpbMessage(json.d.Message);
      const allItems: string[] = Object.values(rawMap).flat() as any;
      console.log(`[SyncTransactions] Items=${allItems.length} keyShare=${keyShare}`);

      const dbSession = await this.sessionRepo.findByKeyShare(keyShare);
      if (!dbSession) {
        throw new Error('Session not found in DB - cannot save transactions');
      }

      const newTransactions: any[] = [];

      for (const itemStr of allItems) {
        let id = '';

        try {
          id = nodeCrypto.createHash('md5').update(itemStr).digest('hex');

          const parts = itemStr.split('|');
          if (parts.length < 3) {
            console.warn('[SyncTransactions] Skipping malformed item:', itemStr);
            continue;
          }

          const dateRaw = (parts[0]?.replace('VPB:', '') ?? '').trim();
          const account = (parts[1] ?? '').trim();
          const amountWithCur = (parts[2] ?? '').trim();
          const note = (parts[4] ?? '').trim();

          const currency = amountWithCur.slice(-3);
          const amountStr = amountWithCur.slice(0, -3).replace(/,/g, '').trim();

          const amountValue = parseFloat(amountStr);
          if (!Number.isFinite(amountValue)) {
            console.warn('[SyncTransactions] Skipping invalid amount:', { amountWithCur, itemStr });
            continue;
          }

          const txDate = this.parseVpbDateOrNull(dateRaw);
          if (!txDate) {
            console.warn('[SyncTransactions] Skipping invalid date:', { dateRaw, itemStr });
            continue;
          }

          const existingResult = await this.transactionRepo.find({
            bankTransactionId: id,
            sessionId: dbSession.id
          });

          const existing = existingResult.data.length > 0 ? existingResult.data[0] : null;
          if (existing) {
            console.log('[SyncTransactions] Skipping duplicate transaction:', id);
            continue;
          }

          // Insert-first approach: rely on UNIQUE constraint (sessionId, bankTransactionId)
          await this.transactionRepo.save({
            sessionId: dbSession.id,
            bankTransactionId: id,
            amountValue,
            currency,
            transactionDate: txDate,
            note,
            senderAccount: account,
          });

          // If save succeeded => it's new
          newTransactions.push({
            transactionId: id,
            accountNumber: account,
            date: dateRaw,
            amount: amountStr,
            currency,
            note,
          });
        } catch (e: any) {
          if (e?.name === 'SequelizeUniqueConstraintError') {
            continue;
          }
          console.error('[SyncTransactions] Error processing item:', itemStr, e);
        }
      }

      // Emit only if there are new transactions and we have userId (socket cần userId để target)
      if (newTransactions.length > 0 && dbSession.userId) {
        try {
          const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://vpbank-server:3000';
          const secret = process.env.INTERNAL_API_SECRET || 'insecure-default-secret';

          const r = await fetch(`${apiBaseUrl}/api/internal/socket-emit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': secret,
            },
            body: JSON.stringify({
              event: 'vpbank:transaction',
              data: {
                userId: dbSession.userId,
                keyShare,
                type: 'notification',
                payload: { newTransactions },
              },
            }),
          });

          console.log('[SyncTransactions] Socket emit status:', r.status);
        } catch (e: any) {
          console.error('[SyncTransactions] Failed to emit socket event:', e?.message || e);
        }
      } else if (newTransactions.length > 0 && !dbSession.userId) {
        console.warn('[SyncTransactions] Skipping socket emit: session has no userId (legacy?)');
      }

      return { newTransactions, status: 'SUCCESS' };
    } catch (err: any) {
      return { newTransactions: [], status: 'ERROR', error: err?.message || String(err) };
    }
  }

  /**
   * date format: "26/01/2026 23:11" (DD/MM/YYYY HH:mm)
   * Returns null if invalid.
   */
  private parseVpbDateOrNull(dateRaw: string): Date | null {
    if (!dateRaw) return null;

    const [datePart, timePartRaw] = dateRaw.split(' ');
    const timePart = timePartRaw || '00:00';

    const [dayStr, monthStr, yearStr] = (datePart || '').split('/');
    if (!dayStr || !monthStr || !yearStr) return null;

    const [hhStr, mmStr] = timePart.split(':');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    const hh = parseInt(hhStr || '0', 10);
    const mm = parseInt(mmStr || '0', 10);

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hh < 0 || hh > 23) return null;
    if (mm < 0 || mm > 59) return null;

    // Local time
    const d = new Date(year, month - 1, day, hh, mm, 0, 0);
    if (Number.isNaN(d.getTime())) return null;

    return d;
  }

  async dispatchWebhooks(transactions: any[], keyShare: string): Promise<void> {
    const session = await this.sessionRepo.findByKeyShare(keyShare);
    if (!session) {
      console.warn('[VPBankService] Session not found in DB - cannot dispatch webhooks');
      return;
    }
    const userId = session.userId;
    const configs = (await this.webhookRepo.findAllByUserId(userId) || []).map((w) => ({
      id: w.id,
      url: w.url,
      enabled: w.isActive,
      name: (w.config as any)?.name || 'Webhook',
      config: w.config,
      ...w.config
    })) as WebhookConfig[];

    console.log('[VPBankService] Dispatching webhooks for account:', keyShare);
    console.log('[VPBankService] Transactions:', transactions);
    console.log('[VPBankService] Webhook configs:', configs);
    console.log('[VPBankService] User ID:', userId);

    const bankTransactions = transactions.map(tx => ({
      transactionId: tx.transactionId,
      accountNumber: tx.accountNumber,
      amount: tx.amount,
      currency: tx.currency,
      note: tx.note,
      date: tx.date
    }));

    await webhookService.processNewTransactions(bankTransactions, configs);
  }
}

export const vpbankService = new VpbankService();
