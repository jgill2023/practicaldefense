import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { storage } from '../storage';
import { appointmentService } from './service';
import { isAuthenticated } from '../customAuth';
import { NotificationEngine } from '../notificationEngine';
import { db } from '../db';
import { appointmentTypes } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';

import { getStripeClient } from '../stripeClient';

// Initialize Stripe using Replit connector
let stripe: Stripe | null = null;
let stripeInitialized = false;

async function ensureStripeInitialized(): Promise<Stripe | null> {
  if (!stripeInitialized) {
    try {
      stripe = await getStripeClient();
      stripeInitialized = true;
    } catch (error) {
      console.warn('Appointments: Stripe not configured');
      stripe = null;
    }
  }
  return stripe;
}

ensureStripeInitialized();
import { 
  insertAppointmentTypeSchema,
  insertInstructorWeeklyTemplateSchema,
  insertInstructorAvailabilityOverrideSchema,
  insertAppointmentNotificationTemplateSchema,
  insertAppointmentReminderScheduleSchema
} from '@shared/schema';

export const appointmentRouter = Router();

async function verifyAppointmentTypeOwnership(typeId: string, user: any): Promise<boolean> {
  // Admin and superadmin can access all appointment types
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const appointmentType = await storage.getAppointmentType(typeId);
  return appointmentType?.instructorId === user.id;
}

async function verifyWeeklyTemplateOwnership(templateId: string, user: any): Promise<boolean> {
  // Admin and superadmin can access all templates
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const template = await storage.getWeeklyTemplate(templateId);
  return template?.instructorId === user.id;
}

async function verifyAvailabilityOverrideOwnership(overrideId: string, user: any): Promise<boolean> {
  // Admin and superadmin can access all overrides
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const override = await storage.getAvailabilityOverride(overrideId);
  return override?.instructorId === user.id;
}

async function verifyNotificationTemplateOwnership(templateId: string, user: any): Promise<boolean> {
  // Admin and superadmin can access all notification templates
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const template = await storage.getAppointmentNotificationTemplate(templateId);
  return template?.instructorId === user.id;
}

async function verifyReminderScheduleOwnership(scheduleId: string, user: any): Promise<boolean> {
  // Admin and superadmin can access all reminder schedules
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const schedule = await storage.getAppointmentReminderSchedule(scheduleId);
  return schedule?.instructorId === user.id;
}

async function verifyAppointmentOwnership(appointmentId: string, user: any): Promise<boolean> {
  // Instructors, admins, and superadmins can access all appointments
  if (user.role === 'instructor' || user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  const appointment = await storage.getAppointment(appointmentId);
  return appointment?.instructorId === user.id;
}

// ============================================
// INSTRUCTOR ROUTES - Appointment Type Management
// ============================================

appointmentRouter.get('/instructor/:instructorId/appointments', isAuthenticated, async (req: any, res) => {
  try {
    const { instructorId } = req.params;
    const currentUserId = req.user.id;
    const currentUser = req.user;
    
    // Instructors, admins, and superadmins have global visibility (admin-level data access)
    const isInstructorOrHigher = currentUser.role === 'instructor' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    // Verify the user is authorized: either requesting their own appointments OR is instructor/admin/superadmin
    if (instructorId !== currentUserId && !isInstructorOrHigher) {
      return res.status(403).json({ message: "Not authorized to view these appointments" });
    }
    
    // Instructors/admins/superadmins can view all appointments across all instructors
    const appointments = isInstructorOrHigher
      ? await storage.getAllAppointments()
      : await storage.getAppointmentsByInstructor(instructorId);
      
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

appointmentRouter.get('/instructor/appointment-types', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const types = await storage.getAppointmentTypes(instructorId);
    res.json(types);
  } catch (error) {
    console.error("Error fetching appointment types:", error);
    res.status(500).json({ message: "Failed to fetch appointment types" });
  }
});

appointmentRouter.post('/instructor/appointment-types', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    
    // Manually construct the data object to avoid schema validation issues
    const data = {
      instructorId,
      title: req.body.title || req.body.name, // Support both 'title' and 'name' fields
      description: req.body.description || null,
      durationMinutes: parseInt(req.body.durationMinutes),
      price: parseFloat(req.body.price),
      requiresApproval: req.body.requiresApproval ?? false,
      bufferBefore: parseInt(req.body.bufferBefore) || 0,
      bufferAfter: parseInt(req.body.bufferAfter) || 0,
      maxPartySize: parseInt(req.body.maxPartySize) || 1,
      color: req.body.color || '#3b82f6',
      isActive: req.body.isActive ?? true,
      sortOrder: parseInt(req.body.sortOrder) || 0,
    };
    
    const appointmentType = await storage.createAppointmentType(data);
    res.status(201).json(appointmentType);
  } catch (error) {
    console.error("Error creating appointment type:", error);
    res.status(500).json({ message: "Failed to create appointment type", error: error.message });
  }
});

