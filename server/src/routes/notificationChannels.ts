import { Router, Request, Response } from 'express';
import { PrismaClient, NotificationChannel, NotificationProviderType, DeliveryStatus } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { 
  getChannelStatuses, 
  sendTestMessage, 
  getUserNotificationPreferences, 
  updateUserNotificationPreferences 
} from '../services/notificationChannelManager.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const configs = await prisma.notificationChannelConfig.findMany({
      include: {
        updatedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const configMap: Record<string, any> = {};
    for (const config of configs) {
      configMap[config.channel] = {
        ...config,
        encryptedSecretsJson: undefined
      };
    }

    for (const channel of Object.values(NotificationChannel)) {
      if (!configMap[channel]) {
        configMap[channel] = {
          channel,
          isEnabled: false,
          providerType: getDefaultProviderType(channel),
          settingsJson: null,
          fromName: 'RadioPharma OMS',
          fromAddress: null,
          lastTestedAt: null,
          lastTestStatus: null,
          lastTestMessage: null
        };
      }
    }

    res.json(configMap);
  } catch (error) {
    console.error('Error fetching notification channel configs:', error);
    res.status(500).json({ error: 'Failed to fetch notification channel configurations' });
  }
});

router.get('/status', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const statuses = await getChannelStatuses();
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching channel statuses:', error);
    res.status(500).json({ error: 'Failed to fetch channel statuses' });
  }
});

router.put('/:channel', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const userId = req.user?.userId;
    const { isEnabled, providerType, settingsJson, fromName, fromAddress } = req.body;

    if (!Object.values(NotificationChannel).includes(channel as NotificationChannel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    const existingConfig = await prisma.notificationChannelConfig.findUnique({
      where: { channel: channel as NotificationChannel }
    });

    const config = await prisma.notificationChannelConfig.upsert({
      where: { channel: channel as NotificationChannel },
      update: {
        isEnabled,
        providerType: providerType || undefined,
        settingsJson: settingsJson || undefined,
        fromName: fromName || undefined,
        fromAddress: fromAddress || undefined,
        updatedByUserId: userId
      },
      create: {
        channel: channel as NotificationChannel,
        isEnabled: isEnabled ?? false,
        providerType: providerType || getDefaultProviderType(channel as NotificationChannel),
        settingsJson: settingsJson || null,
        fromName: fromName || 'RadioPharma OMS',
        fromAddress: fromAddress || null,
        updatedByUserId: userId
      }
    });

    await createAuditLog({
      userId,
      action: existingConfig ? 'UPDATE' : 'CREATE',
      entityType: 'NotificationChannelConfig',
      entityId: config.id,
      oldValues: existingConfig ? { isEnabled: existingConfig.isEnabled } : null,
      newValues: { isEnabled: config.isEnabled },
      req
    });

    res.json({
      ...config,
      encryptedSecretsJson: undefined
    });
  } catch (error) {
    console.error('Error updating notification channel config:', error);
    res.status(500).json({ error: 'Failed to update notification channel configuration' });
  }
});

router.post('/:channel/test', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { channel } = req.params;
    const { recipient } = req.body;
    const userId = req.user?.userId;

    if (!Object.values(NotificationChannel).includes(channel as NotificationChannel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    if (channel === NotificationChannel.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
    }

    if (channel === NotificationChannel.SMS || channel === NotificationChannel.WHATSAPP) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(recipient.replace(/[\s-()]/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number. Please use E.164 format (e.g., +966501234567)' });
      }
    }

    const result = await sendTestMessage(channel as NotificationChannel, recipient, userId!);

    res.json(result);
  } catch (error: any) {
    console.error('Error sending test message:', error);
    res.status(500).json({ error: error.message || 'Failed to send test message' });
  }
});

router.get('/delivery-attempts', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { 
      channel, 
      status, 
      startDate, 
      endDate, 
      search,
      page = '1', 
      limit = '50' 
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (channel && channel !== 'all') {
      where.channel = channel;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.attemptedAt = {};
      if (startDate) {
        where.attemptedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.attemptedAt.lte = new Date(endDate as string);
      }
    }

    if (search) {
      where.recipientAddress = { contains: search as string, mode: 'insensitive' };
    }

    const [attempts, total] = await Promise.all([
      prisma.notificationDeliveryAttempt.findMany({
        where,
        include: {
          notification: {
            select: {
              title: true,
              type: true,
              user: {
                select: { firstName: true, lastName: true, email: true }
              }
            }
          }
        },
        orderBy: { attemptedAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.notificationDeliveryAttempt.count({ where })
    ]);

    res.json({
      data: attempts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching delivery attempts:', error);
    res.status(500).json({ error: 'Failed to fetch delivery attempts' });
  }
});

router.get('/user-preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await getUserNotificationPreferences(userId);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching user notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.put('/user-preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { emailEnabled, smsEnabled, whatsappEnabled, minSeverity } = req.body;

    const preferences = await updateUserNotificationPreferences(userId, {
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      minSeverity
    });

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entityType: 'UserNotificationPreference',
      entityId: preferences.id,
      newValues: { emailEnabled, smsEnabled, whatsappEnabled, minSeverity },
      req
    });

    res.json(preferences);
  } catch (error) {
    console.error('Error updating user notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

function getDefaultProviderType(channel: NotificationChannel): NotificationProviderType {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return NotificationProviderType.RESEND;
    case NotificationChannel.SMS:
    case NotificationChannel.WHATSAPP:
      return NotificationProviderType.TWILIO;
    default:
      return NotificationProviderType.RESEND;
  }
}

export default router;
