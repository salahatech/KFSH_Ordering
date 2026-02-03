import twilio from 'twilio';

let connectionSettings: any;
let twilioClient: any = null;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  if (twilioClient) return twilioClient;
  
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  twilioClient = twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
  return twilioClient;
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    if (!fromNumber) {
      return { success: false, error: 'Twilio phone number not configured' };
    }
    
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    console.log(`SMS sent to ${to}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

export async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    if (!fromNumber) {
      return { success: false, error: 'Twilio phone number not configured' };
    }
    
    const whatsappFrom = `whatsapp:${fromNumber}`;
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappTo
    });
    
    console.log(`WhatsApp sent to ${to}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    console.error('Failed to send WhatsApp:', error);
    return { success: false, error: error.message || 'Failed to send WhatsApp message' };
  }
}

export async function testTwilioConnection(): Promise<{ connected: boolean; phoneNumber?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const phoneNumber = await getTwilioFromPhoneNumber();
    
    const account = await client.api.accounts(connectionSettings.settings.account_sid).fetch();
    
    return { 
      connected: true, 
      phoneNumber: phoneNumber || undefined
    };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}