appointmentRouter.patch('/instructor/appointment-types/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAppointmentTypeOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to modify this appointment type" });
    }
    
    // Parse numeric fields if present
    const updateData = { ...req.body };
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.durationMinutes !== undefined) {
      updateData.durationMinutes = parseInt(updateData.durationMinutes);
    }
    
    const appointmentType = await storage.updateAppointmentType(id, updateData);
    res.json(appointmentType);
  } catch (error) {
    console.error("Error updating appointment type:", error);
    res.status(500).json({ message: "Failed to update appointment type" });
  }
});

appointmentRouter.delete('/instructor/appointment-types/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAppointmentTypeOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to delete this appointment type" });
    }
    
    await storage.deleteAppointmentType(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting appointment type:", error);
    res.status(500).json({ message: "Failed to delete appointment type" });
  }
});

// ============================================
// INSTRUCTOR ROUTES - Weekly Template Management
// ============================================

appointmentRouter.get('/instructor/weekly-templates', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const templates = await storage.getWeeklyTemplates(instructorId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching weekly templates:", error);
    res.status(500).json({ message: "Failed to fetch weekly templates" });
  }
});

appointmentRouter.post('/instructor/weekly-templates', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const validatedData = insertInstructorWeeklyTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true, instructorId: true }).parse(req.body);
    const data = { ...validatedData, instructorId };
    const template = await storage.createWeeklyTemplate(data);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Error creating weekly template:", error);
    res.status(500).json({ message: "Failed to create weekly template" });
  }
});

appointmentRouter.patch('/instructor/weekly-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyWeeklyTemplateOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to modify this weekly template" });
    }
    
    const template = await storage.updateWeeklyTemplate(id, req.body);
    res.json(template);
  } catch (error) {
    console.error("Error updating weekly template:", error);
    res.status(500).json({ message: "Failed to update weekly template" });
  }
});

appointmentRouter.delete('/instructor/weekly-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyWeeklyTemplateOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to delete this weekly template" });
    }
    
    await storage.deleteWeeklyTemplate(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting weekly template:", error);
    res.status(500).json({ message: "Failed to delete weekly template" });
  }
});

// ============================================
// INSTRUCTOR ROUTES - Availability Override Management
// ============================================

appointmentRouter.get('/instructor/availability-overrides', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const overrides = await storage.getAvailabilityOverrides(instructorId);
    res.json(overrides);
  } catch (error) {
    console.error("Error fetching availability overrides:", error);
    res.status(500).json({ message: "Failed to fetch availability overrides" });
  }
});

appointmentRouter.post('/instructor/availability-overrides', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const validatedData = insertInstructorAvailabilityOverrideSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
    const data = { ...validatedData, instructorId };
    const override = await storage.createAvailabilityOverride(data);
    res.status(201).json(override);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Error creating availability override:", error);
    res.status(500).json({ message: "Failed to create availability override" });
  }
});

