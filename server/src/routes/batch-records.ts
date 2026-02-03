import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

type BatchRecordStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type BatchRecordStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED' | 'ON_HOLD';

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, batchId, page = '1', limit = '20', search } = req.query;
    
    const where: any = {};
    if (status) where.status = status as BatchRecordStatus;
    if (batchId) where.batchId = batchId as string;
    if (search) {
      where.OR = [
        { recordNumber: { contains: search as string, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [records, total] = await Promise.all([
      prisma.batchRecord.findMany({
        where,
        include: {
          batch: { select: { id: true, batchNumber: true, product: { select: { name: true } } } },
          recipe: { select: { id: true, code: true, name: true, version: true } },
          startedBy: { select: { id: true, firstName: true, lastName: true } },
          completedBy: { select: { id: true, firstName: true, lastName: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { steps: true, materialConsumptions: true, equipmentUsages: true, deviations: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.batchRecord.count({ where })
    ]);

    res.json({ records, total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / take) });
  } catch (error) {
    console.error('Error fetching batch records:', error);
    res.status(500).json({ error: 'Failed to fetch batch records' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await prisma.batchRecord.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { include: { product: true, order: { select: { id: true, orderNumber: true } } } },
        recipe: { include: { components: { include: { material: true } }, steps: true } },
        startedBy: { select: { id: true, firstName: true, lastName: true } },
        completedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewSignature: true,
        approvalSignature: true,
        steps: {
          include: {
            recipeStep: true,
            executedBy: { select: { id: true, firstName: true, lastName: true } },
            verifiedBy: { select: { id: true, firstName: true, lastName: true } },
            verificationSignature: true
          },
          orderBy: { sequence: 'asc' }
        },
        materialConsumptions: {
          include: {
            material: true,
            stockItem: true,
            consumedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        equipmentUsages: {
          include: {
            equipment: true,
            operatedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        deviations: {
          include: {
            reportedBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
            closedBy: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching batch record:', error);
    res.status(500).json({ error: 'Failed to fetch batch record' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { batchId, recipeId, notes } = req.body;
    const userId = (req as any).userId;

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const existingRecord = await prisma.batchRecord.findFirst({ where: { batchId } });
    if (existingRecord) {
      return res.status(400).json({ error: 'Batch already has an electronic batch record' });
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { steps: { orderBy: { sequence: 'asc' } } }
    });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const count = await prisma.batchRecord.count();
    const recordNumber = `EBR-${String(count + 1).padStart(6, '0')}`;

    const record = await prisma.batchRecord.create({
      data: {
        recordNumber,
        batchId,
        recipeId,
        recipeVersion: recipe.version,
        notes,
        status: 'DRAFT',
        steps: {
          create: recipe.steps.map((step: any, index: number) => ({
            sequence: step.sequence,
            stepNumber: step.stepNumber,
            stepName: step.name,
            description: step.description,
            category: step.category,
            instructions: step.instructions,
            expectedDuration: step.expectedDuration,
            isQualityCheckpoint: step.isQualityCheckpoint,
            requiresVerification: step.requiresVerification,
            acceptanceCriteria: step.acceptanceCriteria,
            status: 'PENDING',
            recipeStepId: step.id
          }))
        }
      },
      include: {
        batch: { include: { product: true } },
        recipe: true,
        steps: { orderBy: { sequence: 'asc' } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'BatchRecord',
        entityId: record.id,
        newValues: { recordNumber, batchId, recipeId }
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating batch record:', error);
    res.status(500).json({ error: 'Failed to create batch record' });
  }
});

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const record = await prisma.batchRecord.findUnique({ where: { id: req.params.id } });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (record.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Batch record must be in DRAFT status to start' });
    }

    const updated = await prisma.batchRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        startedById: userId
      },
      include: {
        batch: { include: { product: true } },
        steps: { orderBy: { sequence: 'asc' } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchRecord',
        entityId: record.id,
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'IN_PROGRESS', startedAt: updated.startedAt }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error starting batch record:', error);
    res.status(500).json({ error: 'Failed to start batch record' });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { notes, actualYield, yieldUnit } = req.body;

    const record = await prisma.batchRecord.findUnique({
      where: { id: req.params.id },
      include: { steps: true }
    });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (record.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Batch record must be in IN_PROGRESS status to complete' });
    }

    const pendingSteps = record.steps.filter((s: any) => s.status === 'PENDING' || s.status === 'IN_PROGRESS');
    if (pendingSteps.length > 0) {
      return res.status(400).json({ error: `${pendingSteps.length} steps are not completed` });
    }

    const updated = await prisma.batchRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'PENDING_REVIEW',
        completedAt: new Date(),
        completedById: userId,
        notes: notes || record.notes,
        actualYield,
        yieldUnit
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchRecord',
        entityId: record.id,
        oldValues: { status: 'IN_PROGRESS' },
        newValues: { status: 'PENDING_REVIEW', completedAt: updated.completedAt }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error completing batch record:', error);
    res.status(500).json({ error: 'Failed to complete batch record' });
  }
});

router.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { meaning, comment } = req.body;

    const record = await prisma.batchRecord.findUnique({ where: { id: req.params.id } });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (record.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Batch record must be in PENDING_REVIEW status' });
    }

    const signature = await prisma.eSignature.create({
      data: {
        scope: 'BATCH_RELEASE',
        entityType: 'BatchRecord',
        entityId: record.id,
        signedById: userId,
        meaning: meaning || 'Reviewed and verified batch record execution',
        comment
      }
    });

    const updated = await prisma.batchRecord.update({
      where: { id: req.params.id },
      data: {
        reviewedAt: new Date(),
        reviewedById: userId,
        reviewSignatureId: signature.id
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REVIEW',
        entityType: 'BatchRecord',
        entityId: record.id,
        newValues: { reviewedAt: updated.reviewedAt, signatureId: signature.id }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error reviewing batch record:', error);
    res.status(500).json({ error: 'Failed to review batch record' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { meaning, comment } = req.body;

    const record = await prisma.batchRecord.findUnique({ where: { id: req.params.id } });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (record.status !== 'PENDING_REVIEW') {
      return res.status(400).json({ error: 'Batch record must be in PENDING_REVIEW status' });
    }
    if (!record.reviewedAt) {
      return res.status(400).json({ error: 'Batch record must be reviewed before approval' });
    }

    const signature = await prisma.eSignature.create({
      data: {
        scope: 'BATCH_RELEASE',
        entityType: 'BatchRecord',
        entityId: record.id,
        signedById: userId,
        meaning: meaning || 'Approved batch record for release',
        comment
      }
    });

    const updated = await prisma.batchRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: userId,
        approvalSignatureId: signature.id
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVE',
        entityType: 'BatchRecord',
        entityId: record.id,
        oldValues: { status: 'PENDING_REVIEW' },
        newValues: { status: 'APPROVED', approvedAt: updated.approvedAt, signatureId: signature.id }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error approving batch record:', error);
    res.status(500).json({ error: 'Failed to approve batch record' });
  }
});

router.post('/:id/steps/:stepId/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id, stepId } = req.params;

    const step = await prisma.batchRecordStep.findFirst({
      where: { id: stepId, batchRecordId: id }
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }
    if (step.status !== 'PENDING') {
      return res.status(400).json({ error: 'Step must be in PENDING status to start' });
    }

    const updated = await prisma.batchRecordStep.update({
      where: { id: stepId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        executedById: userId
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchRecordStep',
        entityId: stepId,
        oldValues: { status: 'PENDING' },
        newValues: { status: 'IN_PROGRESS', startedAt: updated.startedAt }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error starting step:', error);
    res.status(500).json({ error: 'Failed to start step' });
  }
});

router.post('/:id/steps/:stepId/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id, stepId } = req.params;
    const { actualValue, actualDuration, notes, parameters } = req.body;

    const step = await prisma.batchRecordStep.findFirst({
      where: { id: stepId, batchRecordId: id }
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }
    if (step.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Step must be in IN_PROGRESS status to complete' });
    }

    const updated = await prisma.batchRecordStep.update({
      where: { id: stepId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualValue,
        actualDuration,
        notes,
        parameters
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'COMPLETE',
        entityType: 'BatchRecordStep',
        entityId: stepId,
        oldValues: { status: 'IN_PROGRESS' },
        newValues: { status: 'COMPLETED', completedAt: updated.completedAt }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(500).json({ error: 'Failed to complete step' });
  }
});

router.post('/:id/steps/:stepId/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id, stepId } = req.params;
    const { meaning, comment } = req.body;

    const step = await prisma.batchRecordStep.findFirst({
      where: { id: stepId, batchRecordId: id }
    });

    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }
    if (step.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Step must be completed before verification' });
    }
    if (!step.requiresVerification) {
      return res.status(400).json({ error: 'This step does not require verification' });
    }

    const signature = await prisma.eSignature.create({
      data: {
        scope: 'QC_APPROVAL',
        entityType: 'BatchRecordStep',
        entityId: stepId,
        signedById: userId,
        meaning: meaning || 'Verified step execution',
        comment
      }
    });

    const updated = await prisma.batchRecordStep.update({
      where: { id: stepId },
      data: {
        verifiedAt: new Date(),
        verifiedById: userId,
        verificationSignatureId: signature.id
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'VERIFY',
        entityType: 'BatchRecordStep',
        entityId: stepId,
        newValues: { verifiedAt: updated.verifiedAt, signatureId: signature.id }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error verifying step:', error);
    res.status(500).json({ error: 'Failed to verify step' });
  }
});

router.get('/:id/kpis', async (req: Request, res: Response) => {
  try {
    const record = await prisma.batchRecord.findUnique({
      where: { id: req.params.id },
      include: {
        steps: true,
        materialConsumptions: true,
        equipmentUsages: true,
        deviations: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Batch record not found' });
    }

    const totalSteps = record.steps.length;
    const completedSteps = record.steps.filter((s: any) => s.status === 'COMPLETED' || s.status === 'SKIPPED').length;
    const failedSteps = record.steps.filter((s: any) => s.status === 'FAILED').length;
    const onHoldSteps = record.steps.filter((s: any) => s.status === 'ON_HOLD').length;

    const totalDuration = record.steps.reduce((sum: number, s: any) => sum + (s.actualDuration || 0), 0);
    const expectedDuration = record.steps.reduce((sum: number, s: any) => sum + (s.expectedDuration || 0), 0);

    const criticalDeviations = record.deviations.filter((d: any) => d.severity === 'CRITICAL').length;
    const majorDeviations = record.deviations.filter((d: any) => d.severity === 'MAJOR').length;
    const minorDeviations = record.deviations.filter((d: any) => d.severity === 'MINOR').length;
    const openDeviations = record.deviations.filter((d: any) => d.status !== 'CLOSED').length;

    const kpis = {
      progress: {
        total: totalSteps,
        completed: completedSteps,
        failed: failedSteps,
        onHold: onHoldSteps,
        percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
      },
      timing: {
        actualMinutes: totalDuration,
        expectedMinutes: expectedDuration,
        variance: expectedDuration > 0 ? Math.round(((totalDuration - expectedDuration) / expectedDuration) * 100) : 0
      },
      deviations: {
        total: record.deviations.length,
        critical: criticalDeviations,
        major: majorDeviations,
        minor: minorDeviations,
        open: openDeviations
      },
      materials: {
        itemsConsumed: record.materialConsumptions.length
      },
      equipment: {
        itemsUsed: record.equipmentUsages.length
      }
    };

    res.json(kpis);
  } catch (error) {
    console.error('Error fetching batch record KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch batch record KPIs' });
  }
});

export default router;
