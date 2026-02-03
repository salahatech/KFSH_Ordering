import { Router, Request, Response } from 'express';
import { PrismaClient, QcTestResultType } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search, isActive, resultType } = req.query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { nameEn: { contains: search as string, mode: 'insensitive' } },
        { nameAr: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (resultType) {
      where.resultType = resultType as QcTestResultType;
    }
    
    const definitions = await prisma.qcTestDefinition.findMany({
      where,
      orderBy: { nameEn: 'asc' },
      include: {
        _count: {
          select: { templateLines: true }
        }
      }
    });
    
    res.json(definitions);
  } catch (error) {
    console.error('Error fetching QC test definitions:', error);
    res.status(500).json({ error: 'Failed to fetch QC test definitions' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const definition = await prisma.qcTestDefinition.findUnique({
      where: { id },
      include: {
        templateLines: {
          include: {
            template: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });
    
    if (!definition) {
      return res.status(404).json({ error: 'QC test definition not found' });
    }
    
    res.json(definition);
  } catch (error) {
    console.error('Error fetching QC test definition:', error);
    res.status(500).json({ error: 'Failed to fetch QC test definition' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code, nameEn, nameAr, methodEn, methodAr, resultType, unit, decimalPlaces, optionsList, isActive } = req.body;
    
    if (!code || !nameEn || !resultType) {
      return res.status(400).json({ error: 'Code, name (English), and result type are required' });
    }
    
    const existing = await prisma.qcTestDefinition.findUnique({
      where: { code }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'A test definition with this code already exists' });
    }
    
    const definition = await prisma.qcTestDefinition.create({
      data: {
        code: code.toUpperCase(),
        nameEn,
        nameAr,
        methodEn,
        methodAr,
        resultType,
        unit,
        decimalPlaces,
        optionsList: optionsList ? JSON.stringify(optionsList) : null,
        isActive: isActive ?? true
      }
    });
    
    await createAuditLog(
      userId,
      'CREATE',
      'QcTestDefinition',
      definition.id,
      null,
      { code, nameEn, resultType },
      req
    );
    
    res.status(201).json(definition);
  } catch (error) {
    console.error('Error creating QC test definition:', error);
    res.status(500).json({ error: 'Failed to create QC test definition' });
  }
});

router.put('/:id', authenticateToken, requireRole('Admin', 'QC Manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { code, nameEn, nameAr, methodEn, methodAr, resultType, unit, decimalPlaces, optionsList, isActive } = req.body;
    
    const existing = await prisma.qcTestDefinition.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'QC test definition not found' });
    }
    
    if (code && code !== existing.code) {
      const codeExists = await prisma.qcTestDefinition.findUnique({
        where: { code }
      });
      if (codeExists) {
        return res.status(400).json({ error: 'A test definition with this code already exists' });
      }
    }
    
    const definition = await prisma.qcTestDefinition.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        nameEn,
        nameAr,
        methodEn,
        methodAr,
        resultType,
        unit,
        decimalPlaces,
        optionsList: optionsList !== undefined ? (optionsList ? JSON.stringify(optionsList) : null) : undefined,
        isActive
      }
    });
    
    await createAuditLog(
      userId,
      'UPDATE',
      'QcTestDefinition',
      definition.id,
      { code: existing.code, nameEn: existing.nameEn },
      { code: definition.code, nameEn: definition.nameEn },
      req
    );
    
    res.json(definition);
  } catch (error) {
    console.error('Error updating QC test definition:', error);
    res.status(500).json({ error: 'Failed to update QC test definition' });
  }
});

router.delete('/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const existing = await prisma.qcTestDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { templateLines: true, batchQcResults: true }
        }
      }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'QC test definition not found' });
    }
    
    if (existing._count.templateLines > 0 || existing._count.batchQcResults > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete test definition that is used in templates or batch results. Deactivate it instead.' 
      });
    }
    
    await prisma.qcTestDefinition.delete({
      where: { id }
    });
    
    await createAuditLog(
      userId,
      'DELETE',
      'QcTestDefinition',
      id,
      { code: existing.code, nameEn: existing.nameEn },
      null,
      req
    );
    
    res.json({ message: 'QC test definition deleted successfully' });
  } catch (error) {
    console.error('Error deleting QC test definition:', error);
    res.status(500).json({ error: 'Failed to delete QC test definition' });
  }
});

export default router;
