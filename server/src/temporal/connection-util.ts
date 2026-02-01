
import { Connection } from '@temporalio/client';

export async function connectWithRetry(address: string, retries = 60, delay = 2000): Promise<Connection> {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Temporal] Connecting to ${address} (Attempt ${i + 1}/${retries})...`);
            const connection = await Connection.connect({ address });
            console.log('[Temporal] Connected successfully.');
            return connection;
        } catch (err: any) {
            console.error(`[Temporal] Connection failed: ${err.message}. Retrying in ${delay / 1000}s...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
    throw new Error(`Failed to connect to Temporal at ${address} after ${retries} attempts.`);
}
