import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
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

async function createInvoiceEvent(invoiceId: string, eventType: string, description: string, userId?: string, metadata?: any) {
  return prisma.invoiceEvent.create({
    data: {
      invoiceId,
      eventType,
      description,
      userId,
      metadata,
    },
  });
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, status, startDate, endDate, overdue, tab } = req.query;
    const user = (req as any).user;

    const where: any = {};
    
    if (user.role === 'Customer') {
      where.customerId = user.customerId;
      where.status = { in: ['ISSUED_POSTED', 'PARTIALLY_PAID', 'PAID', 'CLOSED_ARCHIVED', 'OVERDUE'] };
    } else if (customerId) {
      where.customerId = customerId;
    }
    
    if (status) {
      where.status = status;
    } else if (tab) {
      switch (tab) {
        case 'draft': where.status = 'DRAFT'; break;
        case 'pending': where.status = 'PENDING_APPROVAL'; break;
        case 'issued': where.status = 'ISSUED_POSTED'; break;
        case 'partial': where.status = 'PARTIALLY_PAID'; break;
        case 'paid': where.status = { in: ['PAID', 'CLOSED_ARCHIVED'] }; break;
        case 'voided': where.status = 'CANCELLED_VOIDED'; break;
      }
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate as string);
      if (endDate) where.invoiceDate.lte = new Date(endDate as string);
    }
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
        payments: true,
        paymentRequests: true,
        _count: { select: { items: true, events: true } },
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

router.get('/stats', authenticateToken, requireRole('Admin', 'Finance', 'Sales'), async (req: Request, res: Response): Promise<void> => {
  try {
    const [statusCounts, outstanding, overdue, pendingPayments] = await Promise.all([
      prisma.invoice.groupBy({
        by: ['status'],
        _count: true,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      prisma.invoice.count({
        where: {
          status: { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.paymentRequest.count({
        where: { status: 'PENDING_CONFIRMATION' },
      }),
    ]);

    const statusMap = Object.fromEntries(statusCounts.map(s => [s.status, { count: s._count, total: s._sum?.totalAmount || 0 }]));
    const outstandingAmount = (outstanding._sum?.totalAmount || 0) - (outstanding._sum?.paidAmount || 0);

    res.json({
      draft: statusMap['DRAFT']?.count || 0,
      pendingApproval: statusMap['PENDING_APPROVAL']?.count || 0,
      issued: statusMap['ISSUED_POSTED']?.count || 0,
      partial: statusMap['PARTIALLY_PAID']?.count || 0,
      paid: statusMap['PAID']?.count || 0,
      closed: statusMap['CLOSED_ARCHIVED']?.count || 0,
      voided: statusMap['CANCELLED_VOIDED']?.count || 0,
      outstanding: outstandingAmount,
      overdue,
      pendingPayments,
    });
  } catch (error) {
    console.error('Invoice stats error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice stats' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'Sales', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      contractId,
      orderId,
      shipmentId,
      dueDate,
      items,
      notes,
      taxRate,
      currency = 'SAR',
      fxRateToSAR = 1,
    } = req.body;
    const user = (req as any).user;

    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      subtotal += lineTotal;
      return { ...item, lineTotal };
    });

    const taxAmount = subtotal * ((taxRate || 15) / 100);
    const contract = contractId ? await prisma.contract.findUnique({ where: { id: contractId } }) : null;
    const discountAmount = contract ? subtotal * (contract.discountPercent / 100) : 0;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const totalAmountSAR = totalAmount * fxRateToSAR;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        contractId: contractId || null,
        orderId: orderId || null,
        shipmentId: shipmentId || null,
        invoiceDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + (contract?.paymentTermsDays || 30) * 24 * 60 * 60 * 1000),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        remainingAmount: totalAmount,
        currency,
        fxRateToSAR,
        totalAmountSAR,
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
            taxPercent: taxRate || 15,
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

    await createInvoiceEvent(invoice.id, 'INVOICE_CREATED', 'Invoice created manually', user.id);
    await createAuditLog(user.id, 'CREATE', 'Invoice', invoice.id, null, invoice, req);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.post('/generate-from-shipment', authenticateToken, requireRole('Admin', 'Sales', 'Finance', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { shipmentId, taxRate = 15, triggerSource } = req.body;
    const user = (req as any).user;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        customer: true,
        orders: {
          include: {
            product: true,
            doseUnits: { where: { status: 'DISPENSED' } },
          },
        },
      },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { shipmentId: shipment.id },
    });

    if (existingInvoice) {
      res.status(400).json({ error: 'Invoice already exists for this shipment', invoiceId: existingInvoice.id });
      return;
    }

    const contract = await prisma.contract.findFirst({
      where: {
        customerId: shipment.customerId,
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: { priceItems: true },
    });

    const items = shipment.orders.map(order => {
      const contractPrice = contract?.priceItems.find(p => p.productId === order.productId);
      const unitPrice = contractPrice?.unitPrice || 100;
      const quantity = order.doseUnits?.length || order.requestedActivity;
      const discountPercent = contractPrice?.discountPercent || 0;
      const lineTotal = quantity * unitPrice * (1 - discountPercent / 100);

      return {
        orderId: order.id,
        description: `${order.product.name} - Order ${order.orderNumber}`,
        productId: order.productId,
        quantity,
        unitPrice,
        discountPercent,
        taxPercent: taxRate,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = contract ? subtotal * (contract.discountPercent / 100) : 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        customerId: shipment.customerId,
        contractId: contract?.id || null,
        shipmentId: shipment.id,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + (contract?.paymentTermsDays || 30) * 24 * 60 * 60 * 1000),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        remainingAmount: totalAmount,
        paidAmount: 0,
        status: 'DRAFT',
        triggerSource: triggerSource || 'ON_DELIVERED',
        items: { create: items },
      },
      include: {
        customer: true,
        contract: true,
        items: { include: { product: true } },
      },
    });

    await createInvoiceEvent(invoice.id, 'INVOICE_CREATED_FROM_DELIVERY', 
      `Invoice auto-generated from shipment ${shipment.shipmentNumber}`, user?.id,
      { shipmentId: shipment.id, triggerSource });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Generate invoice from shipment error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

router.put('/:id/submit-for-approval', authenticateToken, requireRole('Admin', 'Sales', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only draft invoices can be submitted for approval' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
      include: { customer: true, items: true },
    });

    await createInvoiceEvent(id, 'SUBMITTED_FOR_APPROVAL', 'Invoice submitted for approval', user.id);
    await createAuditLog(user.id, 'SUBMIT_APPROVAL', 'Invoice', id, { status: 'DRAFT' }, { status: 'PENDING_APPROVAL' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Submit invoice for approval error:', error);
    res.status(500).json({ error: 'Failed to submit invoice for approval' });
  }
});

router.put('/:id/approve-post', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status !== 'PENDING_APPROVAL' && invoice.status !== 'DRAFT') {
      res.status(400).json({ error: 'Invoice is not pending approval' });
      return;
    }

    const now = new Date();
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'ISSUED_POSTED',
        postedAt: now,
        issuedAt: now,
        approvedByUserId: user.id,
      },
      include: { customer: true, items: true },
    });

    await createInvoiceEvent(id, 'APPROVED_POSTED', 'Invoice approved and posted', user.id, { approvedBy: user.email });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'INVOICE_ISSUED',
        title: 'Invoice Issued',
        message: `Invoice ${invoice.invoiceNumber} has been issued to ${updated.customer?.nameEn || 'customer'}`,
        entityType: 'Invoice',
        entityId: id,
      },
    });

    await createAuditLog(user.id, 'APPROVE_POST', 'Invoice', id, { status: invoice.status }, { status: 'ISSUED_POSTED' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Approve and post invoice error:', error);
    res.status(500).json({ error: 'Failed to approve and post invoice' });
  }
});

