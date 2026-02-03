import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: { locations: true, stockItems: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    
    res.json(warehouses);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total, active, inactive, maintenance] = await Promise.all([
      prisma.warehouse.count(),
      prisma.warehouse.count({ where: { status: 'ACTIVE' } }),
      prisma.warehouse.count({ where: { status: 'INACTIVE' } }),
      prisma.warehouse.count({ where: { status: 'MAINTENANCE' } }),
    ]);
    
    const totalLocations = await prisma.warehouseLocation.count();
    const totalStockItems = await prisma.stockItem.count();
    
    res.json({
      total,
      active,
      inactive,
      maintenance,
      totalLocations,
      totalStockItems,
    });
  } catch (error) {
    console.error('Error fetching warehouse stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { code: 'asc' },
        },
        _count: {
          select: { stockItems: true, stockMovements: true },
        },
      },
    });
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    res.json(warehouse);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const data = req.body;
    
    const warehouse = await prisma.warehouse.create({
      data: {
        code: data.code,
        name: data.name,
        nameAr: data.nameAr,
        type: data.type || 'RAW_MATERIALS',
        status: data.status || 'ACTIVE',
        description: data.description,
        address: data.address,
        temperatureMin: data.temperatureMin ? parseFloat(data.temperatureMin) : null,
        temperatureMax: data.temperatureMax ? parseFloat(data.temperatureMax) : null,
        humidityMin: data.humidityMin ? parseFloat(data.humidityMin) : null,
        humidityMax: data.humidityMax ? parseFloat(data.humidityMax) : null,
        isRadioactive: data.isRadioactive || false,
        requiresQC: data.requiresQC !== false,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WAREHOUSE_CREATED',
        entityType: 'Warehouse',
        entityId: warehouse.id,
        newValues: data,
      },
    });
    
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const data = req.body;
    
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    
    if (!existing) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        nameAr: data.nameAr,
        type: data.type,
        status: data.status,
        description: data.description,
        address: data.address,
        temperatureMin: data.temperatureMin ? parseFloat(data.temperatureMin) : null,
        temperatureMax: data.temperatureMax ? parseFloat(data.temperatureMax) : null,
        humidityMin: data.humidityMin ? parseFloat(data.humidityMin) : null,
        humidityMax: data.humidityMax ? parseFloat(data.humidityMax) : null,
        isRadioactive: data.isRadioactive,
        requiresQC: data.requiresQC,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WAREHOUSE_UPDATED',
        entityType: 'Warehouse',
        entityId: id,
        oldValues: existing,
        newValues: data,
      },
    });
    
    res.json(warehouse);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { stockItems: true } } },
    });
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    if (warehouse._count.stockItems > 0) {
      return res.status(400).json({ error: 'Cannot delete warehouse with stock items' });
    }
    
    await prisma.warehouse.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WAREHOUSE_DELETED',
        entityType: 'Warehouse',
        entityId: id,
        oldValues: warehouse,
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

router.post('/:id/locations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const data = req.body;
    
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    
    const location = await prisma.warehouseLocation.create({
      data: {
        warehouseId: id,
        code: data.code,
        name: data.name,
        zone: data.zone,
        aisle: data.aisle,
        rack: data.rack,
        shelf: data.shelf,
        bin: data.bin,
        capacity: data.capacity ? parseFloat(data.capacity) : null,
        capacityUnit: data.capacityUnit,
        isActive: data.isActive !== false,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOCATION_CREATED',
        entityType: 'WarehouseLocation',
        entityId: location.id,
        newValues: { ...data, warehouseId: id },
      },
    });
    
    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

router.put('/:id/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id, locationId } = req.params;
    const data = req.body;
    
    const existing = await prisma.warehouseLocation.findFirst({
      where: { id: locationId, warehouseId: id },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const location = await prisma.warehouseLocation.update({
      where: { id: locationId },
      data: {
        name: data.name,
        zone: data.zone,
        aisle: data.aisle,
        rack: data.rack,
        shelf: data.shelf,
        bin: data.bin,
        capacity: data.capacity ? parseFloat(data.capacity) : null,
        capacityUnit: data.capacityUnit,
        isActive: data.isActive,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOCATION_UPDATED',
        entityType: 'WarehouseLocation',
        entityId: locationId,
        oldValues: existing,
        newValues: data,
      },
    });
    
    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

router.delete('/:id/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id, locationId } = req.params;
    
    const location = await prisma.warehouseLocation.findFirst({
      where: { id: locationId, warehouseId: id },
      include: { _count: { select: { stockItems: true } } },
    });
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    if (location._count.stockItems > 0) {
      return res.status(400).json({ error: 'Cannot delete location with stock items' });
    }
    
    await prisma.warehouseLocation.delete({ where: { id: locationId } });
    
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOCATION_DELETED',
        entityType: 'WarehouseLocation',
        entityId: locationId,
        oldValues: location,
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
