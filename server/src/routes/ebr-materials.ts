import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/:batchRecordId/materials', async (req: Request, res: Response) => {
  try {
    const consumptions = await (prisma as any).batchMaterialConsumption.findMany({
      where: { batchRecordId: req.params.batchRecordId },
      include: {
        material: true,
        stockItem: true,
        stockMovement: true,
        warehouse: true,
        consumedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { consumedAt: 'asc' }
    });

    res.json(consumptions);
  } catch (error) {
    console.error('Error fetching material consumptions:', error);
    res.status(500).json({ error: 'Failed to fetch material consumptions' });
  }
});

router.post('/:batchRecordId/materials', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchRecordId } = req.params;
    const { materialId, stockItemId, quantity, unit, warehouseId, lotNumber, notes } = req.body;

    const batchRecord = await (prisma as any).batchRecord.findUnique({
      where: { id: batchRecordId }
    });
    if (!batchRecord) {
      return res.status(404).json({ error: 'Batch record not found' });
    }
    if (batchRecord.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Batch record must be IN_PROGRESS to consume materials' });
    }

    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: { material: true }
    });
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    if (stockItem.availableQty < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${stockItem.availableQty}, Requested: ${quantity}` });
    }

    const count = await prisma.stockMovement.count();
    const movementNumber = `MOV-${String(count + 1).padStart(6, '0')}`;

    const [consumption, stockMovement, updatedStock] = await prisma.$transaction([
      (prisma as any).batchMaterialConsumption.create({
        data: {
          batchRecordId,
          materialId,
          stockItemId,
          quantity,
          unit: unit || stockItem.unit,
          warehouseId,
          lotNumber: lotNumber || stockItem.lotNumber,
          consumedById: userId,
          notes
        }
      }),
      prisma.stockMovement.create({
        data: {
          movementNumber,
          stockItemId,
          warehouseId,
          type: 'PRODUCTION_ISSUE',
          quantity: -quantity,
          unit: unit || stockItem.unit,
          referenceType: 'BatchRecord',
          referenceId: batchRecordId,
          referenceNumber: batchRecord.recordNumber,
          reason: 'Material consumption for batch production',
          notes,
          performedById: userId
        }
      }),
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: {
          availableQty: { decrement: quantity }
        }
      })
    ]);

    await (prisma as any).batchMaterialConsumption.update({
      where: { id: consumption.id },
      data: { stockMovementId: stockMovement.id }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'BatchMaterialConsumption',
        entityId: consumption.id,
        newValues: { materialId, stockItemId, quantity, batchRecordId }
      }
    });

    res.status(201).json({
      consumption,
      stockMovement,
      remainingStock: updatedStock.availableQty
    });
  } catch (error) {
    console.error('Error consuming material:', error);
    res.status(500).json({ error: 'Failed to consume material' });
  }
});

router.get('/:batchRecordId/available-materials', async (req: Request, res: Response) => {
  try {
    const { batchRecordId } = req.params;
    
    const batchRecord = await (prisma as any).batchRecord.findUnique({
      where: { id: batchRecordId },
      include: {
        recipe: {
          include: {
            components: { include: { material: true } }
          }
        }
      }
    });

    if (!batchRecord) {
      return res.status(404).json({ error: 'Batch record not found' });
    }

    const materialIds = batchRecord.recipe.components.map((c: any) => c.materialId);

    const stockItems = await prisma.stockItem.findMany({
      where: {
        materialId: { in: materialIds },
        status: 'AVAILABLE',
        availableQty: { gt: 0 }
      },
      include: {
        material: true,
        warehouse: true
      },
      orderBy: [
        { expiryDate: 'asc' },
        { availableQty: 'desc' }
      ]
    });

    const materialWithStock = batchRecord.recipe.components.map((component: any) => ({
      component,
      availableStock: stockItems.filter((s: any) => s.materialId === component.materialId)
    }));

    res.json(materialWithStock);
  } catch (error) {
    console.error('Error fetching available materials:', error);
    res.status(500).json({ error: 'Failed to fetch available materials' });
  }
});

router.delete('/:batchRecordId/materials/:consumptionId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { batchRecordId, consumptionId } = req.params;
    const { reason } = req.body;

    const consumption = await (prisma as any).batchMaterialConsumption.findFirst({
      where: { id: consumptionId, batchRecordId }
    });

    if (!consumption) {
      return res.status(404).json({ error: 'Material consumption not found' });
    }

    const batchRecord = await (prisma as any).batchRecord.findUnique({
      where: { id: batchRecordId }
    });
    if (batchRecord.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot reverse consumption on a batch record not IN_PROGRESS' });
    }

    const count = await prisma.stockMovement.count();
    const movementNumber = `MOV-${String(count + 1).padStart(6, '0')}`;

    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          movementNumber,
          stockItemId: consumption.stockItemId,
          warehouseId: consumption.warehouseId,
          type: 'RETURN',
          quantity: consumption.quantity,
          unit: consumption.unit,
          referenceType: 'BatchRecord',
          referenceId: batchRecordId,
          referenceNumber: batchRecord.recordNumber,
          reason: reason || 'Material consumption reversal',
          performedById: userId
        }
      }),
      prisma.stockItem.update({
        where: { id: consumption.stockItemId },
        data: {
          availableQty: { increment: consumption.quantity }
        }
      }),
      (prisma as any).batchMaterialConsumption.delete({
        where: { id: consumptionId }
      })
    ]);

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'BatchMaterialConsumption',
        entityId: consumptionId,
        oldValues: consumption,
        newValues: { reason }
      }
    });

    res.json({ message: 'Material consumption reversed successfully' });
  } catch (error) {
    console.error('Error reversing material consumption:', error);
    res.status(500).json({ error: 'Failed to reverse material consumption' });
  }
});

export default router;
