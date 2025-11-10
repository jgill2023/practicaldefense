// Email service using SendGrid connector
import sgMail from '@sendgrid/mail';
import { storage } from './storage';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  console.log('SendGrid connector response:', JSON.stringify(data, null, 2));
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings) {
    throw new Error('SendGrid connection not found in connector response');
  }
  
  console.log('Connection settings:', JSON.stringify(connectionSettings, null, 2));
  
  const apiKey = connectionSettings.settings?.api_key;
  const fromEmail = connectionSettings.settings?.from_email;
  
  if (!apiKey || !fromEmail) {
    throw new Error(`SendGrid not properly configured. API Key: ${apiKey ? 'present' : 'missing'}, From Email: ${fromEmail ? 'present' : 'missing'}`);
  }
  
  console.log('API Key format check:', apiKey.substring(0, 3));
  
  return {apiKey, email: fromEmail};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableSendGridClient() {
  const {apiKey, email} = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const {client} = await getUncachableSendGridClient();
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
    };
    
    if (params.text) {
      emailData.text = params.text;
    }
    
    const response = await client.send(emailData);
    
    // Log communication to database
    try {
      const messageId = response[0]?.headers?.['x-message-id'] as string | undefined;
      await storage.createCommunication({
        type: 'email',
        direction: 'outbound',
        fromAddress: params.from,
        toAddress: params.to,
        subject: params.subject,
        content: params.text || (params.html ? params.html.replace(/<[^>]*>/g, '').trim() : ''),
        htmlContent: params.html || undefined,
        deliveryStatus: 'sent',
        externalMessageId: messageId,
        sentAt: new Date(),
        userId: null,
        enrollmentId: null,
        courseId: null,
      });
    } catch (logError) {
      console.error('Failed to log email communication:', logError);
    }
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export interface NotificationEmailParams {
  to: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
}

export class NotificationEmailService {
  private static readonly DEFAULT_FROM_NAME = 'Chris Bean - Tactical Advantage';

  static async sendNotificationEmail(params: NotificationEmailParams): Promise<{
    success: boolean;
    messageId?: string | undefined;
    error?: string;
  }> {
    try {
      // Validate recipient emails
      const validEmails = params.to.filter(email => email && email.trim().length > 0 && this.isValidEmail(email));
      if (validEmails.length === 0) {
        return {
          success: false,
          error: 'No valid recipient email addresses provided',
        };
      }

      const {client, fromEmail: connectorFromEmail} = await getUncachableSendGridClient();
      const fromEmail = params.fromEmail || connectorFromEmail;
      const fromName = params.fromName || this.DEFAULT_FROM_NAME;

      const response = await client.send({
        to: validEmails,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: params.subject,
        html: params.htmlContent,
        text: params.textContent || this.stripHtml(params.htmlContent),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      });

      // Enhanced logging with provider details
      const messageId = response[0]?.headers?.['x-message-id'] as string | undefined;
      console.log('Email sent successfully:', {
        messageId,
        to: validEmails,
        subject: params.subject,
        providerResponse: {
          statusCode: response[0]?.statusCode,
          headers: response[0]?.headers,
        }
      });

      // Log communications to database for each recipient
      for (const recipientEmail of validEmails) {
        try {
          await storage.createCommunication({
            type: 'email',
            direction: 'outbound',
            fromAddress: fromEmail,
            toAddress: recipientEmail,
            subject: params.subject,
            content: params.textContent || this.stripHtml(params.htmlContent),
            htmlContent: params.htmlContent,
            deliveryStatus: 'sent',
            externalMessageId: messageId,
            sentAt: new Date(),
            userId: null,
            enrollmentId: null,
            courseId: null,
          });
        } catch (logError) {
          console.error('Failed to log email communication:', logError);
        }
      }

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      // Enhanced error logging with provider details
      const errorDetails = {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        body: error.response?.body,
        headers: error.response?.headers,
      };
      console.error('Failed to send notification email:', errorDetails);
      
      
      return {
        success: false,
        error: error.message || 'Unknown email sending error',
      };
    }
  }

  private static stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}
