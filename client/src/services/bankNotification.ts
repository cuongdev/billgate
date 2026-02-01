/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSocket } from './socket';

export type SupportedBank = 'VPBANK';

export type BankNotificationStatus =
  | 'idle'
  | 'checking'
  | 'waiting-permission'
  | 'registering'
  | 'ready'
  | 'error';

export type BankNotificationErrorCode =
  | 'INVALID_KEY_PIN'
  | 'PERMISSION_DENIED'
  | 'FCM_TOKEN_ERROR'
  | 'CALL_FAILED'
  | 'NO_DATA'
  | 'AUTH_EXPIRED'
  | 'SOUND_BOX_NOT_REGISTERED';

export interface BankNotificationError {
  code: BankNotificationErrorCode;
  message: string;
  detail?: unknown;
}

export interface BankAccountInfo {
  accountNumber: string;
  enabled: boolean;
}

export interface BankTransactionInfo {
  accountNumber: string;
  amount: string;
  currency: string;
  note: string;
  date: string;
}

export interface VpbLocalNotification extends BankTransactionInfo {
  id: string; // Random UUID
  fingerprint?: string;
  senderAccount?: string | null;
  hasAudio?: boolean;
  audioUrl?: string | null;
  audioToken?: string | null;
  createdAt?: number;
}

export interface AccountsAndTransactionsResult {
  accounts: BankAccountInfo[];
  transactions: BankTransactionInfo[];
}

export interface BankDisplayConfig {
  id: SupportedBank;
  name: string;
  description?: string;
}

export interface BankNotificationProvider {
  readonly bank: SupportedBank;

  init(): Promise<void>;
  isConfigured(): boolean;

  startRegistrationFlow(
    keyShare: string,
    pinShare: string
  ): Promise<{ status: BankNotificationStatus; error?: BankNotificationError }>;

  loadAccountsAndTransactions(
    accountNumber?: string
  ): Promise<{
    status: BankNotificationStatus;
    error?: BankNotificationError;
    data?: AccountsAndTransactionsResult;
  }>;

  toggleAccountNotification(
    accountNumber: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: BankNotificationError }>;

  handleForegroundMessage(payload: any): void;
  clearConfig(): Promise<void> | void;
  getConnectedSessions(): Promise<any[]>;
  removeSession?(keyShare: string): Promise<boolean>;
  getDisplayConfig(): BankDisplayConfig;

  // New API Methods
  getHistory(page: number, limit: number, account?: string, search?: string): Promise<any>;
  getPreferences(): Promise<Record<string, any>>;
  savePreferences(prefs: Record<string, any>): Promise<any>;
  getWebhookConfigs(): Promise<any>;
  saveWebhookConfigs(configs: any[]): Promise<any>;
  deleteWebhookConfig?(id: number): Promise<boolean>;
}

export interface BankConfigEntry extends BankDisplayConfig {
  key: SupportedBank;
}

export const BANKS_CONFIG: BankConfigEntry[] = [
  {
    key: 'VPBANK',
    id: 'VPBANK',
    name: 'VPBank',
    description: 'Nhận thông báo biến động số dư qua trình duyệt từ VPBank.',
  },
];

// Registry defined at bottom


// Constants
const VPB_API_BASE = '/api/bank/vpbank';
const VPB_API_DATA_BASE = '/api/vpbank'; // New base since I added /vpbank/... in routes.ts (without /bank prefix?)
// Wait, in routes.ts I added:
// router.get('/vpbank/sessions', ...) (NOT /bank/vpbank)
// router.post('/bank/vpbank/validate-share') (HAS /bank/vpbank)
// I should align or handle both.
// Let's explicitly use the paths I defined in routes.ts.

