import { Worker, NativeConnection } from '@temporalio/worker';
import { createAccountActivities } from './activities/account.activities';
import { createFCMActivities } from './activities/listener.activities';
import { fcmListenerManager } from '../services/fcm-listener.service';
import { checkConnection } from '../db/sequelize';
import { SessionRepository } from '../repositories/session.repository';
import '../models'; // Initialize Sequelize associations
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  // Initialize database connection
  await checkConnection();
  console.log('[DB] Connection verified.');

  const accountActivities = createAccountActivities();
  const fcmActivities = createFCMActivities();
  const listenerActivities = require('./activities/listener.activities'); // Legacy manageListener

  // Retry logic for Worker connection
  let connection: NativeConnection | undefined;
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  for (let i = 0; i < 60; i++) {
    try {
      console.log(`[Worker] Connecting to ${address} (Attempt ${i + 1}/60)...`);
      connection = await NativeConnection.connect({ address });
      break;
    } catch (err: any) {
      console.error(`[Worker] Connection failed: ${err.message}. Retrying in 2s...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  if (!connection) throw new Error('Failed to connect to Temporal.');

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: 'vpbank-queue',
    workflowsPath: require.resolve('./workflows/account.workflow'),
    activities: {
      ...accountActivities,
      ...fcmActivities,
      manageListener: listenerActivities.manageListener, // Legacy support
    },
  });

  /// on worker start, start the FCM listener, get all sessions from the database and start the listener for each session
  const sessionRepo = new SessionRepository();
  const sessions = await sessionRepo.findAll({ isSystem: true });
  console.log(`[Worker] Found ${sessions.length} session(s) in database. Starting FCM listeners...`);
  
  for (const session of sessions) {
    if (session.status !== 'active') {
      console.log(`[Worker] Skipping session ${session.keyShare}...`);
      continue;
    }
    try {
      await fcmListenerManager.startListener(session.keyShare);
      console.log(`[Worker] ✅ Started FCM listener for session: ${session.keyShare.substring(0, 8)}...`);
    } catch (error: any) {
      console.error(`[Worker] ❌ Failed to start FCM listener for ${session.keyShare}:`, error.message);
    }
  }

  console.log('[Worker] Worker started. Listening on vpbank-queue...');

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('[Worker] Shutdown signal received. Stopping worker...');
    await worker.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
