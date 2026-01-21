import { Router, Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { canTransitionOrder, getNextOrderStatuses } from '../utils/statusMachine.js';
import {
  calculateProductionActivityWithOverage,
  calculateBackwardSchedule,
  isWithinShelfLife,
} from '../utils/decay.js';
import { v4 as uuidv4 } from 'uuid';
import { triggerWorkflow } from '../services/workflow.js';

const router = Router();
const prisma = new PrismaClient();

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customerId, fromDate, toDate } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status as OrderStatus;
    if (customerId) where.customerId = customerId as string;
    if (fromDate || toDate) {
      where.deliveryDate = {};
      if (fromDate) where.deliveryDate.gte = new Date(fromDate as string);
      if (toDate) where.deliveryDate.lte = new Date(toDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        product: true,
        batch: true,
        shipment: true,
      },
      orderBy: { deliveryDate: 'asc' },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        product: { include: { qcTemplates: true } },
        batch: { include: { qcResults: true } },
        shipment: true,
        orderHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', authenticateToken, requireRole('Admin', 'Production Manager', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      customerId, productId, deliveryDate, deliveryTimeStart, deliveryTimeEnd,
      requestedActivity, activityUnit, numberOfDoses, injectionTime,
      patientCount, specialNotes, status
    } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { permittedProducts: true },
    });

    if (!customer) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }

    if (customer.licenseExpiryDate && customer.licenseExpiryDate < new Date()) {
      res.status(400).json({ error: 'Customer license has expired' });
      return;
    }

    const isProductPermitted = customer.permittedProducts.some(p => p.productId === productId);
    if (!isProductPermitted) {
      res.status(400).json({ error: 'Product not permitted for this customer' });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(400).json({ error: 'Product not found' });
      return;
    }

    const targetTime = injectionTime ? new Date(injectionTime) : new Date(deliveryTimeStart);
    
    const schedule = calculateBackwardSchedule(
      new Date(deliveryTimeStart),
      customer.travelTimeMinutes,
      product.packagingTimeMinutes,
      product.qcTimeMinutes,
      product.synthesisTimeMinutes
    );

    const calculatedProductionActivity = calculateProductionActivityWithOverage(
      requestedActivity,
      product.halfLifeMinutes,
      targetTime,
      schedule.synthesisStartTime,
      product.overagePercent
    );

    if (!isWithinShelfLife(schedule.synthesisStartTime, new Date(deliveryTimeStart), product.shelfLifeMinutes)) {
      res.status(400).json({ 
        error: 'Order not feasible: delivery time exceeds product shelf life',
        details: {
          shelfLifeMinutes: product.shelfLifeMinutes,
          estimatedProductionTime: schedule.synthesisStartTime,
          deliveryTime: deliveryTimeStart,
        }
      });
      return;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId,
        productId,
        deliveryDate: new Date(deliveryDate),
        deliveryTimeStart: new Date(deliveryTimeStart),
        deliveryTimeEnd: new Date(deliveryTimeEnd),
        requestedActivity,
        activityUnit: activityUnit || 'mCi',
        numberOfDoses,
        injectionTime: injectionTime ? new Date(injectionTime) : null,
        patientCount,
        specialNotes,
        calculatedProductionActivity,
        calculatedCalibrationTime: schedule.synthesisStartTime,
        status: status || 'DRAFT',
      },
      include: { customer: true, product: true },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        toStatus: order.status,
        changedBy: req.user?.userId,
        changeNotes: 'Order created',
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Order', order.id, null, order, req);

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order updated
 */
