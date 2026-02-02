import { Router, Request, Response } from 'express';
import { PrismaClient, BatchStatus, OrderStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { canTransitionBatch, getNextBatchStatuses } from '../utils/statusMachine.js';
import { triggerWorkflow } from '../services/workflow.js';

const router = Router();
const prisma = new PrismaClient();

function generateBatchNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `B${year}${month}${day}-${random}`;
}

/**
 * @swagger
 * /batches:
 *   get:
 *     summary: Get all batches
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, productId, fromDate, toDate } = req.query;
    
    const where: any = {};
    if (status) where.status = status as BatchStatus;
    if (productId) where.productId = productId as string;
    if (fromDate || toDate) {
      where.plannedStartTime = {};
      if (fromDate) where.plannedStartTime.gte = new Date(fromDate as string);
      if (toDate) where.plannedStartTime.lte = new Date(toDate as string);
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        product: true,
        orders: { include: { customer: true } },
        operators: { include: { user: true } },
        synthesisModule: true,
        hotCell: true,
        qcResults: true,
        batchReleases: true,
        doseUnits: true,
      },
      orderBy: { plannedStartTime: 'asc' },
    });

    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

/**
 * @swagger
 * /batches/release/stats:
 *   get:
 *     summary: Get release statistics
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Release statistics
 */
router.get('/release/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingRelease, releasedToday, rejectedToday, qpReview] = await Promise.all([
      prisma.batch.count({ where: { status: 'QC_PASSED' } }),
      prisma.batch.count({ 
        where: { 
          status: 'RELEASED',
          updatedAt: { gte: today },
        } 
      }),
      prisma.batch.count({ 
        where: { 
          status: 'REJECTED',
          updatedAt: { gte: today },
        } 
      }),
      prisma.batch.count({ where: { status: 'QP_REVIEW' } }),
    ]);

    res.json({ pendingRelease, releasedToday, rejectedToday, qpReview });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release stats' });
  }
});

/**
 * @swagger
 * /batches/release/history:
 *   get:
 *     summary: Get release history
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Release history
 */
router.get('/release/history', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = '14' } = req.query;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days as string));

    const batches = await prisma.batch.findMany({
      where: {
        status: { in: ['RELEASED', 'REJECTED'] },
        updatedAt: { gte: fromDate },
      },
      include: {
        product: true,
        orders: { include: { customer: true } },
        batchReleases: { include: { releasedBy: true } },
        qcResults: { include: { template: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release history' });
  }
});

/**
 * @swagger
 * /batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch details with genealogy
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        product: { include: { qcTemplates: true } },
        orders: { include: { customer: true } },
        operators: { include: { user: true } },
        materialLots: { include: { materialLot: true } },
        synthesisModule: true,
        hotCell: true,
        qcResults: { include: { template: true, testedBy: true } },
        batchReleases: { include: { releasedBy: true } },
        doseUnits: true,
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

/**
 * @swagger
 * /batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batches]
 *     responses:
 *       201:
 *         description: Batch created
 */
router.post('/', authenticateToken, requireRole('Admin', 'Production Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productId, plannedStartTime, plannedEndTime, targetActivity,
      activityUnit, calibrationTime, synthesisModuleId, hotCellId,
      orderIds, operatorIds, notes
    } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(400).json({ error: 'Product not found' });
      return;
    }

    const batch = await prisma.batch.create({
      data: {
        batchNumber: generateBatchNumber(),
        productId,
        plannedStartTime: new Date(plannedStartTime),
        plannedEndTime: new Date(plannedEndTime),
        targetActivity,
        activityUnit: activityUnit || 'mCi',
        calibrationTime: calibrationTime ? new Date(calibrationTime) : null,
        synthesisModuleId,
        hotCellId,
        notes,
        orders: orderIds ? { connect: orderIds.map((id: string) => ({ id })) } : undefined,
        operators: operatorIds ? {
          create: operatorIds.map((userId: string) => ({ userId })),
        } : undefined,
      },
      include: {
        product: true,
        orders: true,
        operators: { include: { user: true } },
      },
    });

    if (orderIds && orderIds.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: orderIds } },
        data: { status: 'SCHEDULED', batchId: batch.id },
      });
    }

    await createAuditLog(req.user?.userId, 'CREATE', 'Batch', batch.id, null, batch, req);

    res.status(201).json(batch);
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

/**
 * @swagger
 * /batches/{id}/status:
 *   patch:
 *     summary: Update batch status
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch status updated
 */
