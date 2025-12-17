import { storage } from '../storage';
import type { User } from '@shared/schema';

const INSTRUCTOROPS_AUTH_URL = process.env.INSTRUCTOROPS_AUTH_URL || "https://auth.instructorops.com";
const INSTRUCTOROPS_API_KEY = process.env.INSTRUCTOROPS_API_KEY || "";

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
      const url = `${INSTRUCTOROPS_AUTH_URL}/api/calendars?instructorId=${instructorId}`;
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

  async selectCalendar(instructorId: string, calendarId: string): Promise<boolean> {
    try {
      validateInstructorId(instructorId, 'select calendar');
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/select`, {
        method: 'POST',
        headers: getAuthHeaders(instructorId),
        body: JSON.stringify({ instructorId, calendarId }),
      });
      
      if (!response.ok) {
        console.error(`Failed to select calendar in InstructorOps: ${response.status}`);
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

  async getBlockedTimes(
    instructorId: string,
    startTime: Date,
    endTime: Date
  ): Promise<InstructorOpsBusyTime[]> {
    try {
      validateInstructorId(instructorId, 'get blocked times');
      const params = new URLSearchParams({
        instructorId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      });
      
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/busy?${params}`, {
        headers: getAuthHeaders(instructorId),
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch blocked times from InstructorOps: ${response.status}`);
        return [];
      }
      
      const busyTimes = await response.json();
      return busyTimes;
    } catch (error) {
      console.error('Error fetching blocked times from InstructorOps:', error);
      return [];
    }
  }

  async createEvent(data: InstructorOpsEventData): Promise<string | null> {
    try {
      validateInstructorId(data.instructorId, 'create event');
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/create`, {
        method: 'POST',
        headers: getAuthHeaders(data.instructorId),
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        console.error(`Failed to create event in InstructorOps: ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      return result.eventId || null;
    } catch (error) {
      console.error('Error creating event in InstructorOps:', error);
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/${eventId}`, {
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/${eventId}`, {
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/create`, {
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
      const url = `${INSTRUCTOROPS_AUTH_URL}/api/calendars/status?instructorId=${instructorId}`;
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/disconnect`, {
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
      const params = new URLSearchParams({
        instructorId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
      });
      
      const url = `${INSTRUCTOROPS_AUTH_URL}/api/calendars/events?${params}`;
      console.log(`[Google Events Fetch] instructorId: ${instructorId}, timeRange: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      
      const response = await fetch(url, {
        headers: getAuthHeaders(instructorId),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`[InstructorOps] Failed to fetch events: ${response.status}`, text.substring(0, 200));
        return [];
      }
      
      const events = await response.json();
      console.log(`[Google Events Fetch] instructorId: ${instructorId}, eventsCount: ${events.length}`);
      
      return events.map((event: any) => ({
        id: event.id,
        title: event.summary || event.title || 'Busy',
        startTime: event.start?.dateTime || event.start || event.startTime,
        endTime: event.end?.dateTime || event.end || event.endTime,
        source: 'google' as const,
        calendarId: event.calendarId,
        description: event.description,
        location: event.location,
      }));
    } catch (error) {
      console.error('[InstructorOps] Error fetching events:', error);
      return [];
    }
  }
}

export const instructorOpsCalendarService = new InstructorOpsCalendarService();
