import { db } from '../db';
import { instructorGoogleCredentials, instructorAvailabilityOverrides, instructorAppointments, instructorWeeklyTemplates, users } from '@shared/schema';
import { eq, and, gte, lte, lt, or } from 'drizzle-orm';
import { google, calendar_v3 } from 'googleapis';

const AUTH_BROKER_URL = process.env.AUTH_SERVICE_URL || 'https://auth.instructorops.com';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export interface FreeSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface BusyPeriod {
  start: Date;
  end: Date;
  source: 'google' | 'manual_block' | 'existing_booking';
}

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class CalendarService {
  /**
   * Get a valid access token for the instructor.
   * If the token is expired, refresh it via the central auth broker.
   */
  async getValidAccessToken(instructorId: string): Promise<string> {
    const credentials = await db.query.instructorGoogleCredentials.findFirst({
      where: eq(instructorGoogleCredentials.instructorId, instructorId),
    });

    if (!credentials) {
      throw new Error(`No Google credentials found for instructor ${instructorId}`);
    }

    const now = Date.now();
    const tokenExpiryTime = new Date(credentials.tokenExpiry).getTime();
    const bufferMs = 5 * 60 * 1000;

    if (tokenExpiryTime > now + bufferMs) {
      return credentials.accessToken;
    }

    if (!INTERNAL_API_KEY) {
      throw new Error('INTERNAL_API_KEY is not configured');
    }

    try {
      const response = await fetch(`${AUTH_BROKER_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({
          refresh_token: credentials.refreshToken,
          instructor_id: instructorId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const tokenData: TokenRefreshResponse = await response.json();

      const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      await db.update(instructorGoogleCredentials)
        .set({
          accessToken: tokenData.access_token,
          tokenExpiry: newExpiry,
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      return tokenData.access_token;
    } catch (error) {
      console.error('Error refreshing Google access token:', error);
      throw new Error('Failed to refresh Google access token');
    }
  }

  /**
   * Get an authenticated Google Calendar client for the instructor
   */
  async getCalendarClient(instructorId: string): Promise<calendar_v3.Calendar> {
    const accessToken = await this.getValidAccessToken(instructorId);
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Fetch busy periods from Google Calendar using freeBusy query
   */
  async getGoogleBusyPeriods(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusyPeriod[]> {
    try {
      const calendar = await this.getCalendarClient(instructorId);
      
      const credentials = await db.query.instructorGoogleCredentials.findFirst({
        where: eq(instructorGoogleCredentials.instructorId, instructorId),
      });

      const calendarId = credentials?.primaryCalendarId || 'primary';

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busyPeriods: BusyPeriod[] = [];
      const calendars = response.data.calendars;
      
      if (calendars && calendars[calendarId] && calendars[calendarId].busy) {
        for (const period of calendars[calendarId].busy!) {
          if (period.start && period.end) {
            busyPeriods.push({
              start: new Date(period.start),
              end: new Date(period.end),
              source: 'google',
            });
          }
        }
      }

      return busyPeriods;
    } catch (error) {
      console.error('Error fetching Google busy periods:', error);
      return [];
    }
  }

  /**
   * Get manual blocks (availability overrides) from the database
   * Uses proper overlap logic: block.start < windowEnd AND block.end > windowStart
   */
  async getManualBlocks(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusyPeriod[]> {
    const overrides = await db.query.instructorAvailabilityOverrides.findMany({
      where: and(
        eq(instructorAvailabilityOverrides.instructorId, instructorId),
        lt(instructorAvailabilityOverrides.startDate, endDate),
        gte(instructorAvailabilityOverrides.endDate, startDate)
      ),
    });

    return overrides
      .filter(override => override.overrideType === 'remove' || override.overrideType === 'blackout')
      .map(override => ({
        start: new Date(override.startDate),
        end: new Date(override.endDate),
        source: 'manual_block' as const,
      }));
  }

  /**
   * Get existing bookings from the database
   * Uses proper overlap logic: booking.start < windowEnd AND booking.end > windowStart
   */
  async getExistingBookings(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusyPeriod[]> {
    const appointments = await db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        lt(instructorAppointments.startTime, endDate),
        gte(instructorAppointments.endTime, startDate)
      ),
    });

    return appointments
      .filter(apt => apt.status !== 'cancelled' && apt.status !== 'rejected')
      .map(apt => ({
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        source: 'existing_booking' as const,
      }));
  }

  /**
   * Get weekly availability templates for the instructor
   */
  async getWeeklyAvailability(instructorId: string): Promise<{ dayOfWeek: number; startTime: string; endTime: string }[]> {
    const templates = await db.query.instructorWeeklyTemplates.findMany({
      where: and(
        eq(instructorWeeklyTemplates.instructorId, instructorId),
        eq(instructorWeeklyTemplates.isActive, true)
      ),
    });

    return templates.map(t => ({
      dayOfWeek: t.dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
    }));
  }

  /**
   * Get instructor's timezone
   */
  async getInstructorTimezone(instructorId: string): Promise<string> {
    const instructor = await db.query.users.findFirst({
      where: eq(users.id, instructorId),
    });
    return instructor?.timezone || 'America/Denver';
  }

  /**
   * Merge overlapping busy periods
   */
  private mergeOverlappingPeriods(periods: BusyPeriod[]): BusyPeriod[] {
    if (periods.length === 0) return [];

    const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: BusyPeriod[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start.getTime() <= last.end.getTime()) {
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Get unified free slots by merging Google Calendar events with manual overrides
   * Returns an array of free 30-minute slots
   */
  async getUnifiedFreeSlots(
    instructorId: string,
    date: Date,
    slotDurationMinutes: number = 30
  ): Promise<FreeSlot[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      googleBusy,
      manualBlocks,
      existingBookings,
      weeklyAvailability,
      timezone
    ] = await Promise.all([
      this.getGoogleBusyPeriods(instructorId, startOfDay, endOfDay),
      this.getManualBlocks(instructorId, startOfDay, endOfDay),
      this.getExistingBookings(instructorId, startOfDay, endOfDay),
      this.getWeeklyAvailability(instructorId),
      this.getInstructorTimezone(instructorId),
    ]);

    const allBusyPeriods = this.mergeOverlappingPeriods([
      ...googleBusy,
      ...manualBlocks,
      ...existingBookings,
    ]);

    const dayOfWeek = date.getDay();
    const availabilityBlocks = weeklyAvailability.filter(a => a.dayOfWeek === dayOfWeek);

    if (availabilityBlocks.length === 0) {
      return [];
    }

    const freeSlots: FreeSlot[] = [];

    for (const block of availabilityBlocks) {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);

      const blockStart = new Date(date);
      blockStart.setHours(startHour, startMin, 0, 0);
      
      const blockEnd = new Date(date);
      blockEnd.setHours(endHour, endMin, 0, 0);

      let slotStart = new Date(blockStart);
      
      while (slotStart.getTime() + slotDurationMinutes * 60000 <= blockEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
        
        const isConflict = allBusyPeriods.some(busy => 
          slotStart.getTime() < busy.end.getTime() && 
          slotEnd.getTime() > busy.start.getTime()
        );

        if (!isConflict) {
          freeSlots.push({
            startTime: new Date(slotStart),
            endTime: new Date(slotEnd),
            durationMinutes: slotDurationMinutes,
          });
        }

        slotStart = new Date(slotStart.getTime() + slotDurationMinutes * 60000);
      }
    }

    return freeSlots;
  }

  /**
   * Create a Google Calendar event with Meet link
   */
  async createGoogleEvent(
    instructorId: string,
    summary: string,
    description: string,
    startTime: Date,
    endTime: Date,
    attendeeEmail?: string
  ): Promise<{ eventId: string; meetLink?: string }> {
    const calendar = await this.getCalendarClient(instructorId);
    
    const credentials = await db.query.instructorGoogleCredentials.findFirst({
      where: eq(instructorGoogleCredentials.instructorId, instructorId),
    });

    const calendarId = credentials?.primaryCalendarId || 'primary';

    const event: calendar_v3.Schema$Event = {
      summary,
      description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    return {
      eventId: response.data.id || '',
      meetLink: response.data.hangoutLink || undefined,
    };
  }

  /**
   * Create a manual availability block
   */
  async createManualBlock(
    instructorId: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ): Promise<void> {
    await db.insert(instructorAvailabilityOverrides).values({
      instructorId,
      overrideType: 'remove',
      startDate: startTime,
      endDate: endTime,
      startTime: startTime.toTimeString().slice(0, 8),
      endTime: endTime.toTimeString().slice(0, 8),
      reason: reason || 'Manual block',
    });
  }
}

export const calendarService = new CalendarService();
