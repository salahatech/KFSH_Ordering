import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { warehouseId, materialId, status, search, lowStock } = req.query;
    
    const where: any = {};
    
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    
    if (materialId) {
      where.materialId = materialId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { material: { code: { contains: search as string, mode: 'insensitive' } } },
        { material: { name: { contains: search as string, mode: 'insensitive' } } },
        { lotNumber: { contains: search as string, mode: 'insensitive' } },
        { batchNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const stockItems = await prisma.stockItem.findMany({
      where,
      include: {
        material: {
          select: { id: true, code: true, name: true, unit: true, minStockLevel: true },
        },
        warehouse: {
          select: { id: true, code: true, name: true },
        },
        location: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    let result = stockItems;
    
    if (lowStock === 'true') {
      result = stockItems.filter(item => 
        item.material.minStockLevel > 0 && item.availableQty < item.material.minStockLevel
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching stock items:', error);
    res.status(500).json({ error: 'Failed to fetch stock items' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalItems, available, quarantine, reserved, onHold, expired] = await Promise.all([
      prisma.stockItem.count(),
      prisma.stockItem.count({ where: { status: 'AVAILABLE' } }),
      prisma.stockItem.count({ where: { status: 'QUARANTINE' } }),
      prisma.stockItem.count({ where: { status: 'RESERVED' } }),
      prisma.stockItem.count({ where: { status: 'ON_HOLD' } }),
      prisma.stockItem.count({ where: { status: 'EXPIRED' } }),
    ]);
    
    const totalValue = await prisma.stockItem.aggregate({
      _sum: { totalValue: true },
    });
    
    const lowStockItems = await prisma.stockItem.findMany({
      include: { material: true },
    });
    
    const lowStockCount = lowStockItems.filter(item => 
      item.material.minStockLevel > 0 && item.availableQty < item.material.minStockLevel
    ).length;
    
    const expiringThreshold = new Date();
    expiringThreshold.setDate(expiringThreshold.getDate() + 30);
    
    const expiringSoon = await prisma.stockItem.count({
      where: {
        expiryDate: { lte: expiringThreshold, gte: new Date() },
        status: { not: 'EXPIRED' },
      },
    });
    
    res.json({
      totalItems,
      available,
      quarantine,
      reserved,
      onHold,
      expired,
      lowStockCount,
      expiringSoon,
      totalValue: totalValue._sum.totalValue || 0,
    });
  } catch (error) {
    console.error('Error fetching stock stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await prisma.stockItem.groupBy({
      by: ['materialId', 'warehouseId'],
      _sum: {
        quantity: true,
        availableQty: true,
        reservedQty: true,
      },
    });
    
    const enrichedSummary = await Promise.all(
      summary.map(async (s) => {
        const material = await prisma.material.findUnique({
          where: { id: s.materialId },
          select: { code: true, name: true, unit: true, minStockLevel: true },
        });
        const warehouse = await prisma.warehouse.findUnique({
          where: { id: s.warehouseId },
          select: { code: true, name: true },
        });
        return {
          ...s,
          material,
          warehouse,
        };
      })
    );
    
    res.json(enrichedSummary);
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ error: 'Failed to fetch stock summary' });
  }
});

router.get('/movements', async (req: Request, res: Response) => {
  try {
    const { warehouseId, stockItemId, type, from, to, search } = req.query;
    
    const where: any = {};
    
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    
    if (stockItemId) {
      where.stockItemId = stockItemId;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (from || to) {
      where.performedAt = {};
      if (from) where.performedAt.gte = new Date(from as string);
      if (to) where.performedAt.lte = new Date(to as string);
    }
    
    if (search) {
      where.OR = [
        { movementNumber: { contains: search as string, mode: 'insensitive' } },
        { referenceNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        stockItem: {
          include: {
            material: {
              select: { code: true, name: true },
            },
          },
        },
        warehouse: {
          select: { code: true, name: true },
        },
      },
      orderBy: { performedAt: 'desc' },
      take: 500,
    });
    
    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        material: true,
        warehouse: true,
        location: true,
        movements: {
          orderBy: { performedAt: 'desc' },
          take: 20,
        },
      },
    });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    res.json(stockItem);
  } catch (error) {
    console.error('Error fetching stock item:', error);
    res.status(500).json({ error: 'Failed to fetch stock item' });
  }
});

