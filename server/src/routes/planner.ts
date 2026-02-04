import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { calculateBackwardSchedule, calculateProductionActivityWithOverage } from '../utils/decay.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /planner/orders:
 *   get:
 *     summary: Get orders for planning
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: Orders ready for scheduling
 */
router.get('/orders', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, productId } = req.query;
    
    const where: any = {
      status: { in: ['VALIDATED'] },
    };

    if (date) {
      const targetDate = new Date(date as string);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.deliveryDate = {
        gte: targetDate,
        lt: nextDate,
      };
    }

    if (productId) {
      where.productId = productId as string;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        product: true,
      },
      orderBy: { deliveryTimeStart: 'asc' },
    });

    const ordersWithSchedule = orders.map(order => {
      const schedule = calculateBackwardSchedule(
        order.deliveryTimeStart,
        order.customer.travelTimeMinutes,
        order.product.packagingTimeMinutes,
        order.product.qcTimeMinutes,
        order.product.synthesisTimeMinutes
      );

      return {
        ...order,
        schedule,
      };
    });

    res.json(ordersWithSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders for planning' });
  }
});

/**
 * @swagger
 * /planner/production-slots:
 *   get:
 *     summary: Get production slots
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: Available production slots
 */
router.get('/production-slots', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, equipmentType } = req.query;
    
    const where: any = {};
    if (date) {
      const targetDate = new Date(date as string);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.slotDate = {
        gte: targetDate,
        lt: nextDate,
      };
    }
    if (equipmentType) {
      where.equipmentType = equipmentType as string;
    }

    const slots = await prisma.productionSlot.findMany({
      where,
      orderBy: { slotStartTime: 'asc' },
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production slots' });
  }
});

/**
 * @swagger
 * /planner/equipment:
 *   get:
 *     summary: Get available equipment
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: List of equipment
 */
router.get('/equipment', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: { isAvailable: true },
      orderBy: { name: 'asc' },
    });

    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

/**
 * @swagger
 * /planner/batches:
 *   get:
 *     summary: Get scheduled batches for timeline
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: Batches for timeline view
 */
router.get('/batches', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const where: any = {};
    if (fromDate || toDate) {
      where.plannedStartTime = {};
      if (fromDate) {
        const startDate = new Date(fromDate as string);
        startDate.setHours(0, 0, 0, 0);
        where.plannedStartTime.gte = startDate;
      }
      if (toDate) {
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        where.plannedStartTime.lte = endDate;
      }
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        product: true,
        orders: { include: { customer: true } },
        synthesisModule: true,
        hotCell: true,
      },
      orderBy: { plannedStartTime: 'asc' },
    });

    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch batches for timeline' });
  }
});

/**
 * @swagger
 * /planner/group-orders:
 *   post:
 *     summary: Group orders into batches
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: Grouped orders
 */
router.post('/group-orders', authenticateToken, requireRole('Admin', 'Production Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.body;
    
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        status: 'VALIDATED',
        deliveryDate: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      include: {
        customer: true,
        product: true,
      },
      orderBy: { deliveryTimeStart: 'asc' },
    });

    const groupedByProduct = orders.reduce((acc, order) => {
      const key = order.productId;
      if (!acc[key]) {
        acc[key] = {
          product: order.product,
          orders: [],
          totalActivity: 0,
          earliestDelivery: order.deliveryTimeStart,
          latestDelivery: order.deliveryTimeStart,
        };
      }
      acc[key].orders.push(order);
      acc[key].totalActivity += order.calculatedProductionActivity || 0;
      if (order.deliveryTimeStart < acc[key].earliestDelivery) {
        acc[key].earliestDelivery = order.deliveryTimeStart;
      }
      if (order.deliveryTimeStart > acc[key].latestDelivery) {
        acc[key].latestDelivery = order.deliveryTimeStart;
      }
      return acc;
    }, {} as Record<string, any>);

    const suggestedBatches = Object.entries(groupedByProduct).map(([productId, group]: [string, any]) => {
      const avgTravelTime = group.orders.reduce((sum: number, o: any) => sum + o.customer.travelTimeMinutes, 0) / group.orders.length;
      
      const schedule = calculateBackwardSchedule(
        group.earliestDelivery,
        avgTravelTime,
        group.product.packagingTimeMinutes,
        group.product.qcTimeMinutes,
        group.product.synthesisTimeMinutes
      );

      return {
        productId,
        product: group.product,
        orders: group.orders,
        orderCount: group.orders.length,
        totalActivity: group.totalActivity,
        suggestedStartTime: schedule.synthesisStartTime,
        suggestedEndTime: new Date(schedule.synthesisStartTime.getTime() + group.product.synthesisTimeMinutes * 60 * 1000),
        qcStartTime: schedule.qcStartTime,
        packagingStartTime: schedule.packagingStartTime,
        earliestDelivery: group.earliestDelivery,
        latestDelivery: group.latestDelivery,
      };
    });

    res.json(suggestedBatches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to group orders' });
  }
});

/**
 * @swagger
 * /planner/daily-summary:
 *   get:
 *     summary: Get daily production summary
 *     tags: [Planner]
 *     responses:
 *       200:
 *         description: Daily summary
 */
