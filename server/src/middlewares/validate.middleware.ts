import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.method === 'POST' || req.method === 'PUT') {
            req.body = schema.parse(req.body);
        } else {
            if (Object.keys(req.query).length > 0) {
            }
        }
        next();
    } catch (err: any) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors || err.message
        });
    }
};

export const Schemas = {
    RegisterListener: z.object({
        keyShare: z.string().min(5),
        pinShare: z.string().min(1),
        webhookConfigs: z.array(z.any()).optional(),
        jwt: z.string().optional(),
        accountNumber: z.string().optional(),
        name: z.string().optional(),
        tokenFb: z.string().optional()
    }),

    WebhookConfig: z.object({
        url: z.string().url().refine((url) => {
            const u = new URL(url);
            return !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(u.hostname) && !u.hostname.startsWith('192.168.') && !u.hostname.startsWith('10.');
        }, { message: 'Internal network Webhooks are not allowed (SSRF Protection)' }),
        enabled: z.boolean().optional(),
    })
};
