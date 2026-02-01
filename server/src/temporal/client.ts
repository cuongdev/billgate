import { Client } from '@temporalio/client';
import { connectWithRetry } from './connection-util';
import dotenv from 'dotenv';

dotenv.config();

let client: Client | undefined;

export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await connectWithRetry(process.env.TEMPORAL_ADDRESS || 'localhost:7233');

  client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  return client;
}
