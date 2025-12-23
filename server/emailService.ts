// Email service using SendGrid API key
import sgMail from '@sendgrid/mail';
import { storage } from './storage';

const DEFAULT_FROM_EMAIL = 'Info@abqconcealedcarry.com';
const DEFAULT_FROM_NAME = 'Practical Defense Training';

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

// Authentication-related email functions (no credits required)
const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : "http://localhost:5000";

async function sendAuthEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    initializeSendGrid();
    await sgMail.send({
      to,
      from: { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
      subject,
      html,
    });
    console.log(`Auth email sent successfully to ${to} - Subject: ${subject}`);
    return true;
  } catch (error: any) {
    console.error("Error sending auth email:", {
      to,
      subject,
      error: error.response?.body || error.message || error,
      statusCode: error.code || error.statusCode,
    });
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Tactical Advantage!</h1>
        
        <p style="font-size: 16px;">Hi ${firstName},</p>
        
        <p style="font-size: 16px;">
          Thank you for signing up! Please verify your email address to complete your registration.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training - Professional Firearms Training<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendAuthEmail(email, "Verify Your Email - Practical Defense Training", html);
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Password Reset Request</h1>
        
        <p style="font-size: 16px;">Hi ${firstName},</p>
        
        <p style="font-size: 16px;">
          We received a request to reset your password. Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; background-color: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #dc3545; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training - Professional Firearms Training<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendAuthEmail(email, "Reset Your Password - Practical Defense Training", html);
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<boolean> {
  const loginUrl = `${APP_URL}/login`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Practical Defense Training</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Practical Defense Training!</h1>
        
        <p style="font-size: 16px;">Hi ${firstName},</p>
        
        <p style="font-size: 16px;">
          Your email has been verified successfully! You can now access your account and explore our firearms training courses.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="display: inline-block; background-color: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Go to Login
          </a>
        </div>
        
        <p style="font-size: 16px; color: #666;">
          <strong>Note:</strong> Your account is pending approval. You'll receive another email once an administrator has reviewed and approved your account.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          If you have any questions, feel free to contact us.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training - Professional Firearms Training<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendAuthEmail(email, "Welcome to Practical Defense Training!", html);
}
