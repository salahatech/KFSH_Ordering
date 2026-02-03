import nodemailer from 'nodemailer';
import { PrismaClient, NotificationChannel } from '@prisma/client';

const prisma = new PrismaClient();

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ConnectionStatus {
  connected: boolean;
  fromEmail?: string;
  error?: string;
}

export async function getSMTPConfig(): Promise<SMTPConfig | null> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel: NotificationChannel.EMAIL }
  });

  if (!config?.settingsJson) return null;

  const settings = config.settingsJson as any;
  return {
    host: settings.host || '',
    port: parseInt(settings.port, 10) || 587,
    secure: settings.secure || false,
    username: settings.username || '',
    password: settings.password || '',
    fromEmail: settings.fromEmail || config.fromAddress || '',
    fromName: settings.fromName || config.fromName || 'RadioPharma OMS'
  };
}

export async function testSMTPConnection(): Promise<ConnectionStatus> {
  const config = await getSMTPConfig();
  
  if (!config || !config.host || !config.username || !config.password) {
    return {
      connected: false,
      error: 'SMTP not configured. Please enter your SMTP settings.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    await transporter.verify();
    return {
      connected: true,
      fromEmail: config.fromEmail
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Failed to connect to SMTP server'
    };
  }
}

export async function sendEmailViaSMTP(
  to: string,
  subject: string,
  html: string,
  fromNameOverride?: string
): Promise<SendResult> {
  const config = await getSMTPConfig();
  
  if (!config || !config.host || !config.username || !config.password) {
    return {
      success: false,
      error: 'SMTP not configured'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    const info = await transporter.sendMail({
      from: `"${fromNameOverride || config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}
