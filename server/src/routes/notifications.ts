import { Router, Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { unreadOnly, limit, page } = req.query;
    
    const where: any = { userId: req.user?.userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const pageNum = page ? parseInt(page as string) : 1;
    const pageSize = limit ? parseInt(limit as string) : 20;
    const skip = (pageNum - 1) * pageSize;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user?.userId, isRead: false },
      }),
    ]);

    res.json({ 
      notifications, 
      unreadCount,
      totalCount,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user?.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export default router;
