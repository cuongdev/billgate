require('dotenv').config();

export default {
	development: {
		username: process.env.PG_USER || 'postgres',
		password: process.env.PG_PASSWORD || 'postgres',
		database: process.env.PG_DATABASE || 'vpbank_dev',
		host: process.env.PG_HOST || '127.0.0.1',
		port: parseInt(process.env.PG_PORT || '5432', 10),
		dialect: 'postgres' as const,
		seederStorage: 'sequelize',
		logging: console.log,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000
		}
	},
	test: {
		username: process.env.PG_USER || 'postgres',
		password: process.env.PG_PASSWORD || 'postgres',
		database: process.env.PG_DATABASE_TEST || 'vpbank_test',
		host: process.env.PG_HOST || '127.0.0.1',
		port: parseInt(process.env.PG_PORT || '5432', 10),
		dialect: 'postgres' as const,
		logging: false,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000
		}
	},
	production: {
		username: process.env.PG_USER!,
		password: process.env.PG_PASSWORD!,
		database: process.env.PG_DATABASE!,
		host: process.env.PG_HOST!,
		port: parseInt(process.env.PG_PORT || '5432', 10),
		dialect: 'postgres' as const,
		logging: false,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000
		}
	}
};
