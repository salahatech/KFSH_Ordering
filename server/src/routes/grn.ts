import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, supplierId, poId, search, from, to } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (supplierId) {
      where.supplierId = supplierId;
    }
    
    if (poId) {
      where.poId = poId;
    }
    
    if (search) {
      where.OR = [
        { grnNumber: { contains: search as string, mode: 'insensitive' } },
        { deliveryNoteNumber: { contains: search as string, mode: 'insensitive' } },
        { purchaseOrder: { poNumber: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    
    if (from || to) {
      where.receivedDate = {};
      if (from) where.receivedDate.gte = new Date(from as string);
      if (to) where.receivedDate.lte = new Date(to as string);
    }
    
    const grns = await prisma.goodsReceivedNote.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true, status: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { receivedDate: 'desc' },
    });
    
    res.json(grns);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: 'Failed to fetch GRNs' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, draft, pendingQC, approved, partiallyApproved, rejected] = await Promise.all([
      prisma.goodsReceivedNote.count(),
      prisma.goodsReceivedNote.count({ where: { status: 'DRAFT' } }),
      prisma.goodsReceivedNote.count({ where: { status: 'PENDING_QC' } }),
      prisma.goodsReceivedNote.count({ where: { status: 'APPROVED' } }),
      prisma.goodsReceivedNote.count({ where: { status: 'PARTIALLY_APPROVED' } }),
      prisma.goodsReceivedNote.count({ where: { status: 'REJECTED' } }),
    ]);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const receivedToday = await prisma.goodsReceivedNote.count({
      where: { receivedDate: { gte: todayStart } },
    });
    
    res.json({
      total,
      draft,
      pendingQC,
      approved,
      partiallyApproved,
      rejected,
      receivedToday,
    });
  } catch (error) {
    console.error('Error fetching GRN stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/next-number', async (req: Request, res: Response) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;
    
    const lastGRN = await prisma.goodsReceivedNote.findFirst({
      where: { grnNumber: { startsWith: prefix } },
      orderBy: { grnNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastGRN) {
      const lastNum = parseInt(lastGRN.grnNumber.replace(prefix, ''));
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    res.json({ nextNumber: `${prefix}${String(nextNum).padStart(4, '0')}` });
  } catch (error) {
    console.error('Error generating GRN number:', error);
    res.status(500).json({ error: 'Failed to generate GRN number' });
  }
});

router.get('/pending-pos', async (req: Request, res: Response) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'] },
      },
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        items: true,
      },
      orderBy: { expectedDate: 'asc' },
    });
    
    res.json(pos);
  } catch (error) {
    console.error('Error fetching pending POs:', error);
    res.status(500).json({ error: 'Failed to fetch pending POs' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: { items: true },
        },
        items: {
          include: {
            poItem: true,
          },
        },
      },
    });
    
    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    res.json(grn);
  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({ error: 'Failed to fetch GRN' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { poId, deliveryNoteNumber, notes, items } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { supplier: true, items: true },
    });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (!['SENT', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      return res.status(400).json({ error: 'PO is not in a receivable state' });
    }
    
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;
    const lastGRN = await prisma.goodsReceivedNote.findFirst({
      where: { grnNumber: { startsWith: prefix } },
      orderBy: { grnNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastGRN) {
      const lastNum = parseInt(lastGRN.grnNumber.replace(prefix, ''));
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    
    const grnNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;
    
    const grn = await prisma.$transaction(async (tx) => {
      const newGRN = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          poId,
          supplierId: po.supplierId,
          deliveryNoteNumber,
          notes,
          receivedById: userId,
          status: 'DRAFT',
        },
      });
      
      if (items && items.length > 0) {
        await tx.gRNItem.createMany({
          data: items.map((item: any) => ({
            grnId: newGRN.id,
            poItemId: item.poItemId,
            receivedQty: item.receivedQty,
            unit: item.unit || 'EA',
            lotNumber: item.lotNumber,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            warehouseId: item.warehouseId,
            binLocation: item.binLocation,
            notes: item.notes,
            status: 'QUARANTINE',
          })),
        });
      }
      
      return newGRN;
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_CREATED',
        entityType: 'GoodsReceivedNote',
        entityId: grn.id,
        newValues: { grnNumber, poId, itemCount: items?.length || 0 },
      },
    });
    
    const fullGRN = await prisma.goodsReceivedNote.findUnique({
      where: { id: grn.id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { poItem: true } },
      },
    });
    
    res.status(201).json(fullGRN);
  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: 'Failed to create GRN' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { deliveryNoteNumber, notes, items } = req.body;
    
    const existing = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft GRNs can be edited' });
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.goodsReceivedNote.update({
        where: { id },
        data: { deliveryNoteNumber, notes },
      });
      
      if (items) {
        await tx.gRNItem.deleteMany({ where: { grnId: id } });
        
        await tx.gRNItem.createMany({
          data: items.map((item: any) => ({
            grnId: id,
            poItemId: item.poItemId,
            receivedQty: item.receivedQty,
            unit: item.unit || 'EA',
            lotNumber: item.lotNumber,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            warehouseId: item.warehouseId,
            binLocation: item.binLocation,
            notes: item.notes,
            status: 'QUARANTINE',
          })),
        });
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_UPDATED',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        oldValues: { deliveryNoteNumber: existing.deliveryNoteNumber },
        newValues: { deliveryNoteNumber, notes },
      },
    });
    
    const updated = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { poItem: true } },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating GRN:', error);
    res.status(500).json({ error: 'Failed to update GRN' });
  }
});

