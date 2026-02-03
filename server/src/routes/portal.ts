import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { sendError, ErrorCodes } from '../utils/errors.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const uploadsDir = path.join(process.cwd(), 'uploads');
const paymentProofsDir = path.join(uploadsDir, 'payment-proofs');

[uploadsDir, paymentProofsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paymentProofsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const customerId = (req as any).user?.customerId || 'unknown';
    cb(null, `${customerId}-payment-${Date.now()}${ext}`);
  }
});

const paymentProofUpload = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

function requireCustomer(req: Request, res: Response, next: Function) {
  const user = (req as any).user;
  if (!user.customerId) {
    sendError(res, 403, ErrorCodes.CUSTOMER_NOT_LINKED, 
      'User is not linked to a customer record', {
        userMessage: 'Your account is not linked to a customer profile. Please contact support to complete your account setup.',
      });
    return;
  }
  next();
}

router.get('/orders', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, fromDate, toDate, productId, shipmentStatus, search } = req.query;

    const where: any = { customerId: user.customerId };
    
    if (status) {
      const statuses = (status as string).split(',');
      where.status = { in: statuses };
    }
    if (fromDate || toDate) {
      where.deliveryDate = {};
      if (fromDate) where.deliveryDate.gte = new Date(fromDate as string);
      if (toDate) where.deliveryDate.lte = new Date(toDate as string);
    }
    if (productId) where.productId = productId;
    if (shipmentStatus) {
      where.shipment = { status: shipmentStatus };
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { hospitalReference: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        product: true,
        shipment: true,
        orderHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { deliveryDate: 'desc' },
    });

    const invoices = await prisma.invoice.findMany({
      where: { customerId: user.customerId },
      select: { id: true, orderId: true, status: true, remainingAmount: true }
    });

    const invoiceMap = new Map(invoices.filter(i => i.orderId).map(i => [i.orderId, i]));

    const enrichedOrders = orders.map(order => ({
      ...order,
      invoice: invoiceMap.get(order.id) || null,
      lastUpdate: order.orderHistory[0]?.createdAt || order.createdAt,
      eta: order.shipment?.expectedArrivalTime || order.deliveryDate,
    }));

    res.json(enrichedOrders);
  } catch (error) {
    console.error('Portal orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/orders/:id', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, customerId: user.customerId },
      include: {
        customer: true,
        product: true,
        batch: {
          select: { id: true, batchNumber: true, status: true }
        },
        shipment: true,
        orderHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedByUser: { select: { id: true, firstName: true, lastName: true } } }
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const invoice = await prisma.invoice.findFirst({
      where: { customerId: user.customerId, orderId: id },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        dueDate: true,
      }
    });

    const journeySteps = [
      { key: 'SUBMITTED', label: 'Submitted', icon: 'FileText' },
      { key: 'VALIDATED', label: 'Validated', icon: 'CheckCircle' },
      { key: 'SCHEDULED', label: 'Scheduled', icon: 'Calendar' },
      { key: 'IN_PRODUCTION', label: 'In Production', icon: 'Factory' },
      { key: 'QC_PENDING', label: 'Quality Control', icon: 'TestTube' },
      { key: 'RELEASED', label: 'Released', icon: 'Award' },
      { key: 'DISPATCHED', label: 'Dispatched', icon: 'Truck' },
      { key: 'DELIVERED', label: 'Delivered', icon: 'Package' },
    ];

    const statusOrder = ['SUBMITTED', 'VALIDATED', 'SCHEDULED', 'IN_PRODUCTION', 'QC_PENDING', 'RELEASED', 'DISPATCHED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(order.status);

    const sanitizedTimeline = order.orderHistory
      .filter((h: any) => !['INTERNAL_NOTE', 'ADMIN_OVERRIDE'].includes(h.changeNotes || ''))
      .map((h: any) => ({
        id: h.id,
        status: h.toStatus,
        timestamp: h.createdAt,
        note: h.changeNotes,
      }));

    res.json({
      ...order,
      invoice,
      journeySteps,
      currentStepIndex: Math.max(0, Math.min(currentIndex, journeySteps.length - 1)),
      sanitizedTimeline,
      deliveryTracking: order.shipment ? {
        shipmentNumber: order.shipment.shipmentNumber,
        courierName: order.shipment.courierName,
        dispatchTime: order.shipment.actualDepartureTime,
        eta: order.shipment.expectedArrivalTime,
        lastCheckpoint: null,
        deliveryConfirmation: order.shipment.actualArrivalTime,
        proofOfDelivery: order.shipment.receiverSignature,
      } : null,
    });
  } catch (error) {
    console.error('Portal order detail error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

router.get('/invoices', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, fromDate, toDate, orderId, minAmount, maxAmount, currency } = req.query;

    const where: any = { customerId: user.customerId };
    
    if (status) {
      const statuses = (status as string).split(',');
      where.status = { in: statuses };
    }
    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) where.invoiceDate.gte = new Date(fromDate as string);
      if (toDate) where.invoiceDate.lte = new Date(toDate as string);
    }
    if (orderId) where.orderId = orderId;
    if (minAmount) where.totalAmount = { ...where.totalAmount, gte: parseFloat(minAmount as string) };
    if (maxAmount) where.totalAmount = { ...where.totalAmount, lte: parseFloat(maxAmount as string) };
    if (currency) where.currency = currency;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const invoiceIds = invoices.map(i => i.id);
    const paymentRequests = await prisma.paymentRequest.findMany({
      where: { invoiceId: { in: invoiceIds } },
      orderBy: { submittedAt: 'desc' },
    });

    const paymentRequestMap = new Map<string, typeof paymentRequests>();
    paymentRequests.forEach(pr => {
      if (!paymentRequestMap.has(pr.invoiceId)) {
        paymentRequestMap.set(pr.invoiceId, []);
      }
      paymentRequestMap.get(pr.invoiceId)!.push(pr);
    });

    const enrichedInvoices = invoices.map(inv => ({
      ...inv,
      paymentRequests: paymentRequestMap.get(inv.id) || [],
    }));

    res.json(enrichedInvoices);
  } catch (error) {
    console.error('Portal invoices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/invoices/:id', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, customerId: user.customerId },
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

    const paymentRequests = await prisma.paymentRequest.findMany({
      where: { invoiceId: id },
      orderBy: { submittedAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      }
    });

    const receiptVouchers = await prisma.receiptVoucher.findMany({
      where: { invoiceId: id },
      orderBy: { confirmedAt: 'desc' },
    });

    const isOverdue = invoice.dueDate < new Date() && 
      ['ISSUED_POSTED', 'PARTIALLY_PAID'].includes(invoice.status);

    res.json({
      ...invoice,
      paymentRequests,
      receiptVouchers,
      isOverdue,
      vatBreakdown: {
        subtotal: invoice.subtotal,
        vatRate: invoice.items.length > 0 ? invoice.items[0].taxPercent : 15,
        vatAmount: invoice.taxAmount,
        discount: invoice.discountAmount,
        grandTotal: invoice.totalAmount,
      },
    });
  } catch (error) {
    console.error('Portal invoice detail error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

router.post('/invoices/:id/payments', authenticateToken, requireCustomer, (req: Request, res: Response): void => {
  const user = (req as any).user;

  paymentProofUpload.single('proof')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Invalid file type. Only PNG, JPG, and PDF are allowed.' });
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      } else {
        res.status(500).json({ error: 'Failed to upload proof' });
      }
      return;
    }

    try {
      const { id } = req.params;
      const { amount, paymentMethod, referenceNumber, notes } = req.body;

      const invoice = await prisma.invoice.findFirst({
        where: { id, customerId: user.customerId },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        res.status(400).json({ error: 'Invalid payment amount' });
        return;
      }

      const remainingBalance = invoice.totalAmount - invoice.paidAmount;
      if (paymentAmount > remainingBalance) {
        res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
        return;
      }

      if (!['SENT', 'PARTIALLY_PAID'].includes(invoice.status)) {
        res.status(400).json({ error: 'Invoice is not payable' });
        return;
      }

      const proofUrl = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;

      const paymentRequest = await prisma.paymentRequest.create({
        data: {
          invoiceId: id,
          customerId: user.customerId,
          amount: paymentAmount,
          currency: invoice.currency,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          proofUrl,
          notes: notes || null,
          status: 'PENDING_CONFIRMATION',
          submittedByUserId: user.userId,
        },
      });

      await createAuditLog(
        user.userId,
        'CREATE',
        'PaymentRequest',
        paymentRequest.id,
        null,
        { invoiceId: id, amount: paymentAmount, paymentMethod },
        req
      );

      res.status(201).json(paymentRequest);
    } catch (error) {
      console.error('Payment submission error:', error);
      res.status(500).json({ error: 'Failed to submit payment' });
    }
  });
});

