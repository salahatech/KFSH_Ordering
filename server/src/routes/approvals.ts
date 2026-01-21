import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { triggerWorkflow, processApproval, getPendingApprovals, getApprovalHistory } from '../services/workflow.js';
import { WorkflowEntityType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/pending', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const pendingApprovals = await getPendingApprovals(userId);
    res.json(pendingApprovals);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

router.get('/requests', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const entityType = req.query.entityType as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const requests = await prisma.approvalRequest.findMany({
      where,
      include: {
        workflow: { include: { steps: { include: { approverRole: true } } } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        actions: {
          include: {
            actionBy: { select: { id: true, firstName: true, lastName: true } },
            step: true,
          },
          orderBy: { actionAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
});

router.get('/history/:entityType/:entityId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;
    const history = await getApprovalHistory(entityType as WorkflowEntityType, entityId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
});

router.post('/trigger', authenticateToken, requireRole('Admin', 'Production Manager', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, triggerStatus, priority, notes } = req.body;
    const userId = req.user?.userId;

    if (!userId || !entityType || !entityId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await triggerWorkflow({
      entityType,
      entityId,
      triggerStatus,
      requestedById: userId,
      priority,
      notes,
    });

    if (!result) {
      res.status(404).json({ error: 'No workflow found for this entity type' });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Trigger workflow error:', error);
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

router.post('/:id/action', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, comments, signature } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Must be APPROVED or REJECTED' });
      return;
    }

    if (action === 'REJECTED' && !comments) {
      res.status(400).json({ error: 'Comments are required for rejection' });
      return;
    }

    const result = await processApproval(id, userId, action as 'APPROVED' | 'REJECTED', comments, signature);
    res.json(result);
  } catch (error: any) {
    console.error('Process approval action error:', error);
    res.status(400).json({ error: error.message || 'Failed to process approval action' });
  }
});

router.post('/:id/approve', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments, signature } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await processApproval(id, userId, 'APPROVED', comments, signature);
    res.json(result);
  } catch (error: any) {
    console.error('Approve error:', error);
    res.status(400).json({ error: error.message || 'Failed to approve' });
  }
});

router.post('/:id/reject', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!comments) {
      res.status(400).json({ error: 'Comments are required for rejection' });
      return;
    }

    const result = await processApproval(id, userId, 'REJECTED', comments);
    res.json(result);
  } catch (error: any) {
    console.error('Reject error:', error);
    res.status(400).json({ error: error.message || 'Failed to reject' });
  }
});

router.get('/workflows', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const workflows = await prisma.workflowDefinition.findMany({
      include: {
        steps: {
          include: { approverRole: true },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

router.post('/workflows', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, entityType, triggerStatus, description, requiresAllSteps, steps } = req.body;

    const workflow = await prisma.workflowDefinition.create({
      data: {
        name,
        entityType,
        triggerStatus,
        description,
        requiresAllSteps: requiresAllSteps ?? true,
        steps: {
          create: steps?.map((step: any, index: number) => ({
            stepOrder: index + 1,
            stepName: step.stepName,
            description: step.description,
            approverRoleId: step.approverRoleId,
            timeoutHours: step.timeoutHours,
            isRequired: step.isRequired ?? true,
            canDelegate: step.canDelegate ?? false,
          })) || [],
        },
      },
      include: {
        steps: { include: { approverRole: true } },
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.put('/workflows/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, isActive, requiresAllSteps } = req.body;

    const workflow = await prisma.workflowDefinition.update({
      where: { id },
      data: {
        name,
        description,
        isActive,
        requiresAllSteps,
      },
      include: {
        steps: { include: { approverRole: true } },
      },
    });

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

export default router;
