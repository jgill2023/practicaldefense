// Email service using SendGrid API key
import sgMail from '@sendgrid/mail';
import { storage } from './storage';

const DEFAULT_FROM_EMAIL = 'chris@tacticaladv.com';
const DEFAULT_FROM_NAME = 'Chris Bean - Tactical Advantage';

function initializeSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is required for email sending');
  }
  sgMail.setApiKey(apiKey);
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
    initializeSendGrid();
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
    };
    
    if (params.text) {
      emailData.text = params.text;
    }
    
    const response = await sgMail.send(emailData);
    
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

      initializeSendGrid();
      const fromEmail = params.fromEmail || DEFAULT_FROM_EMAIL;
      const fromName = params.fromName || DEFAULT_FROM_NAME;

      const response = await sgMail.send({
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
      console.error('Failed to send notification email:', JSON.stringify(errorDetails, null, 2));
      
      
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