router.get('/daily-summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query;
    
    const targetDate = date ? new Date(date as string) : new Date();
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const [orders, batches, shipments] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        where: {
          deliveryDate: {
            gte: targetDate,
            lt: nextDate,
          },
        },
        _count: true,
      }),
      prisma.batch.findMany({
        where: {
          plannedStartTime: {
            gte: targetDate,
            lt: nextDate,
          },
        },
        include: { product: true },
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        where: {
          scheduledDepartureTime: {
            gte: targetDate,
            lt: nextDate,
          },
        },
        _count: true,
      }),
    ]);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      orders: {
        byStatus: orders.reduce((acc, o) => ({ ...acc, [o.status]: o._count }), {}),
        total: orders.reduce((sum, o) => sum + o._count, 0),
      },
      batches: {
        total: batches.length,
        byProduct: batches.reduce((acc, b) => {
          const name = b.product.name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      shipments: {
        byStatus: shipments.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
        total: shipments.reduce((sum, s) => sum + s._count, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get daily summary' });
  }
});

router.get('/capacity', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, days = 7 } = req.query;
    const startDate = date ? new Date(date as string) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Number(days));
    endDate.setHours(23, 59, 59, 999);

    const windows = await prisma.deliveryWindow.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        isActive: true,
      },
      include: {
        reservations: {
          where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } },
          select: { id: true, status: true, estimatedMinutes: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const capacityData = windows.map(window => {
      const reservedMinutes = window.reservations
        .filter(r => r.status === 'TENTATIVE')
        .reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);
      const committedMinutes = window.reservations
        .filter(r => r.status === 'CONFIRMED')
        .reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);
      const usedMinutes = window.usedMinutes || 0;
      const availableMinutes = Math.max(0, window.capacityMinutes - reservedMinutes - committedMinutes - usedMinutes);
      const utilizationPercent = window.capacityMinutes > 0 
        ? Math.round(((reservedMinutes + committedMinutes + usedMinutes) / window.capacityMinutes) * 100)
        : 0;

      return {
        id: window.id,
        name: window.name,
        date: window.date,
        startTime: window.startTime,
        endTime: window.endTime,
        capacityMinutes: window.capacityMinutes,
        reservedMinutes,
        committedMinutes,
        usedMinutes,
        availableMinutes,
        utilizationPercent,
        reservationCount: window.reservations.length,
        status: utilizationPercent >= 100 ? 'FULL' : utilizationPercent >= 80 ? 'NEAR_FULL' : 'AVAILABLE',
      };
    });

    const summary = {
      totalCapacityMinutes: capacityData.reduce((sum, w) => sum + w.capacityMinutes, 0),
      totalReservedMinutes: capacityData.reduce((sum, w) => sum + w.reservedMinutes, 0),
      totalCommittedMinutes: capacityData.reduce((sum, w) => sum + w.committedMinutes, 0),
      totalUsedMinutes: capacityData.reduce((sum, w) => sum + w.usedMinutes, 0),
      totalAvailableMinutes: capacityData.reduce((sum, w) => sum + w.availableMinutes, 0),
      windowCount: capacityData.length,
      fullWindows: capacityData.filter(w => w.status === 'FULL').length,
      nearFullWindows: capacityData.filter(w => w.status === 'NEAR_FULL').length,
    };

    res.json({ windows: capacityData, summary });
  } catch (error) {
    console.error('Get capacity error:', error);
    res.status(500).json({ error: 'Failed to get capacity data' });
  }
});

router.get('/time-standards', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;
    const where: any = {};
    if (productId) where.productId = productId;

    const timeStandards = await prisma.timeStandard.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    res.json(timeStandards);
  } catch (error) {
    console.error('Get time standards error:', error);
    res.status(500).json({ error: 'Failed to get time standards' });
  }
});

router.post('/check-capacity', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { windowId, requestedMinutes } = req.body;

    const window = await prisma.deliveryWindow.findUnique({
      where: { id: windowId },
      include: {
        reservations: {
          where: { status: { in: ['TENTATIVE', 'CONFIRMED'] } },
          select: { estimatedMinutes: true, status: true },
        },
      },
    });

    if (!window) {
      res.status(404).json({ error: 'Delivery window not found' });
      return;
    }

    const reservedMinutes = window.reservations.reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);
    const usedMinutes = window.usedMinutes || 0;
    const availableMinutes = window.capacityMinutes - reservedMinutes - usedMinutes;

    const canBook = availableMinutes >= requestedMinutes;
    const wouldOverbookBy = canBook ? 0 : requestedMinutes - availableMinutes;

    res.json({
      windowId,
      capacityMinutes: window.capacityMinutes,
      reservedMinutes,
      usedMinutes,
      availableMinutes,
      requestedMinutes,
      canBook,
      wouldOverbookBy,
      message: canBook 
        ? `${availableMinutes} minutes available, ${requestedMinutes} minutes requested` 
        : `Insufficient capacity: would overbook by ${wouldOverbookBy} minutes`,
    });
  } catch (error) {
    console.error('Check capacity error:', error);
    res.status(500).json({ error: 'Failed to check capacity' });
  }
});

export default router;
