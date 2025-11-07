import twilio from 'twilio';
import { z } from 'zod';

// Twilio client setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const isConfigured = !!(accountSid && authToken);

if (!isConfigured) {
  console.warn('⚠️  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not configured. SMS functionality is disabled.');
  console.warn('   Set these environment variables to enable Twilio SMS features.');
}

const client = isConfigured ? twilio(accountSid, authToken) : null;

// Types for SMS messages from Twilio
export interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered' | 'receiving' | 'received';
  dateSent: Date | null;
  dateCreated: Date;
  price: string | null;
  priceUnit: string | null;
  errorCode: number | null;
  errorMessage: string | null;
  uri: string;
}

// SMS message filters
export interface SMSFilters {
  from?: string;
  to?: string;
  dateSent?: string;
  status?: string;
  direction?: 'inbound' | 'outbound-api';
  limit?: number;
  pageSize?: number;
}

// Validation schemas
export const sendSMSSchema = z.object({
  to: z.string().min(1, 'Recipient phone number is required'),
  body: z.string().min(1, 'Message body is required').max(1600, 'Message too long'),
  from: z.string().optional(), // Will default to TWILIO_PHONE_NUMBER
});

export type SendSMSRequest = z.infer<typeof sendSMSSchema>;

export class TwilioSMSService {
  private fromPhoneNumber: string;

  constructor() {
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    if (!this.fromPhoneNumber) {
      console.warn('TWILIO_PHONE_NUMBER not set - SMS sending will require explicit from parameter');
    }
  }

  /**
   * Retrieve SMS messages from Twilio with optional filters
   */
  async getMessages(filters: SMSFilters = {}): Promise<TwilioMessage[]> {
    if (!client) {
      throw new Error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }
    
    try {
      const options: any = {
        limit: filters.limit || 50,
        pageSize: filters.pageSize || 20,
      };

      if (filters.from) options.from = filters.from;
      if (filters.to) options.to = filters.to;
      if (filters.dateSent) options.dateSent = filters.dateSent;

      const messages = await client.messages.list(options);

      return messages.map(msg => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        direction: msg.direction as any,
        status: msg.status as any,
        dateSent: msg.dateSent,
        dateCreated: msg.dateCreated,
        price: msg.price,
        priceUnit: msg.priceUnit,
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage,
        uri: msg.uri,
      }));
    } catch (error: any) {
      console.error('Error fetching SMS messages from Twilio:', error);
      throw new Error(`Failed to fetch SMS messages: ${error.message}`);
    }
  }

  /**
   * Get a specific message by SID
   */
  async getMessage(messageSid: string): Promise<TwilioMessage | null> {
    if (!client) {
      throw new Error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }
    
    try {
      const message = await client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        direction: message.direction as any,
        status: message.status as any,
        dateSent: message.dateSent,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        uri: message.uri,
      };
    } catch (error) {
      console.error(`Error fetching message ${messageSid}:`, error);
      return null;
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(data: SendSMSRequest): Promise<TwilioMessage> {
    if (!client) {
      throw new Error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
    }
    
    try {
      const message = await client.messages.create({
        body: data.body,
        from: data.from || this.fromPhoneNumber,
        to: data.to,
      });

      return {
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        direction: message.direction as any,
        status: message.status as any,
        dateSent: message.dateSent,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        uri: message.uri,
      };
    } catch (error: any) {
      console.error('Error sending SMS via Twilio:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Get inbox messages (inbound only)
   */
  async getInboxMessages(filters: SMSFilters = {}): Promise<TwilioMessage[]> {
    const messages = await this.getMessages({ ...filters, direction: 'inbound' });
    return messages;
  }

  /**
   * Get sent messages (outbound only)
   */
  async getSentMessages(filters: SMSFilters = {}): Promise<TwilioMessage[]> {
    const messages = await this.getMessages({ ...filters, direction: 'outbound-api' });
    return messages;
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{
    total: number;
    sent: number;
    received: number;
    failed: number;
  }> {
    try {
      const messages = await this.getMessages({ limit: 1000 });
      
      return {
        total: messages.length,
        sent: messages.filter(m => m.direction.startsWith('outbound')).length,
        received: messages.filter(m => m.direction === 'inbound').length,
        failed: messages.filter(m => m.status === 'failed').length,
      };
    } catch (error) {
      console.error('Error getting message stats:', error);
      return { total: 0, sent: 0, received: 0, failed: 0 };
    }
  }
}

// Singleton instance
export const twilioSMSService = new TwilioSMSService();