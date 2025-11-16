import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { appointmentService } from './service';
import { isAuthenticated } from '../customAuth';
import { 
  insertAppointmentTypeSchema,
  insertInstructorWeeklyTemplateSchema,
  insertInstructorAvailabilityOverrideSchema,
  insertAppointmentNotificationTemplateSchema,
  insertAppointmentReminderScheduleSchema
} from '@shared/schema';

export const appointmentRouter = Router();

async function verifyAppointmentTypeOwnership(typeId: string, instructorId: string): Promise<boolean> {
  const appointmentType = await storage.getAppointmentType(typeId);
  return appointmentType?.instructorId === instructorId;
}

async function verifyWeeklyTemplateOwnership(templateId: string, instructorId: string): Promise<boolean> {
  const template = await storage.getWeeklyTemplate(templateId);
  return template?.instructorId === instructorId;
}

async function verifyAvailabilityOverrideOwnership(overrideId: string, instructorId: string): Promise<boolean> {
  const override = await storage.getAvailabilityOverride(overrideId);
  return override?.instructorId === instructorId;
}

async function verifyNotificationTemplateOwnership(templateId: string, instructorId: string): Promise<boolean> {
  const template = await storage.getAppointmentNotificationTemplate(templateId);
  return template?.instructorId === instructorId;
}

async function verifyReminderScheduleOwnership(scheduleId: string, instructorId: string): Promise<boolean> {
  const schedule = await storage.getAppointmentReminderSchedule(scheduleId);
  return schedule?.instructorId === instructorId;
}

async function verifyAppointmentOwnership(appointmentId: string, instructorId: string): Promise<boolean> {
  const appointment = await storage.getAppointment(appointmentId);
  return appointment?.instructorId === instructorId;
}

// ============================================
// INSTRUCTOR ROUTES - Appointment Type Management
// ============================================

appointmentRouter.get('/instructor/:instructorId/appointments', isAuthenticated, async (req: any, res) => {
  try {
    const { instructorId } = req.params;
    const currentUserId = req.user.id;
    
    // Verify the instructor is requesting their own appointments
    if (instructorId !== currentUserId) {
      return res.status(403).json({ message: "Not authorized to view these appointments" });
    }
    
    const appointments = await storage.getAppointmentsByInstructor(instructorId);
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
    
    if (!await verifyAppointmentTypeOwnership(id, instructorId)) {
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
    
    if (!await verifyAppointmentTypeOwnership(id, instructorId)) {
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
    
    if (!await verifyWeeklyTemplateOwnership(id, instructorId)) {
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
    
    if (!await verifyWeeklyTemplateOwnership(id, instructorId)) {
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
    
    if (!await verifyAvailabilityOverrideOwnership(id, instructorId)) {
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
    
    if (!await verifyAvailabilityOverrideOwnership(id, instructorId)) {
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
    const validatedData = insertAppointmentNotificationTemplateSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
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
    
    if (!await verifyNotificationTemplateOwnership(id, instructorId)) {
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
    
    if (!await verifyNotificationTemplateOwnership(id, instructorId)) {
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
    
    if (!await verifyReminderScheduleOwnership(id, instructorId)) {
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
    
    if (!await verifyReminderScheduleOwnership(id, instructorId)) {
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
    const instructorId = req.user.id;
    const appointments = await storage.getAppointmentsByInstructor(instructorId);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

appointmentRouter.get('/instructor/appointments/pending', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const appointments = await storage.getPendingAppointments(instructorId);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching pending appointments:", error);
    res.status(500).json({ message: "Failed to fetch pending appointments" });
  }
});

appointmentRouter.get('/instructor/appointments/upcoming', isAuthenticated, async (req: any, res) => {
  try {
    const instructorId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const appointments = await storage.getUpcomingAppointments(instructorId, limit);
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
    
    if (!await verifyAppointmentOwnership(id, instructorId)) {
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
    
    if (!await verifyAppointmentOwnership(id, instructorId)) {
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
    
    if (!await verifyAppointmentOwnership(id, instructorId)) {
      return res.status(403).json({ message: "Not authorized to cancel this appointment" });
    }
    
    const { reason } = req.body;
    const appointment = await storage.cancelAppointment(id, instructorId, reason);
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

appointmentRouter.get('/available-slots', async (req, res) => {
  try {
    const { instructorId, appointmentTypeId, startDate, endDate } = req.query;
    
    if (!instructorId || !appointmentTypeId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const appointmentType = await storage.getAppointmentType(appointmentTypeId as string);
    if (!appointmentType) {
      return res.status(404).json({ message: "Appointment type not found" });
    }

    const slots = await appointmentService.generateAvailableSlots(
      instructorId as string,
      appointmentTypeId as string,
      new Date(startDate as string),
      new Date(endDate as string),
      appointmentType.durationMinutes
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
      partySize 
    } = req.body;
    
    if (!instructorId || !appointmentTypeId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await appointmentService.bookAppointment({
      instructorId,
      studentId,
      appointmentTypeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      studentNotes,
      partySize,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error });
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
      partySize 
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Missing required account information" });
    }
    
    if (!instructorId || !appointmentTypeId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required booking information" });
    }

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please login instead." });
    }

    // Create new user account
    const { hashPassword } = await import('../customAuth');
    const passwordHash = await hashPassword(password);
    
    const newUser = await storage.createUser({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role: 'student',
      userStatus: 'pending',
      isEmailVerified: true,
    });

    // Book appointment for the new user
    const result = await appointmentService.bookAppointment({
      instructorId,
      studentId: newUser.id,
      appointmentTypeId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      studentNotes,
      partySize,
    });

    if (!result.success) {
      // If booking fails, we could delete the user here, but let's keep the account
      return res.status(400).json({ message: result.error });
    }

    // Auto-login the new user
    const session = req.session as any;
    session.userId = newUser.id;

    res.status(201).json({ 
      appointment: result.appointment,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      }
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
    res.json(cancelledAppointment);
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ message: "Failed to cancel appointment" });
  }
});
