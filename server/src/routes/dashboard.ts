import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { addDays, startOfDay, endOfDay } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: any;
}

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get operations overview dashboard data
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Aggregated dashboard data for operations overview
 */
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const next7Days = addDays(today, 7);

    const [
      journeyCounts,
      kpis,
      validationQueue,
      qcQueue,
      qpQueue,
      logisticsQueue,
      exceptions,
      capacityData,
      recentActivity,
    ] = await Promise.all([
      getJourneyCounts(),
      getKPIs(today, tomorrow),
      getValidationQueue(),
      getQCQueue(),
      getQPQueue(),
      getLogisticsQueue(),
      getExceptions(),
      getCapacityData(today, next7Days),
      getRecentActivity(20),
    ]);

    res.json({
      journeyCounts,
      kpis,
      queues: {
        validation: validationQueue,
        qc: qcQueue,
        qp: qpQueue,
        logistics: logisticsQueue,
      },
      exceptions,
      capacity: capacityData,
      recentActivity,
      lastRefreshed: new Date(),
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

async function getJourneyCounts() {
  const orderStatusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });

  const batchStatusCounts = await prisma.batch.groupBy({
    by: ['status'],
    _count: true,
  });

  const shipmentStatusCounts = await prisma.shipment.groupBy({
    by: ['status'],
    _count: true,
  });

  const orderMap = Object.fromEntries(orderStatusCounts.map(s => [s.status, s._count]));
  const batchMap = Object.fromEntries(batchStatusCounts.map(s => [s.status, s._count]));
  const shipmentMap = Object.fromEntries(shipmentStatusCounts.map(s => [s.status, s._count]));

  return [
    { id: 'submitted', label: 'Submitted', count: orderMap['SUBMITTED'] || 0, color: 'blue', lateCount: 0 },
    { id: 'validated', label: 'Validated', count: orderMap['VALIDATED'] || 0, color: 'blue', lateCount: 0 },
    { id: 'scheduled', label: 'Scheduled', count: orderMap['SCHEDULED'] || 0, color: 'blue', lateCount: 0 },
    { id: 'in_production', label: 'In Production', count: (batchMap['IN_PRODUCTION'] || 0) + (batchMap['PRODUCTION_COMPLETE'] || 0), color: 'yellow', lateCount: 0 },
    { id: 'qc_pending', label: 'QC Pending', count: (batchMap['QC_PENDING'] || 0) + (batchMap['QC_IN_PROGRESS'] || 0), color: 'yellow', lateCount: 0 },
    { id: 'released', label: 'Released', count: batchMap['RELEASED'] || 0, color: 'green', lateCount: 0 },
    { id: 'dispensing', label: 'Dispensing', count: (batchMap['DISPENSING_IN_PROGRESS'] || 0) + (batchMap['DISPENSED'] || 0), color: 'teal', lateCount: 0 },
    { id: 'packed', label: 'Packed', count: batchMap['PACKED'] || 0, color: 'purple', lateCount: 0 },
    { id: 'dispatched', label: 'Dispatched', count: shipmentMap['IN_TRANSIT'] || 0, color: 'blue', lateCount: 0 },
    { id: 'delivered', label: 'Delivered', count: shipmentMap['DELIVERED'] || 0, color: 'green', lateCount: 0 },
  ];
}

async function getKPIs(today: Date, tomorrow: Date) {
  const [
    ordersDueToday,
    ordersLate,
    batchesAwaitingQC,
    batchesAwaitingQP,
    readyToDispense,
    shipmentsReadyToDispatch,
    shipmentsDelayed,
    deliveredToday,
  ] = await Promise.all([
    prisma.order.count({
      where: { deliveryDate: { gte: today, lt: tomorrow }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    }),
    prisma.order.count({
      where: { deliveryDate: { lt: today }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    }),
    prisma.batch.count({
      where: { status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] } },
    }),
    prisma.batch.count({
      where: { status: 'QC_PASSED' },
    }),
    prisma.batch.count({
      where: { status: 'RELEASED' },
    }),
    prisma.shipment.count({
      where: { status: 'PACKED' },
    }),
    prisma.shipment.count({
      where: { status: 'DELAYED' },
    }),
    prisma.shipment.count({
      where: { 
        status: 'DELIVERED',
        actualArrivalTime: { gte: today, lt: tomorrow },
      },
    }),
  ]);

  return {
    ordersDueToday,
    ordersLate,
    batchesAwaitingQC,
    batchesAwaitingQP,
    readyToDispense,
    shipmentsReadyToDispatch,
    shipmentsDelayed,
    deliveredToday,
  };
}

