'use strict';

/**
 * Consolidated Initial Migration - IDEMPOTENT VERSION
 * Creates all tables with final schema. All timestamp columns use TIMESTAMPTZ (UTC).
 * Client hiển thị GMT+7 bằng toLocaleString(..., { timeZone: 'Asia/Ho_Chi_Minh' }).
 * Safe to re-run - uses IF NOT EXISTS checks.
 */
module.exports = {
	up: async (queryInterface, Sequelize) => {
		const { sequelize } = queryInterface;

		// Enable UUID extension
		await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

		// Create ENUM type if not exists
		await sequelize.query(`
			DO $$ BEGIN
				CREATE TYPE enum_sessions_status AS ENUM('active', 'expired', 'paused');
			EXCEPTION
				WHEN duplicate_object THEN null;
			END $$;
		`);

		// 1. Create Users Table (TIMESTAMPTZ = lưu UTC, client show GMT+7)
		await sequelize.query(`
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
		`);

		await sequelize.query('CREATE INDEX IF NOT EXISTS users_firebase_uid ON users(firebase_uid);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS users_google_sub ON users(google_sub);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS users_email ON users(email);');

		// 2. Create Sessions Table
		await sequelize.query(`
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
		`);

		await sequelize.query('CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS sessions_account_number ON sessions(account_number);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS sessions_key_share ON sessions(key_share);');

		// 3. Create FCM Credentials Table
		await sequelize.query(`
			CREATE TABLE IF NOT EXISTS fcm_credentials (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				key_share VARCHAR NOT NULL UNIQUE,
				credentials JSONB NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				deleted_at TIMESTAMPTZ
			);
		`);

		await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS fcm_credentials_key_share_index ON fcm_credentials(key_share);');

		// 4. Create Transactions Table
		await sequelize.query(`
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
		`);

		await sequelize.query('CREATE INDEX IF NOT EXISTS transactions_session_id_transaction_date ON transactions(session_id, transaction_date);');
		await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS transactions_bank_transaction_id ON transactions(bank_transaction_id);');

		// 5. Create Webhooks Table
		await sequelize.query(`
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
		`);

		await sequelize.query('CREATE INDEX IF NOT EXISTS webhooks_session_id ON webhooks(session_id);');

		// 6. Create Webhook Logs Table
		await sequelize.query(`
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
		`);

		await sequelize.query('CREATE INDEX IF NOT EXISTS webhook_logs_webhook_id ON webhook_logs(webhook_id);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS webhook_logs_dispatched_at ON webhook_logs(dispatched_at);');
		await sequelize.query('CREATE INDEX IF NOT EXISTS webhook_logs_transaction_id ON webhook_logs(transaction_id);');

		// 7. Create Preferences Table
		await sequelize.query(`
			CREATE TABLE IF NOT EXISTS preferences (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				session_id UUID REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
				key VARCHAR NOT NULL,
				value JSONB NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				deleted_at TIMESTAMPTZ
			);
		`);

		await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS preferences_session_id_key ON preferences(session_id, key);');
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.dropTable('preferences');
		await queryInterface.dropTable('webhook_logs');
		await queryInterface.dropTable('webhooks');
		await queryInterface.dropTable('transactions');
		await queryInterface.dropTable('fcm_credentials');
		await queryInterface.dropTable('sessions');
		await queryInterface.dropTable('users');

		// Drop ENUM
		await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sessions_status";');

		// Drop extension
		await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
	}
};
