// Email service using SendGrid integration
import { MailService } from '@sendgrid/mail';
import { storage } from './storage';

// Lazy initialization to avoid server crash on startup
let mailService: MailService | null = null;

function initializeMailService(): MailService {
  if (!mailService) {
    const apiKey = process.env.SENDGRIP_API_KEY_WebApp;
    if (!apiKey) {
      throw new Error("SENDGRIP_API_KEY_WebApp environment variable must be set for email sending");
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
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
    };
    
    if (params.text) {
      emailData.text = params.text;
    }
    
    const response = await service.send(emailData);
    
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
        userId: null, // Will be resolved in API layer if user context is available
        enrollmentId: null, // Will be resolved in API layer if enrollment context is available
        courseId: null, // Will be resolved in API layer if course context is available
      });
    } catch (logError) {
      console.error('Failed to log email communication:', logError);
      // Don't fail the email send if logging fails
    }
    
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
  private static readonly DEFAULT_FROM_EMAIL = 'jeremy@abqconcealedcarry.com';
  private static readonly DEFAULT_FROM_NAME = 'Jeremy - Practical Defense Training';

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
            userId: null, // Will be resolved in API layer if user context is available
            enrollmentId: null, // Will be resolved in API layer if enrollment context is available
            courseId: null, // Will be resolved in API layer if course context is available
          });
        } catch (logError) {
          console.error('Failed to log email communication:', logError);
          // Don't fail the email send if logging fails
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