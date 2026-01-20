import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /reports/daily-production:
 *   get:
 *     summary: Get daily production summary
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Daily production summary
 */
router.get('/daily-production', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const startDate = fromDate ? new Date(fromDate as string) : new Date();
    const endDate = toDate ? new Date(toDate as string) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const batches = await prisma.batch.findMany({
      where: {
        plannedStartTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
        orders: true,
      },
    });

    const summary = batches.reduce((acc, batch) => {
      const date = batch.plannedStartTime.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalBatches: 0,
          totalOrders: 0,
          byProduct: {},
          byStatus: {},
        };
      }
      acc[date].totalBatches++;
      acc[date].totalOrders += batch.orders.length;
      acc[date].byProduct[batch.product.name] = (acc[date].byProduct[batch.product.name] || 0) + 1;
      acc[date].byStatus[batch.status] = (acc[date].byStatus[batch.status] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

    res.json(Object.values(summary));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate daily production report' });
  }
});

/**
 * @swagger
 * /reports/on-time-delivery:
 *   get:
 *     summary: Get on-time delivery rate
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: On-time delivery statistics
 */
router.get('/on-time-delivery', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const where: any = { status: 'DELIVERED' };
    if (fromDate || toDate) {
      where.updatedAt = {};
      if (fromDate) where.updatedAt.gte = new Date(fromDate as string);
      if (toDate) where.updatedAt.lte = new Date(toDate as string);
    }

    const deliveredOrders = await prisma.order.findMany({
      where,
      include: { shipment: true },
    });

    let onTime = 0;
    let late = 0;

    for (const order of deliveredOrders) {
      if (order.shipment?.actualArrivalTime && order.deliveryTimeEnd) {
        if (order.shipment.actualArrivalTime <= order.deliveryTimeEnd) {
          onTime++;
        } else {
          late++;
        }
      }
    }

    const total = onTime + late;
    const rate = total > 0 ? (onTime / total) * 100 : 0;

    res.json({
      totalDelivered: deliveredOrders.length,
      onTime,
      late,
      onTimeRate: rate.toFixed(2),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate on-time delivery rate' });
  }
});

/**
 * @swagger
 * /reports/qc-pass-rate:
 *   get:
 *     summary: Get QC pass rate
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: QC pass rate statistics
 */
router.get('/qc-pass-rate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate, productId } = req.query;
    
    const where: any = {
      status: { in: ['QC_PASSED', 'QC_FAILED', 'RELEASED'] },
    };
    if (fromDate || toDate) {
      where.updatedAt = {};
      if (fromDate) where.updatedAt.gte = new Date(fromDate as string);
      if (toDate) where.updatedAt.lte = new Date(toDate as string);
    }
    if (productId) {
      where.productId = productId as string;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: { product: true },
    });

    const passed = batches.filter(b => b.status === 'QC_PASSED' || b.status === 'RELEASED').length;
    const failed = batches.filter(b => b.status === 'QC_FAILED').length;
    const total = passed + failed;
    const rate = total > 0 ? (passed / total) * 100 : 0;

    const byProduct = batches.reduce((acc, batch) => {
      const name = batch.product.name;
      if (!acc[name]) {
        acc[name] = { passed: 0, failed: 0 };
      }
      if (batch.status === 'QC_PASSED' || batch.status === 'RELEASED') {
        acc[name].passed++;
      } else {
        acc[name].failed++;
      }
      return acc;
    }, {} as Record<string, { passed: number; failed: number }>);

    res.json({
      total,
      passed,
      failed,
      passRate: rate.toFixed(2),
      byProduct,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate QC pass rate' });
  }
});

/**
 * @swagger
 * /reports/capacity-utilization:
 *   get:
 *     summary: Get capacity utilization
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Capacity utilization statistics
 */
router.get('/capacity-utilization', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const startDate = fromDate ? new Date(fromDate as string) : new Date();
    const endDate = toDate ? new Date(toDate as string) : new Date();

    const [equipment, batches] = await Promise.all([
      prisma.equipment.findMany(),
      prisma.batch.findMany({
        where: {
          plannedStartTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { synthesisModule: true, hotCell: true },
      }),
    ]);

    const utilizationByEquipment = equipment.map(eq => {
      const usedBatches = batches.filter(
        b => b.synthesisModuleId === eq.id || b.hotCellId === eq.id
      );
      
      let totalMinutesUsed = 0;
      for (const batch of usedBatches) {
        const start = batch.actualStartTime || batch.plannedStartTime;
        const end = batch.actualEndTime || batch.plannedEndTime;
        totalMinutesUsed += (end.getTime() - start.getTime()) / (1000 * 60);
      }

      const totalAvailableMinutes = 8 * 60;
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const utilization = (totalMinutesUsed / (totalAvailableMinutes * days)) * 100;

      return {
        equipment: eq.name,
        type: eq.type,
        batchCount: usedBatches.length,
        minutesUsed: totalMinutesUsed,
        utilizationPercent: Math.min(utilization, 100).toFixed(2),
      };
    });

    res.json(utilizationByEquipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate capacity utilization' });
  }
});

/**
 * @swagger
 * /reports/order-turnaround:
 *   get:
 *     summary: Get order turnaround time
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Order turnaround statistics
 */
router.get('/order-turnaround', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const where: any = { status: 'DELIVERED' };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) where.createdAt.lte = new Date(toDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      include: { shipment: true, product: true },
    });

    const turnaroundTimes = orders
      .filter(o => o.shipment?.actualArrivalTime)
      .map(order => {
        const created = order.createdAt.getTime();
        const delivered = order.shipment!.actualArrivalTime!.getTime();
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          product: order.product.name,
          turnaroundMinutes: (delivered - created) / (1000 * 60),
          turnaroundHours: (delivered - created) / (1000 * 60 * 60),
        };
      });

    const avgTurnaround = turnaroundTimes.length > 0
      ? turnaroundTimes.reduce((sum, t) => sum + t.turnaroundHours, 0) / turnaroundTimes.length
      : 0;

    res.json({
      totalOrders: turnaroundTimes.length,
      averageTurnaroundHours: avgTurnaround.toFixed(2),
      orders: turnaroundTimes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate order turnaround' });
  }
});

/**
 * @swagger
 * /reports/dashboard:
 *   get:
 *     summary: Get dashboard summary
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Dashboard summary
 */
router.get('/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayOrders,
      todayBatches,
      pendingQC,
      inTransit,
      recentOrders,
      recentBatches,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          deliveryDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.batch.count({
        where: {
          plannedStartTime: { gte: today, lt: tomorrow },
        },
      }),
      prisma.batch.count({
        where: { status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] } },
      }),
      prisma.shipment.count({
        where: { status: 'IN_TRANSIT' },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, product: true },
      }),
      prisma.batch.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: true },
      }),
    ]);

    res.json({
      today: {
        orders: todayOrders,
        batches: todayBatches,
        pendingQC,
        inTransit,
      },
      recentOrders,
      recentBatches,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
