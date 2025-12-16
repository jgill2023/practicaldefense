import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isAuthenticated, requireInstructorOrHigher } from '../customAuth';
import { storage } from '../storage';
import { instructorGoogleCalendarService } from './instructorService';
import { instructorOpsCalendarService } from './instructorOpsService';

export const instructorGoogleCalendarRouter = Router();

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  return process.env.SESSION_SECRET || process.env.REPL_ID || 'google-calendar-fallback-secret';
}

function signState(userId: string, timestamp: number): string {
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', getStateSecret());
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function verifyState(state: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const [userId, timestampStr, signature] = decoded.split(':');
    const timestamp = parseInt(timestampStr, 10);
    
    if (!userId || isNaN(timestamp) || !signature) {
      return null;
    }
    
    const now = Date.now();
    if (now - timestamp > STATE_TTL_MS) {
      console.log('Google Calendar: State token expired');
      return null;
    }
    
    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', getStateSecret());
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.log('Google Calendar: State signature mismatch');
      return null;
    }
    
    return { userId, timestamp };
  } catch (error) {
    console.error('Error verifying state:', error);
    return null;
  }
}

function getBaseUrl(req: Request): string {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
  const proto = isLocalhost ? 'http' : 'https';
  return `${proto}://${host}`;
}

function isUsingInstructorOps(): boolean {
  // Always use InstructorOps centralized auth service
  // This site is a CLIENT of auth.instructorops.com and should NOT handle OAuth locally
  // Set USE_LEGACY_GOOGLE_CALENDAR=true only for migration purposes
  return process.env.USE_LEGACY_GOOGLE_CALENDAR !== 'true';
}

instructorGoogleCalendarRouter.get('/status', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    if (isUsingInstructorOps()) {
      const instructor = await storage.getUser(req.user.id);
      const creds = await storage.getInstructorGoogleCredentials(req.user.id);
      
      let opsStatus = { connected: false, selectedCalendarId: undefined as string | undefined };
      try {
        opsStatus = await instructorOpsCalendarService.getConnectionStatus(req.user.id);
      } catch (e) {
        console.log('InstructorOps status check failed, using local DB status');
      }
      
      const isConnected = opsStatus.connected || instructor?.googleCalendarConnected || false;
      const selectedCalendarId = creds?.primaryCalendarId || opsStatus.selectedCalendarId;
      
      let calendars: any[] = [];
      if (isConnected) {
        try {
          calendars = await instructorOpsCalendarService.getCalendars(req.user.id);
        } catch (e) {
          console.log('InstructorOps calendar fetch failed');
        }
      }
      
      res.json({
        configured: true,
        connected: isConnected,
        syncEnabled: instructor?.googleCalendarSyncEnabled ?? true,
        blockingEnabled: instructor?.googleCalendarBlockingEnabled ?? true,
        calendars: calendars.map(cal => ({
          id: cal.id,
          name: cal.name,
          color: cal.color,
          isPrimary: cal.isPrimary || cal.id === selectedCalendarId,
        })),
        selectedCalendarId,
        timezone: instructor?.timezone || 'America/Denver',
      });
    } else {
      const status = await instructorGoogleCalendarService.getInstructorStatus(req.user.id);
      res.json(status);
    }
  } catch (error: any) {
    console.error('Error fetching Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

instructorGoogleCalendarRouter.get('/oauth-link', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    if (!instructorGoogleCalendarService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Google Calendar is not configured. Please contact your administrator.' 
      });
    }

    const state = signState(req.user.id, Date.now());
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/instructor-google-calendar/oauth/callback`;

    const url = instructorGoogleCalendarService.getAuthorizationUrl(redirectUri, state);

    res.json({ 
      url,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Error generating Google Calendar OAuth link:', error);
    res.status(500).json({ error: 'Failed to generate OAuth link' });
  }
});

instructorGoogleCalendarRouter.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Google Calendar OAuth error:', error);
      return res.redirect('/settings?gcal_error=access_denied');
    }

    if (!code || !state) {
      return res.redirect('/settings?gcal_error=missing_params');
    }

    const stateData = verifyState(state as string);
    if (!stateData) {
      return res.redirect('/settings?gcal_error=invalid_state');
    }

    const user = await storage.getUser(stateData.userId);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.redirect('/settings?gcal_error=unauthorized');
    }

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/instructor-google-calendar/oauth/callback`;

    console.log('Google Calendar OAuth callback - exchanging code with redirectUri:', redirectUri);
    const tokens = await instructorGoogleCalendarService.exchangeCodeForTokens(code as string, redirectUri);

    await instructorGoogleCalendarService.saveInstructorCredentials(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiryDate,
      primaryCalendarId: 'primary',
    });

    await instructorGoogleCalendarService.syncInstructorCalendars(user.id);

    console.log('Google Calendar connected successfully for instructor:', user.id);
    res.redirect('/settings?gcal_success=true');
  } catch (error: any) {
    console.error('Error during Google Calendar OAuth callback:', error);
    res.redirect('/settings?gcal_error=exchange_failed');
  }
});