router.post('/adjust', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { stockItemId, adjustmentQty, reason, notes } = req.body;
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
    });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Adjustment reason is required' });
    }
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `SM-${year}${month}-`;
    
    const lastMovement = await prisma.stockMovement.findFirst({
      where: { movementNumber: { startsWith: prefix } },
      orderBy: { movementNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastMovement) {
      const lastNum = parseInt(lastMovement.movementNumber.replace(prefix, ''));
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    const movementNumber = `${prefix}${String(nextNum).padStart(5, '0')}`;
    const movementType = adjustmentQty >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: {
          quantity: { increment: adjustmentQty },
          availableQty: { increment: adjustmentQty },
        },
      });
      
      await tx.stockMovement.create({
        data: {
          movementNumber,
          stockItemId,
          warehouseId: stockItem.warehouseId,
          type: movementType,
          quantity: Math.abs(adjustmentQty),
          unit: stockItem.unit,
          reason,
          notes,
          performedById: userId,
        },
      });
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_ADJUSTED',
        entityType: 'StockItem',
        entityId: stockItemId,
        newValues: { adjustmentQty, reason, movementNumber },
      },
    });
    
    const updated = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: { material: true, warehouse: true },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { stockItemId, toWarehouseId, toLocationId, quantity, reason, notes } = req.body;
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: { material: true },
    });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    if (quantity > stockItem.availableQty) {
      return res.status(400).json({ error: 'Insufficient available quantity' });
    }
    
    if (toWarehouseId === stockItem.warehouseId && toLocationId === stockItem.locationId) {
      return res.status(400).json({ error: 'Cannot transfer to same location' });
    }
    
    const toWarehouse = await prisma.warehouse.findUnique({
      where: { id: toWarehouseId },
    });
    
    if (!toWarehouse) {
      return res.status(404).json({ error: 'Destination warehouse not found' });
    }
    
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `SM-${year}${month}-`;
    
    const lastMovement = await prisma.stockMovement.findFirst({
      where: { movementNumber: { startsWith: prefix } },
      orderBy: { movementNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastMovement) {
      const lastNum = parseInt(lastMovement.movementNumber.replace(prefix, ''));
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: {
          quantity: { decrement: quantity },
          availableQty: { decrement: quantity },
        },
      });
      
      const outMovementNumber = `${prefix}${String(nextNum++).padStart(5, '0')}`;
      await tx.stockMovement.create({
        data: {
          movementNumber: outMovementNumber,
          stockItemId,
          warehouseId: stockItem.warehouseId,
          type: 'TRANSFER_OUT',
          quantity,
          unit: stockItem.unit,
          toLocationId,
          reason,
          notes,
          performedById: userId,
        },
      });
      
      let targetStockItem = await tx.stockItem.findFirst({
        where: {
          materialId: stockItem.materialId,
          warehouseId: toWarehouseId,
          lotNumber: stockItem.lotNumber,
          batchNumber: stockItem.batchNumber,
          locationId: toLocationId,
        },
      });
      
      if (targetStockItem) {
        targetStockItem = await tx.stockItem.update({
          where: { id: targetStockItem.id },
          data: {
            quantity: { increment: quantity },
            availableQty: { increment: quantity },
          },
        });
      } else {
        targetStockItem = await tx.stockItem.create({
          data: {
            materialId: stockItem.materialId,
            warehouseId: toWarehouseId,
            locationId: toLocationId,
            quantity,
            availableQty: quantity,
            unit: stockItem.unit,
            lotNumber: stockItem.lotNumber,
            batchNumber: stockItem.batchNumber,
            expiryDate: stockItem.expiryDate,
            manufacturingDate: stockItem.manufacturingDate,
            receivedDate: stockItem.receivedDate,
            status: stockItem.status,
            unitCost: stockItem.unitCost,
            supplierId: stockItem.supplierId,
          },
        });
      }
      
      const inMovementNumber = `${prefix}${String(nextNum++).padStart(5, '0')}`;
      await tx.stockMovement.create({
        data: {
          movementNumber: inMovementNumber,
          stockItemId: targetStockItem.id,
          warehouseId: toWarehouseId,
          type: 'TRANSFER_IN',
          quantity,
          unit: stockItem.unit,
          fromLocationId: stockItem.locationId,
          reason,
          notes,
          performedById: userId,
        },
      });
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_TRANSFERRED',
        entityType: 'StockItem',
        entityId: stockItemId,
        newValues: { toWarehouseId, quantity, reason },
      },
    });
    
    res.json({ success: true, message: 'Stock transferred successfully' });
  } catch (error) {
    console.error('Error transferring stock:', error);
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
});

router.post('/reserve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { stockItemId, quantity, referenceType, referenceId, referenceNumber } = req.body;
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
    });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    if (quantity > stockItem.availableQty) {
      return res.status(400).json({ error: 'Insufficient available quantity' });
    }
    
    const updated = await prisma.stockItem.update({
      where: { id: stockItemId },
      data: {
        reservedQty: { increment: quantity },
        availableQty: { decrement: quantity },
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_RESERVED',
        entityType: 'StockItem',
        entityId: stockItemId,
        newValues: { quantity, referenceType, referenceId, referenceNumber },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error reserving stock:', error);
    res.status(500).json({ error: 'Failed to reserve stock' });
  }
});

router.post('/release-reservation', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { stockItemId, quantity, reason } = req.body;
    
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId },
    });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    if (quantity > stockItem.reservedQty) {
      return res.status(400).json({ error: 'Cannot release more than reserved quantity' });
    }
    
    const updated = await prisma.stockItem.update({
      where: { id: stockItemId },
      data: {
        reservedQty: { decrement: quantity },
        availableQty: { increment: quantity },
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_RESERVATION_RELEASED',
        entityType: 'StockItem',
        entityId: stockItemId,
        newValues: { quantity, reason },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: 'Failed to release reservation' });
  }
});

router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const stockItem = await prisma.stockItem.findUnique({ where: { id } });
    
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    const updated = await prisma.stockItem.update({
      where: { id },
      data: { status, notes: reason ? `${stockItem.notes || ''}\n${reason}` : stockItem.notes },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'STOCK_STATUS_CHANGED',
        entityType: 'StockItem',
        entityId: id,
        oldValues: { status: stockItem.status },
        newValues: { status, reason },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating stock status:', error);
    res.status(500).json({ error: 'Failed to update stock status' });
  }
});

export default router;