appointmentRouter.patch('/instructor/availability-overrides/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAvailabilityOverrideOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to modify this availability override" });
    }
    
    const override = await storage.updateAvailabilityOverride(id, req.body);
    res.json(override);
  } catch (error) {
    console.error("Error updating availability override:", error);
    res.status(500).json({ message: "Failed to update availability override" });
  }
});

appointmentRouter.delete('/instructor/availability-overrides/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAvailabilityOverrideOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to delete this availability override" });
    }
    
    await storage.deleteAvailabilityOverride(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting availability override:", error);
    res.status(500).json({ message: "Failed to delete availability override" });
  }
});

// ============================================
// INSTRUCTOR ROUTES - Notification Template Management
// ============================================

appointmentRouter.get('/instructor/notification-templates', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const templates = await storage.getAppointmentNotificationTemplates(instructorId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    res.status(500).json({ message: "Failed to fetch notification templates" });
  }
});

appointmentRouter.post('/instructor/notification-templates', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const validatedData = insertAppointmentNotificationTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true, instructorId: true }).parse(req.body);
    const data = { ...validatedData, instructorId };
    const template = await storage.createAppointmentNotificationTemplate(data);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Error creating notification template:", error);
    res.status(500).json({ message: "Failed to create notification template" });
  }
});

appointmentRouter.patch('/instructor/notification-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyNotificationTemplateOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to modify this notification template" });
    }
    
    const template = await storage.updateAppointmentNotificationTemplate(id, req.body);
    res.json(template);
  } catch (error) {
    console.error("Error updating notification template:", error);
    res.status(500).json({ message: "Failed to update notification template" });
  }
});

appointmentRouter.delete('/instructor/notification-templates/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyNotificationTemplateOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to delete this notification template" });
    }
    
    await storage.deleteAppointmentNotificationTemplate(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting notification template:", error);
    res.status(500).json({ message: "Failed to delete notification template" });
  }
});

// ============================================
// INSTRUCTOR ROUTES - Reminder Schedule Management
// ============================================

appointmentRouter.get('/instructor/reminder-schedules', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const schedules = await storage.getAppointmentReminderSchedules(instructorId);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching reminder schedules:", error);
    res.status(500).json({ message: "Failed to fetch reminder schedules" });
  }
});

appointmentRouter.post('/instructor/reminder-schedules', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const validatedData = insertAppointmentReminderScheduleSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
    const data = { ...validatedData, instructorId };
    const schedule = await storage.createAppointmentReminderSchedule(data);
    res.status(201).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    console.error("Error creating reminder schedule:", error);
    res.status(500).json({ message: "Failed to create reminder schedule" });
  }
});

appointmentRouter.patch('/instructor/reminder-schedules/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyReminderScheduleOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to modify this reminder schedule" });
    }
    
    const schedule = await storage.updateAppointmentReminderSchedule(id, req.body);
    res.json(schedule);
  } catch (error) {
    console.error("Error updating reminder schedule:", error);
    res.status(500).json({ message: "Failed to update reminder schedule" });
  }
});

appointmentRouter.delete('/instructor/reminder-schedules/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyReminderScheduleOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to delete this reminder schedule" });
    }
    
    await storage.deleteAppointmentReminderSchedule(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting reminder schedule:", error);
    res.status(500).json({ message: "Failed to delete reminder schedule" });
  }
});

// ============================================
// INSTRUCTOR ROUTES - Appointment Management
// ============================================

