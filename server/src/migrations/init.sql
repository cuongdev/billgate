-- BillGate Database Initialization Script
-- PostgreSQL 14+
-- This script creates all tables for the BillGate VPBank integration system
-- IDEMPOTENT - Safe to run multiple times

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM type for session status
DO $$ BEGIN
    CREATE TYPE enum_sessions_status AS ENUM('active', 'expired', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table (TIMESTAMPTZ = lưu UTC, hiển thị GMT+7 ở client)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_sub VARCHAR UNIQUE,
    firebase_uid VARCHAR UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR,
    picture VARCHAR,
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    key_share VARCHAR NOT NULL UNIQUE,
    pin_share VARCHAR NOT NULL,
    jwt TEXT,
    account_number VARCHAR,
    name VARCHAR,
    status enum_sessions_status NOT NULL DEFAULT 'active',
    last_listener_activity BIGINT,
    run_id VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_number ON sessions(account_number);
CREATE INDEX IF NOT EXISTS idx_sessions_key_share ON sessions(key_share);

-- 3. FCM Credentials Table
CREATE TABLE IF NOT EXISTS fcm_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_share VARCHAR NOT NULL UNIQUE,
    credentials JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS fcm_credentials_key_share_index ON fcm_credentials(key_share);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    bank_transaction_id VARCHAR,
    amount_value DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'VND',
    transaction_date TIMESTAMPTZ NOT NULL,
    note TEXT,
    sender_account VARCHAR,
    has_audio BOOLEAN DEFAULT false,
    audio_url TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_session_date ON transactions(session_id, transaction_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_transaction_id);

-- 5. Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    url TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhooks_session_id ON webhooks(session_id);

-- 6. Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON UPDATE CASCADE ON DELETE CASCADE,
    transaction_id VARCHAR,
    status_code INTEGER,
    response_body TEXT,
    request_body TEXT,
    error_message TEXT,
    dispatched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_dispatched_at ON webhook_logs(dispatched_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction_id ON webhook_logs(transaction_id);

-- 7. Preferences Table
CREATE TABLE IF NOT EXISTS preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    key VARCHAR NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_preferences_session_key ON preferences(session_id, key);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with Google OAuth or Firebase authentication';
COMMENT ON TABLE sessions IS 'VPBank account sessions with key share and PIN';
COMMENT ON TABLE fcm_credentials IS 'FCM credentials for push notifications per account';
COMMENT ON TABLE transactions IS 'Bank transactions captured from VPBank Neo';
COMMENT ON TABLE webhooks IS 'Webhook configurations for transaction notifications';
COMMENT ON TABLE webhook_logs IS 'Audit log of webhook dispatches';
COMMENT ON TABLE preferences IS 'User preferences and settings';
