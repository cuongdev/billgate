import { Request, Response } from 'express';
import { getTemporalClient } from '../temporal/client';
import { vpbankService } from '../services/vpbank.service';
import { SessionRepository } from '../repositories/session.repository';
import { startWorkflowForSession } from '../services/workflow.service';

const sessionRepo = new SessionRepository();

export const listWorkflows = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const sessions = await vpbankService.getSessions(req.user.id);
    const { status } = req.query;

    let filtered = sessions;
    if (status) {
      filtered = sessions.filter(s => s.status === status as string);
    }

    const results = filtered.map(s => ({
      workflowId: `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}`,
      runId: s.runId,
      status: s.status,
      startTime: new Date(Number(s.createdAt) || Date.now()).toISOString(),
      executionTime: undefined,
      accountNumber: s.accountNumber,
      name: s.name,
      keyShare: s.keyShare,
      lastListenerActivity: s.lastListenerActivity
    }));

    return res.json({ workflows: results });
  } catch (error) {
    console.error('[WorkflowAPI] List error:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getWorkflowDetails = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);

    if (session) {
      return res.json({
        id: session.id,
        workflowId,
        runId: session.runId,
        status: session.status,
        executionStatus: undefined,
        startTime: new Date(Number(session.createdAt)).toISOString(),
        accountNumber: session.accountNumber,
        name: session.name,
        keyShare: session.keyShare,
        lastListenerActivity: session.lastListenerActivity
      });
    }

    return res.status(404).json({ error: 'Workflow/Session not found' });
  } catch (error) {
    console.error(`[WorkflowAPI] Get details error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const pauseWorkflow = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;
    console.log(`[WorkflowAPI] Request to pause workflow ${workflowId}`);

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);

    if (!session) {
      return res.status(404).json({ error: 'Workflow/Account not found' });
    }

    try {
      await sessionRepo.update(session.keyShare, {
        status: 'paused', // Paused/Stopped
        runId: null
      }, { userId: req.user.id });
      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.signal('delete');
      console.log(`[WorkflowAPI] Sent delete signal to ${workflowId} for suspension`);
    } catch (e: any) {
      console.warn(`[WorkflowAPI] Workflow not running or signal failed: ${e.message}`);
    }

    return res.json({
      success: true,
      message: 'Workflow paused',
      status: 'paused'
    });
  } catch (error) {
    console.error(`[WorkflowAPI] Pause error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const resumeWorkflow = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;
    console.log(`[WorkflowAPI] Request to resume workflow ${workflowId}`);

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);

    if (!session) {
      return res.status(404).json({ error: 'Account not found' });
    }
    try {

      const sessionForWorkflow = {
        keyShare: session.keyShare,
        pinShare: session.pinShare,
        jwt: session.jwt || '',
        accountNumber: session.accountNumber || '',
        name: session.name || '',
        fcmToken: '',
      };

      const runId = await startWorkflowForSession(sessionForWorkflow);

      await sessionRepo.update(session.keyShare, {
        status: 'active',
        runId: runId
      }, { userId: req.user.id });

      return res.json({
        success: true,
        message: 'Workflow resumed (restarted)',
        status: 'active'
      });
    } catch (e: any) {
      throw e;
    }
  } catch (error) {
    console.error(`[WorkflowAPI] Resume error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const stopWorkflow = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);
    if (!session) {
      return res.status(404).json({ error: 'Workflow/Session not found or access denied' });
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('stop');

    return res.json({ success: true, message: 'Workflow stop signal sent' });
  } catch (error) {
    console.error(`[WorkflowAPI] Stop error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const getWorkflowHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;
    const { limit = '50' } = req.query;

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);
    if (!session) {
      return res.status(404).json({ error: 'Workflow/Session not found or access denied' });
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();

    return res.json({
      workflowId,
      historyLength: description.historyLength,
      historyEvents: description.historyLength
    });
  } catch (error) {
    console.error(`[WorkflowAPI] History error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

export const updateCredentials = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw new Error('User not authenticated');
    const { workflowId } = req.params;
    const { keyShare, pinShare } = req.body;

    if (!keyShare || !pinShare) {
      return res.status(400).json({ error: 'Missing keyShare or pinShare' });
    }

    const sessions = await vpbankService.getSessions(req.user.id);
    const session = sessions.find(s => `vpbank-account-${s.keyShare.replace(/[^a-z0-9]/gi, '-')}` === workflowId);
    if (!session) {
      return res.status(404).json({ error: 'Workflow/Session not found or access denied' });
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('updateCredsSignal', {
      keyShare,
      pinShare
    });

    return res.json({ success: true, message: 'Updated credentials signal sent' });
  } catch (error) {
    console.error(`[WorkflowAPI] Update Creds error for ${req.params.workflowId}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};
