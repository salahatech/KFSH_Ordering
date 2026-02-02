import { Router, Request, Response } from 'express';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { calculateActivityAtTime } from '../utils/decay.js';
import { triggerWorkflow } from '../services/workflow.js';

const router = Router();
const prisma = new PrismaClient();

function generateShipmentNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SHP-${year}${month}${day}-${random}`;
}

async function createShipmentEvent(
  shipmentId: string,
  eventType: string,
  fromStatus: ShipmentStatus | null,
  toStatus: ShipmentStatus | null,
  driverId?: string,
  userId?: string,
  notes?: string,
  metadata?: any
) {
  return prisma.shipmentEvent.create({
    data: {
      shipmentId,
      eventType,
      fromStatus,
      toStatus,
      driverId,
      userId,
      notes,
      metadata,
    },
  });
}

/**
 * @swagger
 * /shipments:
 *   get:
 *     summary: Get all shipments
 *     tags: [Logistics]
 *     responses:
 *       200:
 *         description: List of shipments
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId, driverId, fromDate, toDate, search, priority, unassigned } = req.query;
    
    const where: any = {};
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status as ShipmentStatus;
      }
    }
    if (customerId) where.customerId = customerId as string;
    if (driverId) where.driverId = driverId as string;
    if (priority) where.priority = priority;
    if (unassigned === 'true') where.driverId = null;
    if (fromDate || toDate) {
      where.scheduledDeliveryAt = {};
      if (fromDate) where.scheduledDeliveryAt.gte = new Date(fromDate as string);
      if (toDate) where.scheduledDeliveryAt.lte = new Date(toDate as string);
    }
    if (search) {
      where.OR = [
        { shipmentNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
        { driver: { fullName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        customer: true,
        driver: true,
        orders: { include: { product: true } },
        _count: { select: { orders: true, events: true } },
      },
      orderBy: { scheduledDeliveryAt: 'asc' },
    });

    res.json(shipments);
  } catch (error) {
    console.error('Fetch shipments error:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

/**
 * @swagger
 * /shipments/{id}:
 *   get:
 *     summary: Get shipment by ID
 *     tags: [Logistics]
 *     responses:
 *       200:
 *         description: Shipment details with activity calculations
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        driver: true,
        orders: { 
          include: { 
            product: true,
            batch: true,
          },
        },
        events: { orderBy: { createdAt: 'desc' }, include: { driver: true } },
        proofOfDelivery: { include: { photos: true, capturedByDriver: true } },
      },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const ordersWithActivity = shipment.orders.map(order => {
      const batch = order.batch;
      if (!batch || !batch.actualActivity || !batch.calibrationTime) {
        return { ...order, activityAtDispatch: null, activityAtDelivery: null };
      }

      const activityAtDispatch = shipment.actualDepartureTime 
        ? calculateActivityAtTime(
            batch.actualActivity,
            batch.calibrationTime,
            shipment.actualDepartureTime,
            order.product.halfLifeMinutes
          )
        : null;

      const activityAtDelivery = shipment.expectedArrivalTime
        ? calculateActivityAtTime(
            batch.actualActivity,
            batch.calibrationTime,
            shipment.expectedArrivalTime,
            order.product.halfLifeMinutes
          )
        : null;

      return { ...order, activityAtDispatch, activityAtDelivery };
    });

    res.json({ ...shipment, orders: ordersWithActivity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

/**
 * @swagger
 * /shipments:
 *   post:
 *     summary: Create a new shipment
 *     tags: [Logistics]
 *     responses:
 *       201:
 *         description: Shipment created
 */
router.post('/', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId, courierName, vehicleInfo, routeInfo,
      scheduledDepartureTime, expectedArrivalTime, orderIds, notes
    } = req.body;

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, status: 'RELEASED' },
      include: { batch: true },
    });

    if (orders.length !== orderIds.length) {
      res.status(400).json({ error: 'All orders must be in RELEASED status' });
      return;
    }

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: generateShipmentNumber(),
        customerId,
        courierName,
        vehicleInfo,
        routeInfo,
        scheduledDepartureTime: scheduledDepartureTime ? new Date(scheduledDepartureTime) : null,
        expectedArrivalTime: expectedArrivalTime ? new Date(expectedArrivalTime) : null,
        notes,
        orders: { connect: orderIds.map((id: string) => ({ id })) },
      },
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
    });

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { shipmentId: shipment.id },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Shipment', shipment.id, null, shipment, req);

    res.status(201).json(shipment);
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

/**
 * @swagger
 * /shipments/{id}/dispatch:
 *   post:
 *     summary: Dispatch shipment
 *     tags: [Logistics]
 *     responses:
 *       200:
 *         description: Shipment dispatched
 */
router.post('/:id/dispatch', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { courierId, courierName, vehicleInfo } = req.body;
    
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { orders: { include: { product: true, batch: true } } },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const now = new Date();
    
    let totalActivityAtDispatch = 0;
    for (const order of shipment.orders) {
      if (order.batch?.actualActivity && order.batch.calibrationTime) {
        totalActivityAtDispatch += calculateActivityAtTime(
          order.batch.actualActivity,
          order.batch.calibrationTime,
          now,
          order.product.halfLifeMinutes
        );
      }
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_TRANSIT',
        courierId,
        courierName,
        vehicleInfo,
        actualDepartureTime: now,
        activityAtDispatch: totalActivityAtDispatch,
      },
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
    });

    await prisma.order.updateMany({
      where: { shipmentId: shipment.id },
      data: { status: 'DISPATCHED' },
    });

    await createAuditLog(req.user?.userId, 'DISPATCH', 'Shipment', shipment.id, null,
      { activityAtDispatch: totalActivityAtDispatch }, req);

    if (req.user?.userId) {
      try {
        await triggerWorkflow({
          entityType: 'SHIPMENT',
          entityId: shipment.id,
          triggerStatus: 'ASSIGNED',
          requestedById: req.user.userId,
          priority: 'HIGH',
        });
      } catch (workflowError) {
        console.error('Failed to trigger shipment dispatch workflow:', workflowError);
      }
    }

    res.json(updatedShipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispatch shipment' });
  }
});

/**
 * @swagger
 * /shipments/{id}/deliver:
 *   post:
 *     summary: Confirm delivery
 *     tags: [Logistics]
 *     responses:
 *       200:
 *         description: Delivery confirmed
 */
router.post('/:id/deliver', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiverName, receiverSignature, notes } = req.body;
    
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { orders: { include: { product: true, batch: true } } },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const now = new Date();
    
    let totalActivityAtDelivery = 0;
    for (const order of shipment.orders) {
      if (order.batch?.actualActivity && order.batch.calibrationTime) {
        totalActivityAtDelivery += calculateActivityAtTime(
          order.batch.actualActivity,
          order.batch.calibrationTime,
          now,
          order.product.halfLifeMinutes
        );
      }
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'DELIVERED',
        actualArrivalTime: now,
        receiverName,
        receiverSignature,
        activityAtDelivery: totalActivityAtDelivery,
        notes: notes ? `${shipment.notes || ''}\n${notes}` : shipment.notes,
      },
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
    });

    await prisma.order.updateMany({
      where: { shipmentId: shipment.id },
      data: { status: 'DELIVERED' },
    });

    await createAuditLog(req.user?.userId, 'DELIVER', 'Shipment', shipment.id, null,
      { receiverName, activityAtDelivery: totalActivityAtDelivery }, req);

    res.json(updatedShipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm delivery' });
  }
});

/**
 * @swagger
 * /shipments/{id}/status:
 *   patch:
 *     summary: Update shipment status
 *     tags: [Logistics]
 *     responses:
 *       200:
 *         description: Shipment status updated
 */
router.patch('/:id/status', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    
    const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: { 
        status: status as ShipmentStatus,
        notes: notes ? `${shipment.notes || ''}\n${notes}` : shipment.notes,
      },
      include: { customer: true, orders: true, driver: true },
    });

    await createShipmentEvent(
      shipment.id,
      'STATUS_CHANGE',
      shipment.status,
      status as ShipmentStatus,
      undefined,
      req.user?.userId,
      notes
    );

    await createAuditLog(req.user?.userId, 'STATUS_CHANGE', 'Shipment', shipment.id,
      { status: shipment.status }, { status }, req);

    res.json(updatedShipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shipment status' });
  }
});

router.post('/:id/assign-driver', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId, scheduledPickupAt, scheduledDeliveryAt, driverNotes, priority } = req.body;

    if (!driverId) {
      res.status(400).json({ error: 'Driver ID is required' });
      return;
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { customer: true },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (!['PACKED', 'ASSIGNED_TO_DRIVER', 'DELIVERY_FAILED'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot assign driver to shipment in ${shipment.status} status` });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    if (driver.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Driver is not active' });
      return;
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        driverId,
        assignedAt: new Date(),
        status: 'ASSIGNED_TO_DRIVER',
        scheduledPickupAt: scheduledPickupAt ? new Date(scheduledPickupAt) : undefined,
        scheduledDeliveryAt: scheduledDeliveryAt ? new Date(scheduledDeliveryAt) : undefined,
        driverNotes,
        priority: priority || undefined,
        deliveryAddress: `${shipment.customer.address || ''}, ${shipment.customer.city || ''}`,
        deliveryLat: shipment.customer.latitude,
        deliveryLng: shipment.customer.longitude,
      },
      include: { customer: true, driver: true, orders: { include: { product: true } } },
    });

    await createShipmentEvent(
      shipment.id,
      'ASSIGNED_TO_DRIVER',
      shipment.status,
      'ASSIGNED_TO_DRIVER',
      driverId,
      req.user?.userId,
      `Assigned to ${driver.fullName}`
    );

    await createAuditLog(req.user?.userId, 'ASSIGN_DRIVER', 'Shipment', shipment.id,
      { driverId: shipment.driverId }, { driverId, driverName: driver.fullName }, req);

    res.json(updatedShipment);
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

