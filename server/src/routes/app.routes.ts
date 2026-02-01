import express from 'express';
import * as VpbankController from '../controllers/vpbank.controller';
import { loginWithFirebase } from '../controllers/auth.controller';
import { requireAuth, requireAuthOrAudioToken } from '../middlewares/auth.middleware';
import { apiLimiter, authLimiter } from '../middlewares/rate-limit.middleware';
import { validate, Schemas } from '../middlewares/validate.middleware';

const router = express.Router();

router.use(apiLimiter);

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

router.post('/auth/firebase', authLimiter, loginWithFirebase);

router.post('/bank/vpbank/validate-share', authLimiter, validate(Schemas.RegisterListener), VpbankController.validateShare);
router.get('/bank/vpbank/notifications', requireAuth, VpbankController.getNotifications);
router.get('/bank/vpbank/check-sound', requireAuth, VpbankController.checkSound);
router.post('/bank/vpbank/toggle-sound', requireAuth, VpbankController.toggleSound);
router.post('/bank/vpbank/start-listener', requireAuth, validate(Schemas.RegisterListener), VpbankController.startListener);
import { internalAuthMiddleware } from '../middlewares/internal-auth.middleware';

router.post('/internal/socket-emit', internalAuthMiddleware, VpbankController.emitSocketEvent);
router.get('/bank/vpbank/audio', requireAuthOrAudioToken, VpbankController.streamAudio);


router.delete('/vpbank/session', requireAuth, VpbankController.removeSession);
router.get('/vpbank/history', requireAuth, VpbankController.getHistory); 
router.get('/vpbank/transactions', requireAuth, VpbankController.getTransactions); 
router.get('/vpbank/sessions', requireAuth, VpbankController.getSessions); 
router.get('/vpbank/stats', requireAuth, VpbankController.getStats);
router.get('/vpbank/export-transactions', requireAuth, VpbankController.exportTransactions);

router.get('/vpbank/preferences', requireAuth, VpbankController.getPreferences);
router.post('/vpbank/preferences', requireAuth, VpbankController.updatePreferences);



export default router;
