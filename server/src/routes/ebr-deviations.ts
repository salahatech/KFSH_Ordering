import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, severity, batchRecordId, page = '1', limit = '20' } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (batchRecordId) where.batchRecordId = batchRecordId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [deviations, total] = await Promise.all([
      (prisma as any).batchDeviation.findMany({
        where,
        include: {
          batchRecord: { include: { batch: { select: { batchNumber: true } } } },
          batchRecordStep: { select: { stepNumber: true, stepName: true } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          closedBy: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { reportedAt: 'desc' },
        skip,
        take
      }),
      (prisma as any).batchDeviation.count({ where })
    ]);

    res.json({ deviations, total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / take) });
  } catch (error) {
    console.error('Error fetching deviations:', error);
    res.status(500).json({ error: 'Failed to fetch deviations' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deviation = await (prisma as any).batchDeviation.findUnique({
      where: { id: req.params.id },
      include: {
        batchRecord: { include: { batch: { include: { product: true } }, recipe: true } },
        batchRecordStep: true,
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        closedBy: { select: { id: true, firstName: true, lastName: true } },
        approvalSignature: true
      }
    });

    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }

    res.json(deviation);
  } catch (error) {
    console.error('Error fetching deviation:', error);
    res.status(500).json({ error: 'Failed to fetch deviation' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      batchRecordId,
      batchRecordStepId,
      type,
      severity,
      title,
      description,
      immediateCause,
      assignedToId,
      dueDate
    } = req.body;

    const batchRecord = await (prisma as any).batchRecord.findUnique({ where: { id: batchRecordId } });
    if (!batchRecord) {
      return res.status(404).json({ error: 'Batch record not found' });
    }

    const count = await (prisma as any).batchDeviation.count();
    const deviationNumber = `DEV-${String(count + 1).padStart(6, '0')}`;

    const deviation = await (prisma as any).batchDeviation.create({
      data: {
        deviationNumber,
        batchRecordId,
        batchRecordStepId,
        type,
        severity,
        title,
        description,
        immediateCause,
        status: 'OPEN',
        reportedById: userId,
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        batchRecord: { include: { batch: { select: { batchNumber: true } } } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'BatchDeviation',
        entityId: deviation.id,
        newValues: { deviationNumber, type, severity, title }
      }
    });

    res.status(201).json(deviation);
  } catch (error) {
    console.error('Error creating deviation:', error);
    res.status(500).json({ error: 'Failed to create deviation' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updates = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }

    if (deviation.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot modify a closed deviation' });
    }

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: updates
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: deviation,
        newValues: updates
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating deviation:', error);
    res.status(500).json({ error: 'Failed to update deviation' });
  }
});

router.post('/:id/investigate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rootCauseAnalysis } = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }
    if (deviation.status !== 'OPEN') {
      return res.status(400).json({ error: 'Deviation must be OPEN to start investigation' });
    }

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: {
        status: 'UNDER_INVESTIGATION',
        rootCauseAnalysis,
        investigationStartedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: { status: 'OPEN' },
        newValues: { status: 'UNDER_INVESTIGATION', rootCauseAnalysis }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error starting investigation:', error);
    res.status(500).json({ error: 'Failed to start investigation' });
  }
});

router.post('/:id/propose-capa', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { rootCauseAnalysis, correctiveAction, preventiveAction } = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }
    if (deviation.status !== 'UNDER_INVESTIGATION') {
      return res.status(400).json({ error: 'Deviation must be UNDER_INVESTIGATION to propose CAPA' });
    }

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: {
        status: 'CAPA_PROPOSED',
        rootCauseAnalysis,
        correctiveAction,
        preventiveAction
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: { status: 'UNDER_INVESTIGATION' },
        newValues: { status: 'CAPA_PROPOSED', correctiveAction, preventiveAction }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error proposing CAPA:', error);
    res.status(500).json({ error: 'Failed to propose CAPA' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { meaning, comment } = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }
    if (deviation.status !== 'CAPA_PROPOSED') {
      return res.status(400).json({ error: 'Deviation must have CAPA_PROPOSED to approve' });
    }

    const signature = await prisma.eSignature.create({
      data: {
        scope: 'DEVIATION_APPROVAL',
        entityType: 'BatchDeviation',
        entityId: id,
        signedById: userId,
        meaning: meaning || 'Approved deviation CAPA',
        comment
      }
    });

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: {
        status: 'CAPA_APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        approvalSignatureId: signature.id
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: { status: 'CAPA_PROPOSED' },
        newValues: { status: 'CAPA_APPROVED', signatureId: signature.id }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error approving deviation:', error);
    res.status(500).json({ error: 'Failed to approve deviation' });
  }
});

router.post('/:id/implement', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { implementationNotes } = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }
    if (deviation.status !== 'CAPA_APPROVED') {
      return res.status(400).json({ error: 'Deviation CAPA must be approved to implement' });
    }

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: {
        status: 'IMPLEMENTING',
        implementationNotes
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: { status: 'CAPA_APPROVED' },
        newValues: { status: 'IMPLEMENTING' }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error implementing CAPA:', error);
    res.status(500).json({ error: 'Failed to implement CAPA' });
  }
});

router.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { closureNotes, effectivenessVerification } = req.body;

    const deviation = await (prisma as any).batchDeviation.findUnique({ where: { id } });
    if (!deviation) {
      return res.status(404).json({ error: 'Deviation not found' });
    }
    if (deviation.status !== 'IMPLEMENTING') {
      return res.status(400).json({ error: 'Deviation must be IMPLEMENTING to close' });
    }

    const updated = await (prisma as any).batchDeviation.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedById: userId,
        closedAt: new Date(),
        closureNotes,
        effectivenessVerification
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLOSE',
        entityType: 'BatchDeviation',
        entityId: id,
        oldValues: { status: 'IMPLEMENTING' },
        newValues: { status: 'CLOSED', closedAt: updated.closedAt }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error closing deviation:', error);
    res.status(500).json({ error: 'Failed to close deviation' });
  }
});

router.get('/dashboard/summary', async (req: Request, res: Response) => {
  try {
    const [statusCounts, severityCounts, typeCounts] = await Promise.all([
      (prisma as any).batchDeviation.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      (prisma as any).batchDeviation.groupBy({
        by: ['severity'],
        _count: { severity: true }
      }),
      (prisma as any).batchDeviation.groupBy({
        by: ['type'],
        _count: { type: true }
      })
    ]);

    const overdue = await (prisma as any).batchDeviation.count({
      where: {
        status: { notIn: ['CLOSED'] },
        dueDate: { lt: new Date() }
      }
    });

    const openCritical = await (prisma as any).batchDeviation.count({
      where: {
        status: { notIn: ['CLOSED'] },
        severity: 'CRITICAL'
      }
    });

    res.json({
      byStatus: statusCounts,
      bySeverity: severityCounts,
      byType: typeCounts,
      overdue,
      openCritical
    });
  } catch (error) {
    console.error('Error fetching deviation summary:', error);
    res.status(500).json({ error: 'Failed to fetch deviation summary' });
  }
});

export default router;