appointmentRouter.get('/instructor/appointments', isAuthenticated, async (req: any, res) => {
  try {
    const currentUser = req.user;
    // Instructors, admins, and superadmins can see all appointments
    const isInstructorOrHigher = currentUser.role === 'instructor' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    const appointments = isInstructorOrHigher
      ? await storage.getAllAppointments()
      : await storage.getAppointmentsByInstructor(currentUser.id);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

appointmentRouter.get('/instructor/appointments/pending', isAuthenticated, async (req: any, res) => {
  try {
    const currentUser = req.user;
    // Instructors, admins, and superadmins can see all pending appointments
    const isInstructorOrHigher = currentUser.role === 'instructor' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    const appointments = isInstructorOrHigher
      ? await storage.getAllPendingAppointments()
      : await storage.getPendingAppointments(currentUser.id);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching pending appointments:", error);
    res.status(500).json({ message: "Failed to fetch pending appointments" });
  }
});

appointmentRouter.get('/instructor/appointments/upcoming', isAuthenticated, async (req: any, res) => {
  try {
    const currentUser = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    // Instructors, admins, and superadmins can see all upcoming appointments
    const isInstructorOrHigher = currentUser.role === 'instructor' || currentUser.role === 'admin' || currentUser.role === 'superadmin';
    
    const appointments = isInstructorOrHigher
      ? await storage.getAllUpcomingAppointments(limit)
      : await storage.getUpcomingAppointments(currentUser.id, limit);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    res.status(500).json({ message: "Failed to fetch upcoming appointments" });
  }
});

appointmentRouter.post('/instructor/appointments/:id/approve', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAppointmentOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to approve this appointment" });
    }
    
    const appointment = await storage.approveAppointment(id);
    res.json(appointment);
  } catch (error) {
    console.error("Error approving appointment:", error);
    res.status(500).json({ message: "Failed to approve appointment" });
  }
});

appointmentRouter.post('/instructor/appointments/:id/reject', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAppointmentOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to reject this appointment" });
    }
    
    const { reason } = req.body;
    const appointment = await storage.rejectAppointment(id, reason);
    res.json(appointment);
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    res.status(500).json({ message: "Failed to reject appointment" });
  }
});

appointmentRouter.post('/instructor/appointments/:id/cancel', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    
    if (!await verifyAppointmentOwnership(id, req.user)) {
      return res.status(403).json({ message: "Not authorized to cancel this appointment" });
    }
    
    const { reason } = req.body;
    const appointment = await storage.cancelAppointment(id, instructorId, reason);
    
    // Send cancellation notification
    await NotificationEngine.sendAppointmentNotification({
      eventType: 'booking_cancelled',
      appointmentId: id,
      instructorId,
    }).catch(err => {
      console.error('Failed to send cancellation notification:', err);
    });
    
    res.json(appointment);
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ message: "Failed to cancel appointment" });
  }
});

// ============================================
// STUDENT ROUTES - Browse and Book Appointments
// ============================================

appointmentRouter.get('/student/types', async (req, res) => {
  try {
    const { instructorId } = req.query;
    
    if (!instructorId) {
      return res.status(400).json({ message: "Instructor ID is required" });
    }
    
    const types = await storage.getActiveAppointmentTypes(instructorId as string);
    res.json(types);
  } catch (error) {
    console.error("Error fetching active appointment types:", error);
    res.status(500).json({ message: "Failed to fetch appointment types" });
  }
});

// Get all active appointment types (for single-instructor platform)
appointmentRouter.get('/types', async (req, res) => {
  try {
    // For a single-instructor platform, fetch all active appointment types
    const allTypes = await db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.isActive, true))
      .orderBy(asc(appointmentTypes.sortOrder), asc(appointmentTypes.title));
    res.json(allTypes);
  } catch (error) {
    console.error("Error fetching all active appointment types:", error);
    res.status(500).json({ message: "Failed to fetch appointment types" });
  }
});

appointmentRouter.get('/types/:instructorId', async (req, res) => {
  try {
    const { instructorId } = req.params;
    const types = await storage.getActiveAppointmentTypes(instructorId);
    res.json(types);
  } catch (error) {
    console.error("Error fetching active appointment types:", error);
    res.status(500).json({ message: "Failed to fetch appointment types" });
  }
});

