import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { giftCardService } from './service';
import { giftCardPurchaseRequestSchema, insertGiftCardThemeSchema } from '@shared/schema';
import { z } from 'zod';
import { getStripeClient } from '../stripeClient';
import { markRecoveryCompleted } from '../services/abandonedCartService';
import { processGiftCardDelivery, generateGiftCardPdf } from './delivery';
import multer from 'multer';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { isAuthenticated, requireAdminOrHigher } from '../customAuth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         req.socket.remoteAddress || 
         'unknown';
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Get active themes for purchase page
router.get('/themes', async (req: Request, res: Response) => {
  try {
    const themes = await giftCardService.getActiveThemes();
    res.json(themes);
  } catch (error) {
    console.error('Error fetching gift card themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Validate a gift card code
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift card code is required' });
    }

    const ipAddress = getClientIp(req);
    const sessionId = req.session?.id || undefined;

    const result = await giftCardService.validateCode(code, ipAddress, sessionId);
    
    if (!result.isValid) {
      return res.status(400).json(result);
    }

    res.json({
      isValid: true,
      giftCardId: result.giftCard?.id,
      remainingBalance: result.remainingBalance,
      status: result.giftCard?.status,
    });
  } catch (error) {
    console.error('Error validating gift card:', error);
    res.status(500).json({ error: 'Failed to validate gift card' });
  }
});

// Create payment intent for gift card purchase
router.post('/purchase/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing is not configured' });
    }

    const validated = giftCardPurchaseRequestSchema.parse(req.body);
    
    const amountInCents = Math.round(validated.amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        type: 'gift_card_purchase',
        themeId: validated.themeId,
        deliveryMethod: validated.deliveryMethod,
        purchaserEmail: validated.purchaserEmail,
        purchaserName: validated.purchaserName,
        recipientEmail: validated.recipientEmail || '',
        recipientName: validated.recipientName || '',
        personalMessage: validated.personalMessage || '',
        scheduledDeliveryDate: validated.scheduledDeliveryDate || '',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: validated.amount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Complete gift card purchase after successful payment
router.post('/purchase/complete', async (req: Request, res: Response) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing is not configured' });
    }

    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Mark abandoned cart recovery as completed if applicable
    await markRecoveryCompleted(paymentIntentId);

    const metadata = paymentIntent.metadata;
    if (metadata.type !== 'gift_card_purchase') {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const { giftCard, code } = await giftCardService.createGiftCard({
      amount: paymentIntent.amount / 100,
      themeId: metadata.themeId,
      deliveryMethod: metadata.deliveryMethod as 'email' | 'download',
      purchaserEmail: metadata.purchaserEmail,
      purchaserName: metadata.purchaserName,
      recipientEmail: metadata.recipientEmail || undefined,
      recipientName: metadata.recipientName || undefined,
      personalMessage: metadata.personalMessage || undefined,
      scheduledDeliveryDate: metadata.scheduledDeliveryDate ? new Date(metadata.scheduledDeliveryDate) : undefined,
      issuedByUserId: (req.user as any)?.id || undefined,
    });

    const responseData: any = {
      success: true,
      giftCardId: giftCard.id,
      amount: Number(giftCard.originalAmount),
      deliveryMethod: giftCard.deliveryMethod,
    };

    if (metadata.deliveryMethod === 'download') {
      responseData.code = code;
      responseData.expiresAt = giftCard.expiresAt;
    }

    // Process email delivery asynchronously (don't block response)
    processGiftCardDelivery(giftCard.id, code).catch(err => {
      console.error('Error processing gift card delivery:', err);
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error completing gift card purchase:', error);
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
});

// ============================================
// ADMIN ROUTES (require admin/superadmin role)
// ============================================

// Use the standard auth middleware from customAuth
const requireAdmin = [isAuthenticated, requireAdminOrHigher];

// Get all gift cards (admin)
router.get('/admin/list', requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const giftCards = await giftCardService.getAllGiftCards(status ? { status } : undefined);
    res.json(giftCards);
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({ error: 'Failed to fetch gift cards' });
  }
});

