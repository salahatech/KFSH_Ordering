import { Resend } from 'resend';

let connectionSettings: any;

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'notifications@radiopharma.com'
  };
}

export async function sendEmail(
  to: string, 
  subject: string, 
  html: string,
  fromName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    
    const result = await client.emails.send({
      from,
      to,
      subject,
      html
    });
    
    console.log(`Email sent to ${to}: ${result.data?.id}`);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function testResendConnection(): Promise<{ connected: boolean; fromEmail?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    return { connected: true, fromEmail };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}
