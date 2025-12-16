import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { isAuthenticated } from '../customAuth';
import { getStripeClient } from '../stripeClient';
import { storage } from '../storage';

export const stripeConnectRouter = Router();

let stripe: Stripe | null = null;

async function ensureStripeInitialized(): Promise<Stripe | null> {
  // Always try to initialize if we don't have a client yet
  // This allows initialization to succeed after a secret is added
  if (!stripe) {
    try {
      stripe = await getStripeClient();
    } catch (error) {
      console.warn('Failed to initialize Stripe client:', error);
      stripe = null;
    }
  }
  return stripe;
}

// Force re-initialization (used after secrets are updated)
function resetStripeClient(): void {
  stripe = null;
}

// Check Stripe configuration status
stripeConnectRouter.get('/status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    // Check if admin has completed Stripe onboarding
    const settings = await storage.getAppSettings();
    const stripeOnboarded = settings?.stripeOnboarded ?? false;

    if (!stripeOnboarded) {
      return res.json({
        configured: false,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe is not connected. Click "Connect Stripe" to set up payments.'
      });
    }

    // Verify the Stripe API key is working
    const stripeClient = await ensureStripeInitialized();
    
    if (!stripeClient) {
      return res.json({
        configured: false,
        onboarded: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe API keys are not configured. Please add STRIPE_SECRET_KEY to complete setup.'
      });
    }

    // Verify the API key works by retrieving balance
    try {
      await stripeClient.balance.retrieve();
      
      return res.json({
        configured: true,
        onboarded: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        businessName: 'Apache Solutions',
        message: 'Stripe is configured and ready to accept payments.'
      });
    } catch (balanceError: any) {
      console.error('Error verifying Stripe API key:', balanceError);
      return res.json({
        configured: false,
        onboarded: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe API key is invalid or has insufficient permissions. Please check your STRIPE_SECRET_KEY.'
      });
    }
  } catch (error: any) {
    console.error('Error checking Stripe status:', error);
    res.status(500).json({ error: 'Failed to check Stripe status' });
  }
});

// Complete Stripe onboarding (admin confirms setup is complete)
stripeConnectRouter.post('/onboard', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify Stripe API key is configured and working
    const stripeClient = await ensureStripeInitialized();
    
    if (!stripeClient) {
      return res.status(400).json({ 
        error: 'Stripe API key is not configured. Please add STRIPE_SECRET_KEY as a secret first.',
        step: 'add_api_key'
      });
    }

    // Test the API key by retrieving balance
    try {
      await stripeClient.balance.retrieve();
    } catch (balanceError: any) {
      console.error('Stripe API key validation failed:', balanceError);
      return res.status(400).json({ 
        error: 'Stripe API key is invalid or has insufficient permissions. Please verify your API key.',
        step: 'verify_api_key'
      });
    }

    // Mark Stripe as onboarded
    await storage.updateAppSettings({ stripeOnboarded: true });

    console.log(`Stripe onboarding completed by admin ${user.id}`);

    res.json({ 
      success: true, 
      message: 'Stripe is now connected and ready to accept payments.',
      configured: true,
      chargesEnabled: true,
      payoutsEnabled: true
    });
  } catch (error: any) {
    console.error('Error completing Stripe onboarding:', error);
    res.status(500).json({ error: 'Failed to complete Stripe onboarding' });
  }
});

// Disconnect Stripe (admin resets onboarding)
stripeConnectRouter.delete('/disconnect', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Reset Stripe onboarding status
    await storage.updateAppSettings({ stripeOnboarded: false });

    // Reset Stripe client so new keys can be picked up without restart
    resetStripeClient();

    console.log(`Stripe disconnected by admin ${user.id}`);

    res.json({ 
      success: true, 
      message: 'Stripe has been disconnected. You can reconnect anytime.'
    });
  } catch (error: any) {
    console.error('Error disconnecting Stripe:', error);
    res.status(500).json({ error: 'Failed to disconnect Stripe' });
  }
});

// Config endpoint for checking overall configuration
stripeConnectRouter.get('/config', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const settings = await storage.getAppSettings();
    const stripeClient = await ensureStripeInitialized();
    
    res.json({
      onboarded: settings?.stripeOnboarded ?? false,
      apiKeyConfigured: !!stripeClient,
      message: settings?.stripeOnboarded 
        ? 'Stripe is configured. All payments go directly to Apache Solutions.' 
        : 'Stripe is not yet configured. Complete onboarding to accept payments.'
    });
  } catch (error: any) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});
