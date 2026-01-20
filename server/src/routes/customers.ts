import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
        orders: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post('/', authenticateToken, requireRole('Admin', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, code, address, city, state, postalCode, country,
      phone, email, licenseNumber, licenseExpiryDate,
      deliveryWindowStart, deliveryWindowEnd, preferredDeliveryTime,
      travelTimeMinutes, region, category, permittedProductIds, contacts
    } = req.body;

    const existingCustomer = await prisma.customer.findUnique({ where: { code } });
    if (existingCustomer) {
      res.status(400).json({ error: 'Customer code already exists' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        licenseNumber,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        deliveryWindowStart,
        deliveryWindowEnd,
        preferredDeliveryTime,
        travelTimeMinutes: travelTimeMinutes || 60,
        region,
        category,
        permittedProducts: {
          create: permittedProductIds?.map((productId: string) => ({ productId })) || [],
        },
        contacts: {
          create: contacts || [],
        },
      },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Customer', customer.id, null, customer, req);

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: Customer updated
 */
router.put('/:id', authenticateToken, requireRole('Admin', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, address, city, state, postalCode, country,
      phone, email, licenseNumber, licenseExpiryDate,
      deliveryWindowStart, deliveryWindowEnd, preferredDeliveryTime,
      travelTimeMinutes, region, category, isActive, permittedProductIds
    } = req.body;

    const oldCustomer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { permittedProducts: true },
    });

    if (!oldCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (permittedProductIds) {
      await prisma.customerProduct.deleteMany({ where: { customerId: req.params.id } });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        postalCode,
        country,
        phone,
        email,
        licenseNumber,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        deliveryWindowStart,
        deliveryWindowEnd,
        preferredDeliveryTime,
        travelTimeMinutes,
        region,
        category,
        isActive,
        permittedProducts: permittedProductIds ? {
          create: permittedProductIds.map((productId: string) => ({ productId })),
        } : undefined,
      },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
      },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Customer', customer.id, oldCustomer, customer, req);

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

/**
 * @swagger
 * /customers/{id}/validate-license:
 *   get:
 *     summary: Validate customer license
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: License validation result
 */
router.get('/:id/validate-license', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const isValid = customer.licenseExpiryDate ? customer.licenseExpiryDate > new Date() : true;

    res.json({
      isValid,
      licenseNumber: customer.licenseNumber,
      expiryDate: customer.licenseExpiryDate,
      message: isValid ? 'License is valid' : 'License has expired',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate license' });
  }
});

export default router;
