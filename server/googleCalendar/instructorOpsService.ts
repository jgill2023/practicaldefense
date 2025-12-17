import { storage } from '../storage';
import type { User } from '@shared/schema';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "https://auth.instructorops.com";
const INSTRUCTOROPS_API_KEY = process.env.INSTRUCTOROPS_API_KEY || "";

// Log configuration on startup
console.log(`[InstructorOps Config] AUTH_SERVICE_URL: ${AUTH_SERVICE_URL}`);
console.log(`[InstructorOps Config] INSTRUCTOROPS_API_KEY configured: ${INSTRUCTOROPS_API_KEY ? 'YES (length: ' + INSTRUCTOROPS_API_KEY.length + ', starts with: ' + INSTRUCTOROPS_API_KEY.substring(0, 8) + '...)' : 'NO'}`);

function getAuthHeaders(instructorId: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (INSTRUCTOROPS_API_KEY) {
    headers['x-instructorops-key'] = INSTRUCTOROPS_API_KEY;
  }
  if (instructorId) {
    headers['x-instructor-id'] = instructorId;
  }
  return headers;
}

function validateInstructorId(instructorId: string, operation: string): void {
  if (!instructorId) {
    console.error(`[InstructorOps Request] ERROR: Missing instructorId for ${operation}`);
    throw new Error(`Instructor ID missing — cannot ${operation}`);
  }
  console.log(`[InstructorOps Request] instructorId: ${instructorId} for ${operation}`);
}

interface InstructorOpsCalendar {
  id: string;
  name: string;
  color?: string;
  isPrimary?: boolean;
}

interface InstructorOpsBusyTime {
  start: string;
  end: string;
  summary?: string;
  calendarId?: string;
}

interface InstructorOpsCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: 'google';
  calendarId?: string;
  description?: string;
  location?: string;
}

interface InstructorOpsEventData {
  instructorId: string;
  start: string;
  end: string;
  summary: string;
  description?: string;
  attendees?: string[];
  location?: string;
  calendarId?: string;
}

