import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { testTwilioConnection } from '../services/twilio.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

const NOTIFICATION_CONFIG_KEYS = {
  EMAIL_ENABLED: 'notification_email_enabled',
  EMAIL_FROM_ADDRESS: 'notification_email_from_address',
  EMAIL_FROM_NAME: 'notification_email_from_name',
  SMS_ENABLED: 'notification_sms_enabled',
  WHATSAPP_ENABLED: 'notification_whatsapp_enabled',
  WHATSAPP_TEMPLATE_NAMESPACE: 'notification_whatsapp_template_namespace',
  DEFAULT_CHANNEL: 'notification_default_channel',
  ORDER_NOTIFICATIONS: 'notification_order_events',
  BATCH_NOTIFICATIONS: 'notification_batch_events',
  DELIVERY_NOTIFICATIONS: 'notification_delivery_events',
  APPROVAL_NOTIFICATIONS: 'notification_approval_events',
  INVOICE_NOTIFICATIONS: 'notification_invoice_events',
};

const DEFAULT_VALUES: Record<string, { value: string; dataType: string; description: string }> = {
  [NOTIFICATION_CONFIG_KEYS.EMAIL_ENABLED]: { value: 'true', dataType: 'boolean', description: 'Enable email notifications' },
  [NOTIFICATION_CONFIG_KEYS.EMAIL_FROM_ADDRESS]: { value: 'noreply@radiopharma.com', dataType: 'string', description: 'Email sender address' },
  [NOTIFICATION_CONFIG_KEYS.EMAIL_FROM_NAME]: { value: 'RadioPharma OMS', dataType: 'string', description: 'Email sender display name' },
  [NOTIFICATION_CONFIG_KEYS.SMS_ENABLED]: { value: 'false', dataType: 'boolean', description: 'Enable SMS notifications via Twilio' },
  [NOTIFICATION_CONFIG_KEYS.WHATSAPP_ENABLED]: { value: 'false', dataType: 'boolean', description: 'Enable WhatsApp notifications via Twilio' },
  [NOTIFICATION_CONFIG_KEYS.WHATSAPP_TEMPLATE_NAMESPACE]: { value: '', dataType: 'string', description: 'WhatsApp Business template namespace' },
  [NOTIFICATION_CONFIG_KEYS.DEFAULT_CHANNEL]: { value: 'email', dataType: 'string', description: 'Default notification channel (email, sms, whatsapp, all)' },
  [NOTIFICATION_CONFIG_KEYS.ORDER_NOTIFICATIONS]: { value: 'email', dataType: 'string', description: 'Channels for order notifications' },
  [NOTIFICATION_CONFIG_KEYS.BATCH_NOTIFICATIONS]: { value: 'email', dataType: 'string', description: 'Channels for batch/production notifications' },
  [NOTIFICATION_CONFIG_KEYS.DELIVERY_NOTIFICATIONS]: { value: 'email,sms', dataType: 'string', description: 'Channels for delivery notifications' },
  [NOTIFICATION_CONFIG_KEYS.APPROVAL_NOTIFICATIONS]: { value: 'email', dataType: 'string', description: 'Channels for approval workflow notifications' },
  [NOTIFICATION_CONFIG_KEYS.INVOICE_NOTIFICATIONS]: { value: 'email', dataType: 'string', description: 'Channels for invoice/payment notifications' },
};

router.get('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: Object.values(NOTIFICATION_CONFIG_KEYS) }
      }
    });

    const configMap: Record<string, any> = {};
    
    for (const [name, key] of Object.entries(NOTIFICATION_CONFIG_KEYS)) {
      const existing = configs.find(c => c.key === key);
      if (existing) {
        let value: any = existing.value;
        if (existing.dataType === 'boolean') {
          value = existing.value === 'true';
        } else if (existing.dataType === 'number') {
          value = parseFloat(existing.value);
        }
        configMap[name] = {
          key,
          value,
          dataType: existing.dataType,
          description: existing.description
        };
      } else {
        const defaults = DEFAULT_VALUES[key];
        let value: any = defaults.value;
        if (defaults.dataType === 'boolean') {
          value = defaults.value === 'true';
        }
        configMap[name] = {
          key,
          value,
          dataType: defaults.dataType,
          description: defaults.description
        };
      }
    }

    res.json(configMap);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

