// @ts-ignore
import { register, listen } from '@mr.cuongnt/fcm-node-receiver';
import { FCMCredential } from '../models/fcm-credential.model';

export interface FCMCredentials {
    fcm: { token: string; pushSet: string };
    gcm: { androidId: string; securityToken: string; appId: string };
    keys: { privateKey: string; publicKey: string; authSecret: string };
    persistentIds: string[];
    processedMessageIds?: string[];
}

const MAX_PERSISTENT_IDS = 100;
const MAX_PROCESSED_MESSAGE_IDS = 1000;

export class AccountFCMService {
    private credentials: FCMCredentials | null = null;

    private isListening = false;
    private uniqueId: string;

    private onMessage: ((payload: any) => void) | null = null;

    private client: any = null;

    private _connected = false;

    private processedMessageIds: Set<string> = new Set();

    private startStopLock: Promise<void> = Promise.resolve();

    private connectionId: string = Math.random().toString(36).slice(2, 8);
    private connectionStartTime: number = 0;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
    }

    private async loadCreds(): Promise<FCMCredentials | null> {
        try {
            const record = await FCMCredential.findOne({ where: { keyShare: this.uniqueId } });
            return record ? (record.credentials as FCMCredentials) : null;
        } catch (err) {
            console.error(`[FCM:${this.uniqueId}] Failed to load credentials from DB`, err);
            return null;
        }
    }

    private async saveCreds(creds: FCMCredentials): Promise<void> {
        try {
            await FCMCredential.upsert({
                keyShare: this.uniqueId,
                credentials: creds,
            });
        } catch (err) {
            console.error(`[FCM:${this.uniqueId}] Failed to save credentials to DB`, err);
        }
    }

    private cleanupPersistentIds(creds: FCMCredentials): void {
        if (!creds.persistentIds || creds.persistentIds.length <= MAX_PERSISTENT_IDS) return;

        const removed = creds.persistentIds.length - MAX_PERSISTENT_IDS;
        creds.persistentIds = creds.persistentIds.slice(-MAX_PERSISTENT_IDS);
        console.log(
            `[FCM:${this.uniqueId}] Cleaned up ${removed} old persistentIds, keeping ${creds.persistentIds.length} most recent`,
        );
    }

    private loadProcessedMessageIds(creds: FCMCredentials): void {
        if (creds.processedMessageIds && creds.processedMessageIds.length > 0) {
            this.processedMessageIds = new Set(creds.processedMessageIds);
            console.log(`[FCM:${this.uniqueId}] Loaded ${this.processedMessageIds.size} processedMessageIds from DB`);
        } else {
            this.processedMessageIds = new Set();
        }
    }

    private saveProcessedMessageIdsToCreds(creds: FCMCredentials): void {
        const idsArray = Array.from(this.processedMessageIds);
        creds.processedMessageIds =
            idsArray.length > MAX_PROCESSED_MESSAGE_IDS
                ? idsArray.slice(-MAX_PROCESSED_MESSAGE_IDS)
                : idsArray;
    }

    async getCredentials(): Promise<FCMCredentials> {
        if (this.credentials) {
            if (!this.credentials.persistentIds) this.credentials.persistentIds = [];
            if (!this.credentials.processedMessageIds) this.credentials.processedMessageIds = [];
            this.cleanupPersistentIds(this.credentials);
            this.loadProcessedMessageIds(this.credentials);
            return this.credentials;
        }

        const stored = await this.loadCreds();
        if (stored) {
            if (!stored.persistentIds) stored.persistentIds = [];
            if (!stored.processedMessageIds) stored.processedMessageIds = [];
            this.cleanupPersistentIds(stored);
            this.loadProcessedMessageIds(stored);
            this.credentials = stored;
            return stored;
        }

        console.log(`[FCM:${this.uniqueId}] Registering new credentials...`);
        try {
            const config = {
                firebase: {
                    apiKey: 'AIzaSyCj6YhWReLhhJhkwOtdQ21t5EswmxLSn2M',
                    projectID: 'vpbank-online-new---prod',
                    appID: '1:98475675285:web:32ddcaef807efffb1a959c',
                },
            };

            const creds = (await register(config)) as FCMCredentials;
            creds.persistentIds = [];
            creds.processedMessageIds = [];

            await this.saveCreds(creds);

            console.log(`[FCM:${this.uniqueId}] Registered new credentials token=${creds.fcm?.token}`);
            this.credentials = creds;

            // Initialize runtime state
            this.loadProcessedMessageIds(creds);

            return creds;
        } catch (err: any) {
            console.error(`[FCM:${this.uniqueId}] Registration failed`, err);
            console.error(`[FCM:${this.uniqueId}] Registration failed message=${err?.message}`);
            throw err;
        }
    }

    async start(onMessage: (payload: any) => void): Promise<void> {
        this.startStopLock = this.startStopLock.then(async () => {
            // Already running and connected -> only update callback
            if (this.isListening && this._connected && this.client) {
                this.onMessage = onMessage;
                return;
            }

            // If some old state exists, stop it first
            if (this.client || this.isListening) {
                console.log(`[FCM:${this.uniqueId}] Cleaning up old listener before starting a new one`);
                await this.stopInternal();
            }

            this.onMessage = onMessage;

            const creds = await this.getCredentials();

            this.connectionId = Math.random().toString(36).slice(2, 8);
            this.connectionStartTime = Date.now();

            console.log(`[FCM:${this.uniqueId}:${this.connectionId}] Starting listener`);
            this.isListening = true;

            try {
                const client = await listen(creds, ({ notification, persistentId }: any) => {
                    // persistentId dedupe
                    if (persistentId && creds.persistentIds.includes(persistentId)) {
                        console.log(`[FCM:${this.uniqueId}] Skipping duplicate persistentId=${persistentId}`);
                        return;
                    }

                    // fcmMessageId dedupe
                    const fcmMessageId = notification?.fcmMessageId;
                    if (fcmMessageId && this.processedMessageIds.has(fcmMessageId)) {
                        console.log(`[FCM:${this.uniqueId}] Skipping duplicate fcmMessageId=${fcmMessageId}`);

                        // Still persist persistentId so we don't re-process later
                        if (persistentId && !creds.persistentIds.includes(persistentId)) {
                            creds.persistentIds.push(persistentId);
                            this.cleanupPersistentIds(creds);
                            this.saveCreds(creds).catch(() => { });
                        }
                        return;
                    }

                    console.log(`[FCM:${this.uniqueId}] Received new message`, notification);

                    if (this.onMessage) {
                        this.onMessage(notification);
                    }

                    // Track + persist fcmMessageId
                    if (fcmMessageId) {
                        this.processedMessageIds.add(fcmMessageId);

                        // Keep runtime set bounded (delete oldest)
                        while (this.processedMessageIds.size > MAX_PROCESSED_MESSAGE_IDS) {
                            const oldest = this.processedMessageIds.values().next().value;
                            if (oldest !== undefined) this.processedMessageIds.delete(oldest);
                            else break;
                        }

                        this.saveProcessedMessageIdsToCreds(creds);
                        this.saveCreds(creds).catch((err) => {
                            console.error(`[FCM:${this.uniqueId}] Failed to save processedMessageIds`, err);
                        });
                    }

                    // Track + persist persistentId
                    if (persistentId && !creds.persistentIds.includes(persistentId)) {
                        creds.persistentIds.push(persistentId);
                        this.cleanupPersistentIds(creds);
                        this.saveCreds(creds).catch((err) => {
                            console.error(`[FCM:${this.uniqueId}] Failed to save persistentId`, err);
                        });
                    }
                });

                this.client = client;

                // Connection status tracking with log dampening
                let disconnectTimeout: NodeJS.Timeout | null = null;
                const LOG_DAMPENING_MS = 2000;

                const connectHandler = () => {
                    if (this.client !== client) return;

                    if (disconnectTimeout) {
                        clearTimeout(disconnectTimeout);
                        disconnectTimeout = null;
                        this._connected = true;
                        return;
                    }

                    const uptime = Date.now() - this.connectionStartTime;
                    console.log(`[FCM:${this.uniqueId}:${this.connectionId}] Connected uptimeMs=${uptime}`);
                    this._connected = true;
                };

                const disconnectHandler = () => {
                    if (this.client !== client) return;

                    disconnectTimeout = setTimeout(() => {
                        const uptime = Date.now() - this.connectionStartTime;
                        console.warn(`[FCM:${this.uniqueId}:${this.connectionId}] Disconnected uptimeMs=${uptime}`);
                        this._connected = false;
                        disconnectTimeout = null;
                    }, LOG_DAMPENING_MS);
                };

                const errorHandler = (error: any) => {
                    if (this.client !== client) return;

                    console.error(`[FCM:${this.uniqueId}:${this.connectionId}] Error`, {
                        message: error?.message,
                        code: error?.code,
                        errno: error?.errno,
                    });
                };

                // Attach listeners (store refs on the instance for targeted removal)
                client.on('connect', connectHandler);
                client.on('disconnect', disconnectHandler);
                client.on('error', errorHandler);

                (this.client as any).__handlers = { connectHandler, disconnectHandler, errorHandler };

                // Mark connected best-effort (connect event may come later)
                this._connected = true;
            } catch (err) {
                console.error(`[FCM:${this.uniqueId}] Listen failed`, err);

                // Reset state
                this.isListening = false;
                this._connected = false;
                this.client = null;

                // IMPORTANT: propagate failure so callers know start failed
                throw err;
            }
        });

        return this.startStopLock;
    }

    async stop(): Promise<void> {
        this.startStopLock = this.startStopLock.then(async () => {
            await this.stopInternal();
        });
        return this.startStopLock;
    }

    private async stopInternal(): Promise<void> {
        if (!this.isListening && !this.client) {
            console.log(`[FCM:${this.uniqueId}:${this.connectionId}] Already stopped`);
            return;
        }

        console.log(`[FCM:${this.uniqueId}:${this.connectionId}] Stopping listener`);

        const client = this.client;

        // Detach listeners without nuking any potential listeners from other code
        if (client) {
            try {
                const handlers = (client as any).__handlers;
                if (handlers?.connectHandler) client.removeListener('connect', handlers.connectHandler);
                if (handlers?.disconnectHandler) client.removeListener('disconnect', handlers.disconnectHandler);
                if (handlers?.errorHandler) client.removeListener('error', handlers.errorHandler);
            } catch (err) {
                console.error(`[FCM:${this.uniqueId}:${this.connectionId}] Failed to remove client handlers`, err);
            }

            try {
                if (typeof client.destroy === 'function') {
                    const result = client.destroy();
                    // If destroy returns a Promise, await it.
                    if (result && typeof result.then === 'function') {
                        await result;
                    }
                }
            } catch (err) {
                console.error(`[FCM:${this.uniqueId}] Failed to destroy client`, err);
            }
        }

        this.client = null;

        // Persist last processed ids before stopping (best-effort)
        if (this.credentials && this.processedMessageIds.size > 0) {
            try {
                this.saveProcessedMessageIdsToCreds(this.credentials);
                await this.saveCreds(this.credentials);
            } catch (err) {
                console.error(`[FCM:${this.uniqueId}] Failed to persist processedMessageIds on stop`, err);
            }
        }

        this.isListening = false;
        this._connected = false;

        console.log(`[FCM:${this.uniqueId}:${this.connectionId}] Stopped`);
    }

    isConnected(): boolean {
        return this.isListening && this._connected;
    }

    async removeCredentials(): Promise<void> {
        try {
            await this.stop();
            await FCMCredential.destroy({ where: { keyShare: this.uniqueId } });
            console.log(`[FCM:${this.uniqueId}] Removed credentials from DB`);
        } catch (err) {
            console.error(`[FCM:${this.uniqueId}] Failed to remove credentials from DB`, err);
            throw err;
        }
    }
}