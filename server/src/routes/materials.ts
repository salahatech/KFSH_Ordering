import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, search, supplierId, isRadioactive } = req.query;
    
    const where: any = {};
    
    if (category) where.category = category;
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (isRadioactive !== undefined) where.isRadioactive = isRadioactive === 'true';
    
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
        { nameAr: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const materials = await prisma.material.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            recipeComponents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      { value: 'RAW_MATERIAL', label: 'Raw Material' },
      { value: 'CONSUMABLE', label: 'Consumable' },
      { value: 'REAGENT', label: 'Reagent' },
      { value: 'PACKAGING', label: 'Packaging' },
      { value: 'RADIOISOTOPE', label: 'Radioisotope' },
      { value: 'TARGET_MATERIAL', label: 'Target Material' },
      { value: 'SOLVENT', label: 'Solvent' },
      { value: 'BUFFER', label: 'Buffer' },
      { value: 'FILTER', label: 'Filter' },
      { value: 'CONTAINER', label: 'Container' },
      { value: 'EXCIPIENT', label: 'Excipient' },
      { value: 'REFERENCE_STANDARD', label: 'Reference Standard' },
    ];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        supplier: true,
        recipeComponents: {
          include: {
            recipe: {
              select: {
                id: true,
                code: true,
                name: true,
                version: true,
                status: true,
                product: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = req.body;
    
    const existingCode = await prisma.material.findUnique({
      where: { code: data.code },
    });
    
    if (existingCode) {
      return res.status(400).json({ error: 'Material code already exists' });
    }
    
    const material = await prisma.material.create({
      data: {
        code: data.code,
        name: data.name,
        nameAr: data.nameAr,
        description: data.description,
        category: data.category,
        unit: data.unit,
        minStockLevel: data.minStockLevel || 0,
        reorderPoint: data.reorderPoint || 0,
        reorderQuantity: data.reorderQuantity || 0,
        leadTimeDays: data.leadTimeDays || 7,
        shelfLifeDays: data.shelfLifeDays,
        storageConditions: data.storageConditions,
        handlingInstructions: data.handlingInstructions,
        hazardClass: data.hazardClass,
        casNumber: data.casNumber,
        supplierId: data.supplierId,
        preferredSupplierId: data.preferredSupplierId,
        unitCost: data.unitCost,
        currency: data.currency || 'SAR',
        status: data.status || 'ACTIVE',
        requiresQC: data.requiresQC || false,
        isRadioactive: data.isRadioactive || false,
        halfLifeMinutes: data.halfLifeMinutes,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MATERIAL_CREATED',
        entityType: 'Material',
        entityId: material.id,
        newValues: material,
      },
    });
    
    res.status(201).json(material);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const data = req.body;
    
    const existing = await prisma.material.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.material.findFirst({
        where: { code: data.code, id: { not: id } },
      });
      if (codeExists) {
        return res.status(400).json({ error: 'Material code already exists' });
      }
    }
    
    const material = await prisma.material.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        nameAr: data.nameAr,
        description: data.description,
        category: data.category,
        unit: data.unit,
        minStockLevel: data.minStockLevel,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        leadTimeDays: data.leadTimeDays,
        shelfLifeDays: data.shelfLifeDays,
        storageConditions: data.storageConditions,
        handlingInstructions: data.handlingInstructions,
        hazardClass: data.hazardClass,
        casNumber: data.casNumber,
        supplierId: data.supplierId,
        preferredSupplierId: data.preferredSupplierId,
        unitCost: data.unitCost,
        currency: data.currency,
        status: data.status,
        requiresQC: data.requiresQC,
        isRadioactive: data.isRadioactive,
        halfLifeMinutes: data.halfLifeMinutes,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MATERIAL_UPDATED',
        entityType: 'Material',
        entityId: id,
        oldValues: existing,
        newValues: material,
      },
    });
    
    res.json(material);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { recipeComponents: true },
        },
      },
    });
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    if (material._count.recipeComponents > 0) {
      return res.status(400).json({
        error: 'Cannot delete material that is used in recipes. Consider marking it as inactive instead.',
      });
    }
    
    await prisma.material.delete({
      where: { id },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MATERIAL_DELETED',
        entityType: 'Material',
        entityId: id,
        oldValues: material,
      },
    });
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

export default router;
