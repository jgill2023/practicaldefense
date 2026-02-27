import crypto from 'crypto';
import { db } from '../db';
import {
  abandonedCartRecovery,
  onlineCourseEnrollments,
  merchOrders,
  enrollments,
  courses,
  users,
  type AbandonedCartRecovery,
} from '@shared/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { sendEmail } from '../emailService';
import { sendSms } from '../smsService';
import { getStripeClient } from '../stripeClient';

const APP_URL = process.env.APP_URL || process.env.VITE_APP_URL || 'https://practicaldefense.vercel.app';
const RECOVERY_TOKEN_EXPIRY_DAYS = 7;
const DEFAULT_FROM_EMAIL = 'Info@abqconcealedcarry.com';

// ============================================
// DETECTION: Find new abandoned carts
// ============================================

async function detectAbandonedOnlineCourses(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const pending = await db.select()
    .from(onlineCourseEnrollments)
    .where(
      and(
        eq(onlineCourseEnrollments.status, 'pending_payment'),
        lt(onlineCourseEnrollments.createdAt, oneHourAgo),
      )
    );

  for (const enrollment of pending) {
    if (await alreadyTracked('online_course', enrollment.id)) continue;
    if (await stripePaymentSucceeded(enrollment.stripePaymentIntentId)) continue;

    await createRecoveryRecord({
      cartType: 'online_course',
      sourceRecordId: enrollment.id,
      stripePaymentIntentId: enrollment.stripePaymentIntentId || undefined,
      customerEmail: enrollment.email,
      customerPhone: enrollment.phone,
      customerFirstName: enrollment.firstName,
      itemDescription: enrollment.courseName,
      amount: enrollment.totalAmount || enrollment.amountPaid || '0',
      cartAbandonedAt: enrollment.createdAt,
    });
  }
}

async function detectAbandonedMerchOrders(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const pending = await db.select()
    .from(merchOrders)
    .where(
      and(
        eq(merchOrders.status, 'pending'),
        lt(merchOrders.createdAt, oneHourAgo),
        isNull(merchOrders.paidAt),
      )
    );

  for (const order of pending) {
    if (await alreadyTracked('merch_order', order.id)) continue;
    if (await stripePaymentSucceeded(order.stripePaymentIntentId)) continue;

    await createRecoveryRecord({
      cartType: 'merch_order',
      sourceRecordId: order.id,
      stripePaymentIntentId: order.stripePaymentIntentId || undefined,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone || undefined,
      customerFirstName: order.customerFirstName,
      itemDescription: `Merch Order ($${order.total})`,
      amount: order.total,
      cartAbandonedAt: order.createdAt!,
    });
  }
}

async function detectAbandonedInPersonEnrollments(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const pending = await db.select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.status, 'initiated'),
        eq(enrollments.paymentStatus, 'pending'),
        lt(enrollments.createdAt, oneHourAgo),
      )
    );

  for (const enrollment of pending) {
    if (await alreadyTracked('in_person_course', enrollment.id)) continue;
    if (await stripePaymentSucceeded(enrollment.stripePaymentIntentId)) continue;

    // Get contact info from student record or studentInfo JSONB
    let email = '';
    let phone = '';
    let firstName = '';

    if (enrollment.studentId) {
      const [student] = await db.select()
        .from(users)
        .where(eq(users.id, enrollment.studentId))
        .limit(1);
      if (student) {
        email = student.email;
        phone = student.phone || '';
        firstName = student.firstName || '';
      }
    } else if (enrollment.studentInfo) {
      const info = enrollment.studentInfo as any;
      email = info.email || '';
      phone = info.phone || '';
      firstName = info.firstName || '';
    }

    if (!email) continue;

    const [course] = await db.select({ title: courses.title })
      .from(courses)
      .where(eq(courses.id, enrollment.courseId))
      .limit(1);

    await createRecoveryRecord({
      cartType: 'in_person_course',
      sourceRecordId: enrollment.id,
      stripePaymentIntentId: enrollment.stripePaymentIntentId || undefined,
      customerEmail: email,
      customerPhone: phone || undefined,
      customerFirstName: firstName,
      itemDescription: course?.title || 'Course Registration',
      amount: '0',
      cartAbandonedAt: enrollment.createdAt!,
    });
  }
}

