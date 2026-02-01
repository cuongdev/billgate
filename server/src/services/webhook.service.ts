import { WebhookRepository } from '../repositories/webhook.repository';
import { WebhookHandlerFactory } from './webhook-handler.factory';

/** Max length for paymentCodeRegex to mitigate ReDoS. */
const MAX_PAYMENT_CODE_REGEX_LENGTH = 200;

/** Patterns that suggest catastrophic backtracking (ReDoS). */
const REDOS_UNSAFE_PATTERNS = [
  /\(\.[*+?]?\)[*+?]/,           // (.*)*, (.+)+, etc.
  /\([^)]*[*+?][^)]*\)[*+?]/,    // group with quantifier then group repeated
  /\[.*\]\+/,                     // [..]+
];

/**
 * Returns a safe RegExp for paymentCodeRegex or null if pattern is invalid/dangerous (ReDoS).
 */
function safePaymentCodeRegex(pattern: string | undefined): RegExp | null {
  if (!pattern || typeof pattern !== 'string') return null;
  const trimmed = pattern.trim().slice(0, MAX_PAYMENT_CODE_REGEX_LENGTH);
  if (trimmed.length === 0) return null;
  for (const p of REDOS_UNSAFE_PATTERNS) {
    if (p.test(trimmed)) return null;
  }
  try {
    return new RegExp(trimmed, 'i');
  } catch {
    return null;
  }
}

export interface BankTransactionInfo {
  transactionId?: string;
  accountNumber: string;
  amount: string;
  currency: string;
  note: string;
  date: string;
}

export interface WebhookConfig {
  id?: string;
  url: string;
  authType: 'none' | 'basic' | 'bearer';
  authHeader?: string;
  authToken?: string;
  triggerType: 'in' | 'out' | 'both';
  ignoreNoPaymentCode?: boolean;
  paymentCodeRegex?: string;
  enabled: boolean;
  // added new fields
  name?: string;
  type?: string;
  headers?: Record<string, string>;
  filterAccount?: string[];
  config?: any;
}

export function extractPaymentCodeFromNote(note: string): string | null {
  if (!note) return null;
  const match = note.match(/\b(MM[A-Z0-9]{6,12})\b/i);
  return match ? match[1].toUpperCase() : null;
}

export class WebhookService {
  private webhookRepo: WebhookRepository;

  constructor() {
    this.webhookRepo = new WebhookRepository();
  }

  async processNewTransactions(transactions: BankTransactionInfo[], configs?: WebhookConfig[]) {
    if (transactions.length === 0) return;

    // sort by time from oldest to newest
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (configs) {
      for (const tx of transactions) {
        console.log(`[WebhookService] Processing transaction ${tx.accountNumber} ${tx.amount}`);
        for (const config of configs) {
          if (!config.enabled) continue;
          if (this.shouldTrigger(tx, config)) {
            console.log(`[WebhookService] Dispatching webhook for transaction ${tx.accountNumber} ${tx.amount}`);
            await this.dispatchWebhook(tx, config, config.id || 'unknown');
          } else {
            console.log(`[WebhookService] Skipping webhook for transaction ${tx.accountNumber} ${tx.amount}, due to trigger type ${config.triggerType}, ignoreNoPaymentCode ${config.ignoreNoPaymentCode}, paymentCodeRegex ${config.paymentCodeRegex}`);
          }
        }
      }
      return;
    }
    console.log('No configs provided');
  }

  private shouldTrigger(tx: BankTransactionInfo, config: WebhookConfig): boolean {
    if (config.ignoreNoPaymentCode) {
      if (config.paymentCodeRegex) {
        const regex = safePaymentCodeRegex(config.paymentCodeRegex);
        if (regex) {
          const match = tx.note.match(regex);
          if (!match) return false;
        } else {
          const code = extractPaymentCodeFromNote(tx.note);
          if (!code) return false;
        }
      } else {
        const code = extractPaymentCodeFromNote(tx.note);
        if (!code) return false;
      }
    }
    return true;
  }

  private async dispatchWebhook(tx: BankTransactionInfo, config: WebhookConfig, webhookId: string) {
    const payload = this.buildPayload(tx, config);
    const handler = WebhookHandlerFactory.getHandler(config.type || 'http');
    console.log(`[WebhookService] Dispatching ${config.type} webhook to ${config.url}`);

    const result = await handler.handle(payload, config);

    if (result.status === 'failed') {
      console.error(`[WebhookService] Webhook failed: ${result.errorMessage}`, result);
    }

    console.log(`[WebhookService] Webhook result: ${JSON.stringify(result)}, payload: ${JSON.stringify(payload)}`);

    try {
      await this.webhookRepo.logAttempt({
        webhookId,
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage || null,
        transactionId: payload.transactionId,
        dispatchedAt: new Date(),
        requestBody: result.requestBody
      });
    } catch (e) {
      console.error('[WebhookService] Failed to save log:', e);
    }
  }

  private buildPayload(tx: BankTransactionInfo, config?: WebhookConfig): any {
    const amountVal = parseFloat(tx.amount.replace(/,/g, ''));
    return {
      gateway: 'VPBank',
      transactionId: tx.transactionId,
      transactionDate: tx.date,
      accountNumber: tx.accountNumber,
      code: (() => {
        let code = extractPaymentCodeFromNote(tx.note);
        if (config?.paymentCodeRegex) {
          const regex = safePaymentCodeRegex(config.paymentCodeRegex);
          if (regex) {
            const match = tx.note.match(regex);
            if (match) code = match[1] || match[0];
          }
        }
        return code;
      })(),
      content: tx.note,
      transferType: 'in',
      transferAmount: amountVal,
      description: tx.note,
    };
  }

  async getLogs(limit = 100, webhookId?: string) {
    return await this.webhookRepo.findLogs({ limit, webhookId });
  }

  async findAllByUserId(userId: string) {
    return await this.webhookRepo.findAllByUserId(userId)
  }
}

export const webhookService = new WebhookService();
