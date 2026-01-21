import { PrismaClient, NotificationType } from '@prisma/client';
import { sendEmail } from './resend.js';

const prisma = new PrismaClient();

export interface NotificationParams {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  sendEmail?: boolean;
}

export async function sendNotification(params: NotificationParams) {
  const { userId, type, title, message, relatedId, relatedType, sendEmail: shouldSendEmail } = params;

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

  if (shouldSendEmail) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await sendEmail(
          user.email,
          `[RadioPharma OMS] ${title}`,
          generateEmailHtml(title, message, user.firstName)
        );
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
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
