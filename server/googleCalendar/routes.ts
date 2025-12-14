import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { isAuthenticated } from '../customAuth';
import { storage } from '../storage';
import { googleCalendarService } from './service';

export const googleCalendarRouter = Router();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

// Check if Google Calendar is configured and authorized
googleCalendarRouter.get('/status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const configured = await googleCalendarService.isConfigured();
    const authorized = await googleCalendarService.isAuthorized();
    const credentials = await googleCalendarService.getCredentials();

    res.json({
      configured,
      authorized,
      calendarId: credentials?.calendarId || 'primary',
    });
  } catch (error: any) {
    console.error('Error fetching Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Generate OAuth authorization URL
googleCalendarRouter.get('/oauth-link', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required to connect Google Calendar' });
    }

    const configured = await googleCalendarService.isConfigured();
    if (!configured) {
      return res.status(400).json({ 
        error: 'Google Calendar is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
      });
    }

    const state = signState(user.id, Date.now());
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/google-calendar/oauth/callback`;

    const url = googleCalendarService.getAuthorizationUrl(redirectUri, state);

    res.json({ 
      url,
      redirectUri,
    });
  } catch (error: any) {
    console.error('Error generating Google Calendar OAuth link:', error);
    res.status(500).json({ error: 'Failed to generate OAuth link' });
  }
});

// OAuth callback endpoint
googleCalendarRouter.get('/oauth/callback', async (req: Request, res: Response) => {
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
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.redirect('/settings?gcal_error=unauthorized');
    }

    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/google-calendar/oauth/callback`;

    const tokens = await googleCalendarService.exchangeCodeForTokens(code as string, redirectUri);

    await googleCalendarService.saveCredentials({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: tokens.expiryDate,
      calendarId: 'primary',
    });

    console.log('Google Calendar connected successfully for user:', user.id);
    res.redirect('/settings?gcal_success=true');
  } catch (error: any) {
    console.error('Error during Google Calendar OAuth callback:', error);
    res.redirect('/settings?gcal_error=exchange_failed');
  }
});

// Disconnect Google Calendar
googleCalendarRouter.post('/disconnect', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await googleCalendarService.deleteCredentials();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Update calendar ID (which calendar to use)
googleCalendarRouter.post('/calendar-id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { calendarId } = req.body;
    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID is required' });
    }

    const credentials = await googleCalendarService.getCredentials();
    if (!credentials) {
      return res.status(400).json({ error: 'Google Calendar is not connected' });
    }

    await googleCalendarService.saveCredentials({
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiry: credentials.tokenExpiry,
      calendarId,
    });

    res.json({ success: true, calendarId });
  } catch (error: any) {
    console.error('Error updating calendar ID:', error);
    res.status(500).json({ error: 'Failed to update calendar ID' });
  }
});