async function getValidationQueue() {
  const orders = await prisma.order.findMany({
    where: { status: 'SUBMITTED' },
    include: { customer: true, product: true },
    orderBy: { deliveryDate: 'asc' },
    take: 10,
  });

  return orders.map(order => ({
    id: order.id,
    identifier: order.orderNumber,
    title: order.customer?.name || 'Unknown Customer',
    subtitle: order.product?.name,
    eta: order.deliveryDate,
    status: order.status,
    nextAction: 'Validate Order',
    isLate: order.deliveryDate < new Date(),
    linkTo: `/orders/${order.id}/journey`,
  }));
}

async function getQCQueue() {
  const batches = await prisma.batch.findMany({
    where: { status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] } },
    include: { product: true, orders: { include: { customer: true } } },
    orderBy: { plannedStartTime: 'asc' },
    take: 10,
  });

  return batches.map(batch => ({
    id: batch.id,
    identifier: batch.batchNumber,
    title: batch.product?.name || 'Unknown Product',
    subtitle: batch.orders[0]?.customer?.name,
    eta: batch.plannedEndTime,
    status: batch.status,
    nextAction: batch.status === 'QC_PENDING' ? 'Start QC' : 'Enter Results',
    isLate: batch.plannedEndTime ? batch.plannedEndTime < new Date() : false,
    linkTo: `/qc/batches/${batch.id}`,
  }));
}

async function getQPQueue() {
  const batches = await prisma.batch.findMany({
    where: { status: 'QC_PASSED' },
    include: { product: true, orders: { include: { customer: true } } },
    orderBy: { plannedStartTime: 'asc' },
    take: 10,
  });

  return batches.map(batch => ({
    id: batch.id,
    identifier: batch.batchNumber,
    title: batch.product?.name || 'Unknown Product',
    subtitle: batch.orders[0]?.customer?.name,
    eta: batch.plannedEndTime,
    status: batch.status,
    nextAction: 'Review & Release',
    isLate: batch.plannedEndTime ? batch.plannedEndTime < new Date() : false,
    linkTo: `/release/${batch.id}`,
  }));
}

async function getLogisticsQueue() {
  const shipments = await prisma.shipment.findMany({
    where: { status: { in: ['DRAFT', 'READY_TO_PACK', 'PACKED', 'ASSIGNED_TO_DRIVER'] } },
    include: { orders: { include: { customer: true } }, customer: true },
    orderBy: { expectedArrivalTime: 'asc' },
    take: 10,
  });

  return shipments.map(shipment => ({
    id: shipment.id,
    identifier: shipment.shipmentNumber,
    title: shipment.customer?.name || 'Unknown Customer',
    subtitle: shipment.courierName || 'No courier',
    eta: shipment.expectedArrivalTime,
    status: shipment.status,
    nextAction: shipment.status === 'DRAFT' ? 'Pack Shipment' : shipment.status === 'PACKED' ? 'Assign Driver' : 'Dispatch',
    isLate: shipment.expectedArrivalTime ? shipment.expectedArrivalTime < new Date() : false,
    linkTo: `/shipments/${shipment.id}`,
  }));
}

