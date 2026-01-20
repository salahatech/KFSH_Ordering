import { Router, Request, Response } from 'express';
import { PrismaClient, QCResultStatus, BatchStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /qc/batches:
 *   get:
 *     summary: Get batches pending QC
 *     tags: [QC]
 *     responses:
 *       200:
 *         description: List of batches pending QC
 */
router.get('/batches', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] },
      },
      include: {
        product: { include: { qcTemplates: true } },
        orders: { include: { customer: true } },
        qcResults: { include: { template: true } },
      },
      orderBy: { plannedStartTime: 'asc' },
    });

    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QC batches' });
  }
});

/**
 * @swagger
 * /qc/batches/{batchId}:
 *   get:
 *     summary: Get QC details for a batch
 *     tags: [QC]
 *     responses:
 *       200:
 *         description: QC details
 */
router.get('/batches/:batchId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.batchId },
      include: {
        product: { include: { qcTemplates: { orderBy: { sortOrder: 'asc' } } } },
        qcResults: { 
          include: { template: true, testedBy: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QC details' });
  }
});

/**
 * @swagger
 * /qc/batches/{batchId}/initialize:
 *   post:
 *     summary: Initialize QC results from templates
 *     tags: [QC]
 *     responses:
 *       200:
 *         description: QC results initialized
 */
router.post('/batches/:batchId/initialize', authenticateToken, requireRole('Admin', 'Production Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.batchId },
      include: { 
        product: { include: { qcTemplates: true } },
        qcResults: true,
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.qcResults.length > 0) {
      res.status(400).json({ error: 'QC results already initialized' });
      return;
    }

    const templates = batch.product.qcTemplates;
    
    await prisma.qCResult.createMany({
      data: templates.map((template) => ({
        batchId: batch.id,
        templateId: template.id,
        status: 'PENDING' as QCResultStatus,
      })),
    });

    await prisma.batch.update({
      where: { id: batch.id },
      data: { status: 'QC_IN_PROGRESS' },
    });

    const updatedBatch = await prisma.batch.findUnique({
      where: { id: req.params.batchId },
      include: {
        product: { include: { qcTemplates: true } },
        qcResults: { include: { template: true } },
      },
    });

    res.json(updatedBatch);
  } catch (error) {
    console.error('Initialize QC error:', error);
    res.status(500).json({ error: 'Failed to initialize QC results' });
  }
});

/**
 * @swagger
 * /qc/results/{resultId}:
 *   put:
 *     summary: Update QC result
 *     tags: [QC]
 *     responses:
 *       200:
 *         description: QC result updated
 */
router.put('/results/:resultId', authenticateToken, requireRole('Admin', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { numericResult, textResult, passed, notes } = req.body;

    const result = await prisma.qCResult.findUnique({
      where: { id: req.params.resultId },
      include: { template: true },
    });

    if (!result) {
      res.status(404).json({ error: 'QC result not found' });
      return;
    }

    let calculatedPassed = passed;
    if (numericResult !== undefined && result.template.minValue !== null && result.template.maxValue !== null) {
      calculatedPassed = numericResult >= result.template.minValue && numericResult <= result.template.maxValue;
    }

    const updatedResult = await prisma.qCResult.update({
      where: { id: req.params.resultId },
      data: {
        numericResult,
        textResult,
        passed: calculatedPassed,
        status: 'IN_PROGRESS',
        testedById: req.user?.userId,
        testedAt: new Date(),
        notes,
      },
      include: { template: true, testedBy: true },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'QCResult', result.id, result, updatedResult, req);

    res.json(updatedResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update QC result' });
  }
});

/**
 * @swagger
 * /qc/batches/{batchId}/complete:
 *   post:
 *     summary: Complete QC for a batch
 *     tags: [QC]
 *     responses:
 *       200:
 *         description: QC completed
 */
router.post('/batches/:batchId/complete', authenticateToken, requireRole('Admin', 'QC Analyst', 'Qualified Person'), async (req: Request, res: Response): Promise<void> => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.batchId },
      include: {
        product: { include: { qcTemplates: true } },
        qcResults: { include: { template: true } },
      },
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const requiredResults = batch.qcResults.filter(r => r.template.isRequired);
    const incompleteResults = requiredResults.filter(r => r.passed === null);

    if (incompleteResults.length > 0) {
      res.status(400).json({ 
        error: 'Not all required QC tests are completed',
        incompleteTests: incompleteResults.map(r => r.template.testName),
      });
      return;
    }

    const allPassed = requiredResults.every(r => r.passed === true);
    const newStatus: BatchStatus = allPassed ? 'QC_PASSED' : 'QC_FAILED';

    await prisma.qCResult.updateMany({
      where: { batchId: batch.id },
      data: { status: allPassed ? 'PASSED' : 'FAILED' },
    });

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.batchId },
      data: { status: newStatus },
      include: {
        product: true,
        qcResults: { include: { template: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'QC_COMPLETE', 'Batch', batch.id, null,
      { passed: allPassed, status: newStatus }, req);

    res.json({
      batch: updatedBatch,
      passed: allPassed,
      summary: {
        total: batch.qcResults.length,
        passed: batch.qcResults.filter(r => r.passed === true).length,
        failed: batch.qcResults.filter(r => r.passed === false).length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete QC' });
  }
});

export default router;
