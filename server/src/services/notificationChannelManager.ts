import { PrismaClient, NotificationChannel, NotificationProviderType, DeliveryStatus } from '@prisma/client';
import { sendEmail, testResendConnection } from './resend.js';
import { sendSMS, sendWhatsApp, testTwilioConnection } from './twilio.js';
import { sendEmailViaSMTP, testSMTPConnection } from './smtp.js';
import { sendWhatsAppViaMeta, testMetaWhatsAppConnection } from './metaWhatsApp.js';

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
  const configs = await prisma.notificationChannelConfig.findMany();
  
  const emailConfig = configs.find(c => c.channel === NotificationChannel.EMAIL);
  const smsConfig = configs.find(c => c.channel === NotificationChannel.SMS);
  const whatsappConfig = configs.find(c => c.channel === NotificationChannel.WHATSAPP);

  const results: Record<string, ChannelStatus> = {
    email: { connected: false, provider: emailConfig?.providerType || 'SMTP' },
    sms: { connected: false, provider: smsConfig?.providerType || 'Twilio' },
    whatsapp: { connected: false, provider: whatsappConfig?.providerType || 'Meta Cloud API' }
  };

  try {
    const emailProvider = emailConfig?.providerType || NotificationProviderType.SMTP;
    if (emailProvider === NotificationProviderType.RESEND) {
      const emailStatus = await testResendConnection();
      results.email = {
        connected: emailStatus.connected,
        provider: 'Resend',
        fromAddress: emailStatus.fromEmail,
        error: emailStatus.error
      };
    } else {
      const smtpStatus = await testSMTPConnection();
      results.email = {
        connected: smtpStatus.connected,
        provider: 'SMTP',
        fromAddress: smtpStatus.fromEmail,
        error: smtpStatus.error
      };
    }
  } catch (e: any) {
    results.email.error = e.message;
  }

  try {
    const smsProvider = smsConfig?.providerType || NotificationProviderType.TWILIO;
    if (smsProvider === NotificationProviderType.TWILIO) {
      const twilioStatus = await testTwilioConnection();
      results.sms = {
        connected: twilioStatus.connected,
        provider: 'Twilio',
        phoneNumber: twilioStatus.phoneNumber,
        error: twilioStatus.error
      };
    }
  } catch (e: any) {
    results.sms.error = e.message;
  }

  try {
    const whatsappProvider = whatsappConfig?.providerType || NotificationProviderType.META_WHATSAPP;
    if (whatsappProvider === NotificationProviderType.META_WHATSAPP) {
      const metaStatus = await testMetaWhatsAppConnection();
      results.whatsapp = {
        connected: metaStatus.connected,
        provider: 'Meta Cloud API',
        phoneNumber: metaStatus.phoneNumber,
        error: metaStatus.error
      };
    } else if (whatsappProvider === NotificationProviderType.TWILIO) {
      const twilioStatus = await testTwilioConnection();
      results.whatsapp = {
        connected: twilioStatus.connected,
        provider: 'Twilio',
        phoneNumber: twilioStatus.phoneNumber,
        error: twilioStatus.error
      };
    }
  } catch (e: any) {
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

  let result: SendResult;
  const senderName = fromName || config.fromName || undefined;
  
  if (config.providerType === NotificationProviderType.RESEND) {
    result = await sendEmail(to, subject, html, senderName);
  } else {
    result = await sendEmailViaSMTP(to, subject, html, senderName);
  }
  
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

  let result: SendResult;
  
  if (config.providerType === NotificationProviderType.TWILIO) {
    result = await sendWhatsApp(to, message);
  } else {
    result = await sendWhatsAppViaMeta(to, message);
  }
  
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
  
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel }
  });
  
  switch (channel) {
    case NotificationChannel.EMAIL:
      const emailHtml = `<html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email from RadioPharma OMS</h2>
            <p>This is a test email to verify your email notification configuration.</p>
            <p>If you received this email, your email channel is working correctly.</p>
            <hr />
            <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </body>
        </html>`;
      if (config?.providerType === NotificationProviderType.RESEND) {
        result = await sendEmail(recipient, 'RadioPharma OMS - Test Email', emailHtml);
      } else {
        result = await sendEmailViaSMTP(recipient, 'RadioPharma OMS - Test Email', emailHtml);
      }
      break;
      
    case NotificationChannel.SMS:
      result = await sendSMS(
        recipient,
        'RadioPharma OMS Test: This is a test SMS message to verify your SMS notification configuration.'
      );
      break;
      
    case NotificationChannel.WHATSAPP:
      const whatsappMsg = 'RadioPharma OMS Test: This is a test WhatsApp message to verify your WhatsApp notification configuration.';
      if (config?.providerType === NotificationProviderType.TWILIO) {
        result = await sendWhatsApp(recipient, whatsappMsg);
      } else {
        result = await sendWhatsAppViaMeta(recipient, whatsappMsg);
      }
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
