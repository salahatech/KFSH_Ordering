import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

type OOSCaseStatusType = 'OPEN' | 'PHASE_1_LAB_INVESTIGATION' | 'PHASE_1_COMPLETE' | 'PHASE_2_FULL_INVESTIGATION' | 'PHASE_2_COMPLETE' | 'CAPA_PROPOSED' | 'CAPA_APPROVED' | 'CAPA_IMPLEMENTING' | 'CLOSED_CONFIRMED' | 'CLOSED_INVALIDATED' | 'CLOSED_INCONCLUSIVE';

const STATUS_TRANSITIONS: Record<OOSCaseStatusType, OOSCaseStatusType[]> = {
  OPEN: ['PHASE_1_LAB_INVESTIGATION'],
  PHASE_1_LAB_INVESTIGATION: ['PHASE_1_COMPLETE', 'CLOSED_INVALIDATED'],
  PHASE_1_COMPLETE: ['PHASE_2_FULL_INVESTIGATION', 'CAPA_PROPOSED', 'CLOSED_CONFIRMED', 'CLOSED_INVALIDATED', 'CLOSED_INCONCLUSIVE'],
  PHASE_2_FULL_INVESTIGATION: ['PHASE_2_COMPLETE'],
  PHASE_2_COMPLETE: ['CAPA_PROPOSED', 'CLOSED_CONFIRMED', 'CLOSED_INVALIDATED', 'CLOSED_INCONCLUSIVE'],
  CAPA_PROPOSED: ['CAPA_APPROVED'],
  CAPA_APPROVED: ['CAPA_IMPLEMENTING'],
  CAPA_IMPLEMENTING: ['CLOSED_CONFIRMED'],
  CLOSED_CONFIRMED: [],
  CLOSED_INVALIDATED: [],
  CLOSED_INCONCLUSIVE: [],
};

