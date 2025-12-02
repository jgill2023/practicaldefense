import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import crypto from 'crypto';
import { storage } from '../storage';
import { isAuthenticated } from '../customAuth';

export const stripeConnectRouter = Router();

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
}

const STATE_TTL_MS = 15 * 60 * 1000;

function getStateSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.REPL_ID || 'stripe-connect-fallback-secret';
  return secret;
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
      console.log('State token expired');
      return null;
    }
    
    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', getStateSecret());
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.log('State signature mismatch');
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
  // Always use HTTPS for OAuth redirects to prevent token leakage
  // In development, x-forwarded-proto may be http, but we force https for security
  const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
  const proto = isLocalhost ? 'http' : 'https';
  return `${proto}://${host}`;
}

stripeConnectRouter.get('/config', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const settings = await storage.getAppSettings();
    
    res.json({
      configured: !!settings?.stripeClientId,
      clientId: (user.role === 'admin' || user.role === 'superadmin') ? settings?.stripeClientId : undefined,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe Connect config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

stripeConnectRouter.post('/config', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const schema = z.object({
      stripeClientId: z.string().refine(
        (val) => !val || val.startsWith('ca_'),
        { message: "Stripe Client ID must start with 'ca_'" }
      ).optional().nullable(),
    });

    const { stripeClientId } = schema.parse(req.body);

    await storage.updateAppSettings({ stripeClientId: stripeClientId || null });

    res.json({ success: true, configured: !!stripeClientId });
  } catch (error: any) {
    console.error('Error saving Stripe Connect config:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid input' });
    }
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

stripeConnectRouter.get('/oauth-link', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const settings = await storage.getAppSettings();
    if (!settings?.stripeClientId) {
      return res.status(400).json({ error: 'Stripe Connect is not configured. Please ask an admin to set up the Stripe Client ID.' });
    }

    const state = signState(user.id, Date.now());
    
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/stripe-connect/oauth/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: settings.stripeClientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: state,
      'stripe_user[email]': user.email,
    });

    if (user.firstName) {
      params.set('stripe_user[first_name]', user.firstName);
    }
    if (user.lastName) {
      params.set('stripe_user[last_name]', user.lastName);
    }

    const oauthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    res.json({ 
      url: oauthUrl,
      redirectUri: redirectUri,
    });
  } catch (error: any) {
    console.error('Error generating OAuth link:', error);
    res.status(500).json({ error: 'Failed to generate OAuth link' });
  }
});

stripeConnectRouter.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      console.error('OAuth error:', oauthError, error_description);
      return res.redirect(`/stripe-connect?error=${encodeURIComponent(error_description as string || oauthError as string)}`);
    }

    if (!state || typeof state !== 'string') {
      return res.redirect('/stripe-connect?error=Invalid%20state%20parameter');
    }

    const stateData = verifyState(state);
    if (!stateData) {
      return res.redirect('/stripe-connect?error=Invalid%20or%20expired%20state%20token');
    }

    if (!code || typeof code !== 'string') {
      return res.redirect('/stripe-connect?error=Missing%20authorization%20code');
    }

    if (!stripe) {
      return res.redirect('/stripe-connect?error=Stripe%20is%20not%20configured');
    }

    const settings = await storage.getAppSettings();
    if (!settings?.stripeClientId) {
      return res.redirect('/stripe-connect?error=Stripe%20Connect%20Client%20ID%20not%20configured');
    }

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    if (!response.stripe_user_id) {
      console.error('No stripe_user_id in OAuth response');
      return res.redirect('/stripe-connect?error=Failed%20to%20connect%20Stripe%20account');
    }

    const account = await stripe.accounts.retrieve(response.stripe_user_id);

    await storage.updateUser(stateData.userId, {
      stripeConnectAccountId: response.stripe_user_id,
      stripeConnectOnboardingComplete: account.details_submitted && (account.charges_enabled || false),
      stripeConnectDetailsSubmitted: account.details_submitted || false,
      stripeConnectChargesEnabled: account.charges_enabled || false,
      stripeConnectPayoutsEnabled: account.payouts_enabled || false,
      stripeConnectCreatedAt: new Date(),
    });

    console.log(`Stripe Connect account ${response.stripe_user_id} connected for user ${stateData.userId}`);
    
    return res.redirect('/stripe-connect?success=true');
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return res.redirect(`/stripe-connect?error=${encodeURIComponent(error.message || 'OAuth callback failed')}`);
  }
});

