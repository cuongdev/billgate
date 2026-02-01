
import { defineSignal, defineQuery } from '@temporalio/workflow';

// --- Shared Data Types ---

// Account identity: keyShare is the canonical accountId
export type KeyShare = string; // keyShare

export type AccountWorkflowStatus = 'active' | 'paused' | 'deleted';

export interface BalanceChangeEventPayload {
  timestamp: string | number;
  data: any; // FCM notification payload
}

export interface AccountSession {
  keyShare: string;
  pinShare: string;
  jwt: string;
  accountNumber?: string;
  name?: string;
  deviceId?: string; // For FCM
  fcmToken?: string;
  status?: string; // Added to match usage
}

export interface WebhookConfig {
  id?: string; // Changed from number to string (UUID)
  name: string; // Added
  url: string;
  type?: string; // 'http' | 'telegram' Added
  enabled: boolean;
  triggerType?: string; // 'in', 'out', 'all'
  authType?: string;
  ignoreNoPaymentCode?: boolean;
  paymentCodeRegex?: string;
  filterAccount?: string[];
  config?: any; // JSON Config Added
}

export interface BankTransactionInfo {
  accountNumber: string;
  date: string;
  amount: string; // Plain number string
  currency: string;
  note: string;
}

export interface SyncResult {
  newTransactions: BankTransactionInfo[];
  status: 'SUCCESS' | 'AUTH_FAILED' | 'ERROR';
  error?: string;
}

// --- Signals ---

// Defines the data a signal accepts
export const fcmEventSignal = defineSignal<[BalanceChangeEventPayload]>('fcmEvent');
export const updateCredsSignal = defineSignal<[AccountSession]>('updateCreds');
export const deleteSignal = defineSignal('delete');
export const updateWebhooksSignal = defineSignal<[WebhookConfig[]]>('updateWebhooks');
export const lastHeartbeatQuery = defineQuery<number>('lastHeartbeat');
export const workflowStatusQuery = defineQuery<AccountWorkflowStatus>('workflowStatus');

// --- Activity Interface ---

// We define this so we can type-check our proxyActivities
export interface AccountActivities {
  validateSession: (session: AccountSession) => Promise<{ isValid: boolean; session?: AccountSession; error?: string }>;
  fetchAndSaveTransactions: (session: AccountSession) => Promise<SyncResult>;
  dispatchWebhooks: (transactions: BankTransactionInfo[], keyShare: string) => Promise<void>;
  notifyAuthRequired: (keyShare: string) => Promise<void>;
}

export interface ListenerActivities {
  manageListener: (session: AccountSession) => Promise<void>;
}

// FCM Lifecycle Activities
export interface FCMActivities {
  startFCMListener: (keyShare: KeyShare) => Promise<void>;
  stopFCMListener: (keyShare: KeyShare) => Promise<void>;
  removeFCMListener: (keyShare: KeyShare) => Promise<void>;
  checkListenerHealth: (keyShare: KeyShare) => Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>;
  syncMissedTransactions: (params: { keyShare: KeyShare; sinceTimestamp: number }) => Promise<BankTransactionInfo[]>;
}

// Transaction Activities (granular version, optional)
export interface TransactionActivities {
  pullTransaction: (params: { keyShare: KeyShare; timestamp: string }) => Promise<BankTransactionInfo[]>;
  processTransaction: (params: { keyShare: KeyShare; transaction: BankTransactionInfo }) => Promise<void>;
  notifyUser: (params: { keyShare: KeyShare; newBalance: number }) => Promise<void>;
}
