import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { isAuthenticated } from '../customAuth';
import { getStripeClient, resetStripeClientCache, validateStripeSecretKey } from '../stripeClient';
import { storage } from '../storage';
import { encrypt, extractKeyMetadata, isEncryptionConfigured } from '../utils/encryption';

export const stripeConnectRouter = Router();

let stripe: Stripe | null = null;

async function ensureStripeInitialized(): Promise<Stripe | null> {
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

function resetStripeClient(): void {
  stripe = null;
  resetStripeClientCache();
}

// Check Stripe configuration status
stripeConnectRouter.get('/status', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Instructor or admin access required' });
    }

    const settings = await storage.getAppSettings();
    const stripeOnboarded = settings?.stripeOnboarded ?? false;

    if (!stripeOnboarded) {
      const credentials = await storage.getStripeCredentials();
      return res.json({
        configured: false,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        hasStoredCredentials: !!credentials,
        encryptionConfigured: isEncryptionConfigured(),
        message: 'Stripe is not connected. Enter your API keys to set up payments.'
      });
    }

    const stripeClient = await ensureStripeInitialized();
    
    if (!stripeClient) {
      return res.json({
        configured: false,
        onboarded: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        encryptionConfigured: isEncryptionConfigured(),
        message: 'Stripe API keys need to be configured.'
      });
    }

    try {
      await stripeClient.balance.retrieve();
      
      const credentials = await storage.getStripeCredentials();
      
      return res.json({
        configured: true,
        onboarded: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        businessName: 'Apache Solutions',
        keyPrefix: credentials?.secretKeyPrefix || 'sk_***',
        keyLast4: credentials?.secretKeyLast4 || '****',
        message: 'Stripe is configured and ready to accept payments.'
      });
    } catch (balanceError: any) {
      console.error('Error verifying Stripe API key:', balanceError);
      return res.json({
        configured: false,
        onboarded: true,
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

// Save Stripe credentials (admin submits API keys through web UI)
stripeConnectRouter.post('/credentials', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { secretKey, publishableKey } = req.body;

    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key is required' });
    }

    if (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_')) {
      return res.status(400).json({ error: 'Invalid secret key format. Must start with sk_live_ or sk_test_' });
    }

    if (publishableKey && !publishableKey.startsWith('pk_live_') && !publishableKey.startsWith('pk_test_')) {
      return res.status(400).json({ error: 'Invalid publishable key format. Must start with pk_live_ or pk_test_' });
    }

    if (!isEncryptionConfigured()) {
      return res.status(500).json({ 
        error: 'Encryption is not configured. Please contact the administrator.',
        details: 'ENCRYPTION_MASTER_KEY environment variable is not set.'
      });
    }

    // Validate the secret key with Stripe
    const isValid = await validateStripeSecretKey(secretKey);
    if (!isValid) {
      return res.status(400).json({ 
        error: 'Invalid Stripe API key. Please check your key and try again.',
        details: 'The key could not be validated with Stripe.'
      });
    }

    // Encrypt the keys
    const secretKeyEncrypted = encrypt(secretKey);
    const secretKeyMeta = extractKeyMetadata(secretKey);

    let publishableKeyEncrypted = null;
    let publishableKeyMeta = null;
    if (publishableKey) {
      publishableKeyEncrypted = encrypt(publishableKey);
      publishableKeyMeta = extractKeyMetadata(publishableKey);
    }

    // Save to database
    await storage.saveStripeCredentials({
      encryptedSecretKey: secretKeyEncrypted.encrypted,
      secretKeyIv: secretKeyEncrypted.iv,
      secretKeyAuthTag: secretKeyEncrypted.authTag,
      secretKeyLast4: secretKeyMeta.last4,
      secretKeyPrefix: secretKeyMeta.prefix,
      encryptedPublishableKey: publishableKeyEncrypted?.encrypted || null,
      publishableKeyIv: publishableKeyEncrypted?.iv || null,
      publishableKeyAuthTag: publishableKeyEncrypted?.authTag || null,
      publishableKeyLast4: publishableKeyMeta?.last4 || null,
      publishableKeyPrefix: publishableKeyMeta?.prefix || null,
      isActive: true,
    });

    // Mark Stripe as onboarded
    await storage.updateAppSettings({ stripeOnboarded: true });

    // Reset client cache to use new credentials
    resetStripeClient();

    console.log(`Stripe credentials saved by admin ${user.id}`);

    res.json({ 
      success: true, 
      message: 'Stripe API keys saved and validated successfully.',
      configured: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      keyPrefix: secretKeyMeta.prefix,
      keyLast4: secretKeyMeta.last4,
    });
  } catch (error: any) {
    console.error('Error saving Stripe credentials:', error);
    res.status(500).json({ error: 'Failed to save Stripe credentials' });
  }
});

// Legacy onboard endpoint (for backwards compatibility)
stripeConnectRouter.post('/onboard', isAuthenticated, async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stripeClient = await ensureStripeInitialized();
    
    if (!stripeClient) {
      return res.status(400).json({ 
        error: 'Please enter your Stripe API keys first.',
        step: 'add_api_key'
      });
    }

    try {
      await stripeClient.balance.retrieve();
    } catch (balanceError: any) {
      console.error('Stripe API key validation failed:', balanceError);
      return res.status(400).json({ 
        error: 'Stripe API key is invalid or has insufficient permissions.',
        step: 'verify_api_key'
      });
    }

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

    await storage.updateAppSettings({ stripeOnboarded: false });
    await storage.deleteStripeCredentials();
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
    const credentials = await storage.getStripeCredentials();
    
    res.json({
      onboarded: settings?.stripeOnboarded ?? false,
      apiKeyConfigured: !!stripeClient,
      hasStoredCredentials: !!credentials,
      encryptionConfigured: isEncryptionConfigured(),
      message: settings?.stripeOnboarded 
        ? 'Stripe is configured. All payments go directly to Apache Solutions.' 
        : 'Stripe is not yet configured. Enter your API keys to accept payments.'
    });
  } catch (error: any) {
    console.error('Error fetching Stripe config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});
