import { getTemporalClient } from '../temporal/client';
import VPBankAccountWorkflow from '../temporal/workflows/account.workflow';
import { AccountSession, BalanceChangeEventPayload } from '../interfaces/temporal.interfaces';

/**
 * Start or signal a Temporal workflow for a VPBank session
 * This is a utility that can be called from anywhere (controllers, services, gateway)
 */
export async function startWorkflowForSession(session: AccountSession, signalPayload?: BalanceChangeEventPayload, webhooks?: any[]): Promise<string> {
    const client = await getTemporalClient();
    const workflowId = `vpbank-account-${session.keyShare.replace(/[^a-z0-9]/gi, '-')}`;

    try {
        let handle;
        if (signalPayload) {
            handle = await client.workflow.signalWithStart(VPBankAccountWorkflow, {
                workflowId,
                taskQueue: 'vpbank-queue',
                args: [session],
                signal: 'fcmEvent',
                signalArgs: [signalPayload],
                workflowExecutionTimeout: '0', // Unlimited
                workflowRunTimeout: '0', // Unlimited
                workflowTaskTimeout: '10s',
            });
            console.log(`[Workflow] SignalWithStart sent to ${workflowId}`);
        } else {
            // Start returns a handle
            handle = await client.workflow.start(VPBankAccountWorkflow, {
                workflowId,
                taskQueue: 'vpbank-queue',
                args: [session],
                workflowExecutionTimeout: '0', // Unlimited
                workflowRunTimeout: '0', // Unlimited
                workflowTaskTimeout: '10s',
            });
            console.log(`[Workflow] Started ${workflowId}`);
        }

        return (handle as any).firstExecutionRunId || (handle as any).signaledRunId || workflowId;
    } catch (error: any) {
        // Workflow already exists
        if (error.name === 'WorkflowExecutionAlreadyStartedError' || error.message?.includes('Workflow execution already started')) {
            console.log(`[Workflow] ${workflowId} already running (OK)`);
            try {
                const handle = client.workflow.getHandle(workflowId);
                const desc = await handle.describe();
                return desc.runId;
            } catch (e) {
                console.warn(`[Workflow] Could not get runId for existing workflow ${workflowId}`);
                return '';
            }
        }
        throw error;
    }
}
