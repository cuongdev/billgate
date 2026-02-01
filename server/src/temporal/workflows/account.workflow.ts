import { proxyActivities, setHandler, condition } from '@temporalio/workflow';
import {
    AccountSession,
    AccountActivities,
    FCMActivities,
    AccountWorkflowStatus,
    BalanceChangeEventPayload,
    fcmEventSignal,
    deleteSignal,
    lastHeartbeatQuery,
    workflowStatusQuery,
    KeyShare
} from '../../interfaces/temporal.interfaces';

// --- Proxy Activities ---
const { fetchAndSaveTransactions, dispatchWebhooks } = proxyActivities<AccountActivities>({
    startToCloseTimeout: '1 minute',
    retry: {
        initialInterval: '1s',
        backoffCoefficient: 2.0,
        maximumInterval: '60s',
        maximumAttempts: 5,
        nonRetryableErrorTypes: ['AccountNotFoundError', 'InvalidCredentialsError']
    }
});

const {
    startFCMListener,
    stopFCMListener,
    checkListenerHealth,
} = proxyActivities<FCMActivities>({
    startToCloseTimeout: '5 minutes',
    retry: {
        initialInterval: '1s',
        backoffCoefficient: 2.0,
        maximumInterval: '60s',
        maximumAttempts: 5,
        nonRetryableErrorTypes: ['AccountNotFoundError', 'InvalidCredentialsError']
    }
});


const ensureFCMListenerRunning = async (keyShare: KeyShare): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'> => {
    const health: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' = await checkListenerHealth(keyShare);
    console.log(`[Workflow] FCM listener health check for ${keyShare}: ${health}`);
    if (health === 'DISCONNECTED' || health === 'ERROR') {
        console.warn(`[Workflow] Listener health check failed (${health}). Restarting...`);
        await stopFCMListener(keyShare);
        await startFCMListener(keyShare);
    }
    return health;
}

/**
 * VPBank Account Workflow
 * Orchestrates FCM listener lifecycle and transaction processing for a single bank account
 * 
 * Lifecycle States:
 * - active: FCM listener active, processing events
 * - paused: FCM listener stopped, workflow waiting
 * - deleted: Cleanup and terminate
 */
export default async function VPBankAccountWorkflow(initialSession: AccountSession) {
    let session = initialSession;

    let status: AccountWorkflowStatus = 'active';
    let lastPollTime = 0;
    let eventProcessedCount = 0;

    const isRunning = () => status === 'active';
    const getStatus = (): AccountWorkflowStatus => status as AccountWorkflowStatus;
    let signalQueues: BalanceChangeEventPayload[] = [];
    const keyShare = session.keyShare;
    console.log(`[Workflow] Workflow started for ${keyShare}`);
    await startFCMListener(keyShare);

    setHandler(fcmEventSignal, (payload: BalanceChangeEventPayload) => {
        console.log(`[Workflow] FCM event received for ${keyShare}`, payload);
        if (isRunning()) {
            signalQueues.push(payload);
        }
    });

    setHandler(deleteSignal, () => {
        console.log(`[Workflow] Delete signal received for ${keyShare}`);
        status = 'deleted';
    });

    setHandler(lastHeartbeatQuery, () => lastPollTime);
    setHandler(workflowStatusQuery, () => getStatus());


    while (getStatus() !== 'deleted') {
        await condition(() => (isRunning() && signalQueues.length > 0) || getStatus() === 'deleted');

        if (getStatus() === 'deleted') {
            break;
        }

        console.log(`[Workflow] Processing ${signalQueues.length} FCM events for ${keyShare}`);
        // clear the signal queues
        signalQueues.length = 0;
        const result = await fetchAndSaveTransactions(session);
        console.log(`[Workflow] FCM event processed for ${keyShare}, new transactions: ${result.newTransactions.length}, status: ${result.status}`);
        if (result.status === 'SUCCESS') {
            console.log(`[Workflow] FCM event processed for ${keyShare}, new transactions: ${result.newTransactions.length}`);
            lastPollTime = Date.now();
            eventProcessedCount += result.newTransactions.length;
            await dispatchWebhooks(result.newTransactions, keyShare);
        }
    }

    console.log(`[Workflow] Stopping FCM listener for ${keyShare}`);
    await stopFCMListener(keyShare);
    console.log(`[Workflow] Workflow terminated for ${keyShare}`);
}