// Get single gift card details (admin)
router.get('/admin/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const giftCard = await giftCardService.getGiftCardDetails(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ error: 'Gift card not found' });
    }
    
    const redemptions = await giftCardService.getRedemptionHistory(req.params.id);
    const adjustments = await giftCardService.getAdjustmentHistory(req.params.id);
    
    res.json({
      ...giftCard,
      redemptionHistory: redemptions,
      adjustmentHistory: adjustments,
    });
  } catch (error) {
    console.error('Error fetching gift card details:', error);
    res.status(500).json({ error: 'Failed to fetch gift card details' });
  }
});

// Search gift cards by last 4 digits (admin)
router.get('/admin/search/:last4', requireAdmin, async (req: Request, res: Response) => {
  try {
    const last4 = req.params.last4.toUpperCase();
    if (last4.length !== 4) {
      return res.status(400).json({ error: 'Last 4 digits required' });
    }
    
    const giftCards = await storage.getGiftCardByLast4(last4);
    res.json(giftCards);
  } catch (error) {
    console.error('Error searching gift cards:', error);
    res.status(500).json({ error: 'Failed to search gift cards' });
  }
});

// Void a gift card (admin)
router.post('/admin/:id/void', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Void reason is required' });
    }

    const user = req.user as any;
    const giftCard = await giftCardService.voidGiftCard(req.params.id, user.id, reason);
    res.json(giftCard);
  } catch (error) {
    console.error('Error voiding gift card:', error);
    res.status(500).json({ error: 'Failed to void gift card' });
  }
});

// Adjust gift card balance (admin)
router.post('/admin/:id/adjust-balance', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { adjustmentAmount, reason } = req.body;
    
    if (typeof adjustmentAmount !== 'number' || isNaN(adjustmentAmount)) {
      return res.status(400).json({ error: 'Valid adjustment amount is required' });
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Adjustment reason is required' });
    }

    const user = req.user as any;
    const giftCard = await giftCardService.adjustBalance({
      giftCardId: req.params.id,
      adjustmentAmount,
      reason,
      adjustedByUserId: user.id,
    });
    res.json(giftCard);
  } catch (error: any) {
    console.error('Error adjusting gift card balance:', error);
    res.status(400).json({ error: error.message || 'Failed to adjust balance' });
  }
});

// Create gift card manually (admin - for promotions, replacements, etc.)
router.post('/admin/create', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { amount, themeId, recipientEmail, recipientName, personalMessage, expirationMonths } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!themeId) {
      return res.status(400).json({ error: 'Theme ID is required' });
    }

    const user = req.user as any;
    
    const { giftCard, code } = await giftCardService.createGiftCard({
      amount,
      themeId,
      deliveryMethod: 'download',
      purchaserEmail: user.email,
      purchaserName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      recipientEmail,
      recipientName,
      personalMessage,
      issuedByUserId: user.id,
      expirationMonths: expirationMonths || 12,
    });

    res.json({
      giftCard,
      code,
    });
  } catch (error) {
    console.error('Error creating gift card:', error);
    res.status(500).json({ error: 'Failed to create gift card' });
  }
});

