import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, supplierId, search, from, to } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (supplierId) {
      where.supplierId = supplierId;
    }
    
    if (search) {
      where.OR = [
        { poNumber: { contains: search as string, mode: 'insensitive' } },
        { supplier: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    
    if (from || to) {
      where.orderDate = {};
      if (from) where.orderDate.gte = new Date(from as string);
      if (to) where.orderDate.lte = new Date(to as string);
    }
    
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, code: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        _count: {
          select: { items: true, grns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, draft, pendingApproval, approved, sent, received] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      prisma.purchaseOrder.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.purchaseOrder.count({ where: { status: 'APPROVED' } }),
      prisma.purchaseOrder.count({ where: { status: 'SENT' } }),
      prisma.purchaseOrder.count({ where: { status: 'RECEIVED' } }),
    ]);
    
    const totalValue = await prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: { notIn: ['DRAFT', 'CANCELLED'] } },
    });
    
    res.json({
      total,
      draft,
      pendingApproval,
      approved,
      sent,
      received,
      totalValue: totalValue._sum.totalAmount || 0,
    });
  } catch (error) {
    console.error('Error fetching PO stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/next-number', async (req: Request, res: Response) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    
    const lastPO = await prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { poNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastPO) {
      const lastNum = parseInt(lastPO.poNumber.replace(prefix, ''), 10);
      nextNum = lastNum + 1;
    }
    
    res.json({ poNumber: `${prefix}${String(nextNum).padStart(5, '0')}` });
  } catch (error) {
    console.error('Error generating PO number:', error);
    res.status(500).json({ error: 'Failed to generate PO number' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          orderBy: { lineNumber: 'asc' },
        },
        grns: {
          include: {
            items: true,
          },
          orderBy: { receivedDate: 'desc' },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    
    if (!purchaseOrder) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      poNumber,
      supplierId,
      expectedDate,
      paymentTermsDays,
      deliveryTerms,
      shippingAddress,
      notes,
      items,
    } = req.body;
    
    if (!poNumber || !supplierId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'PO number, supplier, and at least one item are required',
      });
    }
    
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.orderedQty * item.unitPrice),
      0
    );
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        orderDate: new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        status: 'DRAFT',
        subtotal,
        taxAmount,
        totalAmount,
        paymentTermsDays: paymentTermsDays || 30,
        deliveryTerms,
        shippingAddress,
        notes,
        createdById: userId,
        items: {
          create: items.map((item: any, index: number) => ({
            lineNumber: index + 1,
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            orderedQty: item.orderedQty,
            unit: item.unit || 'EA',
            unitPrice: item.unitPrice,
            totalPrice: item.orderedQty * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_CREATED',
        entityType: 'PurchaseOrder',
        entityId: purchaseOrder.id,
        newValues: { poNumber, supplierId, totalAmount },
      },
    });
    
    res.status(201).json(purchaseOrder);
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'PO number already exists' });
    }
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { items, ...data } = req.body;
    
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      return res.status(400).json({
        error: 'Only draft or pending approval POs can be modified',
      });
    }
    
    await prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
        
        if (items.length > 0) {
          await tx.purchaseOrderItem.createMany({
            data: items.map((item: any, index: number) => ({
              poId: id,
              lineNumber: index + 1,
              itemCode: item.itemCode,
              itemName: item.itemName,
              description: item.description,
              orderedQty: item.orderedQty,
              unit: item.unit || 'EA',
              unitPrice: item.unitPrice,
              totalPrice: item.orderedQty * item.unitPrice,
            })),
          });
        }
      }
      
      const updatedItems = items || existing.items;
      const subtotal = updatedItems.reduce(
        (sum: number, item: any) => sum + (item.orderedQty * item.unitPrice),
        0
      );
      const taxAmount = subtotal * 0.15;
      const totalAmount = subtotal + taxAmount;
      
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          ...data,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          subtotal,
          taxAmount,
          totalAmount,
        },
      });
    });
    
    const updated = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_UPDATED',
        entityType: 'PurchaseOrder',
        entityId: id,
        oldValues: { status: existing.status },
        newValues: data,
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft POs can be submitted' });
    }
    
    if (po.items.length === 0) {
      return res.status(400).json({ error: 'PO must have at least one item' });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_SUBMITTED_FOR_APPROVAL',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'PENDING_APPROVAL' },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error submitting PO:', error);
    res.status(500).json({ error: 'Failed to submit PO for approval' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { signatureId } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only pending approval POs can be approved' });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_APPROVED',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'APPROVED', signatureId },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error approving PO:', error);
    res.status(500).json({ error: 'Failed to approve PO' });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'Only pending approval POs can be rejected' });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'DRAFT',
        notes: po.notes ? `${po.notes}\n\nRejected: ${reason}` : `Rejected: ${reason}`,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_REJECTED',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'DRAFT', reason },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting PO:', error);
    res.status(500).json({ error: 'Failed to reject PO' });
  }
});

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved POs can be sent' });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_SENT',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'SENT', supplierEmail: po.supplier.email },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error sending PO:', error);
    res.status(500).json({ error: 'Failed to send PO' });
  }
});

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { acknowledgementRef } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'SENT') {
      return res.status(400).json({ error: 'Only sent POs can be acknowledged' });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        notes: acknowledgementRef
          ? `${po.notes || ''}\nSupplier Ref: ${acknowledgementRef}`
          : po.notes,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_ACKNOWLEDGED',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'ACKNOWLEDGED', acknowledgementRef },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error acknowledging PO:', error);
    res.status(500).json({ error: 'Failed to acknowledge PO' });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (['RECEIVED', 'CLOSED', 'CANCELLED'].includes(po.status)) {
      return res.status(400).json({
        error: 'Cannot cancel a received, closed, or already cancelled PO',
      });
    }
    
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason
          ? `${po.notes || ''}\nCancellation reason: ${reason}`
          : po.notes,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_CANCELLED',
        entityType: 'PurchaseOrder',
        entityId: id,
        newValues: { status: 'CANCELLED', reason },
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error cancelling PO:', error);
    res.status(500).json({ error: 'Failed to cancel PO' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    
    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    if (po.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft POs can be deleted' });
    }
    
    await prisma.purchaseOrder.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PO_DELETED',
        entityType: 'PurchaseOrder',
        entityId: id,
        oldValues: { poNumber: po.poNumber },
      },
    });
    
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting PO:', error);
    res.status(500).json({ error: 'Failed to delete PO' });
  }
});

export default router;
