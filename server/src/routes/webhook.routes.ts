import { Router } from 'express';
import * as WebhookController from '../controllers/webhook.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rate-limit.middleware';

const router = Router();
router.use(apiLimiter);

router.get('/vpbank/webhooks', requireAuth, WebhookController.getWebhooks);
router.post('/vpbank/webhooks', requireAuth, WebhookController.createWebhook);
router.put('/vpbank/webhooks/:id', requireAuth, WebhookController.updateWebhook);
router.delete('/vpbank/webhooks/:id', requireAuth, WebhookController.deleteWebhook);

router.get('/vpbank/webhook-logs', requireAuth, WebhookController.getWebhookLogs);
router.post('/vpbank/update-config', requireAuth, WebhookController.updateConfig);

export default router;
