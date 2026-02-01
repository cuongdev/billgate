import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../db/sequelize';
import { Webhook } from '../models/webhook.model';
import { Session } from '../models/session.model';
import { WebhookRepository } from '../repositories/webhook.repository';

async function run() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const sessions = await Session.findAll();
        console.log(`Found ${sessions.length} sessions.`);
        sessions.forEach(s => {
            console.log(`Session: ${s.id} | keyShare: ${s.keyShare} | userId: ${s.userId}`);
        });

        const webhooks = await Webhook.findAll();
        console.log(`Found ${webhooks.length} webhooks.`);
        webhooks.forEach(w => {
            console.log(`Webhook: ${w.id} | sessionId: ${w.sessionId} | url: ${w.url}`);
        });

        const repo = new WebhookRepository();
        // Pick a userId from sessions if available
        const targetUserId = sessions.find(s => s.userId)?.userId;
        if (targetUserId) {
            console.log(`Testing findAllByUserId for userId: ${targetUserId}`);
            const result = await repo.findAllByUserId(targetUserId);
            console.log(`Repo Result: Found ${result.length} webhooks.`);
            result.forEach(w => console.log(` - ${w.url}`));
        } else {
            console.log('No sessions with userId found to test repository.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

run();