// Create Stripe PaymentIntent for appointment booking
appointmentRouter.post('/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: "Payment processing is not configured" });
    }

    const { instructorId, appointmentTypeId, startTime, endTime, durationHours, billingAddress, promoCode, userId, existingPaymentIntentId, customerEmail, customerName } = req.body;

    // Cancel existing payment intent if provided (for promo code updates)
    if (existingPaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(existingPaymentIntentId);
      } catch (cancelError) {
        console.error("Failed to cancel existing payment intent:", cancelError);
        // Continue even if cancellation fails - the old intent may already be confirmed or canceled
      }
    }

    if (!instructorId || !appointmentTypeId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Get appointment type to calculate price
    const appointmentType = await storage.getAppointmentType(appointmentTypeId);
    if (!appointmentType) {
      return res.status(404).json({ message: "Appointment type not found" });
    }

    // Validate slot is still available
    const validation = await appointmentService.validateAppointmentBooking(
      instructorId,
      appointmentTypeId,
      new Date(startTime),
      new Date(endTime)
    );

    if (!validation.valid) {
      return res.status(400).json({ message: validation.reason });
    }

    // Calculate total amount (supports tiered pricing)
    // Tiered pricing: 1 hour = firstHourPrice, 2+ hours = additionalHourPrice × all hours
    let amount: number;
    if ((appointmentType as any).isVariableDuration && durationHours) {
      const useTieredPricing = (appointmentType as any).useTieredPricing;
      
      if (useTieredPricing) {
        const firstHourPrice = Number((appointmentType as any).firstHourPrice || 0);
        const additionalHourPrice = Number((appointmentType as any).additionalHourPrice || 0);
        // 1 hour uses firstHourPrice, 2+ hours uses additionalHourPrice for ALL hours
        amount = durationHours === 1 ? firstHourPrice : additionalHourPrice * durationHours;
      } else {
        const pricePerHour = Number((appointmentType as any).pricePerHour || 0);
        amount = pricePerHour * durationHours;
      }
    } else {
      amount = Number(appointmentType.price);
    }

    // Apply promo code discount if provided
    let discountAmount = 0;
    let finalAmount = amount;
    let promoCodeInfo = null;

    if (promoCode && promoCode.trim()) {
      const promoValidation = await storage.validatePromoCode(
        promoCode.trim(),
        userId || 'guest-booking',
        null, // No courseId for appointments
        amount,
        'appointment'
      );

      if (promoValidation.isValid && promoValidation.discountAmount !== undefined && promoValidation.finalAmount !== undefined) {
        discountAmount = promoValidation.discountAmount;
        finalAmount = promoValidation.finalAmount;
        promoCodeInfo = {
          code: promoCode.trim(),
          discountAmount,
          type: promoValidation.code?.type,
          value: promoValidation.code?.value
        };
      } else {
        return res.status(400).json({ 
          message: `Invalid promo code: ${promoValidation.error}`,
          errorCode: promoValidation.errorCode
        });
      }
    }

    // Skip payment intent creation for free appointments
    if (finalAmount <= 0) {
      return res.json({ 
        clientSecret: null, 
        amount: 0, 
        isFree: true,
        originalAmount: amount,
        discountAmount,
        promoCode: promoCodeInfo
      });
    }

    // Create PaymentIntent - Direct payment to Apache Solutions' Stripe account
    const subtotalInCents = Math.round(finalAmount * 100); // Subtotal before tax
    const paymentIntentParams: any = {
      amount: subtotalInCents, // Initial amount is subtotal (tax will be added later)
      currency: "usd",
      receipt_email: customerEmail || undefined, // Send receipt to customer email
      description: `${appointmentType.name} - Appointment Booking`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        instructorId,
        appointmentTypeId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        subtotalCents: String(subtotalInCents), // CRITICAL: Store original subtotal for tax calculation
        ...(customerEmail && { customerEmail }),
        ...(customerName && { customerName }),
        ...(durationHours && { durationHours: String(durationHours) }),
        ...(promoCodeInfo && { 
          promoCode: promoCodeInfo.code,
          originalAmount: String(amount),
          discountAmount: String(discountAmount)
        }),
      },
    };

    // Add billing address if provided (required for tax calculation)
    if (billingAddress) {
      paymentIntentParams.shipping = {
        name: billingAddress.name || customerName || 'Customer',
        address: {
          line1: billingAddress.line1,
          line2: billingAddress.line2 || undefined,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postal_code,
          country: billingAddress.country || 'US',
        },
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Calculate total tax from amount_details.taxes array (in cents)
    const totalTaxInCents = paymentIntent.amount_details?.taxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0;

    // Return dollars to frontend (cents / 100)
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      taxAmount: totalTaxInCents / 100,
      originalAmount: amount,
      discountAmount,
      promoCode: promoCodeInfo
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

// Update PaymentIntent with billing address and return tax breakdown
appointmentRouter.post('/update-payment-intent-address', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: "Payment processing is not configured" });
    }

    const { paymentIntentId, billingAddress, customerEmail, customerName } = req.body;

    if (!paymentIntentId || !billingAddress) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // First, retrieve the payment intent to get the original subtotal from metadata
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // CRITICAL: Use original subtotal from metadata, not current amount
    // This prevents tax compounding if user changes address multiple times
    const subtotalInCents = parseInt(paymentIntent.metadata.subtotalCents || '0', 10);
    
    if (subtotalInCents === 0) {
      return res.status(400).json({ message: "Invalid payment intent: missing subtotal" });
    }

    // Update PaymentIntent with billing address and customer information
    const updateParams: any = {
      shipping: {
        name: billingAddress.name || customerName || 'Customer',
        address: {
          line1: billingAddress.line1,
          line2: billingAddress.line2 || undefined,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postal_code,
          country: billingAddress.country || 'US',
        },
      },
    };

    // Add customer email if provided (shows customer info in Stripe Dashboard)
    if (customerEmail) {
      updateParams.receipt_email = customerEmail;
    }

    paymentIntent = await stripe.paymentIntents.update(paymentIntentId, updateParams);

    // Calculate tax from Stripe's automatic tax (if enabled in Stripe Dashboard)
    const stripeTaxInCents = paymentIntent.amount_details?.taxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0;
    
    // Calculate a basic sales tax (7.14% for NM) if Stripe Tax is not configured
    // Instructors should enable Stripe Tax in their dashboard for automatic calculation
    let calculatedTaxInCents = stripeTaxInCents;
    if (stripeTaxInCents === 0 && billingAddress.state === 'NM') {
      // Apply New Mexico state tax rate (7.14%) to ORIGINAL SUBTOTAL
      calculatedTaxInCents = Math.round(subtotalInCents * 0.0714);
    }
    
    const totalInCents = subtotalInCents + calculatedTaxInCents;

    // CRITICAL: Update the payment intent amount to include tax
    // This ensures Stripe actually charges the tax amount, not just displays it
    // Using original subtotal + tax prevents compounding on multiple address updates
    await stripe.paymentIntents.update(paymentIntentId, {
      amount: totalInCents,
    });

    res.json({
      subtotal: subtotalInCents / 100,
      tax: calculatedTaxInCents / 100,
      total: totalInCents / 100,
    });
  } catch (error) {
    console.error("Error updating payment intent with billing address:", error);
    res.status(500).json({ message: "Failed to update payment intent" });
  }
});

