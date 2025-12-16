import { google, calendar_v3 } from 'googleapis';
import { storage } from '../storage';
import type { 
  InstructorGoogleCredentials, 
  InstructorCalendar,
  GoogleCalendarBusyEvent,
  GoogleCalendarListItem,
  InsertBlockedTimeCache,
  User
} from '@shared/schema';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

const CACHE_TTL_HOURS = 1;

class InstructorGoogleCalendarService {
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

  isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  async isInstructorConnected(instructorId: string): Promise<boolean> {
    const creds = await storage.getInstructorGoogleCredentials(instructorId);
    return !!creds;
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
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

  async saveInstructorCredentials(instructorId: string, data: {
    accessToken: string;
    refreshToken: string;
    tokenExpiry: Date;
    primaryCalendarId?: string;
  }): Promise<InstructorGoogleCredentials> {
    const creds = await storage.saveInstructorGoogleCredentials({
      instructorId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiry: data.tokenExpiry,
      primaryCalendarId: data.primaryCalendarId || 'primary',
    });

    await storage.updateGoogleCalendarSettings(instructorId, {
      googleCalendarConnected: true,
    });

    return creds;
  }

  async disconnectInstructor(instructorId: string): Promise<void> {
    await storage.deleteInstructorGoogleCredentials(instructorId);
    await storage.deleteAllInstructorCalendars(instructorId);
    await storage.clearBlockedTimeCache(instructorId);
    await storage.updateGoogleCalendarSettings(instructorId, {
      googleCalendarConnected: false,
    });
  }

  private async getAuthenticatedClient(instructorId: string): Promise<calendar_v3.Calendar | null> {
    const creds = await storage.getInstructorGoogleCredentials(instructorId);
    if (!creds) {
      console.log(`Google Calendar: No credentials for instructor ${instructorId}`);
      return null;
    }

    this.oauth2Client.setCredentials({
      access_token: creds.accessToken,
      refresh_token: creds.refreshToken,
      expiry_date: creds.tokenExpiry?.getTime(),
    });

    const now = new Date();
    if (creds.tokenExpiry && creds.tokenExpiry < now) {
      try {
        console.log(`Google Calendar: Refreshing token for instructor ${instructorId}`);
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        await storage.updateInstructorGoogleCredentials(instructorId, {
          accessToken: credentials.access_token!,
          tokenExpiry: new Date(credentials.expiry_date!),
        });
        
        this.oauth2Client.setCredentials(credentials);
      } catch (error: any) {
        console.error(`Failed to refresh Google Calendar token for instructor ${instructorId}:`, error);
        
        if (error.message?.includes('invalid_grant') || error.message?.includes('Token has been revoked')) {
          await this.disconnectInstructor(instructorId);
          throw new Error('GOOGLE_CALENDAR_ACCESS_REVOKED');
        }
        
        return null;
      }
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async listCalendars(instructorId: string): Promise<GoogleCalendarListItem[]> {
    const calendar = await this.getAuthenticatedClient(instructorId);
    if (!calendar) {
      return [];
    }

    try {
      const response = await calendar.calendarList.list();
      const items = response.data.items || [];
      
      return items.map(item => ({
        id: item.id!,
        name: item.summary || item.id!,
        color: item.backgroundColor || undefined,
        isPrimary: item.primary === true,
        accessRole: item.accessRole || 'reader',
      }));
    } catch (error) {
      console.error(`Failed to list calendars for instructor ${instructorId}:`, error);
      return [];
    }
  }

  async syncInstructorCalendars(instructorId: string): Promise<InstructorCalendar[]> {
    const calendarList = await this.listCalendars(instructorId);
    
    const savedCalendars: InstructorCalendar[] = [];
    for (const cal of calendarList) {
      const saved = await storage.saveInstructorCalendar({
        instructorId,
        calendarId: cal.id,
        calendarName: cal.name,
        calendarColor: cal.color,
        blocksAvailability: cal.isPrimary,
        isPrimary: cal.isPrimary,
      });
      savedCalendars.push(saved);
    }
    
    return savedCalendars;
  }

  async getBusyEvents(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<GoogleCalendarBusyEvent[]> {
    const calendar = await this.getAuthenticatedClient(instructorId);
    if (!calendar) {
      return [];
    }

    const blockingCalendars = await storage.getBlockingCalendars(instructorId);
    if (blockingCalendars.length === 0) {
      return [];
    }

    const busyEvents: GoogleCalendarBusyEvent[] = [];

    for (const calendarConfig of blockingCalendars) {
      try {
        const response = await calendar.events.list({
          calendarId: calendarConfig.calendarId,
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        });

        const events = response.data.items || [];
        
        for (const event of events) {
          const showAs = (event.transparency || 'opaque').toLowerCase();
          if (showAs === 'transparent') continue;

          const isAllDay = !event.start?.dateTime;
          let start: Date;
          let end: Date;

          if (isAllDay) {
            start = new Date(event.start?.date + 'T00:00:00Z');
            end = new Date(event.end?.date + 'T00:00:00Z');
          } else {
            start = new Date(event.start?.dateTime!);
            end = new Date(event.end?.dateTime!);
          }

          busyEvents.push({
            id: event.id!,
            calendarId: calendarConfig.calendarId,
            summary: event.summary,
            start,
            end,
            isAllDay,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch events from calendar ${calendarConfig.calendarId}:`, error);
      }
    }

    return busyEvents;
  }

  async refreshBlockedTimeCache(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    const busyEvents = await this.getBusyEvents(instructorId, startTime, endTime);
    
    await storage.clearBlockedTimeCache(instructorId);
    
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    
    const cacheEntries: InsertBlockedTimeCache[] = busyEvents.map(event => ({
      instructorId,
      startTimeUtc: event.start,
      endTimeUtc: event.end,
      source: 'google' as const,
      calendarEventId: event.id,
      calendarId: event.calendarId,
      isAllDay: event.isAllDay,
      eventSummary: event.summary,
      expiresAt,
    }));
    
    await storage.saveBlockedTimeCache(cacheEntries);
  }

  async getCachedBlockedTimes(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<GoogleCalendarBusyEvent[]> {
    const cached = await storage.getBlockedTimeCache(instructorId, startTime, endTime);
    
    return cached.map(entry => ({
      id: entry.calendarEventId || entry.id,
      calendarId: entry.calendarId || '',
      summary: entry.eventSummary || undefined,
      start: entry.startTimeUtc,
      end: entry.endTimeUtc,
      isAllDay: entry.isAllDay,
    }));
  }

  async checkConflict(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ hasConflict: boolean; conflictingEvent?: GoogleCalendarBusyEvent }> {
    const busyEvents = await this.getBusyEvents(instructorId, startTime, endTime);
    
    for (const event of busyEvents) {
      const eventStart = event.start.getTime();
      const eventEnd = event.end.getTime();
      const slotStart = startTime.getTime();
      const slotEnd = endTime.getTime();
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        return { hasConflict: true, conflictingEvent: event };
      }
    }
    
    return { hasConflict: false };
  }

  async createEvent(
    instructorId: string,
    data: {
      summary: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      location?: string;
      attendeeEmails?: string[];
    }
  ): Promise<string | null> {
    const calendar = await this.getAuthenticatedClient(instructorId);
    if (!calendar) {
      console.log(`Google Calendar: Not authenticated for instructor ${instructorId}`);
      return null;
    }

    const creds = await storage.getInstructorGoogleCredentials(instructorId);
    const calendarId = creds?.primaryCalendarId || 'primary';
    
    const instructor = await storage.getUser(instructorId);
    const timezone = instructor?.timezone || 'America/Denver';

    try {
      const event: calendar_v3.Schema$Event = {
        summary: data.summary,
        description: data.description,
        location: data.location,
        start: {
          dateTime: data.startTime.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: data.endTime.toISOString(),
          timeZone: timezone,
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

      console.log(`Google Calendar event created for instructor ${instructorId}:`, response.data.id);
      return response.data.id || null;
    } catch (error) {
      console.error(`Failed to create Google Calendar event for instructor ${instructorId}:`, error);
      return null;
    }
  }

  async updateEvent(
    instructorId: string,
    eventId: string,
    data: {
      summary?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      location?: string;
      attendeeEmails?: string[];
    }
  ): Promise<boolean> {
    const calendar = await this.getAuthenticatedClient(instructorId);
    if (!calendar) {
      return false;
    }

    const creds = await storage.getInstructorGoogleCredentials(instructorId);
    const calendarId = creds?.primaryCalendarId || 'primary';
    
    const instructor = await storage.getUser(instructorId);
    const timezone = instructor?.timezone || 'America/Denver';

    try {
      const event: calendar_v3.Schema$Event = {};
      
      if (data.summary !== undefined) event.summary = data.summary;
      if (data.description !== undefined) event.description = data.description;
      if (data.location !== undefined) event.location = data.location;
      
      if (data.startTime) {
        event.start = {
          dateTime: data.startTime.toISOString(),
          timeZone: timezone,
        };
      }
      
      if (data.endTime) {
        event.end = {
          dateTime: data.endTime.toISOString(),
          timeZone: timezone,
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

      console.log(`Google Calendar event updated for instructor ${instructorId}:`, eventId);
      return true;
    } catch (error) {
      console.error(`Failed to update Google Calendar event for instructor ${instructorId}:`, error);
      return false;
    }
  }

  async deleteEvent(instructorId: string, eventId: string): Promise<boolean> {
    const calendar = await this.getAuthenticatedClient(instructorId);
    if (!calendar) {
      return false;
    }

    const creds = await storage.getInstructorGoogleCredentials(instructorId);
    const calendarId = creds?.primaryCalendarId || 'primary';

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });

      console.log(`Google Calendar event deleted for instructor ${instructorId}:`, eventId);
      return true;
    } catch (error) {
      console.error(`Failed to delete Google Calendar event for instructor ${instructorId}:`, error);
      return false;
    }
  }

  async getInstructorStatus(instructorId: string): Promise<{
    configured: boolean;
    connected: boolean;
    syncEnabled: boolean;
    blockingEnabled: boolean;
    calendars: InstructorCalendar[];
    primaryCalendarId?: string;
    timezone?: string;
  }> {
    const configured = this.isConfigured();
    const connected = await this.isInstructorConnected(instructorId);
    
    const instructor = await storage.getUser(instructorId);
    const calendars = connected ? await storage.getInstructorCalendars(instructorId) : [];
    const creds = connected ? await storage.getInstructorGoogleCredentials(instructorId) : null;
    
    return {
      configured,
      connected,
      syncEnabled: instructor?.googleCalendarSyncEnabled ?? true,
      blockingEnabled: instructor?.googleCalendarBlockingEnabled ?? true,
      calendars,
      primaryCalendarId: creds?.primaryCalendarId || 'primary',
      timezone: instructor?.timezone || 'America/Denver',
    };
  }

  async updateInstructorSettings(
    instructorId: string,
    settings: {
      syncEnabled?: boolean;
      blockingEnabled?: boolean;
      primaryCalendarId?: string;
      timezone?: string;
    }
  ): Promise<User> {
    const updateData: any = {};
    
    if (settings.syncEnabled !== undefined) {
      updateData.googleCalendarSyncEnabled = settings.syncEnabled;
    }
    if (settings.blockingEnabled !== undefined) {
      updateData.googleCalendarBlockingEnabled = settings.blockingEnabled;
    }
    if (settings.timezone !== undefined) {
      updateData.timezone = settings.timezone;
    }
    
    if (settings.primaryCalendarId !== undefined) {
      await storage.updateInstructorGoogleCredentials(instructorId, {
        primaryCalendarId: settings.primaryCalendarId,
      });
    }
    
    return storage.updateGoogleCalendarSettings(instructorId, updateData);
  }

  async updateCalendarBlocking(
    instructorId: string,
    calendarId: string,
    blocksAvailability: boolean
  ): Promise<InstructorCalendar> {
    const calendars = await storage.getInstructorCalendars(instructorId);
    const calendar = calendars.find(c => c.calendarId === calendarId);
    
    if (!calendar) {
      throw new Error('Calendar not found');
    }
    
    return storage.updateInstructorCalendar(calendar.id, { blocksAvailability });
  }
}

export const instructorGoogleCalendarService = new InstructorGoogleCalendarService();
