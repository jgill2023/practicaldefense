import Stripe from 'stripe';

let _client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!_client && process.env.STRIPE_SECRET_KEY) {
    _client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
