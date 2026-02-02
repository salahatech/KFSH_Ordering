import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, status, startDate, endDate, overdue } = req.query;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['SENT', 'PARTIALLY_PAID'] };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
        payments: true,
        _count: { select: { items: true } },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100,
    });

    res.json(invoices);
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      contractId,
      dueDate,
      items,
      notes,
      taxRate,
    } = req.body;

    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      subtotal += lineTotal;
      return {
        ...item,
        lineTotal,
      };
    });

    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const totalAmount = subtotal + taxAmount;

    const contract = contractId ? await prisma.contract.findUnique({ where: { id: contractId } }) : null;
    const discountAmount = contract ? subtotal * (contract.discountPercent / 100) : 0;
    const finalTotal = totalAmount - discountAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        contractId: contractId || null,
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + (contract?.paymentTermsDays || 30) * 24 * 60 * 60 * 1000),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount: finalTotal,
        paidAmount: 0,
        status: 'DRAFT',
        notes,
        items: {
          create: processedItems.map((item: any) => ({
            orderId: item.orderId || null,
            doseUnitId: item.doseUnitId || null,
            description: item.description,
            productId: item.productId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxPercent: taxRate || 0,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Invoice', invoice.id, null, invoice, req);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.post('/generate-from-orders', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds, customerId, taxRate } = req.body;

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        customerId,
        status: 'DELIVERED',
      },
      include: {
        product: true,
        customer: true,
        doseUnits: true,
      },
    });

    if (orders.length === 0) {
      res.status(400).json({ error: 'No delivered orders found' });
      return;
    }

    const contract = await prisma.contract.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: { priceItems: true },
    });

    const items = orders.map(order => {
      const contractPrice = contract?.priceItems.find(p => p.productId === order.productId);
      const unitPrice = contractPrice?.unitPrice || 100;
      const quantity = order.requestedActivity;
      const discountPercent = contractPrice?.discountPercent || 0;
      const lineTotal = quantity * unitPrice * (1 - discountPercent / 100);

      return {
        orderId: order.id,
        description: `${order.product.name} - Order ${order.orderNumber}`,
        productId: order.productId,
        quantity,
        unitPrice,
        discountPercent,
        taxPercent: taxRate || 0,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * ((taxRate || 0) / 100);
    const discountAmount = contract ? subtotal * (contract.discountPercent / 100) : 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        contractId: contract?.id || null,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + (contract?.paymentTermsDays || 30) * 24 * 60 * 60 * 1000),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        status: 'DRAFT',
        items: {
          create: items,
        },
      },
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Invoice', invoice.id, null, { orderIds }, req);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Generate invoice from orders error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

router.put('/:id/send', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only draft invoices can be sent' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT' },
      include: { customer: true, items: true },
    });

    await createAuditLog(req.user?.userId, 'SEND', 'Invoice', id, 
      { status: 'DRAFT' }, { status: 'SENT' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

router.post('/:id/payments', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, notes } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount,
        paymentMethod,
        referenceNumber,
        notes,
      },
    });

    const newPaidAmount = invoice.paidAmount + amount;
    const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    await createAuditLog(req.user?.userId, 'PAYMENT', 'Invoice', id, 
      { paidAmount: invoice.paidAmount }, { paidAmount: newPaidAmount, payment }, req);

    res.json({ invoice: updatedInvoice, payment });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

router.put('/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.paidAmount > 0) {
      res.status(400).json({ error: 'Cannot cancel invoice with payments' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        notes: reason ? `${invoice.notes || ''}\nCancelled: ${reason}`.trim() : invoice.notes,
      },
    });

    await createAuditLog(req.user?.userId, 'CANCEL', 'Invoice', id, 
      { status: invoice.status }, { status: 'CANCELLED', reason }, req);

    res.json(updated);
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ error: 'Failed to cancel invoice' });
  }
});

router.get('/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, startDate, endDate } = req.query;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }

    const invoices = await prisma.invoice.findMany({ where });

    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0),
      byStatus: {
        draft: invoices.filter(inv => inv.status === 'DRAFT').length,
        sent: invoices.filter(inv => inv.status === 'SENT').length,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        partiallyPaid: invoices.filter(inv => inv.status === 'PARTIALLY_PAID').length,
        overdue: invoices.filter(inv => ['SENT', 'PARTIALLY_PAID'].includes(inv.status) && inv.dueDate < new Date()).length,
      },
    };

    res.json(summary);
  } catch (error) {
    console.error('Get invoice summary error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

export default router;
