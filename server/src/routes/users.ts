import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { sendError, sendValidationError, ErrorCodes } from '../utils/errors.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users.map((user) => ({
      ...user,
      password: undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { role: true, customer: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: string
 *               customerId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, roleId, customerId } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Invalid role');
      return;
    }

    if (role.name === 'Customer' && !customerId) {
      sendError(res, 400, ErrorCodes.CUSTOMER_ROLE_REQUIRES_CUSTOMER, 
        'Customer role requires a linked customer', {
          userMessage: 'Users with Customer role must be linked to a customer record.',
          fieldErrors: [{ field: 'customerId', message: 'Customer is required for Customer role' }]
        });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      sendValidationError(res, [{ field: 'email', message: 'Email already exists' }]);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        roleId,
        customerId: role.name === 'Customer' ? customerId : (customerId || null),
      },
      include: { role: true },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'User', user.id, null, { email, firstName, lastName }, req);

    res.status(201).json({ ...user, password: undefined });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, roleId, customerId, isActive } = req.body;

    const oldUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!oldUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Invalid role');
      return;
    }

    if (role.name === 'Customer' && !customerId) {
      sendError(res, 400, ErrorCodes.CUSTOMER_ROLE_REQUIRES_CUSTOMER, 
        'Customer role requires a linked customer', {
          userMessage: 'Users with Customer role must be linked to a customer record.',
          fieldErrors: [{ field: 'customerId', message: 'Customer is required for Customer role' }]
        });
      return;
    }

    const updateData: any = {
      email,
      firstName,
      lastName,
      phone,
      roleId,
      customerId: role.name === 'Customer' ? customerId : (customerId || null),
      isActive,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { role: true },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'User', user.id, oldUser, user, req);

    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await createAuditLog(req.user?.userId, 'DELETE', 'User', req.params.id, user, null, req);

    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
