import Stripe from 'stripe';
import { storage } from './storage';
import { decrypt, isEncryptionConfigured } from './utils/encryption';

let connectionSettings: any;

async function getCredentialsFromReplit() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

async function getCredentialsFromDatabase(): Promise<{ secretKey: string; publishableKey: string | null } | null> {
  try {
    if (!isEncryptionConfigured()) {
      console.log('Encryption not configured, cannot use database credentials');
      return null;
    }

    const credentials = await storage.getStripeCredentials();
    if (!credentials) {
      return null;
    }

    const secretKey = decrypt({
      encrypted: credentials.encryptedSecretKey,
      iv: credentials.secretKeyIv,
      authTag: credentials.secretKeyAuthTag,
    });

    let publishableKey: string | null = null;
    if (credentials.encryptedPublishableKey && credentials.publishableKeyIv && credentials.publishableKeyAuthTag) {
      publishableKey = decrypt({
        encrypted: credentials.encryptedPublishableKey,
        iv: credentials.publishableKeyIv,
        authTag: credentials.publishableKeyAuthTag,
      });
    }

    return { secretKey, publishableKey };
  } catch (error) {
    console.error('Error retrieving credentials from database:', error);
    return null;
  }
}

async function getCredentials(): Promise<{ secretKey: string; publishableKey: string | null }> {
  // First priority: Environment variable secrets (manually entered)
  const envSecretKey = process.env.STRIPE_SECRET_KEY;
  const envPublishableKey = process.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (envSecretKey) {
    console.log('Using Stripe credentials from environment secrets');
    return {
      secretKey: envSecretKey,
      publishableKey: envPublishableKey || null,
    };
  }

  // Second priority: Database credentials (admin-entered keys)
  const dbCredentials = await getCredentialsFromDatabase();
  if (dbCredentials) {
    console.log('Using Stripe credentials from database');
    return dbCredentials;
  }

  // Fall back to Replit connectors
  console.log('Trying Replit connectors for Stripe credentials');
  return getCredentialsFromReplit();
}

let stripeClient: Stripe | null = null;
let stripeSecretKey: string | null = null;
let stripePublishableKey: string | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeClient) {
    const { secretKey } = await getCredentials();
    stripeSecretKey = secretKey;
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  if (!publishableKey) {
    throw new Error('Stripe publishable key not found');
  }
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

export function resetStripeClientCache(): void {
  stripeClient = null;
  stripeSecretKey = null;
  stripePublishableKey = null;
  console.log('Stripe client cache reset');
}

export async function validateStripeSecretKey(secretKey: string): Promise<boolean> {
  try {
    const testClient = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
    await testClient.balance.retrieve();
    return true;
  } catch (error) {
    console.error('Stripe key validation failed:', error);
    return false;
  }
}