router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (grn.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft GRNs can be submitted' });
    }
    
    if (grn.items.length === 0) {
      return res.status(400).json({ error: 'GRN must have at least one item' });
    }
    
    const updated = await prisma.goodsReceivedNote.update({
      where: { id },
      data: { status: 'PENDING_QC' },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_SUBMITTED_FOR_QC',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        newValues: { status: 'PENDING_QC' },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error submitting GRN:', error);
    res.status(500).json({ error: 'Failed to submit GRN for QC' });
  }
});

router.post('/:id/approve-item/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id, itemId } = req.params;
    const { acceptedQty, rejectedQty, rejectionReason, warehouseId, binLocation } = req.body;
    
    const item = await prisma.gRNItem.findFirst({
      where: { id: itemId, grnId: id },
    });
    
    if (!item) {
      return res.status(404).json({ error: 'GRN item not found' });
    }
    
    const totalQty = (acceptedQty || 0) + (rejectedQty || 0);
    if (totalQty > item.receivedQty) {
      return res.status(400).json({ error: 'Total qty cannot exceed received qty' });
    }
    
    let newStatus: 'RELEASED' | 'REJECTED' = 'RELEASED';
    if (acceptedQty === 0 && rejectedQty > 0) {
      newStatus = 'REJECTED';
    }
    
    const updated = await prisma.gRNItem.update({
      where: { id: itemId },
      data: {
        acceptedQty: acceptedQty || 0,
        rejectedQty: rejectedQty || 0,
        rejectionReason,
        warehouseId,
        binLocation,
        status: newStatus,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_ITEM_QC_COMPLETED',
        entityType: 'GRNItem',
        entityId: itemId,
        newValues: { acceptedQty, rejectedQty, status: newStatus },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error approving GRN item:', error);
    res.status(500).json({ error: 'Failed to approve GRN item' });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        items: { include: { poItem: true } },
        purchaseOrder: { include: { items: true } },
      },
    });
    
    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (grn.status !== 'PENDING_QC') {
      return res.status(400).json({ error: 'GRN is not pending QC' });
    }
    
    const pendingItems = grn.items.filter(i => i.status === 'QUARANTINE');
    if (pendingItems.length > 0) {
      return res.status(400).json({ error: 'All items must be QC reviewed before completing' });
    }
    
    const allRejected = grn.items.every(i => i.status === 'REJECTED');
    const allApproved = grn.items.every(i => i.status === 'RELEASED');
    
    let grnStatus: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' = 'PARTIALLY_APPROVED';
    if (allRejected) {
      grnStatus = 'REJECTED';
    } else if (allApproved) {
      grnStatus = 'APPROVED';
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.goodsReceivedNote.update({
        where: { id },
        data: {
          status: grnStatus,
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
      
      for (const item of grn.items) {
        if (item.status === 'RELEASED' && item.acceptedQty > 0) {
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: {
              receivedQty: {
                increment: item.acceptedQty,
              },
            },
          });
        }
      }
      
      const updatedPOItems = await tx.purchaseOrderItem.findMany({
        where: { poId: grn.poId },
      });
      
      const allReceived = updatedPOItems.every(i => i.receivedQty >= i.orderedQty);
      const someReceived = updatedPOItems.some(i => i.receivedQty > 0);
      
      let poStatus = grn.purchaseOrder.status;
      if (allReceived) {
        poStatus = 'RECEIVED';
      } else if (someReceived) {
        poStatus = 'PARTIALLY_RECEIVED';
      }
      
      if (poStatus !== grn.purchaseOrder.status) {
        await tx.purchaseOrder.update({
          where: { id: grn.poId },
          data: { status: poStatus },
        });
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_COMPLETED',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        newValues: { status: grnStatus },
      },
    });
    
    const updated = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: { include: { poItem: true } },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error completing GRN:', error);
    res.status(500).json({ error: 'Failed to complete GRN' });
  }
});

