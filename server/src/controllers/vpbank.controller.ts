import { Request, Response } from 'express';
import { vpbankService } from '../services/vpbank.service';
import { preferenceService } from '../services/preference.service';
import { socketService } from '../services/socket.service';

export const validateShare = async (req: Request, res: Response) => {
    try {
        const { keyShare, pinShare, tokenFb } = req.body;
        const result = await vpbankService.validateShare(keyShare, pinShare, tokenFb);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { authKey, keyShare, pinShare, accountNumber } = req.query;
        const result = await vpbankService.getNotifications(
            String(authKey),
            String(keyShare),
            String(pinShare),
            String(accountNumber)
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const checkSound = async (req: Request, res: Response) => {
    try {
        const { keyShare, pinShare } = req.query;
        const result = await vpbankService.checkSound(String(keyShare), String(pinShare));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const toggleSound = async (req: Request, res: Response) => {
    try {
        const { keyShare, pinShare, accountNumber, status } = req.body;
        const result = await vpbankService.toggleSound(keyShare, pinShare, accountNumber, !!status);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
    }
};

export const startListener = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { keyShare, pinShare, webhookConfigs, jwt, accountNumber, name } = req.body;
        const result = await vpbankService.registerListener(keyShare, pinShare, webhookConfigs, jwt, accountNumber, name, req.user.id);
        res.json(result);
    } catch (error: any) {
        console.error('Start Listener Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removeSession = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { keyShare } = req.body;
        await vpbankService.removeSession(keyShare, req.user.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getHistory = async (req: Request, res: Response) => {
    try {
        const { page, pageSize, account, search } = req.query;
        if (!req.user) throw new Error('User not authenticated');
        const result = await vpbankService.getTransactionHistory(
            Number(page) || 1,
            Number(pageSize) || 20,
            String(account),
            String(search || ''),
            req.query.sort === 'asc' ? 'asc' : 'desc',
            req.query.sortBy === 'amount' ? 'amount' : 'date',
            undefined, // startDate
            undefined, // endDate
            req.user.id
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const account = req.query.accountNumber as string;
        const search = req.query.search as string;
        const sort = (req.query.sort as string) === 'asc' ? 'asc' : 'desc';
        const sortBy = (req.query.sortBy as string) === 'amount' ? 'amount' : 'date';
        const startDate = (req.query.startDate as string) || undefined;
        const endDate = (req.query.endDate as string) || undefined;

        if (!req.user) throw new Error('User not authenticated');
        const result = await vpbankService.getTransactionHistory(page, limit, account, search, sort, sortBy, startDate, endDate, req.user.id);
        return res.json({
            transactions: result.data,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
    }
};

export const getSessions = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const sessions = await vpbankService.getSessions(req.user.id);
        res.json({ sessions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const { keyShare, startDate, endDate } = req.query;
        let start = startDate ? Number(startDate) : undefined;
        let end = endDate ? Number(endDate) : undefined;

        if (!req.user) throw new Error('User not authenticated');
        const stats = await vpbankService.getDashboardStats(
            keyShare as string,
            start,
            end,
            req.user.id
        );
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const exportTransactions = async (req: Request, res: Response) => {
    try {
        const { accountNumber, search, startDate, endDate } = req.query;
        if (!req.user) throw new Error('User not authenticated');
        const csv = await vpbankService.exportTransactions(
            accountNumber as string,
            search as string,
            startDate as string,
            endDate as string,
            req.user.id
        );

        res.header('Content-Type', 'text/csv');
        res.attachment(`transactions-${Date.now()}.csv`);
        return res.send(csv);
    } catch (error) {
        return res.status(500).json({ error: 'Export failed' });
    }
};

export const getPreferences = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const prefs = await preferenceService.getAll(req.user.id);
        res.json(prefs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePreferences = async (req: Request, res: Response) => {
    try {
        if (!req.user) throw new Error('User not authenticated');
        const { key, value } = req.body;
        await preferenceService.set(req.user.id, key, value);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};





import { Readable } from 'stream';

export const streamAudio = async (req: Request, res: Response) => {
    try {
        const audioUrl = req.query.url as string;
        const token = (req.query.token as string | undefined) || undefined;

        if (!audioUrl) {
            return res.status(400).send('Missing url');
        }

        const proxied = await vpbankService.streamAudio(audioUrl, token);

        res.status(proxied.status);
        const contentType = proxied.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        if (proxied.body) {
            // Check if it's a Node stream (node-fetch) or Web stream (native fetch)
            // @ts-ignore
            if (typeof proxied.body.pipe === 'function') {
                 // @ts-ignore
                proxied.body.pipe(res);
            } else {
                 // Web Stream (Node 18+ native fetch)
                 // @ts-ignore
                const readable = Readable.fromWeb(proxied.body);
                readable.pipe(res);
            }
        } else {
            res.end();
        }
    } catch (error: any) {
        console.error('Audio Stream Error:', error);
        if (!res.headersSent) {
             res.status(500).end();
        }
    }
};

export const emitSocketEvent = (req: Request, res: Response) => {
    try {
        const { event, data } = req.body;
        console.log(`[InternalAPI] Received socket emit request: ${event} for User: ${data?.userId}`, JSON.stringify(data));

        if (!event || !data) {
            console.warn('[InternalAPI] Missing event or data');
            return res.status(400).json({ error: 'Missing event or data' });
        }

        socketService.emit(event, data);
        console.log(`[InternalAPI] Emitted socket event: ${event}`);
        res.json({ success: true });
    } catch (error: any) {
        console.error('[InternalAPI] Error emitting socket event:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!req.user) throw new Error('User not authenticated');

        await vpbankService.deleteWorkflow(id, req.user.id);

        res.json({ message: 'Workflow terminated and session deleted' });
    } catch (error: any) {
        console.error('[Delete Workflow] Error:', error);
        const isNotFound = error?.message?.includes('not found') || error?.message?.includes('access denied');
        res.status(isNotFound ? 404 : 500).json({ error: error.message });
    }
};