router.put('/:id', authenticateToken, requireRole('Admin', 'Production Manager', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldOrder = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, product: true },
    });

    if (!oldOrder) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (!['DRAFT', 'SUBMITTED', 'VALIDATED'].includes(oldOrder.status)) {
      res.status(400).json({ error: 'Order cannot be modified in current status' });
      return;
    }

    const {
      deliveryDate, deliveryTimeStart, deliveryTimeEnd,
      requestedActivity, activityUnit, numberOfDoses, injectionTime,
      patientCount, specialNotes
    } = req.body;

    const product = oldOrder.product;
    const customer = oldOrder.customer;

    const targetTime = injectionTime ? new Date(injectionTime) : new Date(deliveryTimeStart || oldOrder.deliveryTimeStart);
    const startTime = new Date(deliveryTimeStart || oldOrder.deliveryTimeStart);
    
    const schedule = calculateBackwardSchedule(
      startTime,
      customer.travelTimeMinutes,
      product.packagingTimeMinutes,
      product.qcTimeMinutes,
      product.synthesisTimeMinutes
    );

    const activity = requestedActivity || oldOrder.requestedActivity;
    const calculatedProductionActivity = calculateProductionActivityWithOverage(
      activity,
      product.halfLifeMinutes,
      targetTime,
      schedule.synthesisStartTime,
      product.overagePercent
    );

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliveryTimeStart: deliveryTimeStart ? new Date(deliveryTimeStart) : undefined,
        deliveryTimeEnd: deliveryTimeEnd ? new Date(deliveryTimeEnd) : undefined,
        requestedActivity,
        activityUnit,
        numberOfDoses,
        injectionTime: injectionTime ? new Date(injectionTime) : undefined,
        patientCount,
        specialNotes,
        calculatedProductionActivity,
        calculatedCalibrationTime: schedule.synthesisStartTime,
        version: { increment: 1 },
      },
      include: { customer: true, product: true },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        fromStatus: oldOrder.status,
        toStatus: order.status,
        changedBy: req.user?.userId,
        changeNotes: 'Order updated',
        snapshot: oldOrder as any,
      },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Order', order.id, oldOrder, order, req);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authenticateToken, requireRole('Admin', 'Production Manager', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (!canTransitionOrder(order.status, status as OrderStatus)) {
      res.status(400).json({ 
        error: `Invalid status transition from ${order.status} to ${status}`,
        allowedStatuses: getNextOrderStatuses(order.status),
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status as OrderStatus },
      include: { customer: true, product: true },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: status as OrderStatus,
        changedBy: req.user?.userId,
        changeNotes: notes,
      },
    });

    await createAuditLog(req.user?.userId, 'STATUS_CHANGE', 'Order', order.id, 
      { status: order.status }, { status }, req);

    if (status === 'SUBMITTED' && req.user?.userId) {
      try {
        await triggerWorkflow({
          entityType: 'ORDER',
          entityId: order.id,
          triggerStatus: 'SUBMITTED',
          requestedById: req.user.userId,
          priority: 'NORMAL',
          notes,
        });
      } catch (workflowError) {
        console.error('Failed to trigger order approval workflow:', workflowError);
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * @swagger
 * /orders/{id}/calculate-activity:
 *   get:
 *     summary: Calculate activity at different times
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Activity calculations
 */
router.get('/:id/calculate-activity', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { product: true, customer: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const product = order.product;
    const customer = order.customer;
    const targetTime = order.injectionTime || order.deliveryTimeStart;

    const schedule = calculateBackwardSchedule(
      order.deliveryTimeStart,
      customer.travelTimeMinutes,
      product.packagingTimeMinutes,
      product.qcTimeMinutes,
      product.synthesisTimeMinutes
    );

    const calculatedProductionActivity = calculateProductionActivityWithOverage(
      order.requestedActivity,
      product.halfLifeMinutes,
      targetTime,
      schedule.synthesisStartTime,
      product.overagePercent
    );

    res.json({
      requestedActivity: order.requestedActivity,
      activityUnit: order.activityUnit,
      targetTime,
      productionActivity: calculatedProductionActivity,
      schedule: {
        synthesisStart: schedule.synthesisStartTime,
        qcStart: schedule.qcStartTime,
        packagingStart: schedule.packagingStartTime,
        dispatch: schedule.dispatchTime,
        delivery: order.deliveryTimeStart,
      },
      halfLifeMinutes: product.halfLifeMinutes,
      overagePercent: product.overagePercent,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate activity' });
  }
});

export default router;