instructorGoogleCalendarRouter.post('/sync-from-instructorops', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { calendarId } = req.body;
    
    await storage.updateGoogleCalendarSettings(req.user.id, {
      googleCalendarConnected: true,
    });
    
    console.log(`Synced InstructorOps calendar connection for instructor ${req.user.id}, calendar: ${calendarId}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error syncing from InstructorOps:', error);
    res.status(500).json({ error: 'Failed to sync calendar connection' });
  }
});

instructorGoogleCalendarRouter.post('/select-calendar', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { calendarId } = req.body;
    
    if (!calendarId) {
      return res.status(400).json({ error: 'calendarId is required' });
    }
    
    const success = await instructorOpsCalendarService.selectCalendar(req.user.id, calendarId);
    
    if (success) {
      await storage.updateGoogleCalendarSettings(req.user.id, {
        googleCalendarConnected: true,
      });
      
      const existingCreds = await storage.getInstructorGoogleCredentials(req.user.id);
      if (existingCreds) {
        await storage.updateInstructorGoogleCredentials(req.user.id, {
          primaryCalendarId: calendarId,
        });
      } else {
        await storage.saveInstructorGoogleCredentials({
          instructorId: req.user.id,
          accessToken: 'instructorops-managed',
          refreshToken: 'instructorops-managed',
          tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          primaryCalendarId: calendarId,
        });
        await storage.updateGoogleCalendarSettings(req.user.id, {
          googleCalendarConnected: true,
        });
      }
      
      console.log(`Selected calendar ${calendarId} for instructor ${req.user.id}`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to select calendar in InstructorOps' });
    }
  } catch (error: any) {
    console.error('Error selecting calendar:', error);
    res.status(500).json({ error: 'Failed to select calendar' });
  }
});

instructorGoogleCalendarRouter.post('/disconnect', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    if (isUsingInstructorOps()) {
      await instructorOpsCalendarService.disconnect(req.user.id);
    } else {
      await instructorGoogleCalendarService.disconnectInstructor(req.user.id);
    }
    
    await storage.updateGoogleCalendarSettings(req.user.id, {
      googleCalendarConnected: false,
    });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

instructorGoogleCalendarRouter.get('/calendars', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    if (isUsingInstructorOps()) {
      const calendars = await instructorOpsCalendarService.getCalendars(req.user.id);
      res.json(calendars);
    } else {
      const calendars = await storage.getInstructorCalendars(req.user.id);
      res.json(calendars);
    }
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

instructorGoogleCalendarRouter.post('/create-calendar', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }
    
    if (isUsingInstructorOps()) {
      const result = await instructorOpsCalendarService.createCalendar(req.user.id, name);
      
      if (result) {
        res.json({ success: true, calendarId: result.calendarId });
      } else {
        res.status(500).json({ error: 'Failed to create calendar' });
      }
    } else {
      const calendar = await instructorGoogleCalendarService.createCalendar(req.user.id, name);
      
      if (calendar) {
        res.json({ success: true, calendarId: calendar.id });
      } else {
        res.status(500).json({ error: 'Failed to create calendar' });
      }
    }
  } catch (error: any) {
    console.error('Error creating calendar:', error);
    res.status(500).json({ error: 'Failed to create calendar' });
  }
});

instructorGoogleCalendarRouter.post('/calendars/refresh', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    if (isUsingInstructorOps()) {
      const calendars = await instructorOpsCalendarService.getCalendars(req.user.id);
      res.json(calendars);
    } else {
      const calendars = await instructorGoogleCalendarService.syncInstructorCalendars(req.user.id);
      res.json(calendars);
    }
  } catch (error: any) {
    console.error('Error refreshing calendars:', error);
    
    if (error.message === 'GOOGLE_CALENDAR_ACCESS_REVOKED') {
      return res.status(401).json({ 
        error: 'Google Calendar access has been revoked. Please reconnect your account.',
        code: 'ACCESS_REVOKED'
      });
    }
    
    res.status(500).json({ error: 'Failed to refresh calendars' });
  }
});

instructorGoogleCalendarRouter.patch('/calendars/:calendarId/blocking', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { calendarId } = req.params;
    const { blocksAvailability } = req.body;
    
    if (typeof blocksAvailability !== 'boolean') {
      return res.status(400).json({ error: 'blocksAvailability must be a boolean' });
    }
    
    const calendar = await instructorGoogleCalendarService.updateCalendarBlocking(
      req.user.id,
      calendarId,
      blocksAvailability
    );
    
    res.json(calendar);
  } catch (error: any) {
    console.error('Error updating calendar blocking:', error);
    res.status(500).json({ error: 'Failed to update calendar' });
  }
});

instructorGoogleCalendarRouter.patch('/settings', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { syncEnabled, blockingEnabled, primaryCalendarId, timezone } = req.body;
    
    const user = await instructorGoogleCalendarService.updateInstructorSettings(req.user.id, {
      syncEnabled,
      blockingEnabled,
      primaryCalendarId,
      timezone,
    });
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating Google Calendar settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

instructorGoogleCalendarRouter.get('/busy-events', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (isUsingInstructorOps()) {
      const busyTimes = await instructorOpsCalendarService.getBlockedTimes(req.user.id, start, end);
      res.json(busyTimes.map(bt => ({
        id: `${bt.start}-${bt.end}`,
        start: new Date(bt.start),
        end: new Date(bt.end),
        summary: bt.summary,
        calendarId: bt.calendarId,
      })));
    } else {
      const busyEvents = await instructorGoogleCalendarService.getBusyEvents(req.user.id, start, end);
      res.json(busyEvents);
    }
  } catch (error: any) {
    console.error('Error fetching busy events:', error);
    
    if (error.message === 'GOOGLE_CALENDAR_ACCESS_REVOKED') {
      return res.status(401).json({ 
        error: 'Google Calendar access has been revoked. Please reconnect your account.',
        code: 'ACCESS_REVOKED'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch busy events' });
  }
});

instructorGoogleCalendarRouter.get('/blocked-times', async (req: Request, res: Response) => {
  try {
    const { instructorId, startDate, endDate } = req.query;
    
    if (!instructorId || !startDate || !endDate) {
      return res.status(400).json({ error: 'instructorId, startDate, and endDate are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    const instructor = await storage.getUser(instructorId as string);
    if (!instructor || !instructor.googleCalendarConnected || !instructor.googleCalendarBlockingEnabled) {
      return res.json([]);
    }
    
    if (isUsingInstructorOps()) {
      const busyTimes = await instructorOpsCalendarService.getBlockedTimes(instructorId as string, start, end);
      res.json(busyTimes.map(bt => ({
        start: bt.start,
        end: bt.end,
        summary: bt.summary,
      })));
    } else {
      const busyEvents = await instructorGoogleCalendarService.getBusyEvents(instructorId as string, start, end);
      res.json(busyEvents.map(event => ({
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        summary: event.summary,
      })));
    }
  } catch (error: any) {
    console.error('Error fetching blocked times:', error);
    res.status(500).json({ error: 'Failed to fetch blocked times' });
  }
});

instructorGoogleCalendarRouter.post('/refresh-cache', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (!isUsingInstructorOps()) {
      await instructorGoogleCalendarService.refreshBlockedTimeCache(req.user.id, start, end);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

instructorGoogleCalendarRouter.post('/check-conflict', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isUsingInstructorOps()) {
      const result = await instructorOpsCalendarService.checkConflict(req.user.id, start, end);
      res.json(result);
    } else {
      const result = await instructorGoogleCalendarService.checkConflict(req.user.id, start, end);
      res.json(result);
    }
  } catch (error: any) {
    console.error('Error checking conflict:', error);
    res.status(500).json({ error: 'Failed to check conflict' });
  }
});

instructorGoogleCalendarRouter.post('/create-event', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { summary, description, startTime, endTime, attendees, location } = req.body;
    
    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ error: 'summary, startTime, and endTime are required' });
    }
    
    let eventId: string | null = null;
    
    if (isUsingInstructorOps()) {
      eventId = await instructorOpsCalendarService.createEvent({
        instructorId: req.user.id,
        summary,
        description,
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString(),
        attendees,
        location,
      });
    } else {
      eventId = await instructorGoogleCalendarService.createEvent(req.user.id, {
        summary,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        attendeeEmails: attendees,
        location,
      });
    }
    
    if (eventId) {
      res.json({ success: true, eventId });
    } else {
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});