async function detectAbandonedGiftCards(): Promise<void> {
  const stripe = getStripeClient();
  if (!stripe) return;

  const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
  const threeDaysAgo = Math.floor((Date.now() - 72 * 60 * 60 * 1000) / 1000);

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: threeDaysAgo, lte: oneHourAgo },
      limit: 100,
    });

    for (const pi of paymentIntents.data) {
      if (pi.metadata?.type !== 'gift_card_purchase') continue;
      if (pi.status === 'succeeded' || pi.status === 'canceled') continue;

      if (await alreadyTracked('gift_card', pi.id)) continue;

      await createRecoveryRecord({
        cartType: 'gift_card',
        sourceRecordId: pi.id,
        stripePaymentIntentId: pi.id,
        customerEmail: pi.metadata.purchaserEmail || '',
        customerPhone: undefined,
        customerFirstName: pi.metadata.purchaserName?.split(' ')[0] || '',
        itemDescription: `Gift Card ($${(pi.amount / 100).toFixed(2)})`,
        amount: (pi.amount / 100).toFixed(2),
        cartAbandonedAt: new Date(pi.created * 1000),
      });
    }
  } catch (error) {
    console.error('[AbandonedCart] Error detecting gift card abandonments:', error);
  }
}

// ============================================
// TOUCH SENDING
// ============================================

async function sendPendingTouches(): Promise<void> {
  const now = new Date();

  const active = await db.select()
    .from(abandonedCartRecovery)
    .where(eq(abandonedCartRecovery.status, 'active'));

  for (const recovery of active) {
    // Verify payment hasn't completed
    if (await isPaymentCompleted(recovery)) {
      await db.update(abandonedCartRecovery)
        .set({ status: 'recovered', recoveredAt: now, updatedAt: now })
        .where(eq(abandonedCartRecovery.id, recovery.id));
      console.log(`[AbandonedCart] Marked recovered: ${recovery.customerEmail} (${recovery.cartType})`);
      continue;
    }

    // Verify source record is still valid
    if (!(await isSourceRecordValid(recovery))) {
      await db.update(abandonedCartRecovery)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(abandonedCartRecovery.id, recovery.id));
      continue;
    }

    const hoursSinceAbandoned = (now.getTime() - recovery.cartAbandonedAt.getTime()) / (60 * 60 * 1000);

    // Touch 1: Email at 1hr
    if (!recovery.touch1SentAt && hoursSinceAbandoned >= 1) {
      await sendTouch1Email(recovery);
    }

    // Touch 2: SMS at 24hr
    if (!recovery.touch2SentAt && recovery.touch1SentAt && hoursSinceAbandoned >= 24) {
      await sendTouch2Sms(recovery);
    }

    // Touch 3: Final email at 72hr
    if (!recovery.touch3SentAt && recovery.touch2SentAt && hoursSinceAbandoned >= 72) {
      await sendTouch3Email(recovery);
    }

    // Expire after all 3 touches + 24hr grace period
    if (recovery.touch3SentAt) {
      const hoursSinceTouch3 = (now.getTime() - recovery.touch3SentAt.getTime()) / (60 * 60 * 1000);
      if (hoursSinceTouch3 > 24) {
        await db.update(abandonedCartRecovery)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(abandonedCartRecovery.id, recovery.id));
      }
    }
  }
}

function getRecoveryUrl(token: string): string {
  return `${APP_URL}/recover?token=${token}`;
}

