import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromiseCache: Promise<Stripe | null> | null = null;

export async function getStripePromise(): Promise<Promise<Stripe | null> | null> {
  if (stripePromiseCache) {
    return stripePromiseCache;
  }
  
  try {
    const response = await fetch('/api/stripe-connect/public-key');
    const data = await response.json();
    
    if (data.configured && data.publishableKey) {
      stripePromiseCache = loadStripe(data.publishableKey);
      return stripePromiseCache;
    }
  } catch (error) {
    console.error('Failed to fetch Stripe publishable key:', error);
  }
  
  return null;
}

export function resetStripePromiseCache(): void {
  stripePromiseCache = null;
}
