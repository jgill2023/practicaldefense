// SMS service using Twilio integration with ultra-strict content filtering
import Twilio from 'twilio';
import { contentFilter } from './contentFilter';
import { storage } from './storage';

// Lazy initialization to avoid server crash on startup
let twilioClient: Twilio | null = null;

function initializeTwilioClient(): Twilio {
  if (!twilioClient) {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error("TWILIO_ACCOUNT_SID environment variable must be set for SMS sending");
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("TWILIO_AUTH_TOKEN environment variable must be set for SMS sending");
    }
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error("TWILIO_PHONE_NUMBER environment variable must be set for SMS sending");
    }
    
    twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

interface SmsParams {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  instructorId?: string; // Optional instructor context for attribution
  purpose?: 'educational' | 'marketing' | 'administrative'; // Optional purpose for analytics
}

export async function sendSms(params: SmsParams): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  try {
    const client = initializeTwilioClient();
    const fromNumber = params.from || process.env.TWILIO_PHONE_NUMBER!;
    
    const response = await client.messages.create({
      to: params.to,
      from: fromNumber,
      body: params.body,
      mediaUrl: params.mediaUrl,
    });

    // Log communication to database with optional instructor context
    try {
      await storage.createCommunication({
        type: 'sms',
        direction: 'outbound',
        purpose: params.purpose || null, // Include purpose if provided for analytics/filtering
        fromAddress: fromNumber,
        toAddress: params.to,
        subject: null, // SMS doesn't have subjects
        content: params.body,
        htmlContent: null, // SMS is plain text only
        deliveryStatus: 'sent',
        externalMessageId: response.sid,
        sentAt: new Date(),
        userId: params.instructorId || null, // Include instructorId if provided for attribution
        enrollmentId: null, // Will be resolved in API layer if enrollment context is available
        courseId: null, // Will be resolved in API layer if course context is available
      });
    } catch (logError) {
      console.error('Failed to log SMS communication:', logError);
      // Don't fail the SMS send if logging fails
    }

    return {
      success: true,
      messageSid: response.sid,
    };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error.message || 'Unknown SMS sending error',
    };
  }
}

// Enhanced SMS service for notification system with ultra-strict content filtering
export interface NotificationSmsParams {
  to: string[];
  message: string;
  instructorId: string;
  purpose?: 'educational' | 'marketing' | 'administrative';
  mediaUrl?: string[];
  fromNumber?: string;
}

export class NotificationSmsService {
  private static readonly DEFAULT_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  private static readonly MAX_SMS_LENGTH = 1600; // Twilio's limit for concatenated SMS
  private static readonly RATE_LIMIT_DELAY = 100; // 100ms between messages to respect rate limits

