import { google, calendar_v3 } from 'googleapis';
import { db } from '../db';
import { googleCalendarCredentials, instructorAppointments } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn('Google Calendar: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    }
    
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );
  }

  async isConfigured(): Promise<boolean> {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  async getCredentials(): Promise<typeof googleCalendarCredentials.$inferSelect | null> {
    const creds = await db.select().from(googleCalendarCredentials).limit(1);
    return creds.length > 0 ? creds[0] : null;
  }

  async isAuthorized(): Promise<boolean> {
    const creds = await this.getCredentials();
    return !!creds;
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
      state,
      redirect_uri: redirectUri,
    });
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
  }> {
    const { tokens } = await this.oauth2Client.getToken({ code, redirect_uri: redirectUri });
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Please revoke access and try again.');
    }
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date!),
    };
  }

  async saveCredentials(data: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
    calendarId?: string;
  }): Promise<void> {
    const existingCreds = await this.getCredentials();
    
    if (existingCreds) {
      await db.update(googleCalendarCredentials)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiry: data.tokenExpiry,
          calendarId: data.calendarId || 'primary',
          updatedAt: sql`now()`,
        })
        .where(eq(googleCalendarCredentials.id, existingCreds.id));
    } else {
      await db.insert(googleCalendarCredentials).values({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry,
        calendarId: data.calendarId || 'primary',
      });
    }
  }

  async deleteCredentials(): Promise<void> {
    await db.delete(googleCalendarCredentials);
  }

  private async getAuthenticatedClient(): Promise<calendar_v3.Calendar | null> {
    const creds = await this.getCredentials();
    if (!creds) {
      console.log('Google Calendar: No credentials stored');
      return null;
    }

    this.oauth2Client.setCredentials({
      access_token: creds.accessToken,
      refresh_token: creds.refreshToken,
      expiry_date: creds.tokenExpiry?.getTime(),
    });

    // Check if token is expired and refresh if needed
    const now = new Date();
    if (creds.tokenExpiry && creds.tokenExpiry < now) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveCredentials({
          accessToken: credentials.access_token!,
          refreshToken: creds.refreshToken,
          tokenExpiry: new Date(credentials.expiry_date!),
          calendarId: creds.calendarId || 'primary',
        });
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Failed to refresh Google Calendar token:', error);
        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async createEvent(data: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    attendeeEmails?: string[];
  }): Promise<string | null> {
    const calendar = await this.getAuthenticatedClient();
    if (!calendar) {
      console.log('Google Calendar: Not authenticated, skipping event creation');
      return null;
    }

    const creds = await this.getCredentials();
    const calendarId = creds?.calendarId || 'primary';

    try {
      const event: calendar_v3.Schema$Event = {
        summary: data.summary,
        description: data.description,
        location: data.location,
        start: {
          dateTime: data.startTime.toISOString(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: data.endTime.toISOString(),
          timeZone: 'America/Denver',
        },
      };

      if (data.attendeeEmails && data.attendeeEmails.length > 0) {
        event.attendees = data.attendeeEmails.map(email => ({ email }));
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: 'all',
      });

      console.log('Google Calendar event created:', response.data.id);
      return response.data.id || null;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, data: {
    summary?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    location?: string;
    attendeeEmails?: string[];
  }): Promise<boolean> {
    const calendar = await this.getAuthenticatedClient();
    if (!calendar) {
      console.log('Google Calendar: Not authenticated, skipping event update');
      return false;
    }

    const creds = await this.getCredentials();
    const calendarId = creds?.calendarId || 'primary';

    try {
      const event: calendar_v3.Schema$Event = {};
      
      if (data.summary !== undefined) event.summary = data.summary;
      if (data.description !== undefined) event.description = data.description;
      if (data.location !== undefined) event.location = data.location;
      
      if (data.startTime) {
        event.start = {
          dateTime: data.startTime.toISOString(),
          timeZone: 'America/Denver',
        };
      }
      
      if (data.endTime) {
        event.end = {
          dateTime: data.endTime.toISOString(),
          timeZone: 'America/Denver',
        };
      }

      if (data.attendeeEmails && data.attendeeEmails.length > 0) {
        event.attendees = data.attendeeEmails.map(email => ({ email }));
      }

      await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      console.log('Google Calendar event updated:', eventId);
      return true;
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error);
      return false;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    const calendar = await this.getAuthenticatedClient();
    if (!calendar) {
      console.log('Google Calendar: Not authenticated, skipping event deletion');
      return false;
    }

    const creds = await this.getCredentials();
    const calendarId = creds?.calendarId || 'primary';

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });

      console.log('Google Calendar event deleted:', eventId);
      return true;
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error);
      return false;
    }
  }

  async updateAppointmentGoogleEventId(appointmentId: string, googleEventId: string | null): Promise<void> {
    await db.update(instructorAppointments)
      .set({ 
        googleEventId,
        updatedAt: sql`now()`,
      })
      .where(eq(instructorAppointments.id, appointmentId));
  }
}

export const googleCalendarService = new GoogleCalendarService();
