import { Sequelize } from 'sequelize';
import dbConfig from '../config/database';

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env as keyof typeof dbConfig];

export const sequelize = new Sequelize(
    config.database!,
    config.username!,
    config.password!,
    {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: config.logging,
        pool: config.pool,
        define: {
            timestamps: true,
            underscored: true,
        }
    }
);

export const checkConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('[DB] Connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('[DB] Unable to connect to the database:', error);
        return false;
    }
};
