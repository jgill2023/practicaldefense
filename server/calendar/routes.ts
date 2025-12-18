import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { calendarService } from '../services/calendarService';
import { isAuthenticated, requireInstructorOrHigher } from '../customAuth';
import { storage } from '../storage';
import { db } from '../db';
import { instructorAppointments, appointmentTypes, instructorWeeklyTemplates, instructorGoogleCredentials } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export const calendarRouter = Router();

const getAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  instructorId: z.string().min(1, 'Instructor ID is required'),
  slotDuration: z.coerce.number().min(15).max(240).optional().default(30),
});

const manualBlockSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().max(255).optional(),
});

const bookingSchema = z.object({
  instructorId: z.string().min(1),
  appointmentTypeId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  studentName: z.string().min(1).max(255),
  studentEmail: z.string().email(),
  studentPhone: z.string().optional(),
  studentNotes: z.string().max(1000).optional(),
  partySize: z.number().min(1).max(20).optional().default(1),
});

calendarRouter.get('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const { instructorId, slotDuration } = req.query;

    const validated = getAvailabilitySchema.parse({
      date,
      instructorId,
      slotDuration,
    });

    const targetDate = new Date(validated.date);
    
    const freeSlots = await calendarService.getUnifiedFreeSlots(
      validated.instructorId,
      targetDate,
      validated.slotDuration
    );

    res.json({
      date: validated.date,
      instructorId: validated.instructorId,
      slotDurationMinutes: validated.slotDuration,
      slots: freeSlots.map(slot => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        durationMinutes: slot.durationMinutes,
      })),
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request parameters', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to fetch availability' });
  }
});

calendarRouter.post('/manual-block', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const validated = manualBlockSchema.parse(req.body);

    const startTime = new Date(validated.startTime);
    const endTime = new Date(validated.endTime);

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'Start time must be before end time' });
    }

    if (startTime < new Date()) {
      return res.status(400).json({ message: 'Cannot create blocks in the past' });
    }

    await calendarService.createManualBlock(
      instructorId,
      startTime,
      endTime,
      validated.reason
    );

    res.json({ 
      success: true, 
      message: 'Manual block created successfully',
      block: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        reason: validated.reason,
      }
    });
  } catch (error) {
    console.error('Error creating manual block:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request parameters', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create manual block' });
  }
});