router.put('/:id/close', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.status !== 'PAID') {
      res.status(400).json({ error: 'Only fully paid invoices can be closed' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CLOSED_ARCHIVED',
        closedAt: new Date(),
      },
    });

    await createInvoiceEvent(id, 'CLOSED_ARCHIVED', 'Invoice closed and archived', user.id);
    await createAuditLog(user.id, 'CLOSE', 'Invoice', id, { status: 'PAID' }, { status: 'CLOSED_ARCHIVED' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Close invoice error:', error);
    res.status(500).json({ error: 'Failed to close invoice' });
  }
});

router.put('/:id/void', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    if (!reason) {
      res.status(400).json({ error: 'Void reason is required' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (invoice.paidAmount > 0) {
      res.status(400).json({ error: 'Cannot void invoice with payments. Create a credit note instead.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED_VOIDED',
        notes: `${invoice.notes || ''}\nVoided: ${reason}`.trim(),
      },
    });

    await createInvoiceEvent(id, 'VOIDED', `Invoice voided: ${reason}`, user.id, { reason });
    await createAuditLog(user.id, 'VOID', 'Invoice', id, { status: invoice.status }, { status: 'CANCELLED_VOIDED', reason }, req);

    res.json(updated);
  } catch (error) {
    console.error('Void invoice error:', error);
    res.status(500).json({ error: 'Failed to void invoice' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        contract: true,
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: { include: { product: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
        paymentRequests: {
          include: {
            submittedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
        receiptVouchers: { orderBy: { confirmedAt: 'desc' } },
        events: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (user.role === 'Customer') {
      if (invoice.customerId !== user.customerId) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      if (!['ISSUED_POSTED', 'PARTIALLY_PAID', 'PAID', 'CLOSED_ARCHIVED', 'OVERDUE'].includes(invoice.status)) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.get('/:id/events', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(events);
  } catch (error) {
    console.error('Get invoice events error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice events' });
  }
});

router.get('/summary/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const user = (req as any).user;

    const where: any = {};
    
    if (user.role === 'Customer') {
      where.customerId = user.customerId;
    } else if (customerId) {
      where.customerId = customerId;
    }
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
        pendingApproval: invoices.filter(inv => inv.status === 'PENDING_APPROVAL').length,
        issued: invoices.filter(inv => inv.status === 'ISSUED_POSTED').length,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        partiallyPaid: invoices.filter(inv => inv.status === 'PARTIALLY_PAID').length,
        closed: invoices.filter(inv => inv.status === 'CLOSED_ARCHIVED').length,
        overdue: invoices.filter(inv => ['ISSUED_POSTED', 'PARTIALLY_PAID'].includes(inv.status) && inv.dueDate < new Date()).length,
      },
    };

    res.json(summary);
  } catch (error) {
    console.error('Get invoice summary error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
});

export default router;
