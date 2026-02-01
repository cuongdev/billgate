
import { Context, ApplicationFailure } from '@temporalio/activity';
import { fcmListenerManager } from '../../services/fcm-listener.service';
import { AccountSession, FCMActivities, KeyShare } from '../../interfaces/temporal.interfaces';
import { SessionRepository } from '../../repositories/session.repository';

export async function startFCMListener(keyShare: KeyShare): Promise<void> {
    const ctx = Context.current();
    console.log(`[Activity:StartFCMListener] Starting listener for keyShare: ${keyShare}...`);

    try {
        await fcmListenerManager.startListener(keyShare);
        ctx.heartbeat();
        console.log(`[Activity:StartFCMListener] Successfully started listener for ${keyShare}`);
    } catch (error: any) {
        console.error(`[Activity:StartFCMListener] Failed for ${keyShare}:`, error);
        if (error.message?.includes('credentials') || error.message?.includes('invalid')) {
            throw ApplicationFailure.nonRetryable(`Invalid credentials for account ${keyShare}: ${error.message}`);
        }
        throw error;
    }
}

export async function stopFCMListener(keyShare: KeyShare): Promise<void> {
    console.log(`[Activity:StopFCMListener] Stopping listener for ${keyShare}...`);
    try {
        await fcmListenerManager.stopListener(keyShare);
        console.log(`[Activity:StopFCMListener] Successfully stopped listener for ${keyShare}`);
    } catch (error: any) {
        console.warn(`[Activity:StopFCMListener] Error stopping listener (non-fatal):`, error);
    }
}

export async function removeFCMListener(keyShare: KeyShare): Promise<void> {
    console.log(`[Activity:RemoveFCMListener] Removing listener for ${keyShare}...`);
    try {
        await fcmListenerManager.removeListener(keyShare);
        console.log(`[Activity:RemoveFCMListener] Successfully removed listener for ${keyShare}`);
    } catch (error: any) {
        console.error(`[Activity:RemoveFCMListener] Error removing listener:`, error);
        throw error;
    }
}

export async function checkListenerHealth(keyShare: KeyShare): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'> {
    try {
        const health = await fcmListenerManager.checkListenerHealth(keyShare);
        console.log(`[Activity:CheckListenerHealth] ${keyShare}: ${health}`);
        return health;
    } catch (error: any) {
        console.error(`[Activity:CheckListenerHealth] Error checking health:`, error);
        return 'ERROR';
    }
}

export async function manageListener(session: AccountSession): Promise<void> {
    const { keyShare } = session;
    const ctx = Context.current();

    console.log(`[Activity:ManageListener] Starting for ${keyShare}`);

    try {
        await fcmListenerManager.startListener(keyShare);
        console.log(`[Activity:ManageListener] Started listener for ${keyShare}. Monitoring for cancellation...`);

        while (!ctx.cancellationSignal.aborted) {
            ctx.heartbeat();
            await sleep(10000); // Check every 10s
        }

    } catch (error: any) {
        if (ctx.cancellationSignal.aborted) {
            console.log(`[Activity:ManageListener] Cancellation received. Stopping listener ${keyShare}`);
            await fcmListenerManager.stopListener(keyShare);
            throw error;
        }

        console.error(`[Activity:ManageListener] Error for ${keyShare}:`, error);
        throw error;
    } finally {
        if (ctx.cancellationSignal.aborted) {
            await fcmListenerManager.stopListener(keyShare);
        }
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const sessionRepo = new SessionRepository();

export const createFCMActivities = (): FCMActivities => ({
    startFCMListener,
    stopFCMListener,
    removeFCMListener,
    checkListenerHealth,
    syncMissedTransactions: async (params) => {
        const ctx = Context.current();
        ctx.heartbeat();

        const { createAccountActivities } = await import('./account.activities');
        const accountActivities = createAccountActivities();

        const sessionRow = await sessionRepo.findByKeyShare(params.keyShare);

        if (!sessionRow) {
            console.warn(`[Activity:SyncMissedTransactions] Session not found for ${params.keyShare}`);
            return [];
        }

        const session: AccountSession = {
            keyShare: sessionRow.keyShare,
            pinShare: sessionRow.pinShare,
            jwt: sessionRow.jwt || '',
            accountNumber: sessionRow.accountNumber || '',
            name: sessionRow.name || '',
            fcmToken: ''
        };

        const sinceTime = new Date(params.sinceTimestamp).toISOString();
        console.log(`[Activity:SyncMissedTransactions] Syncing missed transactions for ${params.keyShare} since ${sinceTime}`);

        const result = await accountActivities.fetchAndSaveTransactions(session);

        if (result.status === 'SUCCESS') {
            console.log(`[Activity:SyncMissedTransactions] Found ${result.newTransactions.length} new transactions for ${params.keyShare}`);
            return result.newTransactions;
        } else {
            console.warn(`[Activity:SyncMissedTransactions] Failed to fetch transactions for ${params.keyShare}: ${result.error}`);
            return [];
        }
    }
});
