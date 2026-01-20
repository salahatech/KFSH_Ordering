import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of audit logs
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, userId, action, fromDate, toDate, limit, offset } = req.query;
    
    const where: any = {};
    if (entityType) where.entityType = entityType as string;
    if (entityId) where.entityId = entityId as string;
    if (userId) where.userId = userId as string;
    if (action) where.action = action as string;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) where.createdAt.lte = new Date(toDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      total,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * @swagger
 * /audit/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit history for a specific entity
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entity audit history
 */
router.get('/entity/:entityType/:entityId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entity audit history' });
  }
});

/**
 * @swagger
 * /audit/actions:
 *   get:
 *     summary: Get list of unique actions
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: List of unique actions
 */
router.get('/actions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const actions = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
    });

    res.json(actions.map(a => a.action));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

/**
 * @swagger
 * /audit/entity-types:
 *   get:
 *     summary: Get list of unique entity types
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: List of unique entity types
 */
router.get('/entity-types', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const entityTypes = await prisma.auditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
    });

    res.json(entityTypes.map(e => e.entityType));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entity types' });
  }
});

export default router;
