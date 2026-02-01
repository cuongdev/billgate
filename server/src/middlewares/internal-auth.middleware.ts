import { Request, Response, NextFunction } from 'express';

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'insecure-default-secret';
    
    if (secret !== expectedSecret) {
        console.warn('[InternalAuth] Unauthorized attempt to access internal API');
        return res.status(403).json({ error: 'Unauthorized: Invalid internal secret' });
    }

    next();
};
