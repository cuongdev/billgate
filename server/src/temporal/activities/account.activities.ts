import {
  AccountSession,
  AccountActivities,
  BankTransactionInfo,
  WebhookConfig,
  SyncResult,
} from '../../interfaces/temporal.interfaces'; 
import { vpbankService } from '../../services/vpbank.service';

export const createAccountActivities = (): AccountActivities => ({
  async validateSession(
    session: AccountSession
  ): Promise<{ isValid: boolean; session?: AccountSession; error?: string }> {
    const res = await vpbankService.validateShare(session.keyShare, session.pinShare, session.fcmToken);

    if (res.status === '1' && res.jwt) {
      return {
        isValid: true,
        session: { ...session, jwt: res.jwt },
      };
    }

    return {
      isValid: false,
      error: `Validation failed: Status=${res.status}`,
    };
  },

  async fetchAndSaveTransactions(session: AccountSession): Promise<SyncResult> {
    try {
      const result = await vpbankService.syncTransactions({
         keyShare: session.keyShare,
         pinShare: session.pinShare,
         jwt: session.jwt,
         accountNumber: session.accountNumber
      });
      
      if (result.status === 'SUCCESS') {
        return {
           newTransactions: result.newTransactions,
           status: 'SUCCESS'
        };
      }
      
      return {
        newTransactions: [],
        status: result.status === 'AUTH_FAILED' ? 'AUTH_FAILED' : 'ERROR',
        error: result.error
      };

    } catch (err: any) {
      return { newTransactions: [], status: 'ERROR', error: err.message };
    }
  },

  async dispatchWebhooks(transactions: BankTransactionInfo[], keyShare: string): Promise<void> {
    await vpbankService.dispatchWebhooks(transactions, keyShare);
  },

  async notifyAuthRequired(keyShare: string): Promise<void> {
    console.warn(`[Activity] ACTION REQUIRED: Account ${keyShare} needs re-authentication!`);
  },
});