// Email service using SendGrid integration
import { MailService } from '@sendgrid/mail';

// Lazy initialization to avoid server crash on startup
let mailService: MailService | null = null;

function initializeMailService(): MailService {
  if (!mailService) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY environment variable must be set for email sending");
    }
    mailService = new MailService();
    mailService.setApiKey(apiKey);
  }
  return mailService;
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
    const service = initializeMailService();
    await service.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Enhanced email service for notification system
export interface NotificationEmailParams {
  to: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
}

export class NotificationEmailService {
  private static readonly DEFAULT_FROM_EMAIL = 'noreply@protrainacademy.com';
  private static readonly DEFAULT_FROM_NAME = 'ProTrain Academy';

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

      const service = initializeMailService();
      const fromEmail = params.fromEmail || this.DEFAULT_FROM_EMAIL;
      const fromName = params.fromName || this.DEFAULT_FROM_NAME;

      const response = await service.send({
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
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&')  // Replace HTML entities
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