router.patch('/:id/status', authenticateToken, requireRole('Admin', 'Production Manager', 'Operator'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, actualStartTime, actualEndTime, actualActivity, notes } = req.body;
    
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: { orders: true },
    });
    
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (!canTransitionBatch(batch.status, status as BatchStatus)) {
      res.status(400).json({ 
        error: `Invalid status transition from ${batch.status} to ${status}`,
        allowedStatuses: getNextBatchStatuses(batch.status),
      });
      return;
    }

    const updateData: any = { status: status as BatchStatus };
    if (actualStartTime) updateData.actualStartTime = new Date(actualStartTime);
    if (actualEndTime) updateData.actualEndTime = new Date(actualEndTime);
    if (actualActivity !== undefined) updateData.actualActivity = actualActivity;
    if (notes) updateData.notes = notes;

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.id },
      data: updateData,
      include: { product: true, orders: true },
    });

    let orderStatus: OrderStatus | null = null;
    switch (status as BatchStatus) {
      case 'IN_PRODUCTION':
        orderStatus = 'IN_PRODUCTION';
        break;
      case 'QC_PENDING':
        orderStatus = 'QC_PENDING';
        break;
      case 'FAILED_QC':
        orderStatus = 'FAILED_QC';
        break;
      case 'RELEASED':
        orderStatus = 'RELEASED';
        break;
      case 'DISPATCHED':
        orderStatus = 'DISPATCHED';
        break;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: { role: true },
    });

    await prisma.batchEvent.create({
      data: {
        batchId: batch.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: batch.status,
        toStatus: status as BatchStatus,
        actorId: req.user?.userId,
        actorRole: user?.role?.name,
        note: notes,
      },
    });

    if (orderStatus) {
      await prisma.order.updateMany({
        where: { batchId: batch.id },
        data: { status: orderStatus },
      });
    }

    await createAuditLog(req.user?.userId, 'STATUS_CHANGE', 'Batch', batch.id,
      { status: batch.status }, { status }, req);

    if (status === 'QC_PASSED' && req.user?.userId) {
      try {
        await triggerWorkflow({
          entityType: 'BATCH',
          entityId: batch.id,
          triggerStatus: 'QC_PASSED',
          requestedById: req.user.userId,
          priority: 'HIGH',
          notes,
        });
      } catch (workflowError) {
        console.error('Failed to trigger batch release workflow:', workflowError);
      }
    }

    res.json(updatedBatch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update batch status' });
  }
});

/**
 * @swagger
 * /batches/{id}/materials:
 *   post:
 *     summary: Add material lots to batch
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Materials added
 */
router.post('/:id/materials', authenticateToken, requireRole('Admin', 'Production Manager', 'Operator'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { materials } = req.body;

    await prisma.batchMaterialLot.createMany({
      data: materials.map((m: any) => ({
        batchId: req.params.id,
        materialLotId: m.materialLotId,
        quantityUsed: m.quantityUsed,
      })),
      skipDuplicates: true,
    });

    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: { materialLots: { include: { materialLot: true } } },
    });

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add materials to batch' });
  }
});

/**
 * @swagger
 * /batches/{id}/release:
 *   post:
 *     summary: Release batch (QP approval)
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch released
 */
router.post('/:id/release', authenticateToken, requireRole('Qualified Person', 'Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { electronicSignature, reason, releaseType, coaFilePath } = req.body;
    
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: { qcResults: true },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.status !== 'QC_PASSED') {
      res.status(400).json({ error: 'Batch must pass QC before release' });
      return;
    }

    await prisma.batchRelease.create({
      data: {
        batchId: batch.id,
        releasedById: req.user!.userId,
        releaseType: releaseType || 'FULL',
        electronicSignature,
        signatureTimestamp: new Date(),
        reason,
        coaFilePath,
      },
    });

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.id },
      data: { status: 'RELEASED' },
      include: {
        product: true,
        orders: true,
        batchReleases: { include: { releasedBy: true } },
      },
    });

    await prisma.order.updateMany({
      where: { batchId: batch.id },
      data: { status: 'RELEASED' },
    });

    await createAuditLog(req.user?.userId, 'RELEASE', 'Batch', batch.id, null,
      { electronicSignature, reason, releaseType }, req);

    res.json(updatedBatch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to release batch' });
  }
});

/**
 * @swagger
 * /batches/{id}/events:
 *   get:
 *     summary: Get batch timeline events
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch events
 */
router.get('/:id/events', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.batchEvent.findMany({
      where: { batchId: req.params.id },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batch events' });
  }
});

/**
 * @swagger
 * /batches/{id}/transition:
 *   post:
 *     summary: Transition batch to new status with metadata
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch transitioned
 */