// Generate PDF for a gift card (admin only - requires knowing the full code)
router.post('/admin/:id/generate-pdf', requireAdmin, async (req: Request, res: Response) => {
  try {
    const giftCard = await storage.getGiftCardById(req.params.id);
    if (!giftCard) {
      return res.status(404).json({ error: 'Gift card not found' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Gift card code is required' });
    }

    const theme = giftCard.themeId 
      ? await storage.getGiftCardThemeById(giftCard.themeId)
      : undefined;

    const pdfBuffer = await generateGiftCardPdf({
      giftCard,
      theme: theme || undefined,
      code,
      recipientName: giftCard.recipientName || undefined,
      purchaserName: giftCard.purchaserName || 'A friend',
      personalMessage: giftCard.personalMessage || undefined,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gift-card-${giftCard.codeLast4}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating gift card PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============================================
// THEME MANAGEMENT (admin)
// ============================================

// Get all themes (admin)
router.get('/admin/themes/all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const themes = await storage.getGiftCardThemes();
    res.json(themes);
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Upload theme image (admin)
router.post('/admin/themes/upload-image', requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase() || 'png';
    const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const finalExt = validExts.includes(fileExt) ? fileExt : 'png';
    const pathname = `gift-card-themes/${randomUUID()}.${finalExt}`;

    console.log('Uploading gift card theme image to Vercel Blob:', { pathname, contentType: req.file.mimetype });

    const blob = await put(pathname, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
      addRandomSuffix: false,
    });

    console.log('Gift card theme image uploaded successfully:', blob.url);
    res.json({ url: blob.url });
  } catch (error: any) {
    console.error('Error uploading theme image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Theme images are now uploaded to Vercel Blob with public access.
// The URL returned from upload is a public Vercel Blob URL that can be accessed directly.
// This route is kept for backward compatibility but redirects to the blob URL if it looks like one,
// or returns 404 for legacy GCS paths.
router.get('/theme-image/:filename', async (req: Request, res: Response) => {
  // New uploads return full Vercel Blob URLs stored directly in the theme record.
  // This proxy route is no longer needed for new uploads — the imageUrl on the theme
  // is a direct public URL. Return 404 for any legacy proxy requests.
  return res.status(404).json({ error: 'Image not found. Theme images are now served directly from their URLs.' });
});

// Create theme (admin)
router.post('/admin/themes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const validated = insertGiftCardThemeSchema.parse(req.body);
    const theme = await storage.createGiftCardTheme(validated);
    res.json(theme);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid theme data', details: error.errors });
    }
    console.error('Error creating theme:', error);
    res.status(500).json({ error: 'Failed to create theme' });
  }
});

// Update theme (admin)
router.patch('/admin/themes/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const theme = await storage.updateGiftCardTheme(req.params.id, req.body);
    res.json(theme);
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

// Delete theme (admin)
router.delete('/admin/themes/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await storage.deleteGiftCardTheme(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({ error: 'Failed to delete theme' });
  }
});

// ============================================
// CHECKOUT INTEGRATION ROUTES
// ============================================

// Apply gift card at checkout (used during enrollment/appointment payment)
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { code, amount } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift card code is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const ipAddress = getClientIp(req);
    const sessionId = req.session?.id || undefined;

    const validation = await giftCardService.validateCode(code, ipAddress, sessionId);
    
    if (!validation.isValid) {
      return res.status(400).json(validation);
    }

    const amountToApply = Math.min(amount, validation.remainingBalance || 0);

    res.json({
      isValid: true,
      giftCardId: validation.giftCard?.id,
      amountToApply,
      remainingBalance: validation.remainingBalance,
      amountLeft: (validation.remainingBalance || 0) - amountToApply,
    });
  } catch (error) {
    console.error('Error applying gift card:', error);
    res.status(500).json({ error: 'Failed to apply gift card' });
  }
});

// Redeem gift card (called after successful payment to actually deduct balance)
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { giftCardId, amount, enrollmentId, appointmentId, orderId } = req.body;
    
    if (!giftCardId) {
      return res.status(400).json({ error: 'Gift card ID is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const user = req.user as any;
    
    const result = await giftCardService.redeemGiftCard({
      giftCardId,
      amount,
      userId: user?.id,
      enrollmentId,
      appointmentId,
      orderId,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error redeeming gift card:', error);
    res.status(400).json({ error: error.message || 'Failed to redeem gift card' });
  }
});

export default router;