class InstructorOpsCalendarService {
  async getCalendars(instructorId: string): Promise<InstructorOpsCalendar[]> {
    try {
      validateInstructorId(instructorId, 'fetch calendars');
      const url = `${AUTH_SERVICE_URL}/api/calendars?instructorId=${instructorId}`;
      console.log(`[InstructorOps] Fetching calendars from: ${url}`);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(instructorId),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps] Failed to fetch calendars: ${response.status}`, text.substring(0, 200));
        return [];
      }
      
      const calendars = await response.json();
      console.log(`[InstructorOps] Successfully fetched ${calendars.length} calendars`);
      return calendars;
    } catch (error) {
      console.error('[InstructorOps] Error fetching calendars:', error);
      throw error;
    }
  }

  async selectCalendar(instructorId: string, calendarId: string, calendarName?: string): Promise<boolean> {
    try {
      validateInstructorId(instructorId, 'select calendar');
      const response = await fetch(`${AUTH_SERVICE_URL}/api/calendars/select`, {
        method: 'POST',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId, calendarId, calendarName: calendarName || calendarId }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`Failed to select calendar in InstructorOps: ${response.status}`, text.substring(0, 200));
        return false;
      }
      
      await storage.updateGoogleCalendarSettings(instructorId, {
        googleCalendarConnected: true,
      });
      
      return true;
    } catch (error) {
      console.error('Error selecting calendar in InstructorOps:', error);
      return false;
    }
  }

  async getCalendarSelections(instructorId: string): Promise<InstructorOpsCalendar[]> {
    try {
      validateInstructorId(instructorId, 'fetch calendar selections');
      const url = `${AUTH_SERVICE_URL}/api/calendars/selections?instructorId=${instructorId}`;
      console.log(`[InstructorOps] Fetching calendar selections from: ${url}`);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(instructorId),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps] Failed to fetch calendar selections: ${response.status}`, text.substring(0, 200));
        return [];
      }
      
      const selections = await response.json();
      console.log(`[InstructorOps] Successfully fetched ${selections.length} calendar selections`);
      return selections;
    } catch (error) {
      console.error('[InstructorOps] Error fetching calendar selections:', error);
      return [];
    }
  }

  async getBlockedTimes(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<InstructorOpsBusyTime[]> {
    console.log(`[InstructorOps getBlockedTimes] START - instructorId: ${instructorId}, range: ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    try {
      validateInstructorId(instructorId, 'get blocked times');
      const params = new URLSearchParams({
        instructorId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      });
      
      const url = `${AUTH_SERVICE_URL}/api/calendars/busy?${params}`;
      const headers = getAuthHeaders(instructorId);
      console.log(`[InstructorOps getBlockedTimes] Calling: GET ${url}`);
      console.log(`[InstructorOps getBlockedTimes] Headers: x-instructorops-key=${headers['x-instructorops-key'] ? 'SET (' + headers['x-instructorops-key'].length + ' chars)' : 'NOT SET'}, x-instructor-id=${headers['x-instructor-id'] || 'NOT SET'}`);
      
      const response = await fetch(url, { headers });
      
      console.log(`[InstructorOps getBlockedTimes] Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps getBlockedTimes] FAILED: ${response.status}`, text.substring(0, 500));
        return [];
      }
      
      const busyTimes = await response.json();
      console.log(`[InstructorOps getBlockedTimes] SUCCESS - Received ${busyTimes.length} busy times`);
      if (busyTimes.length > 0) {
        console.log(`[InstructorOps getBlockedTimes] Sample busy time:`, JSON.stringify(busyTimes[0]));
      }
      return busyTimes;
    } catch (error) {
      console.error('[InstructorOps getBlockedTimes] ERROR:', error);
      return [];
    }
  }

  async createEvent(data: InstructorOpsEventData): Promise<string | null> {
    try {
      validateInstructorId(data.instructorId, 'create event');
      const url = `${AUTH_SERVICE_URL}/api/calendars/events`;
      console.log(`[InstructorOps] Creating calendar event at: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(data.instructorId),
        body: JSON.stringify({
          instructorId: data.instructorId,
          summary: data.summary,
          description: data.description,
          startTime: data.start,
          endTime: data.end,
          attendees: data.attendees,
        }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps] Failed to create event: ${response.status}`, text.substring(0, 300));
        return null;
      }
      
      const result = await response.json();
      console.log(`[InstructorOps] Event created successfully:`, result.eventId || result.id);
      return result.eventId || result.id || null;
    } catch (error) {
      console.error('[InstructorOps] Error creating event:', error);
      return null;
    }
  }

  async updateEvent(
    instructorId: string,
    eventId: string,
    data: Partial<InstructorOpsEventData>
  ): Promise<boolean> {
    try {
      validateInstructorId(instructorId, 'update event');
      const response = await fetch(`${AUTH_SERVICE_URL}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId, ...data }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error updating event in InstructorOps:', error);
      return false;
    }
  }

  async deleteEvent(instructorId: string, eventId: string, calendarId?: string): Promise<boolean> {
    try {
      validateInstructorId(instructorId, 'delete event');
      const response = await fetch(`${AUTH_SERVICE_URL}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId, calendarId }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting event in InstructorOps:', error);
      return false;
    }
  }

  async createCalendar(instructorId: string, calendarName: string): Promise<{ calendarId: string } | null> {
    try {
      validateInstructorId(instructorId, 'create calendar');
      const response = await fetch(`${AUTH_SERVICE_URL}/api/calendars/create`, {
        method: 'POST',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId, name: calendarName }),
      });
      
      if (!response.ok) {
        console.error(`Failed to create calendar in InstructorOps: ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      return { calendarId: result.calendarId || result.id };
    } catch (error) {
      console.error('Error creating calendar in InstructorOps:', error);
      return null;
    }
  }

  async getConnectionStatus(instructorId: string): Promise<{
    connected: boolean;
    selectedCalendarId?: string;
  }> {
    try {
      validateInstructorId(instructorId, 'check connection status');
      const url = `${AUTH_SERVICE_URL}/api/calendars/status?instructorId=${instructorId}`;
      console.log(`[InstructorOps] Checking connection status: ${url}`);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(instructorId),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps] Status check failed: ${response.status}`, text.substring(0, 200));
        return { connected: false };
      }
      
      const status = await response.json();
      console.log(`[InstructorOps] Connection status:`, status);
      return {
        connected: status.connected || false,
        selectedCalendarId: status.calendarId,
      };
    } catch (error) {
      console.error('[InstructorOps] Error checking connection status:', error);
      throw error;
    }
  }

  async disconnect(instructorId: string): Promise<boolean> {
    try {
      validateInstructorId(instructorId, 'disconnect');
      const response = await fetch(`${AUTH_SERVICE_URL}/api/calendars/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId }),
      });
      
      if (response.ok) {
        await storage.updateGoogleCalendarSettings(instructorId, {
          googleCalendarConnected: false,
        });
      }
      
      return response.ok;
    } catch (error) {
      console.error('Error disconnecting from InstructorOps:', error);
      return false;
    }
  }
  
  async checkConflict(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ hasConflict: boolean; conflictingEvent?: InstructorOpsBusyTime }> {
    const busyTimes = await this.getBlockedTimes(instructorId, startTime, endTime);
    
    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      const slotStart = startTime.getTime();
      const slotEnd = endTime.getTime();
      
      if (slotStart < busyEnd && slotEnd > busyStart) {
        return { hasConflict: true, conflictingEvent: busy };
      }
    }
    
    return { hasConflict: false };
  }

  async getEvents(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<InstructorOpsCalendarEvent[]> {
    try {
      validateInstructorId(instructorId, 'fetch events');
      
      console.log(`[Google Events Fetch] instructorId: ${instructorId}, timeRange: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      // Use the busy endpoint which returns event summaries
      const busyTimes = await this.getBlockedTimes(instructorId, startTime, endTime);
      
      console.log(`[Google Events Fetch] instructorId: ${instructorId}, eventsCount: ${busyTimes.length}`);
      
      // Convert busy times to calendar events format
      return busyTimes.map((busy, index) => ({
        id: `google-busy-${index}-${busy.start}`,
        title: busy.summary || 'Busy',
        startTime: busy.start,
        endTime: busy.end,
        source: 'google' as const,
        calendarId: busy.calendarId,
      }));
    } catch (error) {
      console.error('[InstructorOps] Error fetching events:', error);
      return [];
    }
  }
}

export const instructorOpsCalendarService = new InstructorOpsCalendarService();