const roleAllowedTransitions: Record<string, string[]> = {
  Admin: ['*'],
  'Production Manager': ['IN_PRODUCTION', 'PRODUCTION_COMPLETE', 'ON_HOLD', 'DEVIATION_OPEN'],
  'QC Analyst': ['QC_PENDING', 'QC_IN_PROGRESS', 'QC_PASSED', 'FAILED_QC', 'QP_REVIEW'],
  'Qualified Person': ['RELEASED', 'REJECTED', 'ON_HOLD'],
  Logistics: ['DISPATCHED', 'CLOSED'],
  Dispensing: ['DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED'],
};

function canRoleTransitionTo(roleName: string, targetStatus: string): boolean {
  const allowed = roleAllowedTransitions[roleName];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(targetStatus);
}

router.post('/:id/transition', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, note, metadata } = req.body;
    
    const batch = await prisma.batch.findUnique({ 
      where: { id: req.params.id },
      include: { orders: true },
    });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (!canTransitionBatch(batch.status, status as BatchStatus)) {
      res.status(400).json({ 
        error: `Invalid status transition from ${batch.status} to ${status}`,
        userMessage: `Cannot move batch from ${batch.status.replace('_', ' ')} to ${status.replace('_', ' ')}. This transition is not allowed.`,
        allowedStatuses: getNextBatchStatuses(batch.status),
      });
      return;
    }

    if (['DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED', 'DISPATCHED'].includes(status)) {
      if (!['RELEASED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED'].includes(batch.status)) {
        res.status(400).json({ 
          error: 'Cannot dispense before batch is released',
          userMessage: 'This batch must be released by QP before dispensing can begin.',
        });
        return;
      }
    }

    if (['ON_HOLD', 'REJECTED', 'FAILED_QC', 'CANCELLED', 'DEVIATION_OPEN'].includes(batch.status)) {
      if (['DISPATCHED', 'DISPENSING_IN_PROGRESS', 'DISPENSED', 'PACKED'].includes(status)) {
        res.status(400).json({ 
          error: 'Batch is blocked from dispatch',
          userMessage: `This batch is ${batch.status.replace('_', ' ')} and cannot proceed to dispatch.`,
        });
        return;
      }
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: { role: true },
    });

    const userRole = currentUser?.role?.name || '';
    if (!canRoleTransitionTo(userRole, status)) {
      res.status(403).json({
        error: 'Permission denied',
        userMessage: `Your role (${userRole}) does not have permission to move batches to ${status.replace(/_/g, ' ')}.`,
      });
      return;
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.id },
      data: { status: status as BatchStatus },
      include: { product: true, orders: { include: { customer: true } } },
    });

    await prisma.batchEvent.create({
      data: {
        batchId: batch.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: batch.status,
        toStatus: status as BatchStatus,
        actorId: req.user?.userId,
        actorRole: userRole,
        note,
        metadata: metadata || null,
      },
    });

    let orderStatus: OrderStatus | null = null;
    switch (status as BatchStatus) {
      case 'IN_PRODUCTION':
        orderStatus = 'IN_PRODUCTION';
        break;
      case 'QC_PENDING':
        orderStatus = 'QC_PENDING';
        break;
      case 'FAILED_QC':
        orderStatus = 'FAILED_QC';
        break;
      case 'RELEASED':
        orderStatus = 'RELEASED';
        break;
      case 'DISPATCHED':
        orderStatus = 'DISPATCHED';
        break;
    }

    if (orderStatus) {
      await prisma.order.updateMany({
        where: { batchId: batch.id },
        data: { status: orderStatus },
      });
    }

    await createAuditLog(req.user?.userId, 'STATUS_CHANGE', 'Batch', batch.id, 
      { status: batch.status }, { status, note }, req);

    res.json(updatedBatch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to transition batch status' });
  }
});

/**
 * @swagger
 * /batches/metrics:
 *   get:
 *     summary: Get batch metrics for KPI cards
 *     tags: [Batches]
 *     responses:
 *       200:
 *         description: Batch metrics
 */
router.get('/metrics/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      batchesToday,
      awaitingQC,
      awaitingRelease,
      onHold,
      exceptions,
    ] = await Promise.all([
      prisma.batch.count({
        where: { plannedStartTime: { gte: today, lt: tomorrow } },
      }),
      prisma.batch.count({
        where: { status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] } },
      }),
      prisma.batch.count({
        where: { status: { in: ['QC_PASSED', 'QP_REVIEW'] } },
      }),
      prisma.batch.count({
        where: { status: 'ON_HOLD' },
      }),
      prisma.batch.count({
        where: { status: { in: ['ON_HOLD', 'REJECTED', 'FAILED_QC', 'DEVIATION_OPEN'] } },
      }),
    ]);

    res.json({
      batchesToday,
      awaitingQC,
      awaitingRelease,
      onHold,
      exceptions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batch metrics' });
  }
});

export default router;
