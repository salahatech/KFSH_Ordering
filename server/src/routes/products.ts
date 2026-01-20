import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: { qcTemplates: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { qcTemplates: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, code, productType, radionuclide, halfLifeMinutes,
      shelfLifeMinutes, minConcentration, maxConcentration, standardDose,
      doseUnit, productionMethod, synthesisTimeMinutes, qcTimeMinutes,
      packagingTimeMinutes, packagingType, transportConstraints,
      calibrationTimeOffset, overagePercent, qcTemplates
    } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { code } });
    if (existingProduct) {
      res.status(400).json({ error: 'Product code already exists' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        code,
        productType,
        radionuclide,
        halfLifeMinutes,
        shelfLifeMinutes,
        minConcentration,
        maxConcentration,
        standardDose,
        doseUnit: doseUnit || 'mCi',
        productionMethod,
        synthesisTimeMinutes: synthesisTimeMinutes || 60,
        qcTimeMinutes: qcTimeMinutes || 30,
        packagingTimeMinutes: packagingTimeMinutes || 15,
        packagingType,
        transportConstraints,
        calibrationTimeOffset: calibrationTimeOffset || 0,
        overagePercent: overagePercent || 10,
        qcTemplates: {
          create: qcTemplates?.map((t: any, index: number) => ({
            testName: t.testName,
            testMethod: t.testMethod,
            acceptanceCriteria: t.acceptanceCriteria,
            minValue: t.minValue,
            maxValue: t.maxValue,
            unit: t.unit,
            isRequired: t.isRequired ?? true,
            sortOrder: index,
          })) || [],
        },
      },
      include: { qcTemplates: true },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Product', product.id, null, product, req);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, productType, radionuclide, halfLifeMinutes,
      shelfLifeMinutes, minConcentration, maxConcentration, standardDose,
      doseUnit, productionMethod, synthesisTimeMinutes, qcTimeMinutes,
      packagingTimeMinutes, packagingType, transportConstraints,
      calibrationTimeOffset, overagePercent, isActive
    } = req.body;

    const oldProduct = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!oldProduct) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        productType,
        radionuclide,
        halfLifeMinutes,
        shelfLifeMinutes,
        minConcentration,
        maxConcentration,
        standardDose,
        doseUnit,
        productionMethod,
        synthesisTimeMinutes,
        qcTimeMinutes,
        packagingTimeMinutes,
        packagingType,
        transportConstraints,
        calibrationTimeOffset,
        overagePercent,
        isActive,
      },
      include: { qcTemplates: true },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Product', product.id, oldProduct, product, req);

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * @swagger
 * /products/{id}/qc-templates:
 *   put:
 *     summary: Update QC templates for a product
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: QC templates updated
 */
router.put('/:id/qc-templates', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { qcTemplates } = req.body;

    await prisma.qCTemplate.deleteMany({ where: { productId: req.params.id } });

    await prisma.qCTemplate.createMany({
      data: qcTemplates.map((t: any, index: number) => ({
        productId: req.params.id,
        testName: t.testName,
        testMethod: t.testMethod,
        acceptanceCriteria: t.acceptanceCriteria,
        minValue: t.minValue,
        maxValue: t.maxValue,
        unit: t.unit,
        isRequired: t.isRequired ?? true,
        sortOrder: index,
      })),
    });

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { qcTemplates: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update QC templates' });
  }
});

export default router;
