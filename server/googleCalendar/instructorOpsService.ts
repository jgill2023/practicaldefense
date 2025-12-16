import { storage } from '../storage';
import type { User } from '@shared/schema';

const INSTRUCTOROPS_AUTH_URL = process.env.INSTRUCTOROPS_AUTH_URL || "https://auth.instructorops.com";

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
      const url = `${INSTRUCTOROPS_AUTH_URL}/api/calendars?instructorId=${instructorId}`;
      console.log(`[InstructorOps] Fetching calendars from: ${url}`);
      
      const response = await fetch(url);
      
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
      return [];
    }
  }

  async selectCalendar(instructorId: string, calendarId: string): Promise<boolean> {
    try {
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const params = new URLSearchParams({
        instructorId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      });
      
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/busy?${params}`);
      
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const url = `${INSTRUCTOROPS_AUTH_URL}/api/calendars/status?instructorId=${instructorId}`;
      console.log(`[InstructorOps] Checking connection status: ${url}`);
      
      const response = await fetch(url);
      
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
      return { connected: false };
    }
  }

  async disconnect(instructorId: string): Promise<boolean> {
    try {
      const response = await fetch(`${INSTRUCTOROPS_AUTH_URL}/api/calendars/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
}

export const instructorOpsCalendarService = new InstructorOpsCalendarService();