router.post('/:id/post-to-stock', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const grn = await prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        items: { include: { poItem: true } },
        purchaseOrder: true,
      },
    });
    
    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(grn.status)) {
      return res.status(400).json({ error: 'GRN must be approved before posting to stock' });
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
      for (const item of grn.items) {
        if (item.status === 'RELEASED' && item.acceptedQty > 0 && item.warehouseId) {
          const movementNumber = `${prefix}${String(nextNum++).padStart(5, '0')}`;
          
          let stockItem = await tx.stockItem.findFirst({
            where: {
              materialId: item.poItem.itemCode,
              warehouseId: item.warehouseId,
              lotNumber: item.lotNumber,
              batchNumber: item.batchNumber,
            },
          });
          
          const material = await tx.material.findFirst({
            where: { code: item.poItem.itemCode },
          });
          
          if (!material) {
            const newMaterial = await tx.material.create({
              data: {
                code: item.poItem.itemCode,
                name: item.poItem.itemName,
                category: 'RAW_MATERIAL',
                unit: item.unit,
              },
            });
            
            stockItem = await tx.stockItem.create({
              data: {
                materialId: newMaterial.id,
                warehouseId: item.warehouseId,
                quantity: item.acceptedQty,
                availableQty: item.acceptedQty,
                unit: item.unit,
                lotNumber: item.lotNumber,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                manufacturingDate: item.manufacturingDate,
                receivedDate: grn.receivedDate,
                status: 'AVAILABLE',
                supplierId: grn.supplierId,
                grnItemId: item.id,
                poNumber: grn.purchaseOrder.poNumber,
                unitCost: item.poItem.unitPrice,
              },
            });
          } else if (stockItem) {
            stockItem = await tx.stockItem.update({
              where: { id: stockItem.id },
              data: {
                quantity: { increment: item.acceptedQty },
                availableQty: { increment: item.acceptedQty },
              },
            });
          } else {
            stockItem = await tx.stockItem.create({
              data: {
                materialId: material.id,
                warehouseId: item.warehouseId,
                quantity: item.acceptedQty,
                availableQty: item.acceptedQty,
                unit: item.unit,
                lotNumber: item.lotNumber,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                manufacturingDate: item.manufacturingDate,
                receivedDate: grn.receivedDate,
                status: 'AVAILABLE',
                supplierId: grn.supplierId,
                grnItemId: item.id,
                poNumber: grn.purchaseOrder.poNumber,
                unitCost: item.poItem.unitPrice,
              },
            });
          }
          
          await tx.stockMovement.create({
            data: {
              movementNumber,
              stockItemId: stockItem.id,
              warehouseId: item.warehouseId,
              type: 'RECEIPT',
              quantity: item.acceptedQty,
              unit: item.unit,
              toLocationId: null,
              referenceType: 'GRN',
              referenceId: grn.id,
              referenceNumber: grn.grnNumber,
              reason: 'Goods receipt from PO',
              performedById: userId,
            },
          });
        }
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_POSTED_TO_STOCK',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        newValues: { grnNumber: grn.grnNumber },
      },
    });
    
    res.json({ success: true, message: 'GRN posted to stock successfully' });
  } catch (error) {
    console.error('Error posting GRN to stock:', error);
    res.status(500).json({ error: 'Failed to post GRN to stock' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const grn = await prisma.goodsReceivedNote.findUnique({ where: { id } });
    
    if (!grn) {
      return res.status(404).json({ error: 'GRN not found' });
    }
    
    if (grn.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft GRNs can be deleted' });
    }
    
    await prisma.goodsReceivedNote.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GRN_DELETED',
        entityType: 'GoodsReceivedNote',
        entityId: id,
        oldValues: { grnNumber: grn.grnNumber },
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting GRN:', error);
    res.status(500).json({ error: 'Failed to delete GRN' });
  }
});

export default router;
