import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/windows', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const windows = await prisma.deliveryWindow.findMany({
      where,
      include: {
        slots: true,
        reservations: {
          where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } },
          include: { customer: true, product: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(windows);
  } catch (error) {
    console.error('List delivery windows error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery windows' });
  }
});

router.post('/windows', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, date, startTime, endTime, capacityMinutes } = req.body;

    const window = await prisma.deliveryWindow.create({
      data: {
        name,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacityMinutes,
        usedMinutes: 0,
        isActive: true,
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'DeliveryWindow', window.id, null, window, req);

    res.status(201).json(window);
  } catch (error) {
    console.error('Create delivery window error:', error);
    res.status(500).json({ error: 'Failed to create delivery window' });
  }
});

router.post('/windows/generate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, startTime, endTime, capacityMinutes, excludeWeekends } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const windows: any[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

      const dateStr = d.toISOString().slice(0, 10);
      const windowStartTime = new Date(`${dateStr}T${startTime}`);
      const windowEndTime = new Date(`${dateStr}T${endTime}`);

      const existing = await prisma.deliveryWindow.findFirst({
        where: {
          date: new Date(dateStr),
          startTime: windowStartTime,
          endTime: windowEndTime,
        },
      });

      if (!existing) {
        const window = await prisma.deliveryWindow.create({
          data: {
            name: `Delivery Window ${dateStr}`,
            date: new Date(dateStr),
            startTime: windowStartTime,
            endTime: windowEndTime,
            capacityMinutes,
            usedMinutes: 0,
            isActive: true,
          },
        });
        windows.push(window);
      }
    }

    res.status(201).json({ created: windows.length, windows });
  } catch (error) {
    console.error('Generate delivery windows error:', error);
    res.status(500).json({ error: 'Failed to generate delivery windows' });
  }
});

router.put('/windows/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, capacityMinutes, isActive } = req.body;

    const window = await prisma.deliveryWindow.update({
      where: { id },
      data: {
        name,
        capacityMinutes,
        isActive,
      },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'DeliveryWindow', id, null, { name, capacityMinutes, isActive }, req);

    res.json(window);
  } catch (error) {
    console.error('Update delivery window error:', error);
    res.status(500).json({ error: 'Failed to update delivery window' });
  }
});

router.get('/slots', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { windowId, date, isAvailable } = req.query;

    const where: any = {};
    if (windowId) where.windowId = windowId;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
    if (date) {
      where.slotTime = {
        gte: new Date(date as string),
        lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const slots = await prisma.deliverySlot.findMany({
      where,
      include: {
        window: true,
        reservations: {
          where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } },
        },
      },
      orderBy: { slotTime: 'asc' },
    });

    res.json(slots);
  } catch (error) {
    console.error('List delivery slots error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery slots' });
  }
});

router.post('/slots', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { windowId, slotTime, durationMinutes, capacityMinutes } = req.body;

    const slot = await prisma.deliverySlot.create({
      data: {
        windowId,
        slotTime: new Date(slotTime),
        durationMinutes,
        capacityMinutes,
        usedMinutes: 0,
        isAvailable: true,
      },
      include: { window: true },
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error('Create delivery slot error:', error);
    res.status(500).json({ error: 'Failed to create delivery slot' });
  }
});

router.get('/calendar', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const windows = await prisma.deliveryWindow.findMany({
      where: {
        date: { gte: start, lte: end },
        isActive: true,
      },
      include: {
        slots: true,
        reservations: {
          where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } },
          include: { customer: true, product: true },
        },
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
      reservationCount: w.reservations.length,
      slots: w.slots,
    }));

    res.json(calendarData);
  } catch (error) {
    console.error('Get availability calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch availability calendar' });
  }
});

router.get('/resources', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, resourceId } = req.query;

    const where: any = {};
    if (resourceId) where.resourceId = resourceId;
    if (date) where.date = new Date(date as string);

    const calendars = await prisma.resourceCalendar.findMany({
      where,
      include: {
        resource: true,
        slots: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json(calendars);
  } catch (error) {
    console.error('List resource calendars error:', error);
    res.status(500).json({ error: 'Failed to fetch resource calendars' });
  }
});

router.post('/resources', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { resourceId, date, startTime, endTime, capacityMinutes, isAvailable, notes } = req.body;

    const calendar = await prisma.resourceCalendar.create({
      data: {
        resourceId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacityMinutes,
        usedMinutes: 0,
        isAvailable: isAvailable !== false,
        notes,
      },
      include: { resource: true },
    });

    res.status(201).json(calendar);
  } catch (error) {
    console.error('Create resource calendar error:', error);
    res.status(500).json({ error: 'Failed to create resource calendar' });
  }
});

export default router;
