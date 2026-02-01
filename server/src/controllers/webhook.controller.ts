import { Request, Response } from 'express';
import { vpbankService } from '../services/vpbank.service';
import fetch from 'node-fetch';

export const getWebhooks = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        res.json({
            webhooks: await vpbankService.getAllWebhooks(req.user.id)
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createWebhook = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');

        const { filterAccount } = req.body;
        const keyShare = filterAccount?.[0];
        console.log(`[WebhookController] createWebhook: ${JSON.stringify(req.body)}, keyShare: ${keyShare}`);
        const session = await vpbankService.getSession(keyShare, req.user.id);
        if (!session?.id) throw new Error('Session not found');
        const webhook = await vpbankService.createWebhook({
            ...req.body,
            sessionId: session.id,
        });
        res.json({ data: webhook, message: 'Webhook created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateWebhook = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { id } = req.params;
        await vpbankService.updateWebhook(id, req.body, req.user.id);
        res.json({ message: 'Webhook updated' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteWebhook = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { id } = req.params;
        await vpbankService.deleteWebhook(id, req.user.id);
        res.json({ message: 'Webhook deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getWebhookLogs = async (req: Request, res: Response) => {
    try {
        const { limit = 50, offset = 0, configId, status, accountNumber } = req.query;

        if (!req.user) throw new Error('User not authenticated');
        const logs = await vpbankService.getWebhookLogs(
            Number(limit),
            configId ? String(configId) : undefined,
            undefined,
            String(accountNumber || 'default'),
            req.user.id
        );

        res.json({ logs });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { configs, sessionId, keyShare } = req.body;
        const configList = Array.isArray(configs) ? configs : Array.isArray(req.body) ? req.body : undefined;
        if (!configList) {
            return res.status(400).json({ error: 'Invalid config format: configs array required' });
        }

        let resolvedSessionId: string | undefined = sessionId;
        if (keyShare && !resolvedSessionId) {
            const session = await vpbankService.getSession(keyShare, req.user.id);
            resolvedSessionId = session?.id;
        }
        if (!resolvedSessionId) {
            return res.status(400).json({ error: 'sessionId or keyShare is required and must belong to your account' });
        }

        await vpbankService.updateWebhookConfigs(configList, resolvedSessionId, req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        const isDenied = error?.message?.includes('not found') || error?.message?.includes('access denied');
        res.status(isDenied ? 403 : 500).json({ error: error.message });
    }
};