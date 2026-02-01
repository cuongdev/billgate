import { AccountFCMService } from './account-fcm.service';
import { getTemporalClient } from '../temporal/client';
import { fcmEventSignal, BalanceChangeEventPayload, KeyShare } from '../interfaces/temporal.interfaces';
import fetch from 'node-fetch';
import { SessionRepository } from '../repositories/session.repository';

const sessionRepo = new SessionRepository();

/**
 * FCMListenerManager
 * - Singleton
 * - Manages lifecycle of AccountFCMService per keyShare
 * - Deduplicates FCM messages
 * - Signals Temporal workflows
 */
export class FCMListenerManager {
    private static instance: FCMListenerManager;

    private listeners: Map<KeyShare, AccountFCMService> = new Map();
    private startingLocks: Map<KeyShare, Promise<void>> = new Map();

    private processedMessageIds: Set<string> = new Set();
    private readonly MAX_PROCESSED_IDS = 10000;

    private constructor() { }

    public static getInstance(): FCMListenerManager {
        if (!FCMListenerManager.instance) {
            FCMListenerManager.instance = new FCMListenerManager();
        }
        return FCMListenerManager.instance;
    }

    /**
     * Start listening for a specific keyShare
     */
    async startListener(keyShare: KeyShare): Promise<void> {
        const pendingLock = this.startingLocks.get(keyShare);
        if (pendingLock) {
            console.log(`[FCMListenerManager] Listener is already starting for keyShare=${keyShare}, waiting...`);
            await pendingLock;

            const serviceAfterLock = this.listeners.get(keyShare);
            if (serviceAfterLock && serviceAfterLock.isConnected()) {
                console.log(`[FCMListenerManager] Listener already started for keyShare=${keyShare}`);
                return;
            }
        }

        const existingService = this.listeners.get(keyShare);
        if (existingService && existingService.isConnected()) {
            console.log(`[FCMListenerManager] Listener already active for keyShare=${keyShare}`);
            return;
        }

        const lockPromise = (async () => {
            try {
                console.log(
                    `[FCMListenerManager] Starting listener for keyShare=${keyShare}. Current listeners=${this.listeners.size}`,
                );

                if (existingService) {
                    console.log(`[FCMListenerManager] Stopping existing listener for keyShare=${keyShare}`);
                    try {
                        await existingService.stop();
                    } catch (err) {
                        console.warn(`[FCMListenerManager] Failed to stop existing listener`, err);
                    }
                    this.listeners.delete(keyShare);
                }

                const service = new AccountFCMService(keyShare);
                this.listeners.set(keyShare, service);

                await service.start(payload => this.handleNotification(keyShare, payload));

                console.log(
                    `[FCMListenerManager] Listener started for keyShare=${keyShare}. Total listeners=${this.listeners.size}`,
                );
            } catch (error) {
                console.error(`[FCMListenerManager] Failed to start listener for keyShare=${keyShare}`, error);
                this.listeners.delete(keyShare);
                throw error;
            } finally {
                this.startingLocks.delete(keyShare);
            }
        })();

        this.startingLocks.set(keyShare, lockPromise);
        await lockPromise;
    }

    /**
     * Stop listener for a specific keyShare (idempotent)
     */
    async stopListener(keyShare: KeyShare): Promise<void> {
        console.log(`[FCMListenerManager] Stopping listener for keyShare=${keyShare}`);

        const pendingLock = this.startingLocks.get(keyShare);
        if (pendingLock) {
            console.log(`[FCMListenerManager] Waiting for start lock before stopping keyShare=${keyShare}`);
            try {
                await pendingLock;
            } catch (err) {
                console.warn(`[FCMListenerManager] Error while waiting for start lock`, err);
            }
        }

        const service = this.listeners.get(keyShare);
        if (!service) {
            console.log(`[FCMListenerManager] No active listener found for keyShare=${keyShare}`);
            return;
        }

        try {
            await service.stop();
        } catch (err) {
            console.warn(`[FCMListenerManager] Failed to stop listener for keyShare=${keyShare}`, err);
        }

        this.listeners.delete(keyShare);
        console.log(
            `[FCMListenerManager] Listener stopped for keyShare=${keyShare}. Remaining listeners=${this.listeners.size}`,
        );
    }

