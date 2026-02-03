import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/countries', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const countries = await prisma.settingCountry.findMany({
      include: { cities: true, regions: true },
      orderBy: { name: 'asc' },
    });
    res.json(countries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

router.post('/countries', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr } = req.body;
    const country = await prisma.settingCountry.create({
      data: { code, name, nameAr },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingCountry', country.id, null, country, req);
    res.status(201).json(country);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create country' });
  }
});

router.put('/countries/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, isActive } = req.body;
    const oldData = await prisma.settingCountry.findUnique({ where: { id: req.params.id } });
    const country = await prisma.settingCountry.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingCountry', country.id, oldData, country, req);
    res.json(country);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update country' });
  }
});

router.delete('/countries/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingCountry.findUnique({ where: { id: req.params.id } });
    await prisma.settingCountry.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingCountry', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

router.get('/cities', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId, regionId } = req.query;
    const where: any = {};
    if (countryId) where.countryId = countryId;
    if (regionId) where.regionId = regionId;
    const cities = await prisma.settingCity.findMany({
      where,
      include: { country: true, region: true },
      orderBy: { name: 'asc' },
    });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

router.post('/cities', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId, regionId, code, name, nameAr } = req.body;
    const city = await prisma.settingCity.create({
      data: { countryId, regionId: regionId || null, code, name, nameAr },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingCity', city.id, null, city, req);
    res.status(201).json(city);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create city' });
  }
});

router.put('/cities/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId, regionId, code, name, nameAr, isActive } = req.body;
    const oldData = await prisma.settingCity.findUnique({ where: { id: req.params.id } });
    const city = await prisma.settingCity.update({
      where: { id: req.params.id },
      data: { countryId, regionId: regionId || null, code, name, nameAr, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingCity', city.id, oldData, city, req);
    res.json(city);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update city' });
  }
});

router.delete('/cities/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingCity.findUnique({ where: { id: req.params.id } });
    await prisma.settingCity.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingCity', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete city' });
  }
});

router.get('/regions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId } = req.query;
    const where: any = {};
    if (countryId) where.countryId = countryId;
    const regions = await prisma.settingRegion.findMany({
      where,
      include: { country: true },
      orderBy: { name: 'asc' },
    });
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

router.post('/regions', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId, code, name, nameAr } = req.body;
    const region = await prisma.settingRegion.create({
      data: { countryId, code, name, nameAr },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingRegion', region.id, null, region, req);
    res.status(201).json(region);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create region' });
  }
});

router.put('/regions/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId, code, name, nameAr, isActive } = req.body;
    const oldData = await prisma.settingRegion.findUnique({ where: { id: req.params.id } });
    const region = await prisma.settingRegion.update({
      where: { id: req.params.id },
      data: { countryId, code, name, nameAr, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingRegion', region.id, oldData, region, req);
    res.json(region);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update region' });
  }
});

router.delete('/regions/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingRegion.findUnique({ where: { id: req.params.id } });
    await prisma.settingRegion.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingRegion', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

router.get('/categories', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.settingCategory.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description } = req.body;
    const category = await prisma.settingCategory.create({
      data: { code, name, nameAr, description },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingCategory', category.id, null, category, req);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description, isActive } = req.body;
    const oldData = await prisma.settingCategory.findUnique({ where: { id: req.params.id } });
    const category = await prisma.settingCategory.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, description, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingCategory', category.id, oldData, category, req);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingCategory.findUnique({ where: { id: req.params.id } });
    await prisma.settingCategory.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingCategory', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.get('/couriers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const couriers = await prisma.settingCourier.findMany({
      include: { vehicles: true },
      orderBy: { name: 'asc' },
    });
    res.json(couriers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch couriers' });
  }
});

router.post('/couriers', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, phone, email } = req.body;
    const courier = await prisma.settingCourier.create({
      data: { code, name, nameAr, phone, email },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingCourier', courier.id, null, courier, req);
    res.status(201).json(courier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create courier' });
  }
});

router.put('/couriers/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, phone, email, isActive } = req.body;
    const oldData = await prisma.settingCourier.findUnique({ where: { id: req.params.id } });
    const courier = await prisma.settingCourier.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, phone, email, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingCourier', courier.id, oldData, courier, req);
    res.json(courier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update courier' });
  }
});

router.delete('/couriers/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingCourier.findUnique({ where: { id: req.params.id } });
    await prisma.settingCourier.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingCourier', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete courier' });
  }
});