calendarRouter.post('/book', async (req: Request, res: Response) => {
  try {
    const validated = bookingSchema.parse(req.body);

    const startTime = new Date(validated.startTime);
    const endTime = new Date(validated.endTime);

    if (startTime >= endTime) {
      return res.status(400).json({ message: 'Start time must be before end time' });
    }

    if (startTime < new Date()) {
      return res.status(400).json({ message: 'Cannot book appointments in the past' });
    }

    const appointmentType = await storage.getAppointmentType(validated.appointmentTypeId);
    if (!appointmentType) {
      return res.status(404).json({ message: 'Appointment type not found' });
    }

    if (appointmentType.instructorId !== validated.instructorId) {
      return res.status(400).json({ message: 'Appointment type does not belong to this instructor' });
    }

    const targetDate = new Date(startTime);
    const freeSlots = await calendarService.getUnifiedFreeSlots(
      validated.instructorId,
      targetDate,
      appointmentType.durationMinutes
    );

    const isSlotAvailable = freeSlots.some(slot => 
      slot.startTime.getTime() === startTime.getTime() &&
      slot.endTime.getTime() === endTime.getTime()
    );

    if (!isSlotAvailable) {
      return res.status(409).json({ message: 'The requested time slot is no longer available' });
    }

    let googleEventId: string | null = null;
    let meetLink: string | undefined;

    try {
      const instructor = await storage.getUser(validated.instructorId);
      const instructorName = instructor 
        ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || 'Instructor'
        : 'Instructor';

      const eventResult = await calendarService.createGoogleEvent(
        validated.instructorId,
        `Booking: ${appointmentType.title} with ${validated.studentName}`,
        `Appointment booked via calendar system.
        
Student: ${validated.studentName}
Email: ${validated.studentEmail}
${validated.studentPhone ? `Phone: ${validated.studentPhone}` : ''}
${validated.studentNotes ? `Notes: ${validated.studentNotes}` : ''}`,
        startTime,
        endTime,
        validated.studentEmail
      );

      googleEventId = eventResult.eventId;
      meetLink = eventResult.meetLink;
    } catch (calendarError) {
      console.warn('Failed to create Google Calendar event, proceeding without it:', calendarError);
    }

    const [newAppointment] = await db.insert(instructorAppointments).values({
      appointmentTypeId: validated.appointmentTypeId,
      instructorId: validated.instructorId,
      startTime,
      endTime,
      status: appointmentType.requiresApproval ? 'pending' : 'confirmed',
      partySize: validated.partySize,
      studentInfo: {
        name: validated.studentName,
        email: validated.studentEmail,
        phone: validated.studentPhone,
      },
      studentNotes: validated.studentNotes,
      googleEventId,
      paymentStatus: 'pending',
    }).returning();

    res.status(201).json({
      success: true,
      booking: {
        id: newAppointment.id,
        instructorId: validated.instructorId,
        appointmentType: appointmentType.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: newAppointment.status,
        studentName: validated.studentName,
        googleEventId,
        meetLink,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid booking data', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

calendarRouter.get('/instructor/blocks', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const blocks = await calendarService.getManualBlocks(instructorId, start, end);

    res.json({
      blocks: blocks.map(block => ({
        startTime: block.start.toISOString(),
        endTime: block.end.toISOString(),
        source: block.source,
      })),
    });
  } catch (error) {
    console.error('Error fetching manual blocks:', error);
    res.status(500).json({ message: 'Failed to fetch manual blocks' });
  }
});

calendarRouter.get('/instructor/google-status', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;

    // Check local database for connection record
    const credentials = await db.query.instructorGoogleCredentials.findFirst({
      where: eq(instructorGoogleCredentials.instructorId, instructorId),
    });
    
    if (credentials) {
      // We have a local record - instructor is connected
      return res.json({
        connected: true,
        email: credentials.primaryCalendarId || null,
        syncStatus: credentials.syncStatus || 'active',
      });
    }
    
    // No local record - not connected
    res.json({ connected: false, email: null, syncStatus: null });
  } catch (error) {
    console.error('Error checking Google status:', error);
    res.status(500).json({ message: 'Failed to check Google connection status' });
  }
});

calendarRouter.post('/instructor/google-disconnect', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
    const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

    await db.delete(instructorGoogleCredentials)
      .where(eq(instructorGoogleCredentials.instructorId, instructorId));

    if (AUTH_SERVICE_URL && INTERNAL_API_KEY) {
      try {
        await fetch(`${AUTH_SERVICE_URL}/api/tokens/revoke`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${INTERNAL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ instructorId }),
        });
      } catch (fetchError) {
        console.warn('Failed to revoke tokens on auth service:', fetchError);
      }
    }

    res.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({ message: 'Failed to disconnect Google Calendar' });
  }
});

const weeklyTemplateSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM or HH:MM:SS format'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:MM or HH:MM:SS format'),
  isActive: z.boolean().optional().default(true),
});

calendarRouter.get('/instructor/weekly-hours', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;

    const templates = await db.query.instructorWeeklyTemplates.findMany({
      where: eq(instructorWeeklyTemplates.instructorId, instructorId),
    });

    res.json({
      weeklyHours: templates.map(t => ({
        id: t.id,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        isActive: t.isActive,
      })),
    });
  } catch (error) {
    console.error('Error fetching weekly hours:', error);
    res.status(500).json({ message: 'Failed to fetch weekly hours' });
  }
});

calendarRouter.post('/instructor/weekly-hours', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const validated = weeklyTemplateSchema.parse(req.body);

    const normalizedStartTime = validated.startTime.length === 5 ? `${validated.startTime}:00` : validated.startTime;
    const normalizedEndTime = validated.endTime.length === 5 ? `${validated.endTime}:00` : validated.endTime;

    const [newTemplate] = await db.insert(instructorWeeklyTemplates).values({
      instructorId,
      dayOfWeek: validated.dayOfWeek,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      isActive: validated.isActive,
    }).returning();

    res.status(201).json({
      success: true,
      weeklyHour: {
        id: newTemplate.id,
        dayOfWeek: newTemplate.dayOfWeek,
        startTime: newTemplate.startTime,
        endTime: newTemplate.endTime,
        isActive: newTemplate.isActive,
      },
    });
  } catch (error) {
    console.error('Error creating weekly hour:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create weekly hour' });
  }
});

