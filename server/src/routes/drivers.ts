import { Router, Request, Response } from 'express';
import { PrismaClient, DriverStatus, VehicleType } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, requireRole('Admin', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, vehicleType } = req.query;
    
    const where: any = {};
    if (status) where.status = status as DriverStatus;
    if (vehicleType) where.vehicleType = vehicleType as VehicleType;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { mobile: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { vehiclePlateNo: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, isActive: true } },
        _count: { select: { shipments: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const driversWithStats = await Promise.all(drivers.map(async (driver) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const assignedToday = await prisma.shipment.count({
        where: {
          driverId: driver.id,
          scheduledDeliveryAt: { gte: todayStart, lte: todayEnd },
        },
      });

      const inTransit = await prisma.shipment.count({
        where: {
          driverId: driver.id,
          status: { in: ['ACCEPTED_BY_DRIVER', 'PICKED_UP', 'IN_TRANSIT'] },
        },
      });

      return {
        ...driver,
        assignedToday,
        inTransit,
      };
    }));

    res.json(driversWithStats);
  } catch (error) {
    console.error('Fetch drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

router.get('/:id', authenticateToken, requireRole('Admin', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } },
        shipments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { customer: true },
        },
        availability: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 14,
        },
      },
    });

    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const stats = {
      totalDeliveries: await prisma.shipment.count({
        where: { driverId: driver.id, status: 'DELIVERED' },
      }),
      thisMonth: await prisma.shipment.count({
        where: {
          driverId: driver.id,
          status: 'DELIVERED',
          actualArrivalTime: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      failedDeliveries: await prisma.shipment.count({
        where: { driverId: driver.id, status: 'DELIVERY_FAILED' },
      }),
    };

    res.json({ ...driver, stats });
  } catch (error) {
    console.error('Fetch driver error:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName, mobile, email, nationalId, driverLicenseNo,
      licenseExpiryDate, vehicleType, vehiclePlateNo, vehicleModel,
      photoUrl, createUserAccount, userPassword
    } = req.body;

    if (!fullName || !mobile) {
      res.status(400).json({ error: 'Full name and mobile are required' });
      return;
    }

    let userId: string | undefined;

    if (createUserAccount && email) {
      const driverRole = await prisma.role.findFirst({ where: { name: 'Driver' } });
      if (!driverRole) {
        const newRole = await prisma.role.create({
          data: { name: 'Driver', description: 'Driver with portal access' },
        });
        const hashedPassword = await bcrypt.hash(userPassword || 'driver123', 10);
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' ') || '',
            phone: mobile,
            roleId: newRole.id,
          },
        });
        userId = user.id;
      } else {
        const hashedPassword = await bcrypt.hash(userPassword || 'driver123', 10);
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' ') || '',
            phone: mobile,
            roleId: driverRole.id,
          },
        });
        userId = user.id;
      }
    }

    const driver = await prisma.driver.create({
      data: {
        fullName,
        mobile,
        email,
        nationalId,
        driverLicenseNo,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        vehicleType: vehicleType || 'CAR',
        vehiclePlateNo,
        vehicleModel,
        photoUrl,
        userId,
      },
      include: { user: { select: { id: true, email: true } } },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Driver', driver.id, null, driver, req);

    res.status(201).json(driver);
  } catch (error: any) {
    console.error('Create driver error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

router.put('/:id', authenticateToken, requireRole('Admin', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const {
      fullName, mobile, email, nationalId, driverLicenseNo,
      licenseExpiryDate, vehicleType, vehiclePlateNo, vehicleModel,
      status, photoUrl
    } = req.body;

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        fullName,
        mobile,
        email,
        nationalId,
        driverLicenseNo,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        vehicleType,
        vehiclePlateNo,
        vehicleModel,
        status,
        photoUrl,
      },
      include: { user: { select: { id: true, email: true } } },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Driver', driver.id, existing, driver, req);

    res.json(driver);
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

router.delete('/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    if (driver._count.shipments > 0) {
      await prisma.driver.update({
        where: { id: req.params.id },
        data: { status: 'INACTIVE' },
      });
      res.json({ message: 'Driver deactivated (has shipment history)' });
      return;
    }

    await prisma.driver.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'Driver', req.params.id, driver, null, req);

    res.json({ message: 'Driver deleted' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

router.post('/:id/availability', authenticateToken, requireRole('Admin', 'Logistics'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, startTime, endTime, isAvailable, notes } = req.body;

    const availability = await prisma.driverAvailability.create({
      data: {
        driverId: req.params.id,
        date: new Date(date),
        startTime,
        endTime,
        isAvailable: isAvailable ?? true,
        notes,
      },
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error('Create availability error:', error);
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

router.get('/:id/availability', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromDate, toDate } = req.query;
    
    const where: any = { driverId: req.params.id };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate as string);
      if (toDate) where.date.lte = new Date(toDate as string);
    }

    const availability = await prisma.driverAvailability.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

export default router;