router.get('/vehicles', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { courierId } = req.query;
    const where: any = {};
    if (courierId) where.courierId = courierId;
    const vehicles = await prisma.settingVehicle.findMany({
      where,
      include: { courier: true },
      orderBy: { plateNumber: 'asc' },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.post('/vehicles', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { courierId, plateNumber, vehicleType, model, capacity } = req.body;
    const vehicle = await prisma.settingVehicle.create({
      data: { courierId, plateNumber, vehicleType, model, capacity },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingVehicle', vehicle.id, null, vehicle, req);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

router.put('/vehicles/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { courierId, plateNumber, vehicleType, model, capacity, isActive } = req.body;
    const oldData = await prisma.settingVehicle.findUnique({ where: { id: req.params.id } });
    const vehicle = await prisma.settingVehicle.update({
      where: { id: req.params.id },
      data: { courierId, plateNumber, vehicleType, model, capacity, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingVehicle', vehicle.id, oldData, vehicle, req);
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

router.delete('/vehicles/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingVehicle.findUnique({ where: { id: req.params.id } });
    await prisma.settingVehicle.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingVehicle', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

router.get('/dose-units', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const doseUnits = await prisma.settingDoseUnit.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(doseUnits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dose units' });
  }
});

router.post('/dose-units', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, symbol, description } = req.body;
    const doseUnit = await prisma.settingDoseUnit.create({
      data: { code, name, symbol, description },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingDoseUnit', doseUnit.id, null, doseUnit, req);
    res.status(201).json(doseUnit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dose unit' });
  }
});

router.put('/dose-units/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, symbol, description, isActive } = req.body;
    const oldData = await prisma.settingDoseUnit.findUnique({ where: { id: req.params.id } });
    const doseUnit = await prisma.settingDoseUnit.update({
      where: { id: req.params.id },
      data: { code, name, symbol, description, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingDoseUnit', doseUnit.id, oldData, doseUnit, req);
    res.json(doseUnit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dose unit' });
  }
});

router.delete('/dose-units/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingDoseUnit.findUnique({ where: { id: req.params.id } });
    await prisma.settingDoseUnit.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingDoseUnit', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dose unit' });
  }
});

router.get('/product-types', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const productTypes = await prisma.settingProductType.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(productTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product types' });
  }
});

router.post('/product-types', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description } = req.body;
    const productType = await prisma.settingProductType.create({
      data: { code, name, nameAr, description },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingProductType', productType.id, null, productType, req);
    res.status(201).json(productType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product type' });
  }
});

router.put('/product-types/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description, isActive } = req.body;
    const oldData = await prisma.settingProductType.findUnique({ where: { id: req.params.id } });
    const productType = await prisma.settingProductType.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, description, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingProductType', productType.id, oldData, productType, req);
    res.json(productType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product type' });
  }
});

router.delete('/product-types/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingProductType.findUnique({ where: { id: req.params.id } });
    await prisma.settingProductType.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingProductType', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product type' });
  }
});

router.get('/production-methods', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const productionMethods = await prisma.settingProductionMethod.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(productionMethods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production methods' });
  }
});

router.post('/production-methods', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description } = req.body;
    const productionMethod = await prisma.settingProductionMethod.create({
      data: { code, name, nameAr, description },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingProductionMethod', productionMethod.id, null, productionMethod, req);
    res.status(201).json(productionMethod);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create production method' });
  }
});

router.put('/production-methods/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, description, isActive } = req.body;
    const oldData = await prisma.settingProductionMethod.findUnique({ where: { id: req.params.id } });
    const productionMethod = await prisma.settingProductionMethod.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, description, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingProductionMethod', productionMethod.id, oldData, productionMethod, req);
    res.json(productionMethod);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update production method' });
  }
});

router.delete('/production-methods/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const oldData = await prisma.settingProductionMethod.findUnique({ where: { id: req.params.id } });
    await prisma.settingProductionMethod.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingProductionMethod', req.params.id, oldData, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete production method' });
  }
});

