'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
	up: async (queryInterface, Sequelize) => {
		// 1. Create a Demo Session
		const sessionId = uuidv4();
		const keyShare = 'demo-share-key-123';

		await queryInterface.bulkInsert('sessions', [{
			id: sessionId,
			key_share: keyShare,
			pin_share: 'demo-pin',
			jwt: 'demo-jwt-token',
			account_number: '123456789',
			name: 'Demo User',
			status: 'active',
			created_at: new Date(),
			updated_at: new Date()
		}]);

		// 2. Create some Transactions
		await queryInterface.bulkInsert('transactions', [
			{
				id: uuidv4(),
				session_id: sessionId,
				amount_value: 100000.00,
				currency: 'VND',
				transaction_date: new Date(),
				note: 'Deposit from ATM',
				sender_account: '987654321',
				created_at: new Date(),
				updated_at: new Date()
			},
			{
				id: uuidv4(),
				session_id: sessionId,
				amount_value: -50000.00,
				currency: 'VND',
				transaction_date: new Date(Date.now() - 86400000), // Yesterday
				note: 'Payment for Bill',
				created_at: new Date(),
				updated_at: new Date()
			}
		]);

		// 3. Create Default Preferences
		await queryInterface.bulkInsert('preferences', [{
			id: uuidv4(),
			session_id: sessionId,
			key: 'theme',
			value: JSON.stringify({ mode: 'dark' }),
			created_at: new Date(),
			updated_at: new Date()
		}]);

		// 4. Create Webhook
		const webhookId = uuidv4();
		await queryInterface.bulkInsert('webhooks', [{
			id: webhookId,
			session_id: sessionId,
			url: 'https://webhook.site/demo',
			config: JSON.stringify({ authType: 'none', enabled: true }),
			is_active: true,
			created_at: new Date(),
			updated_at: new Date()
		}]);

		// 5. Create Webhook Log
		await queryInterface.bulkInsert('webhook_logs', [{
			id: uuidv4(),
			webhook_id: webhookId,
			status_code: 200,
			response_body: 'OK',
			dispatched_at: new Date()
		}]);
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.bulkDelete('webhook_logs', null, {});
		await queryInterface.bulkDelete('webhooks', null, {});
		await queryInterface.bulkDelete('preferences', null, {});
		await queryInterface.bulkDelete('transactions', null, {});
		await queryInterface.bulkDelete('sessions', null, {});
	}
};