async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OOS-${year}-`;
  const lastCase = await prisma.oOSCase.findFirst({
    where: { caseNumber: { startsWith: prefix } },
    orderBy: { caseNumber: 'desc' },
  });
  const nextNum = lastCase ? parseInt(lastCase.caseNumber.split('-').pop() || '0') + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

async function addTimelineEntry(oosCaseId: string, action: string, description: string, userId: string, oldStatus?: string, newStatus?: string) {
  await prisma.oOSTimeline.create({
    data: { oosCaseId, action, description, userId, oldStatus, newStatus },
  });
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, caseType, priority, batchId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    if (caseType) where.caseType = caseType;
    if (priority) where.priority = priority;
    if (batchId) where.batchId = batchId;

    const [cases, total] = await Promise.all([
      prisma.oOSCase.findMany({
        where,
        include: {
          batch: { include: { product: true } },
          openedBy: { select: { id: true, name: true, email: true } },
          phase1Investigator: { select: { id: true, name: true, email: true } },
          phase2Lead: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ priority: 'desc' }, { openedAt: 'desc' }],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.oOSCase.count({ where }),
    ]);

    res.json({ cases, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error) {
    console.error('Error fetching OOS cases:', error);
    res.status(500).json({ error: 'Failed to fetch OOS cases' });
  }
});

router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const [byStatus, byType, byPriority, overdue, recentClosures] = await Promise.all([
      prisma.oOSCase.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.oOSCase.groupBy({ by: ['caseType'], _count: { id: true } }),
      prisma.oOSCase.groupBy({ by: ['priority'], _count: { id: true } }),
      prisma.oOSCase.count({ where: { isOverdue: true, closedAt: null } }),
      prisma.oOSCase.count({
        where: { closedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const openCases = byStatus.filter(s => !s.status.startsWith('CLOSED')).reduce((acc, s) => acc + s._count.id, 0);

    res.json({ byStatus, byType, byPriority, openCases, overdue, recentClosures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OOS stats' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const oosCase = await prisma.oOSCase.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { include: { product: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closedBy: { select: { id: true, name: true, email: true } },
        phase1Investigator: { select: { id: true, name: true, email: true } },
        phase2Lead: { select: { id: true, name: true, email: true } },
        capaProposedBy: { select: { id: true, name: true, email: true } },
        capaApprovedBy: { select: { id: true, name: true, email: true } },
        capaApprovalSignature: true,
        closureSignature: true,
        attachments: { orderBy: { uploadedAt: 'desc' } },
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    res.json(oosCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OOS case' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { batchId, caseType, priority, testResultId, testName, testMethod, specMin, specMax, actualValue, unit, deviationPercent, initialDescription, dueDate } = req.body;

    if (!batchId || !testName || !initialDescription) {
      res.status(400).json({ error: 'Missing required fields: batchId, testName, initialDescription' });
      return;
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const caseNumber = await generateCaseNumber();

    const oosCase = await prisma.oOSCase.create({
      data: {
        caseNumber,
        caseType: caseType || 'OOS',
        priority: priority || 'MEDIUM',
        batchId,
        testResultId,
        testName,
        testMethod,
        specMin: specMin ? parseFloat(specMin) : null,
        specMax: specMax ? parseFloat(specMax) : null,
        actualValue: actualValue ? parseFloat(actualValue) : null,
        unit,
        deviationPercent: deviationPercent ? parseFloat(deviationPercent) : null,
        initialDescription,
        openedById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { batch: { include: { product: true } }, openedBy: { select: { id: true, name: true, email: true } } },
    });

    await addTimelineEntry(oosCase.id, 'CASE_OPENED', `OOS case opened for test: ${testName}`, userId, undefined, 'OPEN');

    await createAuditLog(userId, 'CREATE', 'OOSCase', oosCase.id, null, { caseNumber, caseType, batchId, testName }, req);

    res.status(201).json(oosCase);
  } catch (error) {
    console.error('Error creating OOS case:', error);
    res.status(500).json({ error: 'Failed to create OOS case' });
  }
});

router.post('/:id/start-phase1', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { investigatorId } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'OPEN') {
      res.status(400).json({ error: 'Phase 1 can only be started from OPEN status' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: 'PHASE_1_LAB_INVESTIGATION',
        phase1StartedAt: new Date(),
        phase1InvestigatorId: investigatorId || userId,
      },
      include: { phase1Investigator: { select: { id: true, name: true, email: true } } },
    });

    await addTimelineEntry(oosCase.id, 'PHASE1_STARTED', 'Phase 1 Lab Investigation started', userId, 'OPEN', 'PHASE_1_LAB_INVESTIGATION');

    await createAuditLog(userId, 'UPDATE', 'OOSCase', oosCase.id, { status: 'OPEN' }, { status: 'PHASE_1_LAB_INVESTIGATION' }, req);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start Phase 1' });
  }
});

router.put('/:id/phase1', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { labChecks, retesting, findings, conclusion } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'PHASE_1_LAB_INVESTIGATION') {
      res.status(400).json({ error: 'Phase 1 data can only be updated during PHASE_1_LAB_INVESTIGATION' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        phase1LabChecks: labChecks,
        phase1Retesting: retesting,
        phase1Findings: findings,
        phase1Conclusion: conclusion,
      },
    });

    await addTimelineEntry(oosCase.id, 'PHASE1_UPDATED', 'Phase 1 investigation data updated', userId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Phase 1' });
  }
});

router.post('/:id/complete-phase1', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { conclusion, proceedToPhase2 } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'PHASE_1_LAB_INVESTIGATION') {
      res.status(400).json({ error: 'Can only complete Phase 1 from PHASE_1_LAB_INVESTIGATION status' });
      return;
    }

    const newStatus = proceedToPhase2 ? 'PHASE_1_COMPLETE' : 'CLOSED_INVALIDATED';

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        phase1CompletedAt: new Date(),
        phase1Conclusion: conclusion,
        ...(newStatus === 'CLOSED_INVALIDATED' ? { closedAt: new Date(), closedById: userId, closureType: 'INVALIDATED' } : {}),
      },
    });

    await addTimelineEntry(oosCase.id, 'PHASE1_COMPLETED', `Phase 1 completed: ${proceedToPhase2 ? 'Proceeding to Phase 2' : 'Case invalidated'}`, userId, 'PHASE_1_LAB_INVESTIGATION', newStatus);

    await createAuditLog(userId, 'UPDATE', 'OOSCase', oosCase.id, { status: 'PHASE_1_LAB_INVESTIGATION' }, { status: newStatus }, req);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete Phase 1' });
  }
});

router.post('/:id/start-phase2', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { leadId } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'PHASE_1_COMPLETE') {
      res.status(400).json({ error: 'Phase 2 can only be started from PHASE_1_COMPLETE status' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: 'PHASE_2_FULL_INVESTIGATION',
        phase2StartedAt: new Date(),
        phase2LeadId: leadId || userId,
      },
      include: { phase2Lead: { select: { id: true, name: true, email: true } } },
    });

    await addTimelineEntry(oosCase.id, 'PHASE2_STARTED', 'Phase 2 Full Investigation started', userId, 'PHASE_1_COMPLETE', 'PHASE_2_FULL_INVESTIGATION');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start Phase 2' });
  }
});

router.put('/:id/phase2', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { rootCauseAnalysis, impactAssessment, affectedBatches, findings, conclusion } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'PHASE_2_FULL_INVESTIGATION') {
      res.status(400).json({ error: 'Phase 2 data can only be updated during PHASE_2_FULL_INVESTIGATION' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        phase2RootCauseAnalysis: rootCauseAnalysis,
        phase2ImpactAssessment: impactAssessment,
        phase2AffectedBatches: affectedBatches,
        phase2Findings: findings,
        phase2Conclusion: conclusion,
      },
    });

    await addTimelineEntry(oosCase.id, 'PHASE2_UPDATED', 'Phase 2 investigation data updated', userId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update Phase 2' });
  }
});

router.post('/:id/complete-phase2', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { conclusion, rootCause } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'PHASE_2_FULL_INVESTIGATION') {
      res.status(400).json({ error: 'Can only complete Phase 2 from PHASE_2_FULL_INVESTIGATION status' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: 'PHASE_2_COMPLETE',
        phase2CompletedAt: new Date(),
        phase2Conclusion: conclusion,
        rootCause,
      },
    });

    await addTimelineEntry(oosCase.id, 'PHASE2_COMPLETED', 'Phase 2 Full Investigation completed', userId, 'PHASE_2_FULL_INVESTIGATION', 'PHASE_2_COMPLETE');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete Phase 2' });
  }
});

router.post('/:id/propose-capa', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { rootCause, correctiveAction, preventiveAction } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    const validStatuses: OOSCaseStatusType[] = ['PHASE_1_COMPLETE', 'PHASE_2_COMPLETE'];
    if (!validStatuses.includes(oosCase.status as OOSCaseStatusType)) {
      res.status(400).json({ error: 'CAPA can only be proposed after Phase 1 or Phase 2 completion' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: 'CAPA_PROPOSED',
        rootCause: rootCause || oosCase.rootCause,
        correctiveAction,
        preventiveAction,
        capaProposedAt: new Date(),
        capaProposedById: userId,
      },
    });

    await addTimelineEntry(oosCase.id, 'CAPA_PROPOSED', 'CAPA proposal submitted for approval', userId, oosCase.status, 'CAPA_PROPOSED');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to propose CAPA' });
  }
});

router.post('/:id/approve-capa', authenticateToken, requireRole('Admin', 'QC Manager', 'QP'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { signatureMeaning } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'CAPA_PROPOSED') {
      res.status(400).json({ error: 'CAPA can only be approved from CAPA_PROPOSED status' });
      return;
    }

    const signature = await prisma.eSignature.create({
      data: {
        entityType: 'OOSCase',
        entityId: oosCase.id,
        scope: 'QC_APPROVAL',
        meaning: signatureMeaning || 'I approve this CAPA for implementation',
        signedById: userId,
      },
    });

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: 'CAPA_APPROVED',
        capaApprovedAt: new Date(),
        capaApprovedById: userId,
        capaApprovalSignatureId: signature.id,
      },
    });

    await addTimelineEntry(oosCase.id, 'CAPA_APPROVED', 'CAPA approved with e-signature', userId, 'CAPA_PROPOSED', 'CAPA_APPROVED');

    await createAuditLog(userId, 'UPDATE', 'OOSCase', oosCase.id, { status: 'CAPA_PROPOSED' }, { status: 'CAPA_APPROVED', signatureId: signature.id }, req);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve CAPA' });
  }
});

router.post('/:id/start-implementation', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'CAPA_APPROVED') {
      res.status(400).json({ error: 'Implementation can only start from CAPA_APPROVED status' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: { status: 'CAPA_IMPLEMENTING' },
    });

    await addTimelineEntry(oosCase.id, 'IMPLEMENTATION_STARTED', 'CAPA implementation started', userId, 'CAPA_APPROVED', 'CAPA_IMPLEMENTING');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start implementation' });
  }
});

router.put('/:id/implementation', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { implementationNotes, effectivenessCheck } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status !== 'CAPA_IMPLEMENTING') {
      res.status(400).json({ error: 'Implementation notes can only be updated during CAPA_IMPLEMENTING' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        capaImplementationNotes: implementationNotes,
        capaEffectivenessCheck: effectivenessCheck,
      },
    });

    await addTimelineEntry(oosCase.id, 'IMPLEMENTATION_UPDATED', 'Implementation progress updated', userId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update implementation' });
  }
});

router.post('/:id/close', authenticateToken, requireRole('Admin', 'QC Manager', 'QP'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { closureType, finalConclusion, signatureMeaning } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    const validClosureStatuses: OOSCaseStatusType[] = ['PHASE_1_COMPLETE', 'PHASE_2_COMPLETE', 'CAPA_IMPLEMENTING'];
    if (!validClosureStatuses.includes(oosCase.status as OOSCaseStatusType)) {
      res.status(400).json({ error: 'Case can only be closed from PHASE_1_COMPLETE, PHASE_2_COMPLETE, or CAPA_IMPLEMENTING' });
      return;
    }

    const validClosureTypes = ['CONFIRMED', 'INVALIDATED', 'INCONCLUSIVE'];
    if (!validClosureTypes.includes(closureType)) {
      res.status(400).json({ error: 'Invalid closure type' });
      return;
    }

    const signature = await prisma.eSignature.create({
      data: {
        entityType: 'OOSCase',
        entityId: oosCase.id,
        scope: 'QC_APPROVAL',
        meaning: signatureMeaning || `I confirm the closure of this OOS case as ${closureType}`,
        signedById: userId,
      },
    });

    const newStatus = `CLOSED_${closureType}` as OOSCaseStatusType;

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        closureType,
        finalConclusion,
        closedAt: new Date(),
        closedById: userId,
        closureSignatureId: signature.id,
      },
    });

    await addTimelineEntry(oosCase.id, 'CASE_CLOSED', `Case closed as ${closureType}`, userId, oosCase.status, newStatus);

    await createAuditLog(userId, 'UPDATE', 'OOSCase', oosCase.id, { status: oosCase.status }, { status: newStatus, closureType, signatureId: signature.id }, req);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to close case' });
  }
});

router.get('/:id/timeline', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const timeline = await prisma.oOSTimeline.findMany({
      where: { oosCaseId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

router.put('/:id', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { priority, dueDate, testMethod, testName } = req.body;

    const oosCase = await prisma.oOSCase.findUnique({ where: { id: req.params.id } });
    if (!oosCase) {
      res.status(404).json({ error: 'OOS case not found' });
      return;
    }

    if (oosCase.status.startsWith('CLOSED')) {
      res.status(400).json({ error: 'Cannot update a closed case' });
      return;
    }

    const updated = await prisma.oOSCase.update({
      where: { id: req.params.id },
      data: {
        ...(priority && { priority }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(testMethod && { testMethod }),
        ...(testName && { testName }),
      },
    });

    await addTimelineEntry(oosCase.id, 'CASE_UPDATED', 'Case details updated', userId);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case' });
  }
});

export default router;