calendarRouter.delete('/instructor/weekly-hours/:id', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const { id } = req.params;

    const existing = await db.query.instructorWeeklyTemplates.findFirst({
      where: and(
        eq(instructorWeeklyTemplates.id, id),
        eq(instructorWeeklyTemplates.instructorId, instructorId)
      ),
    });

    if (!existing) {
      return res.status(404).json({ message: 'Weekly hour not found' });
    }

    await db.delete(instructorWeeklyTemplates).where(eq(instructorWeeklyTemplates.id, id));

    res.json({ success: true, message: 'Weekly hour deleted' });
  } catch (error) {
    console.error('Error deleting weekly hour:', error);
    res.status(500).json({ message: 'Failed to delete weekly hour' });
  }
});

calendarRouter.put('/instructor/weekly-hours/:id', isAuthenticated, requireInstructorOrHigher, async (req: any, res: Response) => {
  try {
    const instructorId = req.user.id;
    const { id } = req.params;
    const validated = weeklyTemplateSchema.partial().parse(req.body);

    const existing = await db.query.instructorWeeklyTemplates.findFirst({
      where: and(
        eq(instructorWeeklyTemplates.id, id),
        eq(instructorWeeklyTemplates.instructorId, instructorId)
      ),
    });

    if (!existing) {
      return res.status(404).json({ message: 'Weekly hour not found' });
    }

    const updateData: any = {};
    if (validated.dayOfWeek !== undefined) updateData.dayOfWeek = validated.dayOfWeek;
    if (validated.startTime) updateData.startTime = validated.startTime.length === 5 ? `${validated.startTime}:00` : validated.startTime;
    if (validated.endTime) updateData.endTime = validated.endTime.length === 5 ? `${validated.endTime}:00` : validated.endTime;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const [updated] = await db.update(instructorWeeklyTemplates)
      .set(updateData)
      .where(eq(instructorWeeklyTemplates.id, id))
      .returning();

    res.json({
      success: true,
      weeklyHour: {
        id: updated.id,
        dayOfWeek: updated.dayOfWeek,
        startTime: updated.startTime,
        endTime: updated.endTime,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error('Error updating weekly hour:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update weekly hour' });
  }
});

// ============================================
// GOOGLE CALENDAR WEBHOOK ENDPOINT
// ============================================

/**
 * Webhook endpoint for Google Calendar push notifications
 * Google sends notifications here when calendar events change
 * We verify the resourceId to ensure the notification is legitimate
 */
calendarRouter.post('/webhook/calendar', async (req: Request, res: Response) => {
  try {
    const resourceId = req.headers['x-goog-resource-id'] as string;
    const channelId = req.headers['x-goog-channel-id'] as string;
    const resourceState = req.headers['x-goog-resource-state'] as string;
    const channelExpiration = req.headers['x-goog-channel-expiration'] as string;

    console.log(`[CalendarWebhook] Received notification - resourceId: ${resourceId}, channelId: ${channelId}, state: ${resourceState}`);

    if (!resourceId || !channelId) {
      console.warn('[CalendarWebhook] Missing required headers');
      return res.status(400).json({ message: 'Missing required headers' });
    }

    const credentials = await db.query.instructorGoogleCredentials.findFirst({
      where: eq(instructorGoogleCredentials.webhookResourceId, resourceId),
    });

    if (!credentials) {
      console.warn(`[CalendarWebhook] Unknown resourceId: ${resourceId} - notification may be stale or fraudulent`);
      return res.status(404).json({ message: 'Unknown resource' });
    }

    if (credentials.webhookChannelId !== channelId) {
      console.warn(`[CalendarWebhook] Channel ID mismatch for instructor ${credentials.instructorId}. Expected: ${credentials.webhookChannelId}, Got: ${channelId}`);
      return res.status(403).json({ message: 'Channel ID mismatch' });
    }

    if (resourceState === 'sync') {
      console.log(`[CalendarWebhook] Sync notification for instructor ${credentials.instructorId} - initial subscription confirmation`);
      return res.status(200).json({ message: 'Sync acknowledged' });
    }

    console.log(`[CalendarWebhook] Calendar change detected for instructor ${credentials.instructorId}, state: ${resourceState}`);

    res.status(200).json({ message: 'Notification received' });
  } catch (error) {
    console.error('[CalendarWebhook] Error processing webhook:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