appointmentRouter.get('/available-slots', async (req, res) => {
  try {
    const { instructorId, appointmentTypeId, startDate, endDate, durationHours } = req.query;
    
    if (!instructorId || !appointmentTypeId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const appointmentType = await storage.getAppointmentType(appointmentTypeId as string);
    if (!appointmentType) {
      return res.status(404).json({ message: "Appointment type not found" });
    }

    // For variable duration appointments, use the requested duration
    // For fixed duration appointments, use the appointment type's duration
    let durationMinutes: number;
    if ((appointmentType as any).isVariableDuration && durationHours) {
      durationMinutes = parseInt(durationHours as string) * 60;
    } else {
      durationMinutes = appointmentType.durationMinutes;
    }

    // Parse dates - handle date-only strings (YYYY-MM-DD) by treating them as local dates
    // This ensures conflict detection works correctly regardless of timezone
    let parsedStartDate: Date;
    let parsedEndDate: Date;
    
    const startDateStr = startDate as string;
    const endDateStr = endDate as string;
    
    // If date-only format (YYYY-MM-DD), parse as local date at start/end of day
    if (startDateStr.length === 10) {
      // Parse as local date at start of day
      const [year, month, day] = startDateStr.split('-').map(Number);
      parsedStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      parsedStartDate = new Date(startDateStr);
    }
    
    if (endDateStr.length === 10) {
      // Parse as local date at end of day
      const [year, month, day] = endDateStr.split('-').map(Number);
      parsedEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      parsedEndDate = new Date(endDateStr);
    }

    const slots = await appointmentService.generateAvailableSlots(
      instructorId as string,
      appointmentTypeId as string,
      parsedStartDate,
      parsedEndDate,
      durationMinutes
    );

    res.json(slots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ message: "Failed to fetch available slots" });
  }
});