async function getExceptions() {
  const [qcFailed, onHold, expiredReservations, delayedShipments] = await Promise.all([
    prisma.batch.count({ where: { status: 'FAILED_QC' } }),
    prisma.batch.count({ where: { status: 'ON_HOLD' } }),
    prisma.reservation.count({
      where: {
        status: 'TENTATIVE',
        expiresAt: { lt: new Date() },
      },
    }),
    prisma.shipment.count({
      where: { status: 'DELAYED' },
    }),
  ]);

  return [
    { id: 'qc_failed', type: 'error', icon: 'qc_failed', title: 'QC Failed Batches', count: qcFailed, linkTo: '/batches?status=FAILED_QC' },
    { id: 'on_hold', type: 'warning', icon: 'on_hold', title: 'On Hold Batches', count: onHold, linkTo: '/batches?status=ON_HOLD' },
    { id: 'expired', type: 'warning', icon: 'expired', title: 'Expired Reservations', count: expiredReservations, linkTo: '/reservations?expired=true' },
    { id: 'delay', type: 'error', icon: 'delay', title: 'Delayed Shipments', count: delayedShipments, linkTo: '/shipments?status=DELAYED' },
  ];
}

async function getCapacityData(from: Date, to: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(from, i);
    const windows = await prisma.deliveryWindow.findMany({
      where: {
        date: { gte: startOfDay(date), lt: endOfDay(date) },
      },
    }).catch(() => []);

    const totalCapacity = windows.reduce((sum, w) => sum + (w.capacityMinutes || 0), 0) || 480;
    const usedMinutes = windows.reduce((sum, w) => sum + (w.usedMinutes || 0), 0);

    days.push({
      date,
      reservedMinutes: Math.floor(usedMinutes * 0.6),
      committedMinutes: Math.floor(usedMinutes * 0.4),
      totalCapacity,
      isFull: usedMinutes >= totalCapacity,
    });
  }
  return days;
}

async function getRecentActivity(limit: number) {
  const [orders, batches, shipments] = await Promise.all([
    prisma.order.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { customer: true },
    }),
    prisma.batch.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { product: true },
    }),
    prisma.shipment.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { customer: true },
    }),
  ]);

  const events: any[] = [];

  orders.forEach(order => {
    events.push({
      id: `order-${order.id}`,
      type: getEventType('order', order.status),
      title: `Order ${order.orderNumber} ${formatStatus(order.status)}`,
      description: order.customer?.name,
      timestamp: order.updatedAt,
      entityType: 'order',
      entityId: order.id,
      linkTo: `/orders/${order.id}/journey`,
    });
  });

  batches.forEach(batch => {
    events.push({
      id: `batch-${batch.id}`,
      type: getEventType('batch', batch.status),
      title: `Batch ${batch.batchNumber} ${formatStatus(batch.status)}`,
      description: batch.product?.name,
      timestamp: batch.updatedAt,
      entityType: 'batch',
      entityId: batch.id,
      linkTo: `/batches/${batch.id}/journey`,
    });
  });

  shipments.forEach(shipment => {
    events.push({
      id: `shipment-${shipment.id}`,
      type: getEventType('shipment', shipment.status),
      title: `Shipment ${shipment.shipmentNumber} ${formatStatus(shipment.status)}`,
      description: shipment.customer?.name,
      timestamp: shipment.updatedAt,
      entityType: 'shipment',
      entityId: shipment.id,
      linkTo: `/shipments/${shipment.id}`,
    });
  });

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

function getEventType(entity: string, status: string): string {
  if (entity === 'order') {
    if (status === 'VALIDATED') return 'order_validated';
    if (status === 'SCHEDULED') return 'order_scheduled';
    return 'order_created';
  }
  if (entity === 'batch') {
    if (status === 'IN_PRODUCTION') return 'batch_started';
    if (status === 'PRODUCTION_COMPLETE') return 'batch_completed';
    if (status === 'QC_PASSED') return 'qc_passed';
    if (status === 'FAILED_QC') return 'qc_failed';
    if (status === 'RELEASED') return 'batch_released';
    return 'batch_started';
  }
  if (entity === 'shipment') {
    if (status === 'IN_TRANSIT') return 'shipment_dispatched';
    if (status === 'DELIVERED') return 'shipment_delivered';
    return 'shipment_dispatched';
  }
  return 'default';
}

function formatStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

/**
 * @swagger
 * /dashboard/qc:
 *   get:
 *     summary: Get QC department dashboard data
 *     tags: [Dashboard]
 */
router.get('/qc', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const [awaitingSamples, qcInProgress, qcFailed, nearingDeadline, queue] = await Promise.all([
      prisma.batch.count({ where: { status: 'QC_PENDING' } }),
      prisma.batch.count({ where: { status: 'QC_IN_PROGRESS' } }),
      prisma.batch.count({ where: { status: 'FAILED_QC' } }),
      prisma.batch.count({
        where: {
          status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] },
          plannedEndTime: { gte: today, lt: addDays(today, 2) },
        },
      }),
      getQCQueue(),
    ]);

    res.json({
      kpis: { awaitingSamples, qcInProgress, qcFailed, nearingDeadline },
      queue,
      lastRefreshed: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QC dashboard' });
  }
});

/**
 * @swagger
 * /dashboard/qp:
 *   get:
 *     summary: Get QP department dashboard data
 *     tags: [Dashboard]
 */
router.get('/qp', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const [awaitingQP, onHold, releasedToday, rejected] = await Promise.all([
      prisma.batch.count({ where: { status: 'QC_PASSED' } }),
      prisma.batch.count({ where: { status: 'ON_HOLD' } }),
      prisma.batch.count({
        where: { status: 'RELEASED', updatedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.batch.count({ where: { status: 'REJECTED' } }),
    ]);

    const queue = await getQPQueue();

    res.json({
      kpis: { awaitingQP, onHold, releasedToday, rejected },
      queue,
      lastRefreshed: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch QP dashboard' });
  }
});

/**
 * @swagger
 * /dashboard/dispensing:
 *   get:
 *     summary: Get Dispensing department dashboard data
 *     tags: [Dashboard]
 */
router.get('/dispensing', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const [readyToDispense, dispensingInProgress, blocked, dispensedToday] = await Promise.all([
      prisma.batch.count({ where: { status: 'RELEASED' } }),
      prisma.batch.count({ where: { status: 'DISPENSING_IN_PROGRESS' } }),
      prisma.batch.count({ where: { status: { in: ['ON_HOLD', 'FAILED_QC'] } } }),
      prisma.batch.count({
        where: { status: 'DISPENSED', updatedAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    const batches = await prisma.batch.findMany({
      where: { status: { in: ['RELEASED', 'DISPENSING_IN_PROGRESS'] } },
      include: { product: true, orders: { include: { customer: true } } },
      orderBy: { plannedStartTime: 'asc' },
      take: 10,
    });

    const queue = batches.map(batch => ({
      id: batch.id,
      identifier: batch.batchNumber,
      title: batch.product?.name || 'Unknown Product',
      subtitle: batch.orders[0]?.customer?.name,
      eta: batch.plannedEndTime,
      status: batch.status,
      nextAction: batch.status === 'RELEASED' ? 'Start Dispensing' : 'Continue',
      isLate: batch.plannedEndTime ? batch.plannedEndTime < new Date() : false,
      linkTo: `/dispensing/batches/${batch.id}`,
    }));

    res.json({
      kpis: { readyToDispense, dispensingInProgress, blocked, dispensedToday },
      queue,
      lastRefreshed: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Dispensing dashboard' });
  }
});

/**
 * @swagger
 * /dashboard/logistics:
 *   get:
 *     summary: Get Logistics department dashboard data
 *     tags: [Dashboard]
 */
router.get('/logistics', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const [readyToPack, readyToDispatch, inTransit, delayed, deliveredToday] = await Promise.all([
      prisma.shipment.count({ where: { status: 'READY_TO_PACK' } }),
      prisma.shipment.count({ where: { status: 'PACKED' } }),
      prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.shipment.count({ where: { status: 'DELAYED' } }),
      prisma.shipment.count({
        where: { status: 'DELIVERED', actualArrivalTime: { gte: today, lt: tomorrow } },
      }),
    ]);

    const queue = await getLogisticsQueue();

    res.json({
      kpis: { readyToPack, readyToDispatch, inTransit, delayed, deliveredToday },
      queue,
      lastRefreshed: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Logistics dashboard' });
  }
});

/**
 * @swagger
 * /dashboard/portal:
 *   get:
 *     summary: Get Customer Portal dashboard data
 *     tags: [Dashboard]
 */
router.get('/portal', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const customerId = user?.customerId;
    
    if (!customerId) {
      res.status(403).json({ error: 'Not a customer user' });
      return;
    }

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const [journeyCounts, arrivingToday, inTransit, deliveredRecently] = await Promise.all([
      getCustomerJourneyCounts(customerId),
      prisma.order.findMany({
        where: { customerId, deliveryDate: { gte: today, lt: tomorrow }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        include: { product: true },
        take: 10,
      }),
      prisma.shipment.findMany({
        where: { customerId, status: 'IN_TRANSIT' },
        include: { orders: { include: { product: true } } },
        take: 10,
      }),
      prisma.shipment.findMany({
        where: { customerId, status: 'DELIVERED' },
        include: { orders: { include: { product: true } } },
        orderBy: { actualArrivalTime: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      journeyCounts,
      arrivingToday: arrivingToday.map(o => ({
        id: o.id,
        identifier: o.orderNumber,
        title: o.product?.name,
        eta: o.deliveryDate,
        status: o.status,
        linkTo: `/portal/orders/${o.id}`,
      })),
      inTransit: inTransit.map(s => ({
        id: s.id,
        identifier: s.shipmentNumber,
        title: s.orders[0]?.product?.name,
        eta: s.expectedArrivalTime,
        status: s.status,
        linkTo: `/portal/orders/${s.orders[0]?.id}`,
      })),
      deliveredRecently: deliveredRecently.map(s => ({
        id: s.id,
        identifier: s.shipmentNumber,
        title: s.orders[0]?.product?.name,
        deliveredAt: s.actualArrivalTime,
        linkTo: `/portal/orders/${s.orders[0]?.id}`,
      })),
      lastRefreshed: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portal dashboard' });
  }
});

async function getCustomerJourneyCounts(customerId: string) {
  const orderStatusCounts = await prisma.order.groupBy({
    by: ['status'],
    where: { customerId },
    _count: true,
  });

  const orderMap = Object.fromEntries(orderStatusCounts.map(s => [s.status, s._count]));

  return [
    { id: 'submitted', label: 'Submitted', count: orderMap['SUBMITTED'] || 0, color: 'blue' },
    { id: 'confirmed', label: 'Confirmed', count: (orderMap['VALIDATED'] || 0), color: 'blue' },
    { id: 'scheduled', label: 'Scheduled', count: orderMap['SCHEDULED'] || 0, color: 'blue' },
    { id: 'in_production', label: 'In Production', count: orderMap['IN_PRODUCTION'] || 0, color: 'yellow' },
    { id: 'dispatched', label: 'Dispatched', count: orderMap['DISPATCHED'] || 0, color: 'teal' },
    { id: 'delivered', label: 'Delivered', count: orderMap['DELIVERED'] || 0, color: 'green' },
  ];
}

router.get('/kpi-trends', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.query;
    const numDays = Number(days);
    const endDate = new Date();
    const startDate = addDays(endDate, -numDays);

    const [
      deliveryWindows,
      batches,
      shipments,
      orders,
    ] = await Promise.all([
      prisma.deliveryWindow.findMany({
        where: { date: { gte: startOfDay(startDate), lte: endOfDay(endDate) } },
        include: { reservations: { where: { status: { in: ['CONFIRMED'] } } } },
      }),
      prisma.batch.findMany({
        where: { createdAt: { gte: startDate } },
        select: { id: true, status: true, createdAt: true, targetActivity: true, actualActivity: true, batchReleases: { select: { createdAt: true } } },
      }),
      prisma.shipment.findMany({
        where: { createdAt: { gte: startDate } },
        select: { id: true, status: true, scheduledDeliveryAt: true, actualDeliveryAt: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        select: { id: true, status: true, createdAt: true, deliveryDate: true },
      }),
    ]);

    const capacityUtilization = deliveryWindows.reduce((acc, w) => {
      const committed = w.reservations.reduce((sum, r) => sum + (r.estimatedMinutes || 0), 0);
      const used = w.usedMinutes || 0;
      return {
        total: acc.total + w.capacityMinutes,
        used: acc.used + used + committed,
      };
    }, { total: 0, used: 0 });
    const utilizationPercent = capacityUtilization.total > 0 
      ? Math.round((capacityUtilization.used / capacityUtilization.total) * 100) 
      : 0;

    const releasedBatches = batches.filter(b => b.status === 'RELEASED' && b.batchReleases.length > 0);
    const avgReleaseLeadTimeMinutes = releasedBatches.length > 0
      ? releasedBatches.reduce((sum, b) => {
          const releaseTime = b.batchReleases[0]?.createdAt;
          if (releaseTime && b.createdAt) {
            return sum + (new Date(releaseTime).getTime() - new Date(b.createdAt).getTime()) / 60000;
          }
          return sum;
        }, 0) / releasedBatches.length
      : 0;

    const batchesWithYield = batches.filter(b => b.actualActivity && b.targetActivity);
    const avgYieldPercent = batchesWithYield.length > 0
      ? Math.round(batchesWithYield.reduce((sum, b) => sum + ((b.actualActivity! / b.targetActivity) * 100), 0) / batchesWithYield.length)
      : 0;

    const deliveredShipments = shipments.filter(s => s.status === 'DELIVERED');
    const onTimeDeliveries = deliveredShipments.filter(s => {
      if (!s.scheduledDeliveryAt || !s.actualDeliveryAt) return true;
      return new Date(s.actualDeliveryAt) <= new Date(s.scheduledDeliveryAt);
    });
    const otifPercent = deliveredShipments.length > 0
      ? Math.round((onTimeDeliveries.length / deliveredShipments.length) * 100)
      : 100;

    res.json({
      period: { startDate, endDate, days: numDays },
      kpis: {
        capacityUtilization: {
          label: 'Capacity Utilization',
          value: utilizationPercent,
          unit: '%',
          target: 80,
          status: utilizationPercent >= 80 ? 'success' : utilizationPercent >= 60 ? 'warning' : 'danger',
        },
        releaseLeadTime: {
          label: 'Avg Release Lead Time',
          value: Math.round(avgReleaseLeadTimeMinutes),
          unit: 'min',
          target: 180,
          status: avgReleaseLeadTimeMinutes <= 180 ? 'success' : avgReleaseLeadTimeMinutes <= 240 ? 'warning' : 'danger',
        },
        yield: {
          label: 'Average Yield',
          value: avgYieldPercent,
          unit: '%',
          target: 95,
          status: avgYieldPercent >= 95 ? 'success' : avgYieldPercent >= 85 ? 'warning' : 'danger',
        },
        otif: {
          label: 'OTIF (On-Time In-Full)',
          value: otifPercent,
          unit: '%',
          target: 98,
          status: otifPercent >= 98 ? 'success' : otifPercent >= 90 ? 'warning' : 'danger',
        },
      },
      summary: {
        totalOrders: orders.length,
        deliveredOrders: orders.filter(o => o.status === 'DELIVERED').length,
        totalBatches: batches.length,
        releasedBatches: releasedBatches.length,
        totalShipments: shipments.length,
        deliveredShipments: deliveredShipments.length,
      },
    });
  } catch (error) {
    console.error('KPI trends error:', error);
    res.status(500).json({ error: 'Failed to get KPI trends' });
  }
});

router.get('/audit-logs', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action as string };
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;
