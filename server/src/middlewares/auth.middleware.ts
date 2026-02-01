import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

/**
 * Cho phép GET /bank/vpbank/audio khi có query url + token (TTS JWT).
 * Request từ <audio src="..."> hoặc new Audio() không gửi Authorization header.
 */
export const requireAuthOrAudioToken = async (req: Request, res: Response, next: NextFunction) => {
    const hasAudioToken = req.method === 'GET' && req.query?.url && req.query?.token;
    if (hasAudioToken) {
        return next();
    }
    return requireAuth(req, res, next);
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[AuthMiddleware] Missing/Invalid Header on ${req.method} ${req.path}:`, authHeader);
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = AuthService.verifyAccessToken(token);

        const user = await User.findByPk(payload.sub);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.tokenVersion !== payload.tv) {
            return res.status(401).json({ error: 'Token revoked or expired' });
        }

        req.user = {
            id: user.id,
            email: user.email
        };

        next();
    } catch (error: any) {
        console.error(`[AuthMiddleware] Verification Failed on ${req.path}:`, error.name, error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
