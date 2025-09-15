// Email service using SendGrid integration
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
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
      const fromEmail = params.fromEmail || this.DEFAULT_FROM_EMAIL;
      const fromName = params.fromName || this.DEFAULT_FROM_NAME;

      const response = await mailService.send({
        to: params.to,
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

      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] as string | undefined,
      };
    } catch (error: any) {
      console.error('Failed to send notification email:', error);
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
}