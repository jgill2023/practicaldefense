import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isAuthenticated, requireInstructorOrHigher } from '../customAuth';
import { storage } from '../storage';
import { instructorGoogleCalendarService } from './instructorService';

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

instructorGoogleCalendarRouter.get('/status', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const status = await instructorGoogleCalendarService.getInstructorStatus(req.user.id);
    res.json(status);
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
      return res.redirect('/instructor/settings?gcal_error=access_denied');
    }

    if (!code || !state) {
      return res.redirect('/instructor/settings?gcal_error=missing_params');
    }

    const stateData = verifyState(state as string);
    if (!stateData) {
      return res.redirect('/instructor/settings?gcal_error=invalid_state');
    }

    const user = await storage.getUser(stateData.userId);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.redirect('/instructor/settings?gcal_error=unauthorized');
    }

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/instructor-google-calendar/oauth/callback`;

    const tokens = await instructorGoogleCalendarService.exchangeCodeForTokens(code as string, redirectUri);

    await instructorGoogleCalendarService.saveInstructorCredentials(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiryDate,
      primaryCalendarId: 'primary',
    });

    await instructorGoogleCalendarService.syncInstructorCalendars(user.id);

    console.log('Google Calendar connected successfully for instructor:', user.id);
    res.redirect('/instructor/settings?gcal_success=true');
  } catch (error: any) {
    console.error('Error during Google Calendar OAuth callback:', error);
    res.redirect('/instructor/settings?gcal_error=exchange_failed');
  }
});

instructorGoogleCalendarRouter.post('/disconnect', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    await instructorGoogleCalendarService.disconnectInstructor(req.user.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

instructorGoogleCalendarRouter.get('/calendars', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const calendars = await storage.getInstructorCalendars(req.user.id);
    res.json(calendars);
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

instructorGoogleCalendarRouter.post('/calendars/refresh', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const calendars = await instructorGoogleCalendarService.syncInstructorCalendars(req.user.id);
    res.json(calendars);
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
    
    const busyEvents = await instructorGoogleCalendarService.getBusyEvents(req.user.id, start, end);
    res.json(busyEvents);
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

instructorGoogleCalendarRouter.post('/refresh-cache', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    await instructorGoogleCalendarService.refreshBlockedTimeCache(req.user.id, start, end);
    
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
    
    const result = await instructorGoogleCalendarService.checkConflict(req.user.id, start, end);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error checking conflict:', error);
    res.status(500).json({ error: 'Failed to check conflict' });
  }
});
