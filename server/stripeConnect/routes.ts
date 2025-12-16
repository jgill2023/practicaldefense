import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { isAuthenticated } from '../customAuth';
import { getStripeClient } from '../stripeClient';

export const stripeConnectRouter = Router();

let stripe: Stripe | null = null;
let stripeInitialized = false;

async function ensureStripeInitialized(): Promise<Stripe | null> {
  if (!stripeInitialized) {
    try {
      stripe = await getStripeClient();
      stripeInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize Stripe client:', error);
      stripe = null;
    }
  }
  return stripe;
}

// Simple endpoint to check if Stripe is configured and working
stripeConnectRouter.get('/status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const stripeClient = await ensureStripeInitialized();
    
    if (!stripeClient) {
      return res.json({
        configured: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe API keys are not configured. Please add STRIPE_SECRET_KEY to enable payments.'
      });
    }

    // Verify the Stripe API key is working by retrieving balance (works for standard accounts)
    try {
      await stripeClient.balance.retrieve();
      
      return res.json({
        configured: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        businessName: 'Apache Solutions',
        message: 'Stripe is configured and ready to accept payments.'
      });
    } catch (balanceError: any) {
      console.error('Error verifying Stripe API key:', balanceError);
      return res.json({
        configured: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe API key is invalid or has insufficient permissions.'
      });
    }
  } catch (error: any) {
    console.error('Error checking Stripe status:', error);
    res.status(500).json({ error: 'Failed to check Stripe status' });
  }
});

// Simple config endpoint for admin to see Stripe is set up
stripeConnectRouter.get('/config', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const stripeClient = await ensureStripeInitialized();
    
    res.json({
      configured: !!stripeClient,
      message: stripeClient 
        ? 'Stripe is configured. All payments go directly to Apache Solutions.' 
        : 'Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments.'
    });
  } catch (error: any) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});
