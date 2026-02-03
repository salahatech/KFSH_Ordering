import { PrismaClient, NotificationChannel, DeliveryStatus } from '@prisma/client';
import { sendEmail, testResendConnection } from './resend.js';
import { sendSMS, sendWhatsApp, testTwilioConnection } from './twilio.js';

const prisma = new PrismaClient();

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ChannelStatus {
  connected: boolean;
  provider: string;
  fromAddress?: string;
  phoneNumber?: string;
  error?: string;
}

export async function getChannelStatuses(): Promise<Record<string, ChannelStatus>> {
  const results: Record<string, ChannelStatus> = {
    email: { connected: false, provider: 'Resend' },
    sms: { connected: false, provider: 'Twilio' },
    whatsapp: { connected: false, provider: 'Twilio' }
  };

  try {
    const emailStatus = await testResendConnection();
    results.email = {
      connected: emailStatus.connected,
      provider: 'Resend',
      fromAddress: emailStatus.fromEmail,
      error: emailStatus.error
    };
  } catch (e: any) {
    results.email.error = e.message;
  }

  try {
    const twilioStatus = await testTwilioConnection();
    results.sms = {
      connected: twilioStatus.connected,
      provider: 'Twilio',
      phoneNumber: twilioStatus.phoneNumber,
      error: twilioStatus.error
    };
    results.whatsapp = {
      connected: twilioStatus.connected,
      provider: 'Twilio',
      phoneNumber: twilioStatus.phoneNumber,
      error: twilioStatus.error
    };
  } catch (e: any) {
    results.sms.error = e.message;
    results.whatsapp.error = e.message;
  }

  return results;
}

export async function isChannelEnabled(channel: NotificationChannel): Promise<boolean> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel }
  });
  return config?.isEnabled ?? false;
}

export async function sendViaEmail(
  to: string,
  subject: string,
  html: string,
  notificationId?: string,
  fromName?: string
): Promise<SendResult> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel: NotificationChannel.EMAIL }
  });
  
  if (!config?.isEnabled) {
    await logDeliveryAttempt(NotificationChannel.EMAIL, to, DeliveryStatus.SKIPPED, notificationId, undefined, 'Channel disabled');
    return { success: false, error: 'Email channel is disabled' };
  }

  const result = await sendEmail(to, subject, html, fromName || config.fromName || undefined);
  
  await logDeliveryAttempt(
    NotificationChannel.EMAIL,
    to,
    result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
    notificationId,
    result.messageId,
    result.error
  );

  return result;
}

export async function sendViaSms(
  to: string,
  message: string,
  notificationId?: string
): Promise<SendResult> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel: NotificationChannel.SMS }
  });
  
  if (!config?.isEnabled) {
    await logDeliveryAttempt(NotificationChannel.SMS, to, DeliveryStatus.SKIPPED, notificationId, undefined, 'Channel disabled');
    return { success: false, error: 'SMS channel is disabled' };
  }

  const result = await sendSMS(to, message);
  
  await logDeliveryAttempt(
    NotificationChannel.SMS,
    to,
    result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
    notificationId,
    result.messageId,
    result.error
  );

  return result;
}

export async function sendViaWhatsApp(
  to: string,
  message: string,
  notificationId?: string
): Promise<SendResult> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel: NotificationChannel.WHATSAPP }
  });
  
  if (!config?.isEnabled) {
    await logDeliveryAttempt(NotificationChannel.WHATSAPP, to, DeliveryStatus.SKIPPED, notificationId, undefined, 'Channel disabled');
    return { success: false, error: 'WhatsApp channel is disabled' };
  }

  const result = await sendWhatsApp(to, message);
  
  await logDeliveryAttempt(
    NotificationChannel.WHATSAPP,
    to,
    result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
    notificationId,
    result.messageId,
    result.error
  );

  return result;
}

async function logDeliveryAttempt(
  channel: NotificationChannel,
  recipientAddress: string,
  status: DeliveryStatus,
  notificationId?: string,
  providerMessageId?: string,
  errorMessage?: string
) {
  await prisma.notificationDeliveryAttempt.create({
    data: {
      notificationId,
      channel,
      recipientAddress,
      status,
      providerMessageId,
      errorMessage
    }
  });
}

export async function sendTestMessage(
  channel: NotificationChannel,
  recipient: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  let result: SendResult;
  
  switch (channel) {
    case NotificationChannel.EMAIL:
      result = await sendEmail(
        recipient,
        'RadioPharma OMS - Test Email',
        `<html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email from RadioPharma OMS</h2>
            <p>This is a test email to verify your email notification configuration.</p>
            <p>If you received this email, your email channel is working correctly.</p>
            <hr />
            <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </body>
        </html>`
      );
      break;
      
    case NotificationChannel.SMS:
      result = await sendSMS(
        recipient,
        'RadioPharma OMS Test: This is a test SMS message to verify your SMS notification configuration.'
      );
      break;
      
    case NotificationChannel.WHATSAPP:
      result = await sendWhatsApp(
        recipient,
        'RadioPharma OMS Test: This is a test WhatsApp message to verify your WhatsApp notification configuration.'
      );
      break;
      
    default:
      return { success: false, message: 'Invalid channel' };
  }

  await prisma.notificationChannelConfig.update({
    where: { channel },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
      lastTestMessage: result.success ? 'Test successful' : result.error,
      updatedByUserId: userId
    }
  }).catch(() => {});

  await logDeliveryAttempt(
    channel,
    recipient,
    result.success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
    undefined,
    result.messageId,
    result.error
  );

  return {
    success: result.success,
    message: result.success ? 'Test message sent successfully' : (result.error || 'Failed to send test message')
  };
}

export async function getUserNotificationPreferences(userId: string) {
  let prefs = await prisma.userNotificationPreference.findUnique({
    where: { userId }
  });
  
  if (!prefs) {
    prefs = await prisma.userNotificationPreference.create({
      data: { userId }
    });
  }
  
  const channelConfigs = await prisma.notificationChannelConfig.findMany();
  const channelStatus: Record<string, boolean> = {};
  
  for (const config of channelConfigs) {
    channelStatus[config.channel.toLowerCase() + 'GlobalEnabled'] = config.isEnabled;
  }
  
  return {
    ...prefs,
    ...channelStatus
  };
}

export async function updateUserNotificationPreferences(
  userId: string,
  data: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
    minSeverity?: string;
  }
) {
  return prisma.userNotificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
}
