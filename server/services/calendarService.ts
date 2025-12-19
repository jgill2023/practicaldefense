import { db } from '../db';
import { instructorGoogleCredentials, instructorAvailabilityOverrides, instructorAppointments, instructorWeeklyTemplates, users } from '@shared/schema';
import { eq, and, gte, lte, lt, gt, or } from 'drizzle-orm';
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

    console.log(`[CalendarService] Fetching token from Central Auth:`, {
      url: `${AUTH_BROKER_URL}/api/tokens/get`,
      instructorId,
      hasApiKey: !!INTERNAL_API_KEY,
      apiKeyPrefix: INTERNAL_API_KEY?.substring(0, 8) + '...',
    });

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

      // Read the full response text first to diagnose HTML vs JSON issues
      const responseText = await response.text();
      console.log(`[CalendarService] Auth Broker Response (status ${response.status}):`, responseText.substring(0, 500));

      if (!response.ok) {
        console.error(`[CalendarService] Failed to get token from Central Auth: ${response.status} - ${responseText}`);
        throw new Error(`Token fetch failed: ${response.status} - ${responseText}`);
      }

      // Try to parse as JSON
      let tokenData: TokenRefreshResponse;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[CalendarService] Response is not valid JSON:`, responseText.substring(0, 500));
        throw new Error(`Invalid JSON response from Central Auth: ${responseText.substring(0, 200)}`);
      }

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
    console.log(`[CalendarService] getExistingBookings query params:`, {
      instructorId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const appointments = await db.query.instructorAppointments.findMany({
      where: and(
        eq(instructorAppointments.instructorId, instructorId),
        lt(instructorAppointments.startTime, endDate),
        gt(instructorAppointments.endTime, startDate)
      ),
    });

    console.log(`[CalendarService] Found ${appointments.length} total appointments for instructor ${instructorId}`);
    
    const filtered = appointments.filter(apt => apt.status !== 'cancelled' && apt.status !== 'rejected');
    
    console.log(`[CalendarService] Found ${filtered.length} existing bookings (non-cancelled) for date range`, {
      dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      bookings: filtered.map(apt => ({
        id: apt.id,
        status: apt.status,
        startTime: apt.startTime,
        endTime: apt.endTime,
      })),
    });

    return filtered.map(apt => ({
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
   * All operations use UTC timestamps (milliseconds since epoch).
   */
  private subtractBusyFromBase(
    baseStartMs: number,
    baseEndMs: number,
    busyPeriods: BusyPeriod[]
  ): Array<{ start: number; end: number }> {
    const freeIntervals: Array<{ start: number; end: number }> = [];
    let currentStart = baseStartMs;

    console.log(`[CalendarService] subtractBusyFromBase - Base interval: ${new Date(baseStartMs).toISOString()} to ${new Date(baseEndMs).toISOString()}`);

    const relevantBusy = busyPeriods
      .filter(b => b.start.getTime() < baseEndMs && b.end.getTime() > baseStartMs)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    console.log(`[CalendarService] subtractBusyFromBase - Relevant busy periods: ${relevantBusy.length}`, 
      relevantBusy.map(b => ({
        startMs: b.start.getTime(),
        endMs: b.end.getTime(),
        startUTC: b.start.toISOString(),
        endUTC: b.end.toISOString(),
        source: b.source,
      }))
    );

    for (const busy of relevantBusy) {
      const busyStart = busy.start.getTime();
      const busyEnd = busy.end.getTime();

      console.log(`[CalendarService] Processing busy: ${busy.start.toISOString()} to ${busy.end.toISOString()} (source: ${busy.source}), currentStart: ${new Date(currentStart).toISOString()}`);

      if (busyStart > currentStart) {
        const freeEnd = Math.min(busyStart, baseEndMs);
        console.log(`[CalendarService] Adding free interval: ${new Date(currentStart).toISOString()} to ${new Date(freeEnd).toISOString()}`);
        freeIntervals.push({
          start: currentStart,
          end: freeEnd,
        });
      }

      currentStart = Math.max(currentStart, busyEnd);
      console.log(`[CalendarService] Updated currentStart to: ${new Date(currentStart).toISOString()}`);

      if (currentStart >= baseEndMs) break;
    }

    if (currentStart < baseEndMs) {
      console.log(`[CalendarService] Adding final free interval: ${new Date(currentStart).toISOString()} to ${new Date(baseEndMs).toISOString()}`);
      freeIntervals.push({ start: currentStart, end: baseEndMs });
    }

    console.log(`[CalendarService] subtractBusyFromBase - Result: ${freeIntervals.length} free intervals`);
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
    
    // CRITICAL: Use format() to get the date string in instructor's timezone
    // Do NOT use date.toISOString().split('T')[0] as that converts to UTC first,
    // which can shift the date by a day (e.g., Dec 19 11PM MST -> Dec 20 in UTC)
    const dateStr = format(toZonedTime(date, timezone), 'yyyy-MM-dd', { timeZone: timezone });
    
    console.log(`[CalendarService] Input date: ${date.toISOString()}, formatted in ${timezone}: ${dateStr}`);
    
    // Convert instructor's local day boundaries to UTC
    // Important: Use space separator (not 'T') for consistent parsing across environments
    const startOfDayUTC = fromZonedTime(`${dateStr} 00:00:00`, timezone);
    const endOfDayUTC = fromZonedTime(`${dateStr} 23:59:59`, timezone);
    
    console.log(`[CalendarService] Day boundary conversion for ${dateStr}:`, {
      timezone,
      startOfDayUTC: startOfDayUTC.toISOString(),
      startOfDayMs: startOfDayUTC.getTime(),
      endOfDayUTC: endOfDayUTC.toISOString(),
      endOfDayMs: endOfDayUTC.getTime(),
    });

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

    console.log(`[CalendarService] getUnifiedFreeSlots - Sources for ${dateStr}:`, {
      googleBusy: googleBusy.length,
      manualBlocks: manualBlocks.length,
      existingBookings: existingBookings.length,
      timezone,
    });

    // Convert existing bookings to instructor's timezone for proper comparison
    // The database stores UTC, so we use toZonedTime to interpret in instructor's local time
    const existingBookingsInTz = existingBookings.map(booking => {
      const startZoned = toZonedTime(booking.start, timezone);
      const endZoned = toZonedTime(booking.end, timezone);
      console.log(`[CalendarService] Booking conversion - UTC: ${booking.start.toISOString()} -> Local(${timezone}): ${format(startZoned, 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone })}`);
      return {
        ...booking,
        start: booking.start, // Keep as UTC for millisecond comparison
        end: booking.end,     // Keep as UTC for millisecond comparison
        _localStart: startZoned, // For debugging
        _localEnd: endZoned,     // For debugging
      };
    });

    const allBusyPeriods = this.mergeOverlappingPeriods([
      ...googleBusy,
      ...manualBlocks,
      ...existingBookingsInTz,
    ]);

    console.log(`[CalendarService] Consolidated ${allBusyPeriods.length} busy periods (all in UTC ms):`, 
      allBusyPeriods.map(p => ({
        startUTC: p.start.toISOString(),
        endUTC: p.end.toISOString(),
        startMs: p.start.getTime(),
        endMs: p.end.getTime(),
        startLocal: format(toZonedTime(p.start, timezone), 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }),
        endLocal: format(toZonedTime(p.end, timezone), 'yyyy-MM-dd HH:mm:ss', { timeZone: timezone }),
        source: p.source,
      }))
    );

    // Calculate day of week directly from the dateStr (which is already in instructor's timezone)
    // Parse the date components directly to avoid any timezone conversion issues
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create a date at noon in instructor's timezone to determine day of week
    // Using noon avoids any DST edge cases at midnight
    const noonInTz = fromZonedTime(`${dateStr} 12:00:00`, timezone);
    const dayOfWeek = noonInTz.getUTCDay(); // Use getUTCDay() since noonInTz is now a UTC timestamp
    console.log(`[CalendarService] Day of week calculation:`, {
      dateStr,
      timezone,
      noonInTzUTC: noonInTz.toISOString(),
      dayOfWeek,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
    });
    
    let baseHoursBlocks = weeklyAvailability.filter(a => a.dayOfWeek === dayOfWeek);

    if (baseHoursBlocks.length === 0) {
      baseHoursBlocks = [{ dayOfWeek, startTime: '09:00:00', endTime: '17:00:00' }];
    }

    const freeSlots: FreeSlot[] = [];

    for (const block of baseHoursBlocks) {
      // Parse the time components from the weekly template
      const [startHour, startMin] = block.startTime.split(':').map(Number);
      const [endHour, endMin] = block.endTime.split(':').map(Number);

      // Build datetime strings in instructor's local timezone format
      // Important: Pass strings directly to fromZonedTime, NOT Date objects
      // Using Date objects would interpret in server's timezone, not instructor's
      const startTimeStr = `${dateStr} ${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
      const endTimeStr = `${dateStr} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
      
      // Convert instructor's local time to UTC for comparison with database timestamps
      const blockStartUTC = fromZonedTime(startTimeStr, timezone);
      const blockEndUTC = fromZonedTime(endTimeStr, timezone);

      console.log(`[CalendarService] Base availability block conversion:`, {
        instructorLocalStart: startTimeStr,
        instructorLocalEnd: endTimeStr,
        timezone,
        blockStartUTC: blockStartUTC.toISOString(),
        blockEndUTC: blockEndUTC.toISOString(),
        blockStartMs: blockStartUTC.getTime(),
        blockEndMs: blockEndUTC.getTime(),
      });

      const freeIntervals = this.subtractBusyFromBase(
        blockStartUTC.getTime(),
        blockEndUTC.getTime(),
        allBusyPeriods
      );

      console.log(`[CalendarService] Processing ${freeIntervals.length} free intervals for block ${block.startTime}-${block.endTime}`);
      
      for (const interval of freeIntervals) {
        console.log(`[CalendarService] Free interval: ${new Date(interval.start).toISOString()} to ${new Date(interval.end).toISOString()}`);
        
        let slotStartMs = interval.start;
        const slotDurationMs = slotDurationMinutes * 60 * 1000;
        const bufferMs = bufferMinutes * 60 * 1000;
        const slotIncrementMs = slotDurationMs + bufferMs;

        while (slotStartMs + slotDurationMs <= interval.end) {
          const slotEndMs = slotStartMs + slotDurationMs;
          const slotStart = new Date(slotStartMs);
          const slotEnd = new Date(slotEndMs);
          
          // Millisecond comparison logging - prove if we're comparing numbers that are hours apart
          for (const busy of allBusyPeriods) {
            const busyStartMs = busy.start.getTime();
            const busyEndMs = busy.end.getTime();
            const overlaps = slotStartMs < busyEndMs && slotEndMs > busyStartMs;
            const timeDiffMs = slotStartMs - busyStartMs;
            const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
            
            // Log comparison for slots near busy periods (within 12 hours)
            if (Math.abs(timeDiffHours) < 12) {
              console.log(`[CalendarService] Comparing Slot (ms): ${slotStartMs} to Busy (ms): ${busyStartMs}`, {
                slotStartUTC: slotStart.toISOString(),
                slotEndUTC: slotEnd.toISOString(),
                busyStartUTC: busy.start.toISOString(),
                busyEndUTC: busy.end.toISOString(),
                slotStartMs,
                slotEndMs,
                busyStartMs,
                busyEndMs,
                timeDiffMs,
                timeDiffHours: timeDiffHours.toFixed(2),
                overlaps,
                source: busy.source,
              });
            }
            
            if (overlaps) {
              console.log(`[CalendarService] OVERLAP DETECTED - slot ${slotStart.toISOString()} overlaps with busy ${busy.start.toISOString()} (should be excluded by subtractBusyFromBase)`);
            }
          }

          freeSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            durationMinutes: slotDurationMinutes,
          });

          slotStartMs += slotIncrementMs;
        }
      }
    }

    console.log(`[CalendarService] Generated ${freeSlots.length} free slots for ${dateStr}`);
    return freeSlots;
  }

  /**
   * Helper function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a Google Calendar event with Meet link via Central Auth Broker.
   * The Central Auth service manages OAuth tokens and creates the event on behalf of the instructor.
   */
  async createGoogleEvent(
    instructorId: string,
    summary: string,
    description: string,
    startTime: Date,
    endTime: Date,
    attendeeEmail?: string
  ): Promise<{ eventId: string; meetLink?: string }> {
    if (!INTERNAL_API_KEY) {
      throw new Error('INTERNAL_API_KEY is not configured - cannot create events via Central Auth');
    }

    try {
      const response = await fetch(`${AUTH_BROKER_URL}/api/calendars/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-instructorops-key': INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          instructorId,
          summary,
          description,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendeeEmail,
          createMeetLink: true,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CalendarService] Central Auth event creation failed (${response.status}): ${errorText.substring(0, 500)}`);
        throw new Error(`Failed to create Google Calendar event: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      if (!contentType.includes('application/json')) {
        console.error(`[CalendarService] Central Auth returned non-JSON response (${contentType})`);
        throw new Error('Central Auth returned invalid response format');
      }

      const data = await response.json();
      
      console.log(`[CalendarService] Event created via Central Auth for instructor ${instructorId}:`, {
        eventId: data.eventId || data.id,
        meetLink: data.meetLink || data.hangoutLink,
      });

      return {
        eventId: data.eventId || data.id || '',
        meetLink: data.meetLink || data.hangoutLink || undefined,
      };
    } catch (error: any) {
      console.error(`[CalendarService] Error creating Google Calendar event via Central Auth for instructor ${instructorId}:`, error);
      throw error;
    }
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
