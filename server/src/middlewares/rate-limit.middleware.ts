import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 500, // Limit each IP to 500 requests per windowMs
	standardHeaders: true, 
	legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Stricter limit for auth/registration
    message: { error: 'Too many login attempts, please try again later.' }
});