router.get('/currencies', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const currencies = await prisma.settingCurrency.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

router.post('/currencies', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, symbol, exchangeRate, isDefault } = req.body;
    
    if (isDefault) {
      await prisma.settingCurrency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const currency = await prisma.settingCurrency.create({
      data: { code, name, nameAr, symbol, exchangeRate: exchangeRate || 1.0, isDefault: isDefault || false },
    });
    await createAuditLog(req.user?.userId, 'CREATE', 'SettingCurrency', currency.id, null, currency, req);
    res.status(201).json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

router.put('/currencies/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nameAr, symbol, exchangeRate, isDefault, isActive } = req.body;
    const oldData = await prisma.settingCurrency.findUnique({ where: { id: req.params.id } });
    
    if (isDefault) {
      await prisma.settingCurrency.updateMany({
        where: { isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }
    
    const currency = await prisma.settingCurrency.update({
      where: { id: req.params.id },
      data: { code, name, nameAr, symbol, exchangeRate, isDefault, isActive },
    });
    await createAuditLog(req.user?.userId, 'UPDATE', 'SettingCurrency', currency.id, oldData, currency, req);
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

router.delete('/currencies/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const currency = await prisma.settingCurrency.findUnique({ where: { id: req.params.id } });
    if (currency?.isDefault) {
      res.status(400).json({ error: 'Cannot delete default currency' });
      return;
    }
    await prisma.settingCurrency.delete({ where: { id: req.params.id } });
    await createAuditLog(req.user?.userId, 'DELETE', 'SettingCurrency', req.params.id, currency, null, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

// Invoice Generation Trigger Configuration
router.get('/invoice-trigger', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'INVOICE_GENERATION_TRIGGER' },
    });
    res.json({
      trigger: config?.value || 'ON_DELIVERED',
      options: [
        { value: 'ON_DELIVERED', label: 'On Shipment Delivered', description: 'Generate invoice when shipment is marked as delivered (default)' },
        { value: 'ON_DISPATCHED', label: 'On Shipment Dispatched', description: 'Generate invoice when shipment is dispatched' },
        { value: 'ON_QP_RELEASED', label: 'On QP Release', description: 'Generate invoice when batch is QP released' },
        { value: 'MANUAL_ONLY', label: 'Manual Only', description: 'Only generate invoices manually' },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice trigger configuration' });
  }
});

router.put('/invoice-trigger', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { trigger } = req.body;
    const validTriggers = ['ON_DELIVERED', 'ON_DISPATCHED', 'ON_QP_RELEASED', 'MANUAL_ONLY'];
    
    if (!validTriggers.includes(trigger)) {
      res.status(400).json({ error: 'Invalid trigger value' });
      return;
    }

    const existing = await prisma.systemConfig.findFirst({
      where: { key: 'INVOICE_GENERATION_TRIGGER' },
    });

    if (existing) {
      await prisma.systemConfig.update({
        where: { id: existing.id },
        data: { value: trigger },
      });
    } else {
      await prisma.systemConfig.create({
        data: {
          key: 'INVOICE_GENERATION_TRIGGER',
          value: trigger,
          description: 'Determines when invoices are automatically generated',
        },
      });
    }

    await createAuditLog(req.user?.userId, 'UPDATE', 'SystemConfig', 'INVOICE_GENERATION_TRIGGER',
      { trigger: existing?.value }, { trigger }, req);

    res.json({ success: true, trigger });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice trigger configuration' });
  }
});

// Invoice Auto-Close Configuration
router.get('/invoice-auto-close', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'INVOICE_AUTO_CLOSE_ON_PAID' },
    });
    res.json({ autoClose: config?.value === 'true' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auto-close configuration' });
  }
});

router.put('/invoice-auto-close', authenticateToken, requireRole('Admin', 'Finance'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { autoClose } = req.body;

    const existing = await prisma.systemConfig.findFirst({
      where: { key: 'INVOICE_AUTO_CLOSE_ON_PAID' },
    });

    if (existing) {
      await prisma.systemConfig.update({
        where: { id: existing.id },
        data: { value: autoClose ? 'true' : 'false' },
      });
    } else {
      await prisma.systemConfig.create({
        data: {
          key: 'INVOICE_AUTO_CLOSE_ON_PAID',
          value: autoClose ? 'true' : 'false',
          description: 'Automatically close invoices when fully paid',
        },
      });
    }

    await createAuditLog(req.user?.userId, 'UPDATE', 'SystemConfig', 'INVOICE_AUTO_CLOSE_ON_PAID',
      { autoClose: existing?.value }, { autoClose }, req);

    res.json({ success: true, autoClose });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update auto-close configuration' });
  }
});

export default router;
