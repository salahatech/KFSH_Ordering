import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

function generateReservationNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RES-${dateStr}-${random}`;
}

async function calculateEstimatedMinutes(productId: string, requestedActivity: number, numberOfDoses: number): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { timeStandards: true },
  });

  if (!product) return 30;

  const dispensingStandard = product.timeStandards.find(ts => ts.processType === 'DISPENSING');
  const baseMinutes = dispensingStandard?.standardMinutes || 15;
  
  return baseMinutes * numberOfDoses;
}

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, productId, status, startDate, endDate } = req.query;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (productId) where.productId = productId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.requestedDate = {};
      if (startDate) where.requestedDate.gte = new Date(startDate as string);
      if (endDate) where.requestedDate.lte = new Date(endDate as string);
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        customer: true,
        product: true,
        window: true,
        slot: true,
      },
      orderBy: { requestedDate: 'asc' },
      take: 100,
    });

    res.json(reservations);
  } catch (error) {
    console.error('List reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId,
      productId,
      windowId,
      slotId,
      requestedDate,
      requestedActivity,
      numberOfDoses,
      notes,
      expiresAt,
    } = req.body;

    const estimatedMinutes = await calculateEstimatedMinutes(productId, requestedActivity, numberOfDoses || 1);

    if (windowId) {
      const window = await prisma.deliveryWindow.findUnique({ where: { id: windowId } });
      if (!window) {
        res.status(404).json({ error: 'Delivery window not found' });
        return;
      }

      const availableMinutes = window.capacityMinutes - window.usedMinutes;
      if (estimatedMinutes > availableMinutes) {
        res.status(400).json({ 
          error: `Insufficient capacity. Available: ${availableMinutes} minutes, Required: ${estimatedMinutes} minutes` 
        });
        return;
      }

      await prisma.deliveryWindow.update({
        where: { id: windowId },
        data: { usedMinutes: window.usedMinutes + estimatedMinutes },
      });
    }

    if (slotId) {
      const slot = await prisma.deliverySlot.findUnique({ where: { id: slotId } });
      if (!slot || !slot.isAvailable) {
        res.status(400).json({ error: 'Slot not available' });
        return;
      }

      const availableMinutes = slot.capacityMinutes - slot.usedMinutes;
      if (estimatedMinutes > availableMinutes) {
        res.status(400).json({ 
          error: `Insufficient slot capacity. Available: ${availableMinutes} minutes` 
        });
        return;
      }

      await prisma.deliverySlot.update({
        where: { id: slotId },
        data: { usedMinutes: slot.usedMinutes + estimatedMinutes },
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: generateReservationNumber(),
        customerId,
        productId,
        windowId: windowId || null,
        slotId: slotId || null,
        requestedDate: new Date(requestedDate),
        requestedActivity,
        numberOfDoses: numberOfDoses || 1,
        estimatedMinutes,
        status: 'TENTATIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        notes,
        createdById: req.user?.userId,
      },
      include: {
        customer: true,
        product: true,
        window: true,
        slot: true,
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Reservation', reservation.id, null, reservation, req);

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

router.put('/:id/confirm', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status !== 'TENTATIVE') {
      res.status(400).json({ error: 'Only tentative reservations can be confirmed' });
      return;
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { customer: true, product: true, window: true },
    });

    await createAuditLog(req.user?.userId, 'CONFIRM', 'Reservation', id, 
      { status: 'TENTATIVE' }, { status: 'CONFIRMED' }, req);

    res.json(updated);
  } catch (error) {
    console.error('Confirm reservation error:', error);
    res.status(500).json({ error: 'Failed to confirm reservation' });
  }
});

router.put('/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await prisma.reservation.findUnique({ 
      where: { id },
      include: { window: true, slot: true },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status === 'CONVERTED' || reservation.status === 'CANCELLED') {
      res.status(400).json({ error: 'Reservation cannot be cancelled' });
      return;
    }

    if (reservation.windowId && reservation.window) {
      await prisma.deliveryWindow.update({
        where: { id: reservation.windowId },
        data: { usedMinutes: Math.max(0, reservation.window.usedMinutes - reservation.estimatedMinutes) },
      });
    }

    if (reservation.slotId && reservation.slot) {
      await prisma.deliverySlot.update({
        where: { id: reservation.slotId },
        data: { usedMinutes: Math.max(0, reservation.slot.usedMinutes - reservation.estimatedMinutes) },
      });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        notes: reason ? `${reservation.notes || ''}\nCancelled: ${reason}`.trim() : reservation.notes,
      },
    });

    await createAuditLog(req.user?.userId, 'CANCEL', 'Reservation', id, 
      { status: reservation.status }, { status: 'CANCELLED', reason }, req);

    res.json(updated);
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

router.post('/:id/convert', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { deliveryTimeStart, deliveryTimeEnd, specialNotes } = req.body || {};

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { customer: true, product: true, window: true },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    if (reservation.status !== 'TENTATIVE' && reservation.status !== 'CONFIRMED') {
      res.status(400).json({ error: 'Only tentative or confirmed reservations can be converted' });
      return;
    }

    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount + 1).padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: reservation.customerId,
        productId: reservation.productId,
        deliveryDate: reservation.requestedDate,
        deliveryTimeStart: deliveryTimeStart ? new Date(deliveryTimeStart) : reservation.requestedDate,
        deliveryTimeEnd: deliveryTimeEnd ? new Date(deliveryTimeEnd) : new Date(reservation.requestedDate.getTime() + 2 * 60 * 60 * 1000),
        requestedActivity: reservation.requestedActivity,
        activityUnit: reservation.activityUnit,
        numberOfDoses: reservation.numberOfDoses,
        specialNotes: specialNotes || reservation.notes,
        status: 'DRAFT',
      },
      include: { customer: true, product: true },
    });

    await prisma.reservation.update({
      where: { id },
      data: { 
        status: 'CONVERTED',
        convertedOrderId: order.id,
      },
    });

    await createAuditLog(req.user?.userId, 'CONVERT', 'Reservation', id, 
      { status: reservation.status }, { status: 'CONVERTED', orderId: order.id }, req);

    res.json({ reservation: { ...reservation, status: 'CONVERTED' }, order });
  } catch (error) {
    console.error('Convert reservation error:', error);
    res.status(500).json({ error: 'Failed to convert reservation to order' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        window: true,
        slot: true,
      },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    res.json(reservation);
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

export default router;