  static async sendNotificationSms(params: NotificationSmsParams): Promise<{
    success: boolean;
    messageSids?: string[];
    error?: string;
    blockedByFilter?: boolean;
    filteredReason?: string;
    sentCount?: number;
    failedCount?: number;
  }> {
    try {
      // Validate phone numbers
      const validPhoneNumbers = params.to.filter(phone => phone && phone.trim().length > 0 && this.isValidPhoneNumber(phone));
      if (validPhoneNumbers.length === 0) {
        return {
          success: false,
          error: 'No valid phone numbers provided',
        };
      }

      // ULTRA-STRICT CONTENT FILTERING FOR SMS
      // SMS uses the strictest filtering - blocks ALL firearm terms regardless of context
      const validationResult = await contentFilter.validateMessage(params.message, params.instructorId, {
        channel: 'sms',
        purpose: params.purpose || 'educational'
      });

      // Log the message attempt for compliance audit
      await contentFilter.logMessageAttempt(
        params.instructorId,
        params.message,
        validPhoneNumbers,
        'sms',
        validationResult
      );

      // Block message if content filtering fails
      if (!validationResult.isValid) {
        console.warn('SMS blocked by content filter:', {
          instructorId: params.instructorId,
          recipients: validPhoneNumbers.length,
          violations: validationResult.violations,
          blockedReason: validationResult.blockedReason
        });

        return {
          success: false,
          blockedByFilter: true,
          filteredReason: validationResult.blockedReason,
          error: 'Message contains prohibited content and cannot be sent via SMS',
        };
      }

      // Validate message length
      if (params.message.length > this.MAX_SMS_LENGTH) {
        return {
          success: false,
          error: `Message too long (${params.message.length} characters). SMS messages must be under ${this.MAX_SMS_LENGTH} characters.`,
        };
      }

      const client = initializeTwilioClient();
      const fromNumber = params.fromNumber || this.DEFAULT_FROM_NUMBER;

      if (!fromNumber) {
        return {
          success: false,
          error: 'No valid Twilio phone number configured',
        };
      }

      const results: Array<{ success: boolean; messageSid?: string; error?: string; phone: string }> = [];

      // Send messages with rate limiting
      for (let i = 0; i < validPhoneNumbers.length; i++) {
        const phoneNumber = this.formatPhoneNumber(validPhoneNumbers[i]);
        
        try {
          const response = await client.messages.create({
            to: phoneNumber,
            from: fromNumber,
            body: params.message,
            mediaUrl: params.mediaUrl,
          });

          results.push({
            success: true,
            messageSid: response.sid,
            phone: phoneNumber,
          });

          // Enhanced logging with provider details
          console.log('SMS sent successfully:', {
            messageSid: response.sid,
            to: phoneNumber,
            messageLength: params.message.length,
            instructorId: params.instructorId,
            providerResponse: {
              status: response.status,
              price: response.price,
              priceUnit: response.priceUnit,
            }
          });

          // Log communication to database with full instructor context
          try {
            await storage.createCommunication({
              type: 'sms',
              direction: 'outbound',
              purpose: params.purpose || 'educational', // Capture the purpose for analytics/filtering
              fromAddress: fromNumber,
              toAddress: phoneNumber,
              subject: null, // SMS doesn't have subjects
              content: params.message,
              htmlContent: null, // SMS is plain text only
              deliveryStatus: 'sent',
              externalMessageId: response.sid,
              sentAt: new Date(),
              userId: params.instructorId, // Map instructorId to userId for attribution
              enrollmentId: null, // Will be resolved in API layer if enrollment context is available
              courseId: null, // Will be resolved in API layer if course context is available
            });
          } catch (logError) {
            console.error('Failed to log SMS communication:', logError);
            // Don't fail the SMS send if logging fails
          }

          // Rate limiting - add delay between messages except for the last one
          if (i < validPhoneNumbers.length - 1) {
            await this.delay(this.RATE_LIMIT_DELAY);
          }

        } catch (error: any) {
          results.push({
            success: false,
            error: error.message,
            phone: phoneNumber,
          });

          // Enhanced error logging with provider details
          const errorDetails = {
            message: error.message,
            code: error.code,
            moreInfo: error.moreInfo,
            status: error.status,
            details: error.details,
            phone: phoneNumber,
            instructorId: params.instructorId,
          };
          console.error('Failed to send SMS:', errorDetails);
        }
      }

      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // Update audit logs with delivery status for successful messages
      for (const result of successfulResults) {
        if (result.messageSid) {
          await contentFilter.logMessageAttempt(
            params.instructorId,
            params.message,
            [result.phone],
            'sms',
            validationResult,
            result.messageSid
          );
        }
      }

      const allSuccess = failedResults.length === 0;
      const messageSids = successfulResults.map(r => r.messageSid).filter(Boolean) as string[];

      if (allSuccess) {
        return {
          success: true,
          messageSids,
          sentCount: successfulResults.length,
          failedCount: 0,
        };
      } else {
        // Partial success
        const errorSummary = failedResults.map(r => `${r.phone}: ${r.error}`).join('; ');
        return {
          success: successfulResults.length > 0, // Consider partial success as success
          messageSids,
          sentCount: successfulResults.length,
          failedCount: failedResults.length,
          error: `Failed to send to ${failedResults.length} recipient(s): ${errorSummary}`,
        };
      }

    } catch (error: any) {
      // Enhanced error logging with provider details
      const errorDetails = {
        message: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error.details,
        instructorId: params.instructorId,
        recipientCount: params.to.length,
      };
      console.error('Failed to send notification SMS:', errorDetails);
      
      return {
        success: false,
        error: error.message || 'Unknown SMS sending error',
        sentCount: 0,
        failedCount: params.to.length,
      };
    }
  }

  /**
   * Validate phone number format (basic validation)
   */
  private static isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation - adjust regex as needed for your requirements
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove common formatting
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Format phone number to E.164 format for Twilio
   */
  private static formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove formatting
    
    // Add country code if missing (assuming US +1)
    if (!formatted.startsWith('+')) {
      if (formatted.length === 10) {
        formatted = '+1' + formatted;
      } else if (formatted.length === 11 && formatted.startsWith('1')) {
        formatted = '+' + formatted;
      } else {
        formatted = '+' + formatted;
      }
    }
    
    return formatted;
  }

  /**
   * Helper function to add delay between API calls
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get SMS delivery status from Twilio
   */
  static async getMessageStatus(messageSid: string): Promise<{
    status?: string;
    errorCode?: string;
    errorMessage?: string;
    price?: string;
    priceUnit?: string;
  }> {
    try {
      const client = initializeTwilioClient();
      const message = await client.messages(messageSid).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
        price: message.price || undefined,
        priceUnit: message.priceUnit || undefined,
      };
    } catch (error: any) {
      console.error('Failed to fetch message status:', error);
      return {
        errorMessage: error.message,
      };
    }
  }

  /**
   * Get account balance and usage information
   */
  static async getAccountInfo(): Promise<{
    balance?: string;
    currency?: string;
    accountSid?: string;
    status?: string;
  }> {
    try {
      const client = initializeTwilioClient();
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      
      return {
        balance: account.balance,
        currency: account.currency,
        accountSid: account.sid,
        status: account.status,
      };
    } catch (error: any) {
      console.error('Failed to fetch account info:', error);
      return {};
    }
  }
}