stripeConnectRouter.get('/status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    if (!user.stripeConnectAccountId) {
      return res.json({
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        onboardingComplete: false,
      });
    }

    let liveStatus = null;
    if (stripe) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
        liveStatus = {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        };

        if (
          liveStatus.chargesEnabled !== user.stripeConnectChargesEnabled ||
          liveStatus.payoutsEnabled !== user.stripeConnectPayoutsEnabled ||
          liveStatus.detailsSubmitted !== user.stripeConnectDetailsSubmitted
        ) {
          await storage.updateUser(user.id, {
            stripeConnectChargesEnabled: liveStatus.chargesEnabled || false,
            stripeConnectPayoutsEnabled: liveStatus.payoutsEnabled || false,
            stripeConnectDetailsSubmitted: liveStatus.detailsSubmitted || false,
            stripeConnectOnboardingComplete: (liveStatus.detailsSubmitted && liveStatus.chargesEnabled) || false,
          });
        }
      } catch (stripeError: any) {
        console.error('Error fetching Stripe account status:', stripeError);
      }
    }

    res.json({
      connected: true,
      accountId: user.stripeConnectAccountId,
      chargesEnabled: liveStatus?.chargesEnabled ?? user.stripeConnectChargesEnabled ?? false,
      payoutsEnabled: liveStatus?.payoutsEnabled ?? user.stripeConnectPayoutsEnabled ?? false,
      detailsSubmitted: liveStatus?.detailsSubmitted ?? user.stripeConnectDetailsSubmitted ?? false,
      onboardingComplete: user.stripeConnectOnboardingComplete ?? false,
      connectedAt: user.stripeConnectCreatedAt,
    });
  } catch (error: any) {
    console.error('Error fetching connection status:', error);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

stripeConnectRouter.delete('/disconnect', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    if (!user.stripeConnectAccountId) {
      return res.status(400).json({ error: 'No Stripe account connected' });
    }

    if (stripe) {
      try {
        const settings = await storage.getAppSettings();
        if (settings?.stripeClientId) {
          await stripe.oauth.deauthorize({
            client_id: settings.stripeClientId,
            stripe_user_id: user.stripeConnectAccountId,
          });
        }
      } catch (stripeError: any) {
        console.error('Error deauthorizing Stripe account:', stripeError);
      }
    }

    await storage.updateUser(user.id, {
      stripeConnectAccountId: null,
      stripeConnectOnboardingComplete: false,
      stripeConnectDetailsSubmitted: false,
      stripeConnectChargesEnabled: false,
      stripeConnectPayoutsEnabled: false,
      stripeConnectCreatedAt: null,
    });

    console.log(`Stripe Connect account disconnected for user ${user.id}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Stripe account:', error);
    res.status(500).json({ error: 'Failed to disconnect Stripe account' });
  }
});

stripeConnectRouter.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.log('STRIPE_CONNECT_WEBHOOK_SECRET not configured, skipping webhook verification');
    return res.status(200).json({ received: true });
  }

  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;
  
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    const rawBody = (req as any).rawBody || req.body;
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        const users = await storage.getUsersByStripeConnectAccountId(account.id);
        
        for (const user of users) {
          await storage.updateUser(user.id, {
            stripeConnectChargesEnabled: account.charges_enabled || false,
            stripeConnectPayoutsEnabled: account.payouts_enabled || false,
            stripeConnectDetailsSubmitted: account.details_submitted || false,
            stripeConnectOnboardingComplete: (account.details_submitted && account.charges_enabled) || false,
          });
          console.log(`Updated Stripe Connect status for user ${user.id} from webhook`);
        }
        break;
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as any;
        const accountId = event.account;
        
        if (accountId) {
          const users = await storage.getUsersByStripeConnectAccountId(accountId);
          
          for (const user of users) {
            await storage.updateUser(user.id, {
              stripeConnectAccountId: null,
              stripeConnectOnboardingComplete: false,
              stripeConnectDetailsSubmitted: false,
              stripeConnectChargesEnabled: false,
              stripeConnectPayoutsEnabled: false,
              stripeConnectCreatedAt: null,
            });
            console.log(`Stripe Connect account deauthorized for user ${user.id}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe Connect webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
