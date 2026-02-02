import { Router, Request, Response } from 'express';
import { PrismaClient, ShipmentStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const uploadsDir = path.join(process.cwd(), 'uploads', 'pod');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `pod-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only images and PDFs allowed'));
  },
});

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT: ['READY_TO_PACK'],
  READY_TO_PACK: ['PACKED', 'CANCELLED'],
  PACKED: ['ASSIGNED_TO_DRIVER', 'CANCELLED'],
  ASSIGNED_TO_DRIVER: ['ACCEPTED_BY_DRIVER', 'CANCELLED'],
  ACCEPTED_BY_DRIVER: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED', 'DELAYED', 'DELIVERY_FAILED'],
  ARRIVED: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: [],
  DELIVERY_FAILED: ['RETURNED', 'ASSIGNED_TO_DRIVER'],
  RETURNED: [],
  CANCELLED: [],
  DELAYED: ['IN_TRANSIT', 'ARRIVED', 'DELIVERY_FAILED'],
};

async function getDriverFromUser(userId: string) {
  const driver = await prisma.driver.findFirst({ where: { userId } });
  return driver;
}

async function createShipmentEvent(
  shipmentId: string,
  eventType: string,
  fromStatus: ShipmentStatus | null,
  toStatus: ShipmentStatus | null,
  driverId?: string,
  userId?: string,
  notes?: string,
  latitude?: number,
  longitude?: number,
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
      latitude,
      longitude,
      metadata,
    },
  });
}

router.get('/dashboard', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [assignedToday, awaitingAcceptance, inTransit, deliveredToday, failed] = await Promise.all([
      prisma.shipment.count({
        where: {
          driverId: driver.id,
          scheduledDeliveryAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.shipment.count({
        where: { driverId: driver.id, status: 'ASSIGNED_TO_DRIVER' },
      }),
      prisma.shipment.count({
        where: {
          driverId: driver.id,
          status: { in: ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] },
        },
      }),
      prisma.shipment.count({
        where: {
          driverId: driver.id,
          status: 'DELIVERED',
          actualArrivalTime: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.shipment.count({
        where: {
          driverId: driver.id,
          status: 'DELIVERY_FAILED',
        },
      }),
    ]);

    const nextDeliveries = await prisma.shipment.findMany({
      where: {
        driverId: driver.id,
        status: { in: ['ASSIGNED_TO_DRIVER', 'ACCEPTED_BY_DRIVER', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] },
      },
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
      orderBy: { scheduledDeliveryAt: 'asc' },
      take: 10,
    });

    res.json({
      stats: { assignedToday, awaitingAcceptance, inTransit, deliveredToday, failed },
      nextDeliveries,
      driver: { id: driver.id, fullName: driver.fullName, vehicleType: driver.vehicleType, vehiclePlateNo: driver.vehiclePlateNo },
    });
  } catch (error) {
    console.error('Driver dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/shipments', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { status, fromDate, toDate, search, priority } = req.query;

    const where: any = { driverId: driver.id };
    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }
    if (priority) where.priority = priority;
    if (fromDate || toDate) {
      where.scheduledDeliveryAt = {};
      if (fromDate) where.scheduledDeliveryAt.gte = new Date(fromDate as string);
      if (toDate) where.scheduledDeliveryAt.lte = new Date(toDate as string);
    }
    if (search) {
      where.OR = [
        { shipmentNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        customer: true,
        orders: { include: { product: true } },
      },
      orderBy: { scheduledDeliveryAt: 'asc' },
    });

    res.json(shipments);
  } catch (error) {
    console.error('Fetch driver shipments error:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

router.get('/shipments/:id', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
      include: {
        customer: true,
        orders: { include: { product: true } },
        events: { orderBy: { createdAt: 'desc' } },
        proofOfDelivery: { include: { photos: true } },
      },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found or not assigned to you' });
      return;
    }

    res.json(shipment);
  } catch (error) {
    console.error('Fetch shipment detail error:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

router.post('/shipments/:id/accept', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found or not assigned to you' });
      return;
    }

    if (shipment.status !== 'ASSIGNED_TO_DRIVER') {
      res.status(400).json({ error: `Cannot accept shipment in ${shipment.status} status` });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED_BY_DRIVER' },
      include: { customer: true, orders: { include: { product: true } } },
    });

    await createShipmentEvent(
      shipment.id,
      'ACCEPTED',
      'ASSIGNED_TO_DRIVER',
      'ACCEPTED_BY_DRIVER',
      driver.id,
      req.user?.userId,
      'Driver accepted shipment'
    );

    res.json(updated);
  } catch (error) {
    console.error('Accept shipment error:', error);
    res.status(500).json({ error: 'Failed to accept shipment' });
  }
});

router.post('/shipments/:id/pickup', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { latitude, longitude, notes } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found or not assigned to you' });
      return;
    }

    if (shipment.status !== 'ACCEPTED_BY_DRIVER') {
      res.status(400).json({ error: `Cannot pickup shipment in ${shipment.status} status` });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'PICKED_UP',
        actualDepartureTime: new Date(),
        currentLocationLat: latitude,
        currentLocationLng: longitude,
        lastCheckpointAt: new Date(),
      },
      include: { customer: true, orders: { include: { product: true } } },
    });

    await createShipmentEvent(
      shipment.id,
      'PICKED_UP',
      'ACCEPTED_BY_DRIVER',
      'PICKED_UP',
      driver.id,
      req.user?.userId,
      notes || 'Shipment picked up',
      latitude,
      longitude
    );

    res.json(updated);
  } catch (error) {
    console.error('Pickup error:', error);
    res.status(500).json({ error: 'Failed to confirm pickup' });
  }
});

router.post('/shipments/:id/transit', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { latitude, longitude } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (shipment.status !== 'PICKED_UP') {
      res.status(400).json({ error: `Cannot start transit from ${shipment.status} status` });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_TRANSIT',
        currentLocationLat: latitude,
        currentLocationLng: longitude,
        lastCheckpointAt: new Date(),
      },
      include: { customer: true },
    });

    await createShipmentEvent(
      shipment.id,
      'IN_TRANSIT',
      'PICKED_UP',
      'IN_TRANSIT',
      driver.id,
      req.user?.userId,
      'Started transit',
      latitude,
      longitude
    );

    res.json(updated);
  } catch (error) {
    console.error('Start transit error:', error);
    res.status(500).json({ error: 'Failed to start transit' });
  }
});

router.post('/shipments/:id/arrived', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { latitude, longitude } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (!['IN_TRANSIT', 'DELAYED'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot arrive from ${shipment.status} status` });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'ARRIVED',
        currentLocationLat: latitude,
        currentLocationLng: longitude,
        lastCheckpointAt: new Date(),
      },
      include: { customer: true },
    });

    await createShipmentEvent(
      shipment.id,
      'ARRIVED',
      shipment.status,
      'ARRIVED',
      driver.id,
      req.user?.userId,
      'Arrived at destination',
      latitude,
      longitude
    );

    res.json(updated);
  } catch (error) {
    console.error('Arrived error:', error);
    res.status(500).json({ error: 'Failed to mark arrived' });
  }
});

