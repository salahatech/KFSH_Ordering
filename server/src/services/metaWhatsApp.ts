import { PrismaClient, NotificationChannel } from '@prisma/client';

const prisma = new PrismaClient();

interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ConnectionStatus {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

export async function getMetaWhatsAppConfig(): Promise<MetaWhatsAppConfig | null> {
  const config = await prisma.notificationChannelConfig.findUnique({
    where: { channel: NotificationChannel.WHATSAPP }
  });

  if (!config?.settingsJson) return null;

  const settings = config.settingsJson as any;
  return {
    accessToken: settings.accessToken || '',
    phoneNumberId: settings.phoneNumberId || '',
    businessAccountId: settings.businessAccountId || ''
  };
}

export async function testMetaWhatsAppConnection(): Promise<ConnectionStatus> {
  const config = await getMetaWhatsAppConfig();
  
  if (!config || !config.accessToken || !config.phoneNumberId) {
    return {
      connected: false,
      error: 'Meta WhatsApp not configured. Please enter your Meta Cloud API credentials.'
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      return {
        connected: false,
        error: error.error?.message || 'Failed to verify Meta WhatsApp credentials'
      };
    }

    const data = await response.json() as { display_phone_number?: string };
    return {
      connected: true,
      phoneNumber: data.display_phone_number || config.phoneNumberId
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || 'Failed to connect to Meta Cloud API'
    };
  }
}

export async function sendWhatsAppViaMeta(
  to: string,
  message: string
): Promise<SendResult> {
  const config = await getMetaWhatsAppConfig();
  
  if (!config || !config.accessToken || !config.phoneNumberId) {
    return {
      success: false,
      error: 'Meta WhatsApp not configured'
    };
  }

  const cleanPhone = to.replace(/[^\d+]/g, '').replace(/^\+/, '');

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const data = await response.json() as { error?: { message?: string }; messages?: { id?: string }[] };

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message'
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message'
    };
  }
}
