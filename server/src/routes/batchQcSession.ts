import { Router, Request, Response } from 'express';
import { PrismaClient, QcSessionStatus, QcResultEntryStatus, QcTestResultType, QcSpecRuleType, QcTemplateStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

function evaluateResult(
  resultType: QcTestResultType,
  ruleType: QcSpecRuleType | null,
  numericValue: number | null,
  passFailValue: string | null,
  specMinValue: number | null,
  specMaxValue: number | null,
  specTargetValue: number | null
): { status: QcResultEntryStatus; failReason?: string } {
  if (resultType === 'PASS_FAIL') {
    if (passFailValue === 'PASS') {
      return { status: QcResultEntryStatus.PASS };
    } else if (passFailValue === 'FAIL') {
      return { status: QcResultEntryStatus.FAIL, failReason: 'Manual fail selection' };
    }
    return { status: QcResultEntryStatus.PENDING };
  }
  
  if (resultType === 'NUMERIC' && numericValue !== null && ruleType) {
    switch (ruleType) {
      case 'MIN':
        if (specMinValue !== null && numericValue >= specMinValue) {
          return { status: QcResultEntryStatus.PASS };
        }
        return { status: QcResultEntryStatus.FAIL, failReason: `Value ${numericValue} is below minimum ${specMinValue}` };
        
      case 'MAX':
        if (specMaxValue !== null && numericValue <= specMaxValue) {
          return { status: QcResultEntryStatus.PASS };
        }
        return { status: QcResultEntryStatus.FAIL, failReason: `Value ${numericValue} exceeds maximum ${specMaxValue}` };
        
      case 'RANGE':
        if (specMinValue !== null && specMaxValue !== null) {
          if (numericValue >= specMinValue && numericValue <= specMaxValue) {
            return { status: QcResultEntryStatus.PASS };
          }
          return { status: QcResultEntryStatus.FAIL, failReason: `Value ${numericValue} is outside range ${specMinValue}–${specMaxValue}` };
        }
        break;
        
      case 'EQUAL':
        if (specTargetValue !== null && numericValue === specTargetValue) {
          return { status: QcResultEntryStatus.PASS };
        }
        return { status: QcResultEntryStatus.FAIL, failReason: `Value ${numericValue} does not equal target ${specTargetValue}` };
        
      case 'PASS_FAIL_ONLY':
        return { status: QcResultEntryStatus.PENDING };
    }
  }
  
  if (resultType === 'TEXT' || resultType === 'OPTION_LIST') {
    return { status: QcResultEntryStatus.PENDING };
  }
  
  return { status: QcResultEntryStatus.PENDING };
}

async function updateSessionStatus(sessionId: string): Promise<void> {
  const session = await prisma.batchQcSession.findUnique({
    where: { id: sessionId },
    include: {
      results: true
    }
  });
  
  if (!session) return;
  
  const requiredResults = session.results.filter(r => r.isRequired);
  const allResults = session.results;
  
  const pendingRequired = requiredResults.filter(r => r.status === 'PENDING');
  const failedRequired = requiredResults.filter(r => r.status === 'FAIL');
  const passedRequired = requiredResults.filter(r => r.status === 'PASS');
  
  let newStatus: QcSessionStatus = session.status;
  
  if (pendingRequired.length === requiredResults.length) {
    newStatus = QcSessionStatus.NOT_STARTED;
  } else if (failedRequired.length > 0) {
    newStatus = QcSessionStatus.QC_FAILED;
  } else if (passedRequired.length === requiredResults.length) {
    newStatus = QcSessionStatus.QC_PASSED;
  } else {
    newStatus = QcSessionStatus.IN_PROGRESS;
  }
  
  if (newStatus !== session.status) {
    await prisma.batchQcSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
        completedAt: ['QC_PASSED', 'QC_FAILED'].includes(newStatus) ? new Date() : undefined
      }
    });
  }
}

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    
    const session = await prisma.batchQcSession.findUnique({
      where: { batchId },
      include: {
        template: {
          include: {
            product: true
          }
        },
        results: {
          include: {
            testDefinition: true,
            attachments: true,
            enteredByUser: {
              select: { firstName: true, lastName: true }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },
        analystUser: {
          select: { firstName: true, lastName: true }
        },
        reviewedByUser: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'QC session not found for this batch' });
    }
    
    const totalTests = session.results.length;
    const completedTests = session.results.filter(r => r.status !== 'PENDING').length;
    const passedTests = session.results.filter(r => r.status === 'PASS').length;
    const failedTests = session.results.filter(r => r.status === 'FAIL').length;
    
    res.json({
      ...session,
      summary: {
        totalTests,
        completedTests,
        passedTests,
        failedTests,
        progress: totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching QC session:', error);
    res.status(500).json({ error: 'Failed to fetch QC session' });
  }
});

router.post('/generate', authenticateToken, requireRole('Admin', 'QC Manager', 'Production'), async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.user?.userId;
    
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        product: true,
        batchQcSession: true
      }
    });
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    if (batch.batchQcSession) {
      return res.status(400).json({ error: 'QC session already exists for this batch' });
    }
    
    const activeTemplate = await prisma.productQcTemplate.findFirst({
      where: {
        productId: batch.productId,
        status: QcTemplateStatus.ACTIVE
      },
      include: {
        templateLines: {
          include: {
            testDefinition: true,
            specRule: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    if (!activeTemplate) {
      return res.status(400).json({ error: 'No active QC template found for this product. Please create and activate a template first.' });
    }
    
    function generateCriteriaText(line: any): string {
      if (line.criteriaTextOverrideEn) return line.criteriaTextOverrideEn;
      if (!line.specRule) return '';
      
      const rule = line.specRule;
      const unit = line.testDefinition?.unit || '';
      
      switch (rule.ruleType) {
        case 'MIN':
          return `≥${rule.minValue}${unit}`;
        case 'MAX':
          return `≤${rule.maxValue}${unit}`;
        case 'RANGE':
          return `${rule.minValue}–${rule.maxValue}${unit}`;
        case 'EQUAL':
          return `=${rule.targetValue}${unit}`;
        case 'PASS_FAIL_ONLY':
          return 'Pass/Fail';
        case 'CUSTOM_TEXT':
          return rule.textCriteriaEn || '';
        default:
          return '';
      }
    }
    
    const session = await prisma.batchQcSession.create({
      data: {
        batchId,
        productId: batch.productId,
        templateId: activeTemplate.id,
        status: QcSessionStatus.NOT_STARTED,
        results: {
          create: activeTemplate.templateLines.map((line) => ({
            testDefinitionId: line.testDefinitionId,
            displayOrder: line.displayOrder,
            criteriaDisplayEn: generateCriteriaText(line),
            criteriaDisplayAr: line.criteriaTextOverrideAr || line.specRule?.textCriteriaAr || '',
            resultType: line.testDefinition.resultType,
            unit: line.testDefinition.unit,
            isRequired: line.isRequired,
            specRuleType: line.specRule?.ruleType,
            specMinValue: line.specRule?.minValue,
            specMaxValue: line.specRule?.maxValue,
            specTargetValue: line.specRule?.targetValue,
            status: QcResultEntryStatus.PENDING
          }))
        }
      },
      include: {
        results: {
          include: {
            testDefinition: true
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
    
    await createAuditLog(
      userId,
      'CREATE',
      'BatchQcSession',
      session.id,
      null,
      { batchId, templateId: activeTemplate.id },
      req
    );
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error generating QC session:', error);
    res.status(500).json({ error: 'Failed to generate QC session' });
  }
});

router.put('/results/:resultId', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const userId = req.user?.userId;
    const { numericValue, textValue, passFailValue, selectedOption } = req.body;
    
    const existing = await prisma.batchQcResult.findUnique({
      where: { id: resultId },
      include: { qcSession: true }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'QC result not found' });
    }
    
    if (['QC_PASSED', 'QC_FAILED'].includes(existing.qcSession.status)) {
      return res.status(400).json({ error: 'Cannot modify results for a completed QC session' });
    }
    
    const evaluation = evaluateResult(
      existing.resultType,
      existing.specRuleType,
      numericValue !== undefined ? parseFloat(numericValue) : null,
      passFailValue || null,
      existing.specMinValue ? parseFloat(existing.specMinValue.toString()) : null,
      existing.specMaxValue ? parseFloat(existing.specMaxValue.toString()) : null,
      existing.specTargetValue ? parseFloat(existing.specTargetValue.toString()) : null
    );
    
    const result = await prisma.batchQcResult.update({
      where: { id: resultId },
      data: {
        numericValue: numericValue !== undefined ? new Decimal(numericValue) : undefined,
        textValue,
        passFailValue,
        selectedOption,
        status: evaluation.status,
        failReason: evaluation.failReason,
        enteredByUserId: userId,
        enteredAt: new Date()
      },
      include: {
        testDefinition: true,
        enteredByUser: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    await updateSessionStatus(existing.qcSessionId);
    
    await createAuditLog(
      userId,
      'UPDATE',
      'BatchQcResult',
      resultId,
      { status: existing.status },
      { status: result.status, numericValue, passFailValue },
      req
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error updating QC result:', error);
    res.status(500).json({ error: 'Failed to update QC result' });
  }
});

router.post('/submit', authenticateToken, requireRole('Admin', 'QC Manager', 'QC Analyst'), async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.user?.userId;
    
    const session = await prisma.batchQcSession.findUnique({
      where: { batchId },
      include: { results: true }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'QC session not found' });
    }
    
    const pendingRequired = session.results.filter(r => r.isRequired && r.status === 'PENDING');
    if (pendingRequired.length > 0) {
      return res.status(400).json({ 
        error: `Cannot submit: ${pendingRequired.length} required tests are still pending` 
      });
    }
    
    const updated = await prisma.batchQcSession.update({
      where: { id: session.id },
      data: {
        status: QcSessionStatus.WAITING_REVIEW,
        analystUserId: userId,
        completedAt: new Date()
      }
    });
    
    await createAuditLog(
      userId,
      'UPDATE',
      'BatchQcSession',
      session.id,
      { status: session.status },
      { status: QcSessionStatus.WAITING_REVIEW },
      req
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error submitting QC session:', error);
    res.status(500).json({ error: 'Failed to submit QC session' });
  }
});

router.post('/review', authenticateToken, requireRole('Admin', 'QC Manager', 'QP'), async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.user?.userId;
    const { decision, notes } = req.body;
    
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVE or REJECT' });
    }
    
    const session = await prisma.batchQcSession.findUnique({
      where: { batchId },
      include: { results: true }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'QC session not found' });
    }
    
    const hasFailures = session.results.some(r => r.status === 'FAIL');
    
    let newStatus: QcSessionStatus;
    if (decision === 'APPROVE') {
      if (hasFailures) {
        return res.status(400).json({ error: 'Cannot approve session with failed tests. Reject or resolve failures first.' });
      }
      newStatus = QcSessionStatus.QC_PASSED;
    } else {
      newStatus = QcSessionStatus.QC_FAILED;
    }
    
    const updated = await prisma.batchQcSession.update({
      where: { id: session.id },
      data: {
        status: newStatus,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        notes: notes || session.notes
      }
    });
    
    await createAuditLog(
      userId,
      'UPDATE',
      'BatchQcSession',
      session.id,
      { status: session.status },
      { status: newStatus, decision },
      req
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error reviewing QC session:', error);
    res.status(500).json({ error: 'Failed to review QC session' });
  }
});

router.post('/results/:resultId/attachments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { resultId } = req.params;
    const userId = req.user?.userId;
    const { fileUrl, fileName, fileSizeBytes, mimeType } = req.body;
    
    const result = await prisma.batchQcResult.findUnique({
      where: { id: resultId }
    });
    
    if (!result) {
      return res.status(404).json({ error: 'QC result not found' });
    }
    
    if (fileSizeBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'File type not allowed. Allowed: PDF, JPG, PNG, DOCX' });
    }
    
    const attachment = await prisma.batchQcAttachment.create({
      data: {
        batchQcResultId: resultId,
        fileUrl,
        fileName,
        fileSizeBytes,
        mimeType,
        uploadedByUserId: userId
      }
    });
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error adding QC attachment:', error);
    res.status(500).json({ error: 'Failed to add attachment' });
  }
});

export default router;
