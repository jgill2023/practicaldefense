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
  instructorId?: string; // Add instructor ID for credit tracking
}

export async function sendEmail(params: EmailParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Deduct credits BEFORE sending if instructorId is provided
    let creditTransactionId: string | undefined;
    if (params.instructorId) {
      try {
        const result = await storage.deductCredits(params.instructorId, 0, 1, {
          description: `Sending email to ${params.to}`,
        });
        creditTransactionId = result.transaction.id;
      } catch (creditError: any) {
        console.error('Error deducting email credits:', creditError);
        // Return structured error for insufficient credits
        if (creditError.message?.includes('Insufficient')) {
          return {
            success: false,
            error: 'Insufficient email credits. Please purchase more credits to continue sending messages.',
          };
        }
        return {
          success: false,
          error: 'Unable to process email credits. Please try again or contact support.',
        };
      }
    }

    // Credits successfully deducted, now send the email
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
    
    let response;
    try {
      response = await sgMail.send(emailData);
    } catch (sendGridError: any) {
      // Send failed - refund the credit if it was deducted
      if (params.instructorId && creditTransactionId) {
        try {
          await storage.refundCredits(params.instructorId, creditTransactionId, `Email send failed: ${sendGridError.message}`);
        } catch (refundError) {
          console.error('Failed to refund email credit after send failure:', refundError);
        }
      }
      throw sendGridError;
    }
    
    // Log communication to database
    try {
      const messageId = response[0]?.headers?.['x-message-id'] as string | undefined;
      const communication = await storage.createCommunication({
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
        userId: params.instructorId || null,
        enrollmentId: null,
        courseId: null,
      });
      
      // Update transaction with communication ID if we deducted credits
      if (params.instructorId && creditTransactionId && communication.id) {
        // This is a best-effort update, don't fail if it doesn't work
        try {
          await storage.updateCreditTransactionCommunication(creditTransactionId, communication.id);
        } catch (updateError) {
          console.error('Failed to link transaction to communication:', updateError);
        }
      }
    } catch (logError) {
      console.error('Failed to log email communication:', logError);
      // Don't fail the email send if logging fails
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    return {
      success: false,
      error: error.message || 'Unknown email sending error',
    };
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
