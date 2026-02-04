import { Router, Request, Response } from 'express';
import { PrismaClient, QcTemplateStatus, QcSpecRuleType } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

function generateCriteriaText(rule: any): string {
  if (!rule) return '';
  
  const unit = rule.unit || '';
  
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

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { status } = req.query;
    
    const where: any = { productId };
    if (status) {
      where.status = status as QcTemplateStatus;
    }
    
    const templates = await prisma.productQcTemplate.findMany({
      where,
      include: {
        templateLines: {
          include: {
            testDefinition: true,
            specRule: true
          },
          orderBy: { displayOrder: 'asc' }
        },
        _count: {
          select: { batchQcSessions: true }
        }
      },
      orderBy: { version: 'desc' }
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching product QC templates:', error);
    res.status(500).json({ error: 'Failed to fetch product QC templates' });
  }
});

router.get('/active', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const template = await prisma.productQcTemplate.findFirst({
      where: {
        productId,
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
    
    if (!template) {
      return res.status(404).json({ error: 'No active QC template found for this product' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching active QC template:', error);
    res.status(500).json({ error: 'Failed to fetch active QC template' });
  }
});

router.get('/:templateId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    
    const template = await prisma.productQcTemplate.findUnique({
      where: { id: templateId },
      include: {
        product: true,
        templateLines: {
          include: {
            testDefinition: true,
            specRule: true
          },
          orderBy: { displayOrder: 'asc' }
        },
        batchQcSessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            batch: true
          }
        }
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'QC template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching QC template:', error);
    res.status(500).json({ error: 'Failed to fetch QC template' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.userId;
    const { notes, lines } = req.body;
    
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (lines && lines.length > 0) {
      const testDefIds = lines.map((l: any) => l.testDefinitionId);
      const uniqueIds = new Set(testDefIds);
      if (uniqueIds.size !== testDefIds.length) {
        return res.status(400).json({ error: 'Duplicate test definitions are not allowed in a template' });
      }
    }
    
    const latestTemplate = await prisma.productQcTemplate.findFirst({
      where: { productId },
      orderBy: { version: 'desc' }
    });
    
    const newVersion = latestTemplate ? latestTemplate.version + 1 : 1;
    
    const template = await prisma.productQcTemplate.create({
      data: {
        productId,
        version: newVersion,
        status: QcTemplateStatus.DRAFT,
        notes,
        createdById: userId,
        templateLines: lines ? {
          create: await Promise.all(lines.map(async (line: any, index: number) => {
            let specRuleId = line.specRuleId;
            
            if (!specRuleId && line.specRule) {
              const rule = await prisma.qcSpecRule.create({
                data: {
                  ruleType: line.specRule.ruleType,
                  minValue: line.specRule.minValue,
                  maxValue: line.specRule.maxValue,
                  targetValue: line.specRule.targetValue,
                  tolerance: line.specRule.tolerance,
                  textCriteriaEn: line.specRule.textCriteriaEn,
                  textCriteriaAr: line.specRule.textCriteriaAr,
                  failIfOutside: line.specRule.failIfOutside ?? true
                }
              });
              specRuleId = rule.id;
            }
            
            return {
              testDefinitionId: line.testDefinitionId,
              displayOrder: line.displayOrder ?? index,
              isRequired: line.isRequired ?? true,
              specRuleId,
              criteriaTextOverrideEn: line.criteriaTextOverrideEn,
              criteriaTextOverrideAr: line.criteriaTextOverrideAr,
              defaultResultValue: line.defaultResultValue,
              allowManualPassFail: line.allowManualPassFail ?? false,
              attachmentRequired: line.attachmentRequired ?? false
            };
          }))
        } : undefined
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
    
    await createAuditLog(
      userId,
      'CREATE',
      'ProductQcTemplate',
      template.id,
      null,
      { productId, version: newVersion },
      req
    );
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating QC template:', error);
    res.status(500).json({ error: 'Failed to create QC template' });
  }
});

router.put('/:templateId', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.userId;
    const { notes, lines } = req.body;
    
    const existing = await prisma.productQcTemplate.findUnique({
      where: { id: templateId },
      include: { templateLines: true }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'QC template not found' });
    }
    
    if (existing.status !== QcTemplateStatus.DRAFT) {
      return res.status(400).json({ error: 'Only DRAFT templates can be edited. Create a new version instead.' });
    }
    
    if (lines && lines.length > 0) {
      const testDefIds = lines.map((l: any) => l.testDefinitionId);
      const uniqueIds = new Set(testDefIds);
      if (uniqueIds.size !== testDefIds.length) {
        return res.status(400).json({ error: 'Duplicate test definitions are not allowed in a template' });
      }
    }
    
    if (lines) {
      await prisma.productQcTemplateLine.deleteMany({
        where: { templateId }
      });
    }
    
    const template = await prisma.productQcTemplate.update({
      where: { id: templateId },
      data: {
        notes,
        templateLines: lines ? {
          create: await Promise.all(lines.map(async (line: any, index: number) => {
            let specRuleId = line.specRuleId;
            
            if (!specRuleId && line.specRule) {
              const rule = await prisma.qcSpecRule.create({
                data: {
                  ruleType: line.specRule.ruleType,
                  minValue: line.specRule.minValue,
                  maxValue: line.specRule.maxValue,
                  targetValue: line.specRule.targetValue,
                  tolerance: line.specRule.tolerance,
                  textCriteriaEn: line.specRule.textCriteriaEn,
                  textCriteriaAr: line.specRule.textCriteriaAr,
                  failIfOutside: line.specRule.failIfOutside ?? true
                }
              });
              specRuleId = rule.id;
            }
            
            return {
              testDefinitionId: line.testDefinitionId,
              displayOrder: line.displayOrder ?? index,
              isRequired: line.isRequired ?? true,
              specRuleId,
              criteriaTextOverrideEn: line.criteriaTextOverrideEn,
              criteriaTextOverrideAr: line.criteriaTextOverrideAr,
              defaultResultValue: line.defaultResultValue,
              allowManualPassFail: line.allowManualPassFail ?? false,
              attachmentRequired: line.attachmentRequired ?? false
            };
          }))
        } : undefined
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
    
    await createAuditLog(
      userId,
      'UPDATE',
      'ProductQcTemplate',
      template.id,
      { notes: existing.notes },
      { notes: template.notes },
      req
    );
    
    res.json(template);
  } catch (error) {
    console.error('Error updating QC template:', error);
    res.status(500).json({ error: 'Failed to update QC template' });
  }
});

router.post('/:templateId/activate', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { productId, templateId } = req.params;
    const userId = req.user?.userId;
    
    const template = await prisma.productQcTemplate.findUnique({
      where: { id: templateId },
      include: { templateLines: true }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'QC template not found' });
    }
    
    if (template.templateLines.length === 0) {
      return res.status(400).json({ error: 'Cannot activate template with no test lines' });
    }
    
    await prisma.productQcTemplate.updateMany({
      where: {
        productId,
        status: QcTemplateStatus.ACTIVE
      },
      data: {
        status: QcTemplateStatus.RETIRED,
        effectiveTo: new Date()
      }
    });
    
    const activated = await prisma.productQcTemplate.update({
      where: { id: templateId },
      data: {
        status: QcTemplateStatus.ACTIVE,
        effectiveFrom: new Date()
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
    
    await createAuditLog(
      userId,
      'UPDATE',
      'ProductQcTemplate',
      templateId,
      { status: template.status },
      { status: QcTemplateStatus.ACTIVE },
      req
    );
    
    res.json(activated);
  } catch (error) {
    console.error('Error activating QC template:', error);
    res.status(500).json({ error: 'Failed to activate QC template' });
  }
});

router.post('/:templateId/retire', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.userId;
    
    const template = await prisma.productQcTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'QC template not found' });
    }
    
    const retired = await prisma.productQcTemplate.update({
      where: { id: templateId },
      data: {
        status: QcTemplateStatus.RETIRED,
        effectiveTo: new Date()
      }
    });
    
    await createAuditLog(
      userId,
      'UPDATE',
      'ProductQcTemplate',
      templateId,
      { status: template.status },
      { status: QcTemplateStatus.RETIRED },
      req
    );
    
    res.json(retired);
  } catch (error) {
    console.error('Error retiring QC template:', error);
    res.status(500).json({ error: 'Failed to retire QC template' });
  }
});

router.delete('/:templateId', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const userId = req.user?.userId;
    
    const template = await prisma.productQcTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: { batchQcSessions: true }
        }
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'QC template not found' });
    }
    
    if (template._count.batchQcSessions > 0) {
      return res.status(400).json({ 
        error: `Cannot delete template version ${template.version}. It is referenced by ${template._count.batchQcSessions} batch QC session(s). Consider retiring it instead.`
      });
    }
    
    if (template.status === QcTemplateStatus.ACTIVE) {
      return res.status(400).json({ 
        error: 'Cannot delete an active template. Retire it first or activate a different version.'
      });
    }
    
    await prisma.qcTemplateLine.deleteMany({
      where: { templateId }
    });
    
    await prisma.productQcTemplate.delete({
      where: { id: templateId }
    });
    
    await createAuditLog(
      userId,
      'DELETE',
      'ProductQcTemplate',
      templateId,
      { version: template.version, status: template.status },
      null,
      req
    );
    
    res.json({ success: true, message: `Template version ${template.version} deleted successfully` });
  } catch (error) {
    console.error('Error deleting QC template:', error);
    res.status(500).json({ error: 'Failed to delete QC template' });
  }
});

export default router;
