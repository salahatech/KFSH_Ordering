import { Router, Request, Response } from 'express';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { calculateActivityAtTime } from '../utils/decay.js';

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
    const { status, customerId, fromDate, toDate } = req.query;
    
    const where: any = {};
    if (status) where.status = status as ShipmentStatus;
    if (customerId) where.customerId = customerId as string;
    if (fromDate || toDate) {
      where.scheduledDepartureTime = {};
      if (fromDate) where.scheduledDepartureTime.gte = new Date(fromDate as string);
      if (toDate) where.scheduledDepartureTime.lte = new Date(toDate as string);
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
      orderBy: { scheduledDepartureTime: 'asc' },
    });

    res.json(shipments);
  } catch (error) {
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
        orders: { 
          include: { 
            product: true,
            batch: true,
          },
        },
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
      include: { customer: true, orders: true },
    });

    await createAuditLog(req.user?.userId, 'STATUS_CHANGE', 'Shipment', shipment.id,
      { status: shipment.status }, { status }, req);

    res.json(updatedShipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shipment status' });
  }
});

export default router;