router.post('/:id/schedule', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduledPickupAt, scheduledDeliveryAt, priority, notes } = req.body;

    const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        scheduledPickupAt: scheduledPickupAt ? new Date(scheduledPickupAt) : undefined,
        scheduledDeliveryAt: scheduledDeliveryAt ? new Date(scheduledDeliveryAt) : undefined,
        priority: priority || undefined,
        notes: notes ? `${shipment.notes || ''}\n${notes}` : undefined,
      },
      include: { customer: true, driver: true },
    });

    await createShipmentEvent(
      shipment.id,
      'SCHEDULED',
      null,
      null,
      undefined,
      req.user?.userId,
      `Scheduled pickup: ${scheduledPickupAt}, delivery: ${scheduledDeliveryAt}`
    );

    res.json(updatedShipment);
  } catch (error) {
    console.error('Schedule shipment error:', error);
    res.status(500).json({ error: 'Failed to schedule shipment' });
  }
});

router.post('/:id/mark-packed', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics', 'QP'), async (req: Request, res: Response): Promise<void> => {
  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (!['DRAFT', 'READY_TO_PACK'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot mark as packed from ${shipment.status} status` });
      return;
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: { status: 'PACKED' },
      include: { customer: true, driver: true, orders: { include: { product: true } } },
    });

    await createShipmentEvent(
      shipment.id,
      'PACKED',
      shipment.status,
      'PACKED',
      undefined,
      req.user?.userId,
      'Shipment packed and ready for assignment'
    );

    res.json(updatedShipment);
  } catch (error) {
    console.error('Mark packed error:', error);
    res.status(500).json({ error: 'Failed to mark as packed' });
  }
});

router.post('/:id/cancel', authenticateToken, requireRole('Admin', 'Production Manager', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;

    const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (['DELIVERED', 'CANCELLED'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot cancel shipment in ${shipment.status} status` });
      return;
    }

    const updatedShipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${shipment.notes || ''}\nCancelled: ${reason}` : shipment.notes,
      },
      include: { customer: true, driver: true },
    });

    await createShipmentEvent(
      shipment.id,
      'CANCELLED',
      shipment.status,
      'CANCELLED',
      undefined,
      req.user?.userId,
      reason || 'Shipment cancelled'
    );

    await createAuditLog(req.user?.userId, 'CANCEL', 'Shipment', shipment.id,
      { status: shipment.status }, { status: 'CANCELLED', reason }, req);

    res.json(updatedShipment);
  } catch (error) {
    console.error('Cancel shipment error:', error);
    res.status(500).json({ error: 'Failed to cancel shipment' });
  }
});

router.get('/:id/pod', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const pod = await prisma.proofOfDelivery.findUnique({
      where: { shipmentId: req.params.id },
      include: { photos: true, capturedByDriver: true, shipment: { include: { customer: true } } },
    });

    if (!pod) {
      res.status(404).json({ error: 'Proof of delivery not found' });
      return;
    }

    res.json(pod);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proof of delivery' });
  }
});

router.get('/:id/events', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId: req.params.id },
      include: { driver: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment events' });
  }
});

export default router;