    /**
     * Stop listener and cleanup DB state
     */
    async removeListener(keyShare: KeyShare): Promise<void> {
        console.log(`[FCMListenerManager] Removing listener for keyShare=${keyShare}`);
        await this.stopListener(keyShare);

        try {
            await sessionRepo.update(
                keyShare,
                { status: 'paused' },
                { isSystem: true },
            );
        } catch (err) {
            console.warn(`[FCMListenerManager] Failed to update session status for keyShare=${keyShare}`, err);
        }
    }

    /**
     * Check if listener exists and is connected
     */
    isListening(keyShare: KeyShare): boolean {
        const service = this.listeners.get(keyShare);
        return !!service && service.isConnected();
    }

    /**
     * Check listener health
     */
    async checkListenerHealth(
        keyShare: KeyShare,
    ): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'> {
        const service = this.listeners.get(keyShare);
        if (!service) return 'DISCONNECTED';

        try {
            return service.isConnected() ? 'CONNECTED' : 'DISCONNECTED';
        } catch (err) {
            console.error(`[FCMListenerManager] Health check error for keyShare=${keyShare}`, err);
            return 'ERROR';
        }
    }

    /**
     * Get listener statistics
     */
    getListenerCount(): {
        total: number;
        active: number;
        byAccount: Record<string, number>;
    } {
        const byAccount: Record<string, number> = {};
        let active = 0;

        for (const [keyShare, service] of this.listeners.entries()) {
            byAccount[keyShare] = 1;
            if (service.isConnected()) active++;
        }

        return {
            total: this.listeners.size,
            active,
            byAccount,
        };
    }

    /**
     * Handle incoming FCM notification
     */
    private async handleNotification(keyShare: KeyShare, payload: any) {
        const fcmMessageId: string = payload?.fcmMessageId || 'unknown';

        console.log(
            `[FCMListenerManager] Received notification keyShare=${keyShare}, fcmMessageId=${fcmMessageId}, listeners=${this.listeners.size}`,
        );

        if (fcmMessageId !== 'unknown' && this.processedMessageIds.has(fcmMessageId)) {
            console.log(
                `[FCMListenerManager] Duplicate fcmMessageId detected, skipping: ${fcmMessageId}`,
            );
            return;
        }

        if (fcmMessageId !== 'unknown') {
            this.processedMessageIds.add(fcmMessageId);

            if (this.processedMessageIds.size > this.MAX_PROCESSED_IDS) {
                const ids = Array.from(this.processedMessageIds);
                this.processedMessageIds = new Set(ids.slice(-this.MAX_PROCESSED_IDS));
            }
        }

        // Emit internal socket event (cần userId để socket service target đúng user)
        try {
            const session = await sessionRepo.findByKeyShare(keyShare);
            const userId = session?.userId ?? null;
            if (!userId) {
                console.warn('[FCMListenerManager] No session/userId for keyShare, skipping socket emit');
            } else {
                const apiBaseUrl = process.env.API_INTERNAL_URL || 'http://vpbank-server:3000';
                const secret = process.env.INTERNAL_API_SECRET || 'insecure-default-secret';

                await fetch(`${apiBaseUrl}/api/internal/socket-emit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-secret': secret,
                    },
                    body: JSON.stringify({
                        event: 'vpbank:transaction',
                        data: {
                            userId,
                            keyShare,
                            type: 'fcm_notification',
                            payload,
                        },
                    }),
                });
            }
        } catch (err) {
            console.error('[FCMListenerManager] Failed to emit socket event', err);
        }

        // Signal Temporal workflow
        try {
            const client = await getTemporalClient();
            const workflowId = `vpbank-account-${keyShare.replace(/[^a-z0-9]/gi, '-')}`;

            const eventPayload: BalanceChangeEventPayload = {
                timestamp: Date.now(),
                data: payload,
            };

            const handle = client.workflow.getHandle(workflowId);
            await handle.signal(fcmEventSignal, eventPayload);

            console.log(
                `[FCMListenerManager] Workflow signaled workflowId=${workflowId} keyShare=${keyShare}`,
            );
        } catch (error: any) {
            const msg = error?.message || '';
            if (msg.includes('not found') || msg.includes('does not exist')) {
                console.warn(
                    `[FCMListenerManager] Workflow not found for keyShare=${keyShare}`,
                );
            } else {
                console.error(
                    `[FCMListenerManager] Failed to signal workflow for keyShare=${keyShare}`,
                    error,
                );
            }
        }
    }
}

export const fcmListenerManager = FCMListenerManager.getInstance();