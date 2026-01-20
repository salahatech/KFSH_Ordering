import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /config:
 *   get:
 *     summary: Get all system config
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: List of config items
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    
    const where: any = {};
    if (category) where.category = category as string;

    const configs = await prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * @swagger
 * /config/{key}:
 *   get:
 *     summary: Get config by key
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Config item
 */
router.get('/:key', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: req.params.key },
    });

    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * @swagger
 * /config:
 *   post:
 *     summary: Create or update config
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Config saved
 */
router.post('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value, dataType, category, description } = req.body;

    const existing = await prisma.systemConfig.findUnique({ where: { key } });

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, dataType, category, description },
      create: { key, value, dataType: dataType || 'string', category, description },
    });

    await createAuditLog(req.user?.userId, existing ? 'UPDATE' : 'CREATE', 'SystemConfig', config.id, existing, config, req);

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

/**
 * @swagger
 * /config/{key}:
 *   delete:
 *     summary: Delete config
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Config deleted
 */
router.delete('/:key', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: req.params.key } });
    
    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }

    await prisma.systemConfig.delete({ where: { key: req.params.key } });

    await createAuditLog(req.user?.userId, 'DELETE', 'SystemConfig', config.id, config, null, req);

    res.json({ message: 'Config deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

/**
 * @swagger
 * /config/equipment:
 *   get:
 *     summary: Get all equipment
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: List of equipment
 */
router.get('/equipment/all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

/**
 * @swagger
 * /config/equipment:
 *   post:
 *     summary: Create equipment
 *     tags: [Config]
 *     responses:
 *       201:
 *         description: Equipment created
 */
router.post('/equipment', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, type, location, maintenanceNotes } = req.body;

    const equipment = await prisma.equipment.create({
      data: { name, code, type, location, maintenanceNotes },
    });

    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

/**
 * @swagger
 * /config/materials:
 *   get:
 *     summary: Get all material lots
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: List of material lots
 */
router.get('/materials/all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const materials = await prisma.materialLot.findMany({
      where: { isActive: true },
      orderBy: [{ materialName: 'asc' }, { expiryDate: 'asc' }],
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

/**
 * @swagger
 * /config/materials:
 *   post:
 *     summary: Create material lot
 *     tags: [Config]
 *     responses:
 *       201:
 *         description: Material lot created
 */
router.post('/materials', authenticateToken, requireRole('Admin', 'Production Manager'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialName, materialCode, lotNumber, expiryDate, quantity, unit, supplierId } = req.body;

    const material = await prisma.materialLot.create({
      data: {
        materialName,
        materialCode,
        lotNumber,
        expiryDate: new Date(expiryDate),
        quantity,
        unit,
        supplierId,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create material lot' });
  }
});

export default router;
