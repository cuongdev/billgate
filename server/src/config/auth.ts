import dotenv from 'dotenv';
dotenv.config();

export const AUTH_CONFIG = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '100y',
  JWT_ISSUER: 'vpbank-server',
  JWT_AUDIENCE: 'vpbank-client',
};

if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('[WARN] GOOGLE_CLIENT_ID is not set in environment variables.');
}
