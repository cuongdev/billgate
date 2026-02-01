import admin, { type ServiceAccount } from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

function safeJsonParse<T>(raw?: string): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch (e) {
        console.error('[Firebase] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e);
        return null;
    }
}

function initFirebaseAdmin(): admin.app.App {
    if (admin.apps.length) return admin.app();

    try {
        // 1) Service account JSON string (recommended for containerized envs)
        const sa = safeJsonParse<ServiceAccount>(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        if (sa) {
            const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
            console.log('[Firebase] Admin SDK initialized with FIREBASE_SERVICE_ACCOUNT_JSON');
            return app;
        }

        // 2) Service account file path
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const app = admin.initializeApp({ credential: admin.credential.applicationDefault() });
            console.log(
                `[Firebase] Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
            );
            return app;
        }

        // 3) Application Default Credentials (GCP / workload identity / etc.)
        const app = admin.initializeApp({ credential: admin.credential.applicationDefault() });
        console.log('[Firebase] Admin SDK initialized with Application Default Credentials');
        return app;
    } catch (error) {
        console.error('[Firebase] Failed to initialize Admin SDK:', error);
        // fail fast so callers don't use a half-initialized module
        throw error;
    }
}

const firebaseAdmin = initFirebaseAdmin();

export const firebaseAuth = firebaseAdmin.auth();
export default firebaseAdmin;