appointmentRouter.post('/book', isAuthenticated, async (req: any, res) => {
  try {
    const studentId = req.user.id;
    const { 
      instructorId, 
      appointmentTypeId, 
      startTime, 
      endTime, 
      studentNotes, 
      partySize,
      actualDurationMinutes,
      totalPrice,
      paymentIntentId
    } = req.body;
    
    if (!instructorId || !appointmentTypeId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Payment verification (optional for free appointments)
    let taxAmount = null;
    let taxRate = null;

    if (paymentIntentId && paymentIntentId.trim() !== '') {
      // Verify payment with Stripe
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed" });
      }

      // Extract tax information from PaymentIntent (keep as numbers for calculations)
      const totalTaxInCents = paymentIntent.amount_details?.taxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0;
      const subtotalInCents = paymentIntent.amount - totalTaxInCents;
      
      // Store tax amount in dollars (DECIMAL column) and rate with fixed precision
      taxAmount = totalTaxInCents > 0 ? (totalTaxInCents / 100).toFixed(2) : null;
      taxRate = totalTaxInCents > 0 && subtotalInCents > 0
        ? (totalTaxInCents / subtotalInCents).toFixed(4)
        : null;
    }

    const result = await appointmentService.bookAppointment({
      instructorId,
      studentId,
      appointmentTypeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      studentNotes,
      partySize,
      actualDurationMinutes,
      totalPrice,
      paymentIntentId,
      stripePaymentIntentId: paymentIntentId,
      taxAmount,
      taxRate,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    // Send notification for booking confirmation
    if (result.appointment) {
      await NotificationEngine.sendAppointmentNotification({
        eventType: 'booking_confirmed',
        appointmentId: result.appointment.id,
        instructorId,
      }).catch(err => {
        console.error('Failed to send booking confirmation notification:', err);
        // Don't fail the booking if notification fails
      });
    }

    res.status(201).json(result.appointment);
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ message: "Failed to book appointment" });
  }
});

