import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';
import type { 
  GiftCard, 
  GiftCardTheme,
  GiftCardValidationResult,
  InsertGiftCard,
  InsertGiftCardRedemption,
  InsertGiftCardBalanceAdjustment,
  InsertGiftCardValidationAttempt,
  GiftCardWithDetails 
} from '@shared/schema';

const BCRYPT_ROUNDS = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_VALIDATION_ATTEMPTS = 5;
const CODE_FORMAT = 'GC-XXXX-XXXX-XXXX';

export class GiftCardService {
  /**
   * Generate a cryptographically secure gift card code
   * Format: GC-XXXX-XXXX-XXXX (where X is alphanumeric uppercase)
   */
  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const generateSegment = (length: number): string => {
      let result = '';
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
      }
      return result;
    };

    return `GC-${generateSegment(4)}-${generateSegment(4)}-${generateSegment(4)}`;
  }

  /**
   * Hash a gift card code using bcrypt
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code.toUpperCase(), BCRYPT_ROUNDS);
  }

  /**
   * Verify a gift card code against a hash
   */
  async verifyCode(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code.toUpperCase(), hash);
  }

  /**
   * Extract the last 4 characters from a gift card code (for display/admin lookup)
   */
  getLast4(code: string): string {
    const cleaned = code.replace(/-/g, '');
    return cleaned.slice(-4).toUpperCase();
  }

  /**
   * Check if request is rate limited
   */
  async isRateLimited(ipAddress: string, sessionId?: string): Promise<boolean> {
    const ipAttempts = await storage.getRecentValidationAttempts(ipAddress, RATE_LIMIT_WINDOW_MINUTES);
    
    if (ipAttempts.length >= MAX_VALIDATION_ATTEMPTS) {
      return true;
    }

    if (sessionId) {
      const sessionAttempts = await storage.getRecentValidationAttemptsBySession(sessionId, RATE_LIMIT_WINDOW_MINUTES);
      if (sessionAttempts.length >= MAX_VALIDATION_ATTEMPTS) {
        return true;
      }
    }

    return false;
  }

  /**
   * Record a validation attempt for rate limiting
   */
  async recordValidationAttempt(
    ipAddress: string,
    sessionId: string | null,
    codeHash: string | null,
    wasSuccessful: boolean
  ): Promise<void> {
    await storage.createGiftCardValidationAttempt({
      ipAddress,
      sessionId,
      codeHash,
      wasSuccessful,
    });
  }

  /**
   * Validate a gift card code and return the gift card if valid
   */
  async validateCode(
    code: string,
    ipAddress: string,
    sessionId?: string
  ): Promise<GiftCardValidationResult> {
    if (await this.isRateLimited(ipAddress, sessionId)) {
      return {
        isValid: false,
        errorCode: 'RATE_LIMITED',
        errorMessage: 'Too many validation attempts. Please wait 15 minutes and try again.',
      };
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, '');
    const last4 = this.getLast4(normalizedCode);

    const matchingCards = await storage.getGiftCardByLast4(last4);

    let matchedCard: GiftCardWithDetails | undefined;

    for (const card of matchingCards) {
      const isMatch = await this.verifyCode(normalizedCode, card.codeHash);
      if (isMatch) {
        matchedCard = card;
        break;
      }
    }

    if (!matchedCard) {
      await this.recordValidationAttempt(ipAddress, sessionId || null, null, false);
      return {
        isValid: false,
        errorCode: 'NOT_FOUND',
        errorMessage: 'Invalid gift card code. Please check and try again.',
      };
    }

    await this.recordValidationAttempt(ipAddress, sessionId || null, matchedCard.codeHash, true);

    if (matchedCard.status === 'voided') {
      return {
        isValid: false,
        giftCard: matchedCard,
        errorCode: 'VOIDED',
        errorMessage: 'This gift card has been voided and cannot be used.',
      };
    }

    if (matchedCard.status === 'expired' || 
        (matchedCard.expiresAt && new Date(matchedCard.expiresAt) < new Date())) {
      return {
        isValid: false,
        giftCard: matchedCard,
        errorCode: 'EXPIRED',
        errorMessage: 'This gift card has expired.',
      };
    }

    const currentBalance = Number(matchedCard.currentBalance);
    if (currentBalance <= 0) {
      return {
        isValid: false,
        giftCard: matchedCard,
        errorCode: 'NO_BALANCE',
        errorMessage: 'This gift card has no remaining balance.',
        remainingBalance: 0,
      };
    }

    return {
      isValid: true,
      giftCard: matchedCard,
      remainingBalance: currentBalance,
    };
  }

  /**
   * Create a new gift card
   */
  async createGiftCard(data: {
    amount: number;
    themeId: string;
    deliveryMethod: 'email' | 'download';
    purchaserEmail: string;
    purchaserName: string;
    recipientEmail?: string;
    recipientName?: string;
    personalMessage?: string;
    scheduledDeliveryDate?: Date;
    orderId?: string;
    issuedByUserId?: string;
    expirationMonths?: number;
  }): Promise<{ giftCard: GiftCard; code: string }> {
    const code = this.generateCode();
    const codeHash = await this.hashCode(code);
    const codeLast4 = this.getLast4(code);

    const expirationMonths = data.expirationMonths || 12;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expirationMonths);

    const giftCardData: InsertGiftCard = {
      codeHash,
      codeLast4,
      originalAmount: String(data.amount),
      currentBalance: String(data.amount),
      status: 'active',
      themeId: data.themeId,
      deliveryMethod: data.deliveryMethod,
      deliveryStatus: 'pending',
      purchaserEmail: data.purchaserEmail,
      purchaserName: data.purchaserName,
      recipientEmail: data.recipientEmail || null,
      recipientName: data.recipientName || null,
      personalMessage: data.personalMessage || null,
      scheduledDeliveryDate: data.scheduledDeliveryDate || null,
      orderId: data.orderId || null,
      issuedByUserId: data.issuedByUserId || null,
      expiresAt,
    };

    const giftCard = await storage.createGiftCard(giftCardData);

    return { giftCard, code };
  }

  /**
   * Redeem (use) a gift card for a purchase
   * Returns the amount actually applied
   */
  async redeemGiftCard(data: {
    giftCardId: string;
    amount: number;
    userId?: string;
    orderId?: string;
    enrollmentId?: string;
    appointmentId?: string;
  }): Promise<{ amountApplied: number; remainingBalance: number }> {
    const giftCard = await storage.getGiftCard(data.giftCardId);
    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    if (giftCard.status === 'voided') {
      throw new Error('Gift card has been voided');
    }

    if (giftCard.status === 'expired' || 
        (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date())) {
      throw new Error('Gift card has expired');
    }

    const currentBalance = Number(giftCard.currentBalance);
    if (currentBalance <= 0) {
      throw new Error('Gift card has no remaining balance');
    }

    const amountToApply = Math.min(data.amount, currentBalance);
    const newBalance = currentBalance - amountToApply;

    let newStatus: 'active' | 'partially_used' | 'redeemed' = 'partially_used';
    if (newBalance <= 0) {
      newStatus = 'redeemed';
    }

    await storage.updateGiftCard(data.giftCardId, {
      currentBalance: String(newBalance),
      status: newStatus,
    });

    const redemption: InsertGiftCardRedemption = {
      giftCardId: data.giftCardId,
      amountRedeemed: String(amountToApply),
      balanceAfterRedemption: String(newBalance),
      orderId: data.orderId || null,
      enrollmentId: data.enrollmentId || null,
      appointmentId: data.appointmentId || null,
      userId: data.userId || null,
    };

    await storage.createGiftCardRedemption(redemption);

    return {
      amountApplied: amountToApply,
      remainingBalance: newBalance,
    };
  }

  /**
   * Admin balance adjustment (add or deduct balance with audit trail)
   */
  async adjustBalance(data: {
    giftCardId: string;
    adjustmentAmount: number;
    reason: string;
    adjustedByUserId: string;
  }): Promise<GiftCard> {
    const giftCard = await storage.getGiftCard(data.giftCardId);
    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    const previousBalance = Number(giftCard.currentBalance);
    const newBalance = previousBalance + data.adjustmentAmount;

    if (newBalance < 0) {
      throw new Error('Cannot adjust balance below zero');
    }

    let newStatus = giftCard.status;
    if (newBalance === 0 && previousBalance > 0) {
      newStatus = 'redeemed';
    } else if (newBalance > 0 && newBalance < Number(giftCard.originalAmount)) {
      newStatus = 'partially_used';
    } else if (newBalance === Number(giftCard.originalAmount)) {
      newStatus = 'active';
    }

    const adjustment: InsertGiftCardBalanceAdjustment = {
      giftCardId: data.giftCardId,
      previousBalance: String(previousBalance),
      newBalance: String(newBalance),
      adjustmentAmount: String(data.adjustmentAmount),
      reason: data.reason,
      adjustedByUserId: data.adjustedByUserId,
    };

    await storage.createGiftCardBalanceAdjustment(adjustment);

    return storage.updateGiftCard(data.giftCardId, {
      currentBalance: String(newBalance),
      status: newStatus,
    });
  }

  /**
   * Void a gift card (admin action)
   */
  async voidGiftCard(giftCardId: string, voidedByUserId: string, reason: string): Promise<GiftCard> {
    return storage.voidGiftCard(giftCardId, voidedByUserId, reason);
  }

  /**
   * Update delivery status after sending email
   */
  async markAsDelivered(giftCardId: string): Promise<GiftCard> {
    return storage.updateGiftCard(giftCardId, {
      deliveryStatus: 'sent',
      deliveredAt: new Date(),
    });
  }

  /**
   * Mark delivery as failed
   */
  async markDeliveryFailed(giftCardId: string): Promise<GiftCard> {
    return storage.updateGiftCard(giftCardId, {
      deliveryStatus: 'failed',
    });
  }

  /**
   * Get gift cards that need to be delivered
   */
  async getPendingDeliveries(): Promise<GiftCardWithDetails[]> {
    const allCards = await storage.getGiftCards({ status: 'active' });
    
    return allCards.filter(card => {
      if (card.deliveryStatus !== 'pending') return false;
      if (card.deliveryMethod !== 'email') return false;
      
      if (card.scheduledDeliveryDate) {
        return new Date(card.scheduledDeliveryDate) <= new Date();
      }
      
      return true;
    });
  }

  /**
   * Check and update expired gift cards
   */
  async processExpiredCards(): Promise<number> {
    const activeCards = await storage.getGiftCards({ status: 'active' });
    const partialCards = await storage.getGiftCards({ status: 'partially_used' });
    const allCards = [...activeCards, ...partialCards];
    
    let expiredCount = 0;
    const now = new Date();

    for (const card of allCards) {
      if (card.expiresAt && new Date(card.expiresAt) < now) {
        await storage.updateGiftCard(card.id, { status: 'expired' });
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Get all themes for display
   */
  async getActiveThemes(): Promise<GiftCardTheme[]> {
    return storage.getActiveGiftCardThemes();
  }

  /**
   * Get gift card details for admin view
   */
  async getGiftCardDetails(giftCardId: string): Promise<GiftCardWithDetails | undefined> {
    return storage.getGiftCard(giftCardId);
  }

  /**
   * Get all gift cards for admin management
   */
  async getAllGiftCards(filters?: { status?: string }): Promise<GiftCardWithDetails[]> {
    return storage.getGiftCards(filters);
  }

  /**
   * Get redemption history for a gift card
   */
  async getRedemptionHistory(giftCardId: string) {
    return storage.getGiftCardRedemptions(giftCardId);
  }

  /**
   * Get balance adjustment history for a gift card
   */
  async getAdjustmentHistory(giftCardId: string) {
    return storage.getGiftCardBalanceAdjustments(giftCardId);
  }
}

export const giftCardService = new GiftCardService();
