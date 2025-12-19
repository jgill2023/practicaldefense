import { db } from '../db';
import { instructorGoogleCredentials, instructorAvailabilityOverrides, instructorAppointments, instructorWeeklyTemplates, users } from '@shared/schema';
import { eq, and, gte, lte, lt, or } from 'drizzle-orm';
import { google, calendar_v3 } from 'googleapis';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

const AUTH_BROKER_URL = (process.env.AUTH_SERVICE_URL || 'https://auth.instructorops.com').replace(/\/$/, '');
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
   * Fetches fresh tokens from the Central Auth service since tokens are managed there.
   */
  async getValidAccessToken(instructorId: string): Promise<string> {
    const credentials = await db.query.instructorGoogleCredentials.findFirst({
      where: eq(instructorGoogleCredentials.instructorId, instructorId),
    });

    if (!credentials) {
      throw new Error(`No Google credentials found for instructor ${instructorId}`);
    }

    // Check if we have placeholder tokens (managed by Central Auth)
    const isPlaceholderToken = credentials.accessToken === 'managed-by-central-auth';
    
    // If we have a real token that hasn't expired, use it
    if (!isPlaceholderToken) {
      const now = Date.now();
      const tokenExpiryTime = new Date(credentials.tokenExpiry).getTime();
      const bufferMs = 5 * 60 * 1000;

      if (tokenExpiryTime > now + bufferMs) {
        return credentials.accessToken;
      }
    }

    // Need to get fresh token from Central Auth service
    if (!INTERNAL_API_KEY) {
      throw new Error('INTERNAL_API_KEY is not configured - cannot fetch tokens from Central Auth');
    }

    try {
      // Request fresh token from Central Auth service
      const response = await fetch(`${AUTH_BROKER_URL}/api/tokens/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-instructorops-key': INTERNAL_API_KEY,
          'x-instructor-id': instructorId,
        },
        body: JSON.stringify({
          instructor_id: instructorId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CalendarService] Failed to get token from Central Auth: ${response.status} - ${errorText}`);
        throw new Error(`Token fetch failed: ${response.status} - ${errorText}`);
      }

      const tokenData: TokenRefreshResponse = await response.json();

      // Update local cache with the fresh token
      const newExpiry = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
      await db.update(instructorGoogleCredentials)
        .set({
          accessToken: tokenData.access_token,
          tokenExpiry: newExpiry,
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      return tokenData.access_token;
    } catch (error) {
      console.error('[CalendarService] Error getting access token from Central Auth:', error);
      throw new Error('Failed to get Google access token from Central Auth');
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
    } catch (error: any) {
      const status = error?.response?.status || error?.code;
      const message = error?.response?.data?.error?.message || error?.message || 'Unknown error';
      
      if (status === 403) {
        console.error(`[CalendarService] Google API 403 Forbidden for instructor ${instructorId}. ` +
          `The user may have revoked access or the token scope is insufficient. ` +
          `Error: ${message}`);
      } else if (status === 404) {
        console.error(`[CalendarService] Google API 404 Not Found for instructor ${instructorId}. ` +
          `The calendar may have been deleted or the calendar ID is invalid. ` +
          `Error: ${message}`);
      } else if (status === 401) {
        console.error(`[CalendarService] Google API 401 Unauthorized for instructor ${instructorId}. ` +
          `The access token may have been revoked by the user. ` +
          `Error: ${message}`);
      } else {
        console.error(`[CalendarService] Error fetching Google busy periods for instructor ${instructorId}:`, error);
      }
      
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
   * Merge overlapping busy periods into a consolidated list
   * All timestamps are handled as UTC milliseconds
   */
  private mergeOverlappingPeriods(periods: BusyPeriod[]): BusyPeriod[] {
    if (periods.length === 0) return [];

    const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: BusyPeriod[] = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start.getTime() <= last.end.getTime()) {
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        merged.push({ ...current });
      }
    }

    return merged;
  }

  /**
   * Interval subtraction algorithm: Given a base interval [baseStart, baseEnd] and
   * a list of busy intervals, return the remaining free intervals.
   * All operations use UTC timestamps.
   */
  private subtractBusyFromBase(
    baseStartMs: number,
    baseEndMs: number,
    busyPeriods: BusyPeriod[]
  ): Array<{ start: number; end: number }> {
    const freeIntervals: Array<{ start: number; end: number }> = [];
    let currentStart = baseStartMs;

    const relevantBusy = busyPeriods
      .filter(b => b.start.getTime() < baseEndMs && b.end.getTime() > baseStartMs)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const busy of relevantBusy) {
      const busyStart = busy.start.getTime();
      const busyEnd = busy.end.getTime();

      if (busyStart > currentStart) {
        freeIntervals.push({
          start: currentStart,
          end: Math.min(busyStart, baseEndMs),
        });
      }

      currentStart = Math.max(currentStart, busyEnd);

      if (currentStart >= baseEndMs) break;
    }

    if (currentStart < baseEndMs) {
      freeIntervals.push({ start: currentStart, end: baseEndMs });
    }

    return freeIntervals;
  }

  /**
   * Get unified free slots by merging Google Calendar events with manual overrides.
   * 
   * Logic:
   * 1. Fetch Base Hours: Use weekly templates or default 9 AM - 5 PM in instructor's timezone
   * 2. Fetch Google Busy: Query Google's freeBusy.query for the specific date
   * 3. Fetch Internal Blocks: Query instructor_availability_overrides and instructor_appointments
   * 4. Merge & Subtract: Combine all busy blocks, use interval-subtraction to find gaps
   * 5. Slotify: Divide remaining gaps into slots based on duration with optional buffer
   * 
   * Uses date-fns-tz for proper timezone handling - converts instructor's local times to UTC.
   * 
   * @param instructorId - The instructor's ID
   * @param date - The date to check availability for
   * @param slotDurationMinutes - Duration of each slot (default 30)
   * @param bufferMinutes - Mandatory gap between back-to-back slots (default 0)
   */
  async getUnifiedFreeSlots(
    instructorId: string,
    date: Date,
    slotDurationMinutes: number = 30,
    bufferMinutes: number = 0
  ): Promise<FreeSlot[]> {
    const timezone = await this.getInstructorTimezone(instructorId);
    
    const dateStr = date.toISOString().split('T')[0];
    
    const startOfDayUTC = fromZonedTime(new Date(`${dateStr}T00:00:00`), timezone);
    const endOfDayUTC = fromZonedTime(new Date(`${dateStr}T23:59:59`), timezone);

    const [
      googleBusy,
      manualBlocks,
      existingBookings,
      weeklyAvailability,
    ] = await Promise.all([
      this.getGoogleBusyPeriods(instructorId, startOfDayUTC, endOfDayUTC),
      this.getManualBlocks(instructorId, startOfDayUTC, endOfDayUTC),
      this.getExistingBookings(instructorId, startOfDayUTC, endOfDayUTC),
      this.getWeeklyAvailability(instructorId),
    ]);

    const allBusyPeriods = this.mergeOverlappingPeriods([
      ...googleBusy,
      ...manualBlocks,
      ...existingBookings,
    ]);

    const targetLocalDate = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = targetLocalDate.getDay();
    let baseHoursBlocks = weeklyAvailability.filter(a => a.dayOfWeek === dayOfWeek);

    if (baseHoursBlocks.length === 0) {
      baseHoursBlocks = [{ dayOfWeek, startTime: '09:00:00', endTime: '17:00:00' }];
    }

    const freeSlots: FreeSlot[] = [];

    for (const block of baseHoursBlocks) {
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);

      const blockStartLocal = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`);
      const blockEndLocal = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`);
      
      const blockStartUTC = fromZonedTime(blockStartLocal, timezone);
      const blockEndUTC = fromZonedTime(blockEndLocal, timezone);

      const freeIntervals = this.subtractBusyFromBase(
        blockStartUTC.getTime(),
        blockEndUTC.getTime(),
        allBusyPeriods
      );

      for (const interval of freeIntervals) {
        let slotStartMs = interval.start;
        const slotDurationMs = slotDurationMinutes * 60 * 1000;
        const bufferMs = bufferMinutes * 60 * 1000;
        const slotIncrementMs = slotDurationMs + bufferMs;

        while (slotStartMs + slotDurationMs <= interval.end) {
          const slotEndMs = slotStartMs + slotDurationMs;

          freeSlots.push({
            startTime: new Date(slotStartMs),
            endTime: new Date(slotEndMs),
            durationMinutes: slotDurationMinutes,
          });

          slotStartMs += slotIncrementMs;
        }
      }
    }

    return freeSlots;
  }

  /**
   * Helper function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a Google Calendar event with Meet link.
   * Includes retry logic for Meet link if not immediately available.
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

    const eventId = response.data.id || '';
    let meetLink = response.data.hangoutLink || undefined;

    if (!meetLink && eventId) {
      console.log(`[CalendarService] Meet link not immediately available for event ${eventId}, retrying in 1.5s...`);
      
      await this.delay(1500);
      
      try {
        const retryResponse = await calendar.events.get({
          calendarId,
          eventId,
        });
        
        meetLink = retryResponse.data.hangoutLink || undefined;
        
        if (meetLink) {
          console.log(`[CalendarService] Meet link retrieved on retry for event ${eventId}`);
        } else {
          console.warn(`[CalendarService] Meet link still not available after retry for event ${eventId}`);
        }
      } catch (retryError) {
        console.error(`[CalendarService] Error retrying to fetch Meet link for event ${eventId}:`, retryError);
      }
    }

    return {
      eventId,
      meetLink,
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

  /**
   * Fetch Google Calendar events via Central Auth service
   * The Central Auth service manages the OAuth tokens and makes the Google API calls
   */
  async getGoogleCalendarEvents(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    isAllDay: boolean;
    source: 'google';
  }[]> {
    try {
      if (!INTERNAL_API_KEY) {
        console.error('[CalendarService] INTERNAL_API_KEY not configured - cannot fetch from Central Auth');
        return [];
      }

      // Fetch events from Central Auth service which manages the Google OAuth tokens
      const url = new URL(`${AUTH_BROKER_URL}/api/calendars/events`);
      url.searchParams.set('instructorId', instructorId);
      url.searchParams.set('timeMin', startDate.toISOString());
      url.searchParams.set('timeMax', endDate.toISOString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-instructorops-key': INTERNAL_API_KEY,
        },
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || '';
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CalendarService] Central Auth events fetch failed (${response.status}): ${errorText.substring(0, 200)}`);
        
        // Check if re-auth is needed (only if JSON response)
        if (contentType.includes('application/json')) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.requiresAuth || errorData.requiresReauth) {
              console.warn(`[CalendarService] Instructor ${instructorId} needs to reconnect Google Calendar`);
            }
          } catch (e) {
            // Not valid JSON, ignore
          }
        }
        return [];
      }

      // If response is not JSON (e.g., HTML error page), return empty
      if (!contentType.includes('application/json')) {
        console.warn(`[CalendarService] Central Auth returned non-JSON response (${contentType})`);
        return [];
      }

      const data = await response.json();
      const events = data.events || data || [];
      
      console.log(`[CalendarService] Received ${events.length} events from Central Auth`);
      if (events.length > 0) {
        console.log(`[CalendarService] Sample event structure:`, JSON.stringify(events[0], null, 2));
      }
      
      return events.map((event: any) => {
        // Parse start date - handle multiple formats from Google Calendar API
        // Format 1: { date: '2025-12-18' } - all-day event
        // Format 2: { dateTime: '2025-12-19T12:00:00-07:00' } - timed event
        // Format 3: Direct string (startTime/endTime from Central Auth)
        
        let startStr: string | undefined;
        let endStr: string | undefined;
        let isAllDay = false;
        
        // Check for Google Calendar API nested structure
        if (event.start?.date) {
          // All-day event: date only (e.g., '2025-12-18')
          // Add time component for proper Date parsing
          startStr = event.start.date + 'T00:00:00';
          isAllDay = true;
        } else if (event.start?.dateTime) {
          // Timed event with timezone (e.g., '2025-12-19T12:00:00-07:00')
          startStr = event.start.dateTime;
        } else if (typeof event.start === 'string') {
          // Direct string format
          startStr = event.start;
        } else if (event.startTime) {
          // Fallback: startTime field
          startStr = event.startTime;
        }
        
        if (event.end?.date) {
          endStr = event.end.date + 'T00:00:00';
        } else if (event.end?.dateTime) {
          endStr = event.end.dateTime;
        } else if (typeof event.end === 'string') {
          endStr = event.end;
        } else if (event.endTime) {
          endStr = event.endTime;
        }
        
        const start = startStr ? new Date(startStr) : new Date(NaN);
        const end = endStr ? new Date(endStr) : new Date(NaN);
        
        // Log if dates are invalid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn(`[CalendarService] Invalid date for event "${event.summary || event.title}":`, {
            startStr, endStr, originalStart: event.start, originalEnd: event.end
          });
        }

        return {
          id: event.id || event.googleEventId || '',
          title: event.summary || event.title || '(No title)',
          description: event.description || undefined,
          start,
          end,
          location: event.location || undefined,
          isAllDay,
          source: 'google' as const,
        };
      });
    } catch (error: any) {
      console.error(`[CalendarService] Error fetching Google Calendar events from Central Auth for instructor ${instructorId}:`, error);
      return [];
    }
  }

  /**
   * Get all appointments for the instructor with details
   */
  async getInstructorAppointments(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    studentName: string;
    studentEmail: string;
    status: string;
    appointmentTypeName?: string;
    source: 'appointment';
  }[]> {
    const appointments = await db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        lt(instructorAppointments.startTime, endDate),
        gte(instructorAppointments.endTime, startDate)
      ),
      with: {
        appointmentType: true,
      },
    });

    return appointments.map(apt => ({
      id: apt.id,
      title: apt.appointmentType?.name || 'Appointment',
      description: apt.studentNotes || undefined,
      start: new Date(apt.startTime),
      end: new Date(apt.endTime),
      studentName: apt.studentName,
      studentEmail: apt.studentEmail,
      status: apt.status,
      appointmentTypeName: apt.appointmentType?.name,
      source: 'appointment' as const,
    }));
  }
}

export const calendarService = new CalendarService();