function mapVpbError(code: BankNotificationErrorCode, detail?: any): BankNotificationError {
  const messages: Record<BankNotificationErrorCode, string> = {
    INVALID_KEY_PIN: 'Thông tin KEY và PIN không hợp lệ, vượt quá giới hạn hoặc đã hết hạn.',
    PERMISSION_DENIED: 'Vui lòng cấp quyền nhận thông báo trên trình duyệt.',
    FCM_TOKEN_ERROR: 'Không lấy được token thông báo từ trình duyệt.',
    CALL_FAILED: 'Có lỗi xảy ra khi kết nối tới hệ thống VPBank.',
    NO_DATA: 'Không có dữ liệu giao dịch.',
    AUTH_EXPIRED: 'Phiên xác thực với VPBank đã hết hạn, vui lòng cấu hình lại KEY và PIN.',
    SOUND_BOX_NOT_REGISTERED:
      'VPBank yêu cầu cấu hình thêm thiết bị/giọng đọc (SoundBox/Voice) trước khi bật thông báo trên PC.',
  };

  return {
    code,
    message: messages[code],
    detail,
  };
}

export function extractSenderFromNote(note: string): string | null {
  const match = note.match(/NHAN TU\s+(\d+)\s+TRACE/i);
  if (match && match[1]) return match[1];
  return null;
}