router.get('/receipts', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const receipts = await prisma.receiptVoucher.findMany({
      where: { customerId: user.customerId },
      include: {
        invoice: { select: { invoiceNumber: true, orderId: true } },
        confirmedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { confirmedAt: 'desc' },
    });

    res.json(receipts);
  } catch (error) {
    console.error('Receipts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

router.get('/receipts/:id', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const receipt = await prisma.receiptVoucher.findFirst({
      where: { id, customerId: user.customerId },
      include: {
        customer: true,
        invoice: true,
        confirmedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    res.json(receipt);
  } catch (error) {
    console.error('Receipt detail error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

router.get('/dashboard', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalOrders,
      pendingOrders,
      arrivingToday,
      inTransit,
      unpaidInvoices,
      overdueInvoices,
      recentOrders,
      recentInvoices,
    ] = await Promise.all([
      prisma.order.count({ where: { customerId: user.customerId } }),
      prisma.order.count({ where: { customerId: user.customerId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.order.count({
        where: {
          customerId: user.customerId,
          deliveryDate: { gte: today, lt: tomorrow },
          status: { notIn: ['DELIVERED', 'CANCELLED'] }
        }
      }),
      prisma.order.count({
        where: {
          customerId: user.customerId,
          status: 'DISPATCHED'
        }
      }),
      prisma.invoice.count({
        where: {
          customerId: user.customerId,
          status: { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] }
        }
      }),
      prisma.invoice.count({
        where: {
          customerId: user.customerId,
          dueDate: { lt: today },
          status: { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] }
        }
      }),
      prisma.order.findMany({
        where: { customerId: user.customerId },
        include: { product: true, shipment: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { customerId: user.customerId },
        orderBy: { invoiceDate: 'desc' },
        take: 5,
      }),
    ]);

    const totalOutstanding = await prisma.invoice.aggregate({
      where: { customerId: user.customerId, status: { in: ['ISSUED_POSTED', 'PARTIALLY_PAID'] } },
      _sum: { totalAmount: true, paidAmount: true },
    });

    const outstandingAmount = (totalOutstanding._sum?.totalAmount || 0) - (totalOutstanding._sum?.paidAmount || 0);

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        arrivingToday,
        inTransit,
        unpaidInvoices,
        overdueInvoices,
        totalOutstanding: outstandingAmount,
      },
      recentOrders,
      recentInvoices,
    });
  } catch (error) {
    console.error('Portal dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ==================== CAPACITY BOOKING / RESERVATIONS ====================

router.get('/capacity/calendar', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

    const windows = await prisma.deliveryWindow.findMany({
      where: {
        date: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        slots: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const calendarData = windows.map(w => ({
      id: w.id,
      date: w.date,
      name: w.name,
      startTime: w.startTime,
      endTime: w.endTime,
      capacityMinutes: w.capacityMinutes,
      usedMinutes: w.usedMinutes,
      availableMinutes: w.capacityMinutes - w.usedMinutes,
      utilizationPercent: Math.round((w.usedMinutes / w.capacityMinutes) * 100),
      slots: w.slots.map(s => ({
        id: s.id,
        slotTime: s.slotTime,
        durationMinutes: s.durationMinutes,
        capacityMinutes: s.capacityMinutes,
        usedMinutes: s.usedMinutes,
        availableMinutes: s.capacityMinutes - s.usedMinutes,
        isAvailable: s.isAvailable && (s.capacityMinutes - s.usedMinutes) > 0,
      })),
    }));

    res.json(calendarData);
  } catch (error) {
    console.error('Portal capacity calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch capacity calendar' });
  }
});

router.get('/reservations', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, startDate, endDate } = req.query;

    const where: any = { customerId: user.customerId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.requestedDate = {};
      if (startDate) where.requestedDate.gte = new Date(startDate as string);
      if (endDate) where.requestedDate.lte = new Date(endDate as string);
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        product: true,
        window: true,
        slot: true,
      },
      orderBy: { requestedDate: 'desc' },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Portal reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

async function calculateEstimatedMinutesForProduct(productId: string, numberOfDoses: number): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { timeStandards: { where: { processType: 'DISPENSING', isActive: true } } },
  });
  if (!product) return 15 * numberOfDoses;
  const standard = product.timeStandards[0];
  return (standard?.standardMinutes || 15) * numberOfDoses;
}

router.post('/reservations', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      productId,
      windowId,
      slotId,
      requestedDate,
      requestedActivity,
      numberOfDoses,
      hospitalOrderReference,
      notes,
    } = req.body;

    const estimatedMinutes = await calculateEstimatedMinutesForProduct(productId, numberOfDoses || 1);

    if (windowId) {
      const window = await prisma.deliveryWindow.findUnique({ where: { id: windowId } });
      if (!window) {
        res.status(404).json({ error: 'Delivery window not found' });
        return;
      }
      const availableMinutes = window.capacityMinutes - window.usedMinutes;
      if (estimatedMinutes > availableMinutes) {
        res.status(400).json({ 
          error: 'INSUFFICIENT_CAPACITY',
          message: `Not enough capacity available. Required: ${estimatedMinutes} minutes, Available: ${availableMinutes} minutes.`,
          userMessage: 'This time slot does not have enough capacity for your order. Please select a different window or reduce the number of doses.'
        });
        return;
      }

      await prisma.deliveryWindow.update({
        where: { id: windowId },
        data: { usedMinutes: window.usedMinutes + estimatedMinutes },
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reservationNumber = `RES-${dateStr}-${random}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber,
        customerId: user.customerId,
        productId,
        windowId: windowId || null,
        slotId: slotId || null,
        requestedDate: new Date(requestedDate),
        requestedActivity,
        activityUnit: 'mCi',
        numberOfDoses: numberOfDoses || 1,
        estimatedMinutes,
        status: 'TENTATIVE',
        expiresAt,
        notes: hospitalOrderReference ? `Ref: ${hospitalOrderReference}. ${notes || ''}`.trim() : notes,
        createdById: user.userId,
      },
      include: { product: true, window: true },
    });

    res.status(201).json({
      ...reservation,
      expiresInSeconds: 15 * 60,
      userMessage: `Capacity reserved for ${estimatedMinutes} minutes. Please confirm your order within 15 minutes or the reservation will expire.`,
    });
  } catch (error) {
    console.error('Portal create reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

router.post('/reservations/:id/confirm', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { hospitalOrderReference, specialNotes, deliveryTimeStart, deliveryTimeEnd } = req.body;

    const reservation = await prisma.reservation.findFirst({
      where: { id, customerId: user.customerId },
      include: { product: true, window: true },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status !== 'TENTATIVE') {
      res.status(400).json({ error: 'Only tentative reservations can be confirmed' });
      return;
    }

    if (reservation.expiresAt && reservation.expiresAt < new Date()) {
      await prisma.reservation.update({ where: { id }, data: { status: 'EXPIRED' } });
      if (reservation.windowId && reservation.window) {
        await prisma.deliveryWindow.update({
          where: { id: reservation.windowId },
          data: { usedMinutes: Math.max(0, reservation.window.usedMinutes - reservation.estimatedMinutes) },
        });
      }
      res.status(400).json({ error: 'RESERVATION_EXPIRED', userMessage: 'This reservation has expired. Please create a new one.' });
      return;
    }

    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: user.customerId,
        productId: reservation.productId,
        deliveryDate: reservation.requestedDate,
        deliveryTimeStart: deliveryTimeStart ? new Date(deliveryTimeStart) : reservation.requestedDate,
        deliveryTimeEnd: deliveryTimeEnd ? new Date(deliveryTimeEnd) : new Date(reservation.requestedDate.getTime() + 2 * 60 * 60 * 1000),
        requestedActivity: reservation.requestedActivity,
        activityUnit: reservation.activityUnit,
        numberOfDoses: reservation.numberOfDoses,
        hospitalOrderReference: hospitalOrderReference || null,
        committedDispensingMinutes: reservation.estimatedMinutes,
        specialNotes: specialNotes || reservation.notes,
        reservationId: reservation.id,
        status: 'SUBMITTED',
      },
      include: { customer: true, product: true },
    });

    await prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED', convertedOrderId: order.id },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        changedBy: user.userId,
        role: 'Customer',
        changeNotes: 'Order created from capacity reservation via portal',
      },
    });

    res.status(201).json({ reservation: { ...reservation, status: 'CONFIRMED' }, order });
  } catch (error) {
    console.error('Portal confirm reservation error:', error);
    res.status(500).json({ error: 'Failed to confirm reservation and create order' });
  }
});

router.put('/reservations/:id/cancel', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, customerId: user.customerId },
      include: { window: true, slot: true },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status === 'CONVERTED' || reservation.status === 'CONFIRMED') {
      res.status(400).json({ error: 'Cannot cancel a confirmed or converted reservation' });
      return;
    }

    if (reservation.windowId && reservation.window) {
      await prisma.deliveryWindow.update({
        where: { id: reservation.windowId },
        data: { usedMinutes: Math.max(0, reservation.window.usedMinutes - reservation.estimatedMinutes) },
      });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    console.error('Portal cancel reservation error:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

router.get('/products/available', authenticateToken, requireCustomer, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const permittedProducts = await prisma.customerProduct.findMany({
      where: { customerId: user.customerId, isApproved: true },
      include: {
        product: {
          include: {
            timeStandards: { where: { processType: 'DISPENSING', isActive: true } },
          },
        },
      },
    });

    const products = permittedProducts.map(pp => ({
      id: pp.product.id,
      name: pp.product.name,
      code: pp.product.code,
      productType: pp.product.productType,
      radionuclide: pp.product.radionuclide,
      halfLifeMinutes: pp.product.halfLifeMinutes,
      standardDose: pp.product.standardDose,
      doseUnit: pp.product.doseUnit,
      dispensingMinutesPerDose: pp.product.timeStandards[0]?.standardMinutes || 15,
    }));

    res.json(products);
  } catch (error) {
    console.error('Portal available products error:', error);
    res.status(500).json({ error: 'Failed to fetch available products' });
  }
});

export default router;