router.post(
  '/shipments/:id/deliver',
  authenticateToken,
  requireRole('Driver'),
  upload.fields([
    { name: 'signature', maxCount: 1 },
    { name: 'photos', maxCount: 5 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const driver = await getDriverFromUser(req.user!.userId);
      if (!driver) {
        res.status(403).json({ error: 'Not a registered driver' });
        return;
      }

      const { receiverName, receiverMobile, receiverIdType, latitude, longitude, notes } = req.body;

      if (!receiverName) {
        res.status(400).json({ error: 'Receiver name is required' });
        return;
      }

      const shipment = await prisma.shipment.findFirst({
        where: { id: req.params.id, driverId: driver.id },
        include: { orders: true },
      });

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found' });
        return;
      }

      if (!['ARRIVED', 'IN_TRANSIT'].includes(shipment.status)) {
        res.status(400).json({ error: `Cannot deliver from ${shipment.status} status` });
        return;
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const signatureFile = files?.signature?.[0];
      const photoFiles = files?.photos || [];

      const pod = await prisma.proofOfDelivery.create({
        data: {
          shipmentId: shipment.id,
          deliveredAt: new Date(),
          receiverName,
          receiverMobile,
          receiverIdType,
          signatureFileUrl: signatureFile ? `/uploads/pod/${signatureFile.filename}` : null,
          gpsLat: latitude ? parseFloat(latitude) : null,
          gpsLng: longitude ? parseFloat(longitude) : null,
          notes,
          capturedByDriverId: driver.id,
          photos: {
            create: photoFiles.map((file) => ({
              fileUrl: `/uploads/pod/${file.filename}`,
            })),
          },
        },
        include: { photos: true },
      });

      const updated = await prisma.shipment.update({
        where: { id: req.params.id },
        data: {
          status: 'DELIVERED',
          actualArrivalTime: new Date(),
          receiverName,
          currentLocationLat: latitude ? parseFloat(latitude) : null,
          currentLocationLng: longitude ? parseFloat(longitude) : null,
          lastCheckpointAt: new Date(),
        },
        include: { customer: true, orders: { include: { product: true } }, proofOfDelivery: { include: { photos: true } } },
      });

      await prisma.order.updateMany({
        where: { shipmentId: shipment.id },
        data: { status: 'DELIVERED' },
      });

      await createShipmentEvent(
        shipment.id,
        'DELIVERED',
        shipment.status,
        'DELIVERED',
        driver.id,
        req.user?.userId,
        `Delivered to ${receiverName}`,
        latitude ? parseFloat(latitude) : undefined,
        longitude ? parseFloat(longitude) : undefined,
        { podId: pod.id }
      );

      res.json(updated);
    } catch (error) {
      console.error('Deliver error:', error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  }
);

router.post('/shipments/:id/fail', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { reasonCode, notes, latitude, longitude } = req.body;

    if (!reasonCode) {
      res.status(400).json({ error: 'Reason code is required' });
      return;
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    if (!['IN_TRANSIT', 'ARRIVED', 'DELAYED'].includes(shipment.status)) {
      res.status(400).json({ error: `Cannot fail delivery from ${shipment.status} status` });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        status: 'DELIVERY_FAILED',
        currentLocationLat: latitude,
        currentLocationLng: longitude,
        lastCheckpointAt: new Date(),
        driverNotes: notes,
      },
      include: { customer: true },
    });

    await createShipmentEvent(
      shipment.id,
      'DELIVERY_FAILED',
      shipment.status,
      'DELIVERY_FAILED',
      driver.id,
      req.user?.userId,
      `Failed: ${reasonCode}. ${notes || ''}`,
      latitude,
      longitude,
      { reasonCode }
    );

    res.json(updated);
  } catch (error) {
    console.error('Fail delivery error:', error);
    res.status(500).json({ error: 'Failed to report delivery failure' });
  }
});

router.post('/shipments/:id/checkpoint', authenticateToken, requireRole('Driver'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await getDriverFromUser(req.user!.userId);
    if (!driver) {
      res.status(403).json({ error: 'Not a registered driver' });
      return;
    }

    const { latitude, longitude, notes } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { id: req.params.id, driverId: driver.id },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params.id },
      data: {
        currentLocationLat: latitude,
        currentLocationLng: longitude,
        lastCheckpointAt: new Date(),
      },
    });

    await createShipmentEvent(
      shipment.id,
      'CHECKPOINT',
      null,
      null,
      driver.id,
      req.user?.userId,
      notes || 'Location update',
      latitude,
      longitude
    );

    res.json(updated);
  } catch (error) {
    console.error('Checkpoint error:', error);
    res.status(500).json({ error: 'Failed to record checkpoint' });
  }
});

export default router;