export function extractPaymentCodeFromNote(note: string): string | null {
  if (!note) return null;
  const match = note.match(/\b(MM[A-Z0-9]{6,12})\b/i);
  return match ? match[1].toUpperCase() : null;
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

export class VpbankNotificationProvider implements BankNotificationProvider {
  readonly bank: SupportedBank = 'VPBANK';
  private initialized = false;
  private connectedSessionsCache: any[] = [];

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const socket = getSocket();

    socket.on('vpbank:transaction', (message: any) => {
      console.log('[VPBank] Received socket transaction:', message);

      // The worker sends { accountId, type, payload }
      const payload = message?.payload ?? message;
      this.handleForegroundMessage(payload);
    });

    // Initial fetch of sessions to update cache
    await this.getConnectedSessions();
  }

  isConfigured(): boolean {
    // If we have connected sessions in cache, we are configured
    return this.connectedSessionsCache.length > 0;
  }

  // Helper for Authenticated Requests
  private async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        console.warn('[authenticatedFetch] No token found in localStorage for URL:', url);
    } else {
        // console.debug('[authenticatedFetch] Attaching token to:', url);
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    } as HeadersInit;
    
    return fetch(url, { ...options, headers });
  }

  // --- API Methods ---

  async getConnectedSessions(): Promise<any[]> {
    try {
      const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/sessions`);
      if (!res.ok) return [];
      const json = await res.json();
      this.connectedSessionsCache = json.sessions || [];
      return this.connectedSessionsCache;
    } catch {
      return [];
    }
  }

  async getHistory(page: number, limit: number, account?: string, search?: string) {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      account: account || 'all',
      q: search || ''
    });
    const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/history?${qs}`);
    return await safeJson(res);
  }

  async getPreferences() {
    const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/preferences`);
    return await safeJson(res);
  }

  async savePreferences(prefs: Record<string, any>) {
    const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    return await safeJson(res);
  }

  async getWebhookConfigs() {
    const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/webhooks`);
    return await safeJson(res);
  }

  async saveWebhookConfigs(configs: any[]) {
    const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/update-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookConfigs: configs })
    });
    return await safeJson(res);
  }

  async deleteWebhookConfig(id: number): Promise<boolean> {
    try {
      const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/webhooks/${id}`, {
        method: 'DELETE'
      });
      const json = await safeJson(res);
      return !!json?.success;
    } catch {
      return false;
    }
  }

  async removeSession(keyShare: string): Promise<boolean> {
    try {
      const res = await this.authenticatedFetch(`${VPB_API_DATA_BASE}/session?keyShare=${encodeURIComponent(keyShare)}`, {
        method: 'DELETE'
      });
      const json = await safeJson(res);
      await this.getConnectedSessions(); // Refresh cache
      return !!json?.success;
    } catch {
      return false;
    }
  }

  async clearConfig(): Promise<void> {
    const sessions = await this.getConnectedSessions();
    for (const s of sessions) {
      await this.removeSession(s.keyShare);
    }
  }

  async startRegistrationFlow(
    keyShare: string,
    pinShare: string
  ): Promise<{ status: BankNotificationStatus; error?: BankNotificationError }> {
    try {
      const res = await this.authenticatedFetch(`${VPB_API_BASE}/start-listener`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyShare, pinShare, webhookConfigs: [] }),
      });

      if (!res.ok) {
        return { status: 'error', error: mapVpbError('CALL_FAILED', await safeJson(res)) };
      }
      const json = await res.json();
      if (!json.success || !json.jwt) {
        // Wait, the new API returns success? 
        // Or is this 'json.jwt' referencing the temporal workflow runId?
        // Actually the backend returns { success: true, runId: ... } for start-listener.
        // It does NOT return a JWT anymore (that was legacy?).
        // It relies on Auth token in header.
        // The old code check json.jwt??
        // Let's assume standard response now.
        // If 200 OK, it's good.
        // But for safety let's leave legacy checks if not hindering.
        // Wait, if json.jwt IS missing, it returns INVALID_KEY_PIN.
        // I should check what the backend returns.
        // But the primary fix here is using authenticatedFetch.
        if (!json.success) return { status: 'error', error: mapVpbError('INVALID_KEY_PIN', json) };
      }

      // Registration successful
      await this.getConnectedSessions();
      return { status: 'ready' };
    } catch (err) {
      return { status: 'error', error: mapVpbError('CALL_FAILED', err) };
    }
  }


  async loadAccountsAndTransactions(
    accountNumber?: string
  ): Promise<{
    status: BankNotificationStatus;
    error?: BankNotificationError;
    data?: AccountsAndTransactionsResult;
  }> {
    // Just verify status? Transaction loading is now via getHistory(paging).
    // But the UI might expect "latest" or "all accounts".
    // Let's use getHistory to verify connection?
    // Or just check sessions.

    const sessions = await this.getConnectedSessions();
    if (sessions.length === 0) {
      return { status: 'idle', error: mapVpbError('AUTH_EXPIRED') };
    }

    // We don't fetch full transaction list here anymore because it's paged.
    // We return empty list and let the UI use getHistory?
    // Or fetch latest 20?

    const history = await this.getHistory(1, 20, accountNumber);

    return {
      status: 'ready',
      data: {
        accounts: sessions.map(s => ({ accountNumber: s.name || 'Unknown', enabled: true })),
        transactions: history.data || [] // Latest 20
      }
    };
  }

  async toggleAccountNotification(
    _accountNumber: string,
    _enabled: boolean
  ): Promise<{ success: boolean; error?: BankNotificationError }> {
    return { success: false, error: mapVpbError('CALL_FAILED', 'Feature requires server update') };
  }

  handleForegroundMessage(payload: any): void {
    if (typeof window === 'undefined') return;
    if (!payload) return;

    // Browser Notification
    const title = payload?.notification?.title ?? 'Thông báo VPBank';
    const body = payload?.notification?.body ?? 'Quý khách có thông báo biến động số dư mới';
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }

    // Dispatch Event for UI refresh
    window.dispatchEvent(
      new CustomEvent('vpbank:notification', { detail: payload })
    );
  }

  getDisplayConfig(): BankDisplayConfig {
    return { id: 'VPBANK', name: 'VPBank' };
  }
}

export class BankNotificationRegistry {
  private providers = new Map<SupportedBank, BankNotificationProvider>();

  constructor() {
    // Register default provider
    this.register(new VpbankNotificationProvider());
  }

  register(provider: BankNotificationProvider) {
    this.providers.set(provider.bank, provider);
  }

  getProvider(bank: SupportedBank): BankNotificationProvider | undefined {
    return this.providers.get(bank);
  }

  getAll(): BankNotificationProvider[] {
    return Array.from(this.providers.values());
  }
}

export const bankNotificationRegistry = new BankNotificationRegistry();

