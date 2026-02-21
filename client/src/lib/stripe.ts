import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromiseCache: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (stripePromiseCache) {
    return stripePromiseCache;
  }

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!publishableKey) {
    console.warn('[Stripe] VITE_STRIPE_PUBLIC_KEY not set — Stripe disabled on client');
    return Promise.resolve(null);
  }

  stripePromiseCache = loadStripe(publishableKey);
  return stripePromiseCache;
}
