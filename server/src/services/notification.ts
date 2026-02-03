import { PrismaClient, NotificationType } from '@prisma/client';
import { sendEmail } from './resend.js';
import { sendSMS, sendWhatsApp } from './twilio.js';

const prisma = new PrismaClient();

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface NotificationParams {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  sendEmail?: boolean;
  channels?: NotificationChannel[];
  category?: 'order' | 'batch' | 'delivery' | 'approval' | 'invoice' | 'system';
}

async function getNotificationSettings(): Promise<{
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  defaultChannel: string;
  categoryChannels: Record<string, string[]>;
}> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'notification_email_enabled',
            'notification_sms_enabled',
            'notification_whatsapp_enabled',
            'notification_default_channel',
            'notification_order_events',
            'notification_batch_events',
            'notification_delivery_events',
            'notification_approval_events',
            'notification_invoice_events'
          ]
        }
      }
    });

    const getConfig = (key: string, defaultVal: string) => {
      const config = configs.find(c => c.key === key);
      return config?.value || defaultVal;
    };

    const parseChannels = (value: string): string[] => {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    };

    return {
      emailEnabled: getConfig('notification_email_enabled', 'true') === 'true',
      smsEnabled: getConfig('notification_sms_enabled', 'false') === 'true',
      whatsappEnabled: getConfig('notification_whatsapp_enabled', 'false') === 'true',
      defaultChannel: getConfig('notification_default_channel', 'email'),
      categoryChannels: {
        order: parseChannels(getConfig('notification_order_events', 'email')),
        batch: parseChannels(getConfig('notification_batch_events', 'email')),
        delivery: parseChannels(getConfig('notification_delivery_events', 'email,sms')),
        approval: parseChannels(getConfig('notification_approval_events', 'email')),
        invoice: parseChannels(getConfig('notification_invoice_events', 'email')),
      }
    };
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return {
      emailEnabled: true,
      smsEnabled: false,
      whatsappEnabled: false,
      defaultChannel: 'email',
      categoryChannels: {}
    };
  }
}

export async function sendNotification(params: NotificationParams) {
  const { userId, type, title, message, relatedId, relatedType, sendEmail: shouldSendEmail, channels, category } = params;

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: type as NotificationType,
      title,
      message,
      relatedId,
      relatedType,
    },
  });

  const settings = await getNotificationSettings();
  
  let activeChannels: string[] = [];
  
  if (channels && channels.length > 0) {
    activeChannels = channels;
  } else if (category && settings.categoryChannels[category]) {
    activeChannels = settings.categoryChannels[category];
  } else if (shouldSendEmail) {
    activeChannels = ['email'];
  } else if (settings.defaultChannel === 'all') {
    activeChannels = ['email', 'sms', 'whatsapp'];
  } else {
    activeChannels = [settings.defaultChannel];
  }

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true }
  });

  if (!user) {
    return notification;
  }

  const deliveryResults: { channel: string; success: boolean; error?: string }[] = [];

  if (activeChannels.includes('email') && settings.emailEnabled && user.email) {
    try {
      await sendEmail(
        user.email,
        `[RadioPharma OMS] ${title}`,
        generateEmailHtml(title, message, user.firstName)
      );
      deliveryResults.push({ channel: 'email', success: true });
    } catch (error: any) {
      console.error('Failed to send email notification:', error);
      deliveryResults.push({ channel: 'email', success: false, error: error.message });
    }
  }

  if (activeChannels.includes('sms') && settings.smsEnabled && user.phone) {
    try {
      const smsMessage = `${title}: ${message}`.substring(0, 160);
      const result = await sendSMS(user.phone, smsMessage);
      deliveryResults.push({ channel: 'sms', success: result.success, error: result.error });
    } catch (error: any) {
      console.error('Failed to send SMS notification:', error);
      deliveryResults.push({ channel: 'sms', success: false, error: error.message });
    }
  }

  if (activeChannels.includes('whatsapp') && settings.whatsappEnabled && user.phone) {
    try {
      const waMessage = `*${title}*\n\n${message}`;
      const result = await sendWhatsApp(user.phone, waMessage);
      deliveryResults.push({ channel: 'whatsapp', success: result.success, error: result.error });
    } catch (error: any) {
      console.error('Failed to send WhatsApp notification:', error);
      deliveryResults.push({ channel: 'whatsapp', success: false, error: error.message });
    }
  }

  return notification;
}

export async function sendBulkNotifications(
  userIds: string[],
  type: NotificationType | string,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string,
  sendEmail?: boolean
) {
  const results = await Promise.all(
    userIds.map(userId =>
      sendNotification({ userId, type, title, message, relatedId, relatedType, sendEmail })
    )
  );
  return results;
}

export async function notifyByRole(
  roleName: string,
  type: NotificationType | string,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string,
  sendEmail?: boolean
) {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: { users: { where: { isActive: true } } },
  });

  if (!role) return [];

  return sendBulkNotifications(
    role.users.map(u => u.id),
    type,
    title,
    message,
    relatedId,
    relatedType,
    sendEmail
  );
}

function generateEmailHtml(title: string, message: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 12px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RadioPharma OMS</h1>
        </div>
        <div class="content">
          <p>Hello ${firstName},</p>
          <h2>${title}</h2>
          <p>${message}</p>
          <p>Please log in to the system to take action.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from RadioPharma OMS.</p>
          <p>Do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
