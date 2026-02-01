// Temporal Workflow Management
import * as WorkflowController from '../controllers/workflow.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rate-limit.middleware';
import * as VpbankController from '../controllers/vpbank.controller';
import express from 'express';

const router = express.Router();

router.use(apiLimiter);

router.get('/workflows', requireAuth, WorkflowController.listWorkflows);
router.get('/workflows/:workflowId', requireAuth, WorkflowController.getWorkflowDetails);
router.post('/workflows/:workflowId/pause', requireAuth, WorkflowController.pauseWorkflow);
router.post('/workflows/:workflowId/resume', requireAuth, WorkflowController.resumeWorkflow);
router.post('/workflows/:workflowId/stop', requireAuth, WorkflowController.stopWorkflow);
router.post('/workflows/:workflowId/credentials', requireAuth, WorkflowController.updateCredentials);
router.get('/workflows/:workflowId/history', requireAuth, WorkflowController.getWorkflowHistory);
router.delete('/workflows/:id', requireAuth, VpbankController.deleteWorkflow);

export default router;