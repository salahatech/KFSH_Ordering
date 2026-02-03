import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, requireRole('Admin', 'Finance', 'Sales'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.invoice = { customerId };

    const [requests, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        include: {
          invoice: {
            include: {
              customer: true,
            }
          },
          submittedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    res.json({ data: requests, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error('List payment requests error:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

router.get('/stats', authenticateToken, requireRole('Admin', 'Finance', 'Sales'), async (req: Request, res: Response): Promise<void> => {
  try {
    const [pending, confirmed, rejected, totalPending] = await Promise.all([
      prisma.paymentRequest.count({ where: { status: 'PENDING_CONFIRMATION' } }),
      prisma.paymentRequest.count({ where: { status: 'CONFIRMED' } }),
      prisma.paymentRequest.count({ where: { status: 'REJECTED' } }),
      prisma.paymentRequest.aggregate({
        where: { status: 'PENDING_CONFIRMATION' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      pending,
      confirmed,
      rejected,
      totalPendingAmount: totalPending._sum?.amount || 0,
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

router.get('/:id', authenticateToken, requireRole('Admin', 'Finance', 'Sales'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          }
        },
        submittedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Payment request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('Get payment request error:', error);
    res.status(500).json({ error: 'Failed to fetch payment request' });
  }
});

router.post('/:id/confirm', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = (req as any).user;

    const request = await prisma.paymentRequest.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Payment request not found' });
      return;
    }

    if (request.status !== 'PENDING_CONFIRMATION') {
      res.status(400).json({ error: 'Payment request is not pending confirmation' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
        },
      });

      const receiptNumber = `RV-${Date.now()}`;
      const receiptVoucher = await tx.receiptVoucher.create({
        data: {
          receiptNumber,
          invoiceId: request.invoiceId,
          customerId: request.customerId,
          paymentRequestId: id,
          amount: request.amount,
          amountSAR: request.amountSAR,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          referenceNumber: request.referenceNumber,
          confirmedByUserId: user.id,
          confirmedAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          invoiceId: request.invoiceId,
          amount: request.amount,
          amountSAR: request.amountSAR,
          paymentMethod: request.paymentMethod,
          paymentDate: new Date(),
          referenceNumber: request.referenceNumber || receiptNumber,
          receiptVoucherId: receiptVoucher.id,
          notes: notes || `Confirmed payment from customer submission (${receiptNumber})`,
        },
      });

      const newPaidAmount = request.invoice.paidAmount + request.amount;
      const newStatus = newPaidAmount >= request.invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: request.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'PaymentRequest',
          entityId: id,
          action: 'CONFIRM',
          userId: user.id,
          newValues: { status: 'CONFIRMED', receiptNumber },
        },
      });

      // Create payment event
      await tx.paymentEvent.create({
        data: {
          paymentRequestId: id,
          receiptVoucherId: receiptVoucher.id,
          eventType: 'PAYMENT_CONFIRMED',
          description: `Payment of ${request.amount} ${request.currency} confirmed`,
          userId: user.id,
          metadata: { receiptNumber, amount: request.amount },
        },
      });

      // Create invoice event
      await tx.invoiceEvent.create({
        data: {
          invoiceId: request.invoiceId,
          eventType: 'PAYMENT_RECEIVED',
          description: `Payment of ${request.amount} ${request.currency} received and confirmed`,
          userId: user.id,
          metadata: { receiptNumber, amount: request.amount, newPaidAmount },
        },
      });

      return { updatedRequest, receiptVoucher };
    });

    res.json({
      message: 'Payment confirmed successfully',
      paymentRequest: result.updatedRequest,
      receiptVoucher: result.receiptVoucher,
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.post('/:id/reject', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = (req as any).user;

    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const request = await prisma.paymentRequest.findUnique({ where: { id } });

    if (!request) {
      res.status(404).json({ error: 'Payment request not found' });
      return;
    }

    if (request.status !== 'PENDING_CONFIRMATION') {
      res.status(400).json({ error: 'Payment request is not pending confirmation' });
      return;
    }

    const updatedRequest = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'PaymentRequest',
        entityId: id,
        action: 'REJECT',
        userId: user.id,
        newValues: { status: 'REJECTED', reason },
      },
    });

    // Create payment event for rejection
    await prisma.paymentEvent.create({
      data: {
        paymentRequestId: id,
        eventType: 'PAYMENT_REJECTED',
        description: `Payment of ${request.amount} rejected: ${reason}`,
        userId: user.id,
        metadata: { reason, amount: request.amount },
      },
    });

    res.json({
      message: 'Payment rejected',
      paymentRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

router.get('/receipts/list', authenticateToken, requireRole('Admin', 'Finance', 'Sales'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (customerId) where.customerId = customerId;

    const [vouchers, total] = await Promise.all([
      prisma.receiptVoucher.findMany({
        where,
        include: {
          invoice: { include: { customer: true } },
          confirmedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { confirmedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.receiptVoucher.count({ where }),
    ]);

    res.json({ data: vouchers, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error('List receipt vouchers error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt vouchers' });
  }
});

export default router;