async function sendTouch1Email(recovery: AbandonedCartRecovery): Promise<void> {
  const recoveryUrl = getRecoveryUrl(recovery.recoveryToken);
  const firstName = recovery.customerFirstName || 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #004149; margin-bottom: 20px;">Complete Your Order</h1>
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px;">
          It looks like you started checking out for <strong>${recovery.itemDescription}</strong> but didn't finish.
          No worries — your spot is still available!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}"
             style="display: inline-block; background-color: #004149; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Complete Your Purchase
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          If you had any trouble, just reply to this email and we'll help.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training<br>
          This is an automated message.
        </p>
      </div>
    </body>
    </html>
  `;

  const result = await sendEmail({
    to: recovery.customerEmail,
    from: DEFAULT_FROM_EMAIL,
    subject: `Complete Your ${recovery.itemDescription} Purchase`,
    html,
  });

  if (result.success) {
    await db.update(abandonedCartRecovery)
      .set({ touch1SentAt: new Date(), updatedAt: new Date() })
      .where(eq(abandonedCartRecovery.id, recovery.id));
  }

  console.log(`[AbandonedCart] Touch 1 email ${result.success ? 'sent' : 'failed'} for ${recovery.customerEmail} (${recovery.cartType})`);
}

async function sendTouch2Sms(recovery: AbandonedCartRecovery): Promise<void> {
  if (!recovery.customerPhone) {
    // Skip SMS, mark as sent to not block touch 3
    await db.update(abandonedCartRecovery)
      .set({ touch2SentAt: new Date(), updatedAt: new Date() })
      .where(eq(abandonedCartRecovery.id, recovery.id));
    return;
  }

  const recoveryUrl = getRecoveryUrl(recovery.recoveryToken);
  const firstName = recovery.customerFirstName || '';

  // Generic SMS — no firearms/training terms to pass SHAFT content filtering
  const smsBody = `Hi${firstName ? ' ' + firstName : ''}, you have an incomplete order at Practical Defense. Complete your purchase here: ${recoveryUrl}`;

  const result = await sendSms({
    to: recovery.customerPhone,
    body: smsBody,
    purpose: 'administrative',
  });

  if (result.success) {
    await db.update(abandonedCartRecovery)
      .set({ touch2SentAt: new Date(), updatedAt: new Date() })
      .where(eq(abandonedCartRecovery.id, recovery.id));
  }

  console.log(`[AbandonedCart] Touch 2 SMS ${result.success ? 'sent' : 'failed'} for ${recovery.customerPhone} (${recovery.cartType})`);
}

async function sendTouch3Email(recovery: AbandonedCartRecovery): Promise<void> {
  const recoveryUrl = getRecoveryUrl(recovery.recoveryToken);
  const firstName = recovery.customerFirstName || 'there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #004149; margin-bottom: 20px;">Last Chance: Complete Your Order</h1>
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px;">
          We noticed you still haven't completed your purchase for
          <strong>${recovery.itemDescription}</strong>.
          We're holding your spot, but availability may change.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}"
             style="display: inline-block; background-color: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Finish Checkout Now
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          If you've changed your mind, no action is needed. This is our last reminder.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training<br>
          This is an automated message.
        </p>
      </div>
    </body>
    </html>
  `;

  const result = await sendEmail({
    to: recovery.customerEmail,
    from: DEFAULT_FROM_EMAIL,
    subject: `Last Chance: ${recovery.itemDescription}`,
    html,
  });

  if (result.success) {
    await db.update(abandonedCartRecovery)
      .set({ touch3SentAt: new Date(), updatedAt: new Date() })
      .where(eq(abandonedCartRecovery.id, recovery.id));
  }

  console.log(`[AbandonedCart] Touch 3 email ${result.success ? 'sent' : 'failed'} for ${recovery.customerEmail} (${recovery.cartType})`);
}

// ============================================
// HELPERS
// ============================================

async function alreadyTracked(cartType: string, sourceRecordId: string): Promise<boolean> {
  const existing = await db.select({ id: abandonedCartRecovery.id })
    .from(abandonedCartRecovery)
    .where(
      and(
        eq(abandonedCartRecovery.cartType, cartType as any),
        eq(abandonedCartRecovery.sourceRecordId, sourceRecordId),
      )
    )
    .limit(1);
  return existing.length > 0;
}

async function stripePaymentSucceeded(paymentIntentId: string | null | undefined): Promise<boolean> {
  if (!paymentIntentId) return false;
  const stripe = getStripeClient();
  if (!stripe) return false;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return pi.status === 'succeeded';
  } catch {
    return false;
  }
}