appointmentRouter.post('/book-with-signup', async (req: any, res) => {
  try {
    const { 
      firstName,
      lastName,
      email,
      phone,
      password,
      instructorId, 
      appointmentTypeId, 
      startTime, 
      endTime, 
      studentNotes, 
      partySize,
      actualDurationMinutes,
      totalPrice,
      paymentIntentId
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: "Missing required account information" });
    }
    
    if (!instructorId || !appointmentTypeId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required booking information" });
    }

    // Validate password length if provided
    if (password && password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Payment verification (optional for free appointments)
    let taxAmount = null;
    let taxRate = null;

    if (paymentIntentId && paymentIntentId.trim() !== '') {
      // Verify payment with Stripe
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed" });
      }

      // Extract tax information from PaymentIntent (keep as numbers for calculations)
      const totalTaxInCents = paymentIntent.amount_details?.taxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0;
      const subtotalInCents = paymentIntent.amount - totalTaxInCents;
      
      // Store tax amount in dollars (DECIMAL column) and rate with fixed precision
      taxAmount = totalTaxInCents > 0 ? (totalTaxInCents / 100).toFixed(2) : null;
      taxRate = totalTaxInCents > 0 && subtotalInCents > 0
        ? (totalTaxInCents / subtotalInCents).toFixed(4)
        : null;
    }

    let user;
    let isNewUser = false;
    let needsPasswordSetup = false;

    // Check if user already exists (former student)
    const existingUser = await storage.getUserByEmail(email.toLowerCase());
    
    if (existingUser) {
      // User exists - automatically link appointment to their account
      user = existingUser;
      console.log(`Auto-linking appointment to existing account: ${user.email}`);
    } else {
      // New user - create account
      const { hashPassword, generateToken, getTokenExpiry } = await import('../customAuth');
      const { sendPasswordResetEmail } = await import('../emailService');
      
      let passwordHash: string;
      let resetToken: string | null = null;
      let resetExpiry: Date | null = null;
      
      if (password) {
        // User provided a password
        passwordHash = await hashPassword(password);
      } else {
        // Guest booking - create account with temporary password and send setup email
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
        passwordHash = await hashPassword(tempPassword);
        resetToken = generateToken();
        resetExpiry = getTokenExpiry(1); // 1 hour expiry
        needsPasswordSetup = true;
      }
      
      user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        role: 'student',
        userStatus: 'active',
        isEmailVerified: true,
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      });
      
      isNewUser = true;
      
      // Send password setup email for guest bookings
      if (needsPasswordSetup && resetToken) {
        await sendPasswordResetEmail(user.email, user.firstName || 'User', resetToken);
        console.log(`Password setup email sent to ${user.email}`);
      }
    }

    // Book appointment for the user
    const result = await appointmentService.bookAppointment({
      instructorId,
      studentId: user.id,
      appointmentTypeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      studentNotes,
      partySize,
      actualDurationMinutes,
      totalPrice,
      paymentIntentId,
      stripePaymentIntentId: paymentIntentId,
      taxAmount,
      taxRate,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    // Send notification for booking confirmation
    if (result.appointment) {
      await NotificationEngine.sendAppointmentNotification({
        eventType: 'booking_confirmed',
        appointmentId: result.appointment.id,
        instructorId,
      }).catch(err => {
        console.error('Failed to send booking confirmation notification:', err);
        // Don't fail the booking if notification fails
      });
    }

    // Only auto-login for NEW users who provided a password
    // Do NOT auto-login existing users (security risk) or guest bookings (need to set password first)
    const shouldAutoLogin = isNewUser && password && !needsPasswordSetup;
    
    if (shouldAutoLogin) {
      const session = req.session as any;
      session.userId = user.id;
    }

    res.status(201).json({ 
      appointment: result.appointment,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      isNewUser,
      linkedExistingAccount: !isNewUser,
      needsPasswordSetup,
      autoLoggedIn: shouldAutoLogin,
    });
  } catch (error) {
    console.error("Error in book-with-signup:", error);
    res.status(500).json({ message: "Failed to create account and book appointment" });
  }
});

appointmentRouter.get('/my-appointments', isAuthenticated, async (req: any, res) => {
  try {
    const studentId = req.user.id;
    const appointments = await storage.getAppointmentsByStudent(studentId);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching student appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

appointmentRouter.post('/:id/cancel', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const { reason } = req.body;
    
    const appointment = await storage.getAppointment(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.studentId !== studentId) {
      return res.status(403).json({ message: "Not authorized to cancel this appointment" });
    }

    const cancelledAppointment = await storage.cancelAppointment(id, studentId, reason);
    
    // Send cancellation notification
    await NotificationEngine.sendAppointmentNotification({
      eventType: 'booking_cancelled',
      appointmentId: id,
      instructorId: appointment.instructorId,
    }).catch(err => {
      console.error('Failed to send cancellation notification:', err);
    });
    
    res.json(cancelledAppointment);
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ message: "Failed to cancel appointment" });
  }
});