router.put('/', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const userId = req.user?.userId;

    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!Object.values(NOTIFICATION_CONFIG_KEYS).includes(key)) {
        continue;
      }

      const defaults = DEFAULT_VALUES[key];
      const dataType = defaults?.dataType || 'string';
      const stringValue = String(value);

      const oldConfig = await prisma.systemConfig.findUnique({ where: { key } });

      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: { 
          value: stringValue,
          updatedAt: new Date()
        },
        create: {
          key,
          value: stringValue,
          dataType,
          category: 'notifications',
          description: defaults?.description || ''
        }
      });

      await createAuditLog(
        userId,
        oldConfig ? 'UPDATE' : 'CREATE',
        'SystemConfig',
        key,
        oldConfig ? { value: oldConfig.value } : null,
        { value: stringValue },
        req
      );

      results.push(config);
    }

    res.json({ success: true, updated: results.length });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

router.get('/test/email', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { sendEmail } = await import('../services/resend.js');
    
    const testEmail = req.user?.email || 'test@example.com';
    
    await sendEmail(
      testEmail,
      '[RadioPharma OMS] Test Email',
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1e3a5f;">Email Configuration Test</h2>
          <p>This is a test email from RadioPharma OMS.</p>
          <p>If you received this email, your email notifications are configured correctly.</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    );

    res.json({ success: true, message: `Test email sent to ${testEmail}` });
  } catch (error: any) {
    console.error('Email test failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Email test failed' });
  }
});

router.get('/test/sms', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { to } = req.query;
    
    if (!to || typeof to !== 'string') {
      res.status(400).json({ error: 'Phone number (to) is required' });
      return;
    }

    const { sendSMS } = await import('../services/twilio.js');
    
    const result = await sendSMS(to, 'RadioPharma OMS: This is a test SMS notification. Your SMS configuration is working correctly.');

    if (result.success) {
      res.json({ success: true, message: `Test SMS sent to ${to}`, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('SMS test failed:', error);
    res.status(500).json({ success: false, error: error.message || 'SMS test failed' });
  }
});

router.get('/test/whatsapp', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { to } = req.query;
    
    if (!to || typeof to !== 'string') {
      res.status(400).json({ error: 'Phone number (to) is required' });
      return;
    }

    const { sendWhatsApp } = await import('../services/twilio.js');
    
    const result = await sendWhatsApp(to, 'RadioPharma OMS: This is a test WhatsApp notification. Your WhatsApp configuration is working correctly.');

    if (result.success) {
      res.json({ success: true, message: `Test WhatsApp sent to ${to}`, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('WhatsApp test failed:', error);
    res.status(500).json({ success: false, error: error.message || 'WhatsApp test failed' });
  }
});

router.get('/status', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const emailStatus = { connected: true, provider: 'Resend' };
    
    let twilioStatus = { connected: false, phoneNumber: undefined as string | undefined, error: undefined as string | undefined };
    try {
      twilioStatus = await testTwilioConnection();
    } catch (error: any) {
      twilioStatus = { connected: false, phoneNumber: undefined, error: error.message };
    }

    res.json({
      email: emailStatus,
      sms: {
        connected: twilioStatus.connected,
        provider: 'Twilio',
        phoneNumber: twilioStatus.phoneNumber,
        error: twilioStatus.error
      },
      whatsapp: {
        connected: twilioStatus.connected,
        provider: 'Twilio',
        phoneNumber: twilioStatus.phoneNumber,
        error: twilioStatus.error
      }
    });
  } catch (error: any) {
    console.error('Error checking notification status:', error);
    res.status(500).json({ error: 'Failed to check notification status' });
  }
});

export default router;