async function isPaymentCompleted(recovery: AbandonedCartRecovery): Promise<boolean> {
  if (await stripePaymentSucceeded(recovery.stripePaymentIntentId)) return true;

  switch (recovery.cartType) {
    case 'online_course': {
      const [row] = await db.select({ status: onlineCourseEnrollments.status })
        .from(onlineCourseEnrollments)
        .where(eq(onlineCourseEnrollments.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.status !== 'pending_payment';
    }
    case 'merch_order': {
      const [row] = await db.select({ status: merchOrders.status })
        .from(merchOrders)
        .where(eq(merchOrders.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.status !== 'pending';
    }
    case 'in_person_course': {
      const [row] = await db.select({ paymentStatus: enrollments.paymentStatus })
        .from(enrollments)
        .where(eq(enrollments.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.paymentStatus !== 'pending';
    }
    default:
      return false;
  }
}

async function isSourceRecordValid(recovery: AbandonedCartRecovery): Promise<boolean> {
  switch (recovery.cartType) {
    case 'online_course': {
      const [row] = await db.select({ status: onlineCourseEnrollments.status })
        .from(onlineCourseEnrollments)
        .where(eq(onlineCourseEnrollments.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.status === 'pending_payment';
    }
    case 'merch_order': {
      const [row] = await db.select({ status: merchOrders.status })
        .from(merchOrders)
        .where(eq(merchOrders.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.status === 'pending';
    }
    case 'in_person_course': {
      const [row] = await db.select({ status: enrollments.status })
        .from(enrollments)
        .where(eq(enrollments.id, recovery.sourceRecordId))
        .limit(1);
      return !!row && row.status === 'initiated';
    }
    case 'gift_card': {
      const stripe = getStripeClient();
      if (!stripe) return false;
      try {
        const pi = await stripe.paymentIntents.retrieve(recovery.sourceRecordId);
        return !['succeeded', 'canceled'].includes(pi.status);
      } catch { return false; }
    }
    default:
      return false;
  }
}

async function createRecoveryRecord(data: {
  cartType: 'online_course' | 'in_person_course' | 'merch_order' | 'gift_card';
  sourceRecordId: string;
  stripePaymentIntentId?: string;
  customerEmail: string;
  customerPhone?: string;
  customerFirstName: string;
  itemDescription: string;
  amount: string;
  cartAbandonedAt: Date;
}): Promise<void> {
  const recoveryToken = crypto.randomBytes(32).toString('hex');
  const recoveryTokenExpiresAt = new Date(
    Date.now() + RECOVERY_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(abandonedCartRecovery).values({
    cartType: data.cartType,
    sourceRecordId: data.sourceRecordId,
    stripePaymentIntentId: data.stripePaymentIntentId || null,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone || null,
    customerFirstName: data.customerFirstName || null,
    itemDescription: data.itemDescription,
    amount: data.amount,
    recoveryToken,
    recoveryTokenExpiresAt,
    status: 'active',
    cartAbandonedAt: data.cartAbandonedAt,
  });

  console.log(`[AbandonedCart] Created recovery record for ${data.customerEmail} (${data.cartType}: ${data.itemDescription})`);
}

// ============================================
// PUBLIC: Mark recovery as completed (called from payment confirm endpoints)
// ============================================

export async function markRecoveryCompleted(stripePaymentIntentId: string): Promise<void> {
  const [record] = await db.select()
    .from(abandonedCartRecovery)
    .where(
      and(
        eq(abandonedCartRecovery.stripePaymentIntentId, stripePaymentIntentId),
        eq(abandonedCartRecovery.status, 'active'),
      )
    )
    .limit(1);

  if (record) {
    await db.update(abandonedCartRecovery)
      .set({ status: 'recovered', recoveredAt: new Date(), updatedAt: new Date() })
      .where(eq(abandonedCartRecovery.id, record.id));
    console.log(`[AbandonedCart] Marked recovered via payment confirm: ${record.customerEmail}`);
  }
}

// ============================================
// MAIN ENTRY POINT (called by cron)
// ============================================

export async function runAbandonedCartRecovery(): Promise<void> {
  console.log('[AbandonedCart] Starting recovery check...');
  const startTime = Date.now();

  try {
    // Phase 1: Detect new abandoned carts
    await detectAbandonedOnlineCourses();
    await detectAbandonedMerchOrders();
    await detectAbandonedInPersonEnrollments();
    await detectAbandonedGiftCards();

    // Phase 2: Send pending touches
    await sendPendingTouches();

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[AbandonedCart] Recovery check completed in ${duration.toFixed(2)}s`);
  } catch (error) {
    console.error('[AbandonedCart] Recovery check failed:', error);
  }
}
