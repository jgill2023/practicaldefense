import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { z } from "zod";
import { storage, normalizePhoneNumber } from "./storage";
import { setupAuth, isAuthenticated, requireSuperadmin, requireInstructorOrHigher, requireActiveAccount, requireAdminOrHigher } from "./customAuth";
import { authRouter } from "./auth/routes";
import { db } from "./db";
import { enrollments, smsBroadcastMessages, waiverInstances, studentFormResponses, courseInformationForms, notificationTemplates, notificationSchedules, users, cartItems, instructorAppointments } from "@shared/schema";
import { eq, and, inArray, desc, gte } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCategorySchema, insertCourseSchema, insertCourseScheduleSchema, insertEnrollmentSchema, insertAppSettingsSchema, insertCourseInformationFormSchema, insertCourseInformationFormFieldSchema, initiateRegistrationSchema, paymentIntentRequestSchema, confirmEnrollmentSchema, insertNotificationTemplateSchema, insertNotificationScheduleSchema, insertWaiverTemplateSchema, insertWaiverInstanceSchema, insertWaiverSignatureSchema, insertProductCategorySchema, insertProductSchema, insertProductVariantSchema, insertCartItemSchema, insertEcommerceOrderSchema, insertEcommerceOrderItemSchema, insertCourseNotificationSchema, insertCourseNotificationSignupSchema, type InsertCourseInformationForm, type InsertCourseInformationFormField, type InsertCourseNotification, type User } from "@shared/schema";
import { sendSms } from "./smsService";
import { CourseNotificationEngine, NotificationEngine } from "./notificationEngine";
import { NotificationEmailService } from "./emailService";
import { appointmentRouter } from "./appointments/routes";
import "./types"; // Import type declarations

// Stripe is required for payment processing
// During setup, payments will be disabled if not configured
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-08-27.basil",
  });
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured. Payment processing is disabled.');
  console.warn('   Complete the onboarding process to enable payments.');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.use('/api/auth', authRouter);

  // Profile update route
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      // Validate the request body
      const profileUpdateSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        preferredName: z.string().optional(),
        email: z.string().email("Invalid email address"),
        phone: z.string().optional(),
        streetAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        dateOfBirth: z.string().optional(),
        concealedCarryLicenseIssued: z.string().optional(),
        concealedCarryLicenseExpiration: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
        preferredContactMethods: z.array(z.string()).optional(),
        enableLicenseExpirationReminder: z.boolean().optional(),
        enableRefresherReminder: z.boolean().optional(),
        smsConsent: z.boolean().optional(),
        enableSmsNotifications: z.boolean().optional(),
        enableSmsReminders: z.boolean().optional(),
        enableSmsPaymentNotices: z.boolean().optional(),
        enableSmsAnnouncements: z.boolean().optional(),
      });

      const validatedData = profileUpdateSchema.parse(req.body);

      // Convert date strings to Date objects - process all date fields unconditionally
      const updateData: any = { ...validatedData };

      // Helper function to safely convert date strings
      const safeConvertDate = (dateString: string | undefined): Date | null => {
        // Return null for empty, undefined, or invalid strings
        if (!dateString || dateString.trim() === '' || dateString === 'undefined' || dateString === 'null') {
          return null;
        }

        try {
          const date = new Date(dateString);
          // Check if the date is valid and not "Invalid Date"
          if (isNaN(date.getTime()) || date.getTime() === 0) {
            return null;
          }
          return date;
        } catch (error) {
          return null;
        }
      };

      // Process all date fields unconditionally to prevent empty strings from reaching the database
      const dateFields = ['dateOfBirth', 'concealedCarryLicenseIssued', 'concealedCarryLicenseExpiration'] as const;

      for (const field of dateFields) {
        const convertedDate = safeConvertDate(validatedData[field] as string | undefined);
        if (convertedDate) {
          updateData[field] = convertedDate;
        } else {
          delete updateData[field];
        }
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ============================================
  // USER MANAGEMENT ROUTES (Admin/Superadmin)
  // ============================================

  // Get all users (Admin+)
  app.get('/api/admin/users', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get pending users count (Instructor+)
  app.get('/api/admin/users/pending/count', isAuthenticated, requireInstructorOrHigher, async (req: any, res) => {
    try {
      const count = await storage.getPendingUsersCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching pending users count:", error);
      res.status(500).json({ message: "Failed to fetch pending users count" });
    }
  });

  // Create user manually (Admin+)
  app.post('/api/admin/users', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const createUserSchema = z.object({
        email: z.string().email("Invalid email address"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        role: z.enum(['student', 'instructor', 'admin', 'superadmin']),
        userStatus: z.enum(['pending', 'active', 'suspended', 'rejected']).default('active'),
      });

      const validatedData = createUserSchema.parse(req.body);

      // Only superadmins can create other superadmins
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (validatedData.role === 'superadmin' && admin?.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can create other superadmins" });
      }

      const newUser = await storage.createUser({
        ...validatedData,
        statusUpdatedAt: new Date(),
      });

      res.json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Approve user (Instructor+)
  app.patch('/api/admin/users/:userId/approve', isAuthenticated, requireInstructorOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, {
        userStatus: 'active',
        statusUpdatedAt: new Date(),
        statusReason: null,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  // Reject user (Instructor+)
  app.patch('/api/admin/users/:userId/reject', isAuthenticated, requireInstructorOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, {
        userStatus: 'rejected',
        statusUpdatedAt: new Date(),
        statusReason: reason || 'Application rejected',
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  // Update user role (Admin+)
  app.patch('/api/admin/users/:userId/role', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const roleSchema = z.enum(['student', 'instructor', 'admin', 'superadmin']);
      const validatedRole = roleSchema.parse(role);

      // Only superadmins can assign superadmin role
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      if (validatedRole === 'superadmin' && admin?.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can assign superadmin role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, {
        role: validatedRole,
      });

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role", errors: error.errors });
      }
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Edit user (Admin+)
  app.patch('/api/admin/users/:userId', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;
      const admin = await storage.getUser(adminId);

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const editUserSchema = z.object({
        email: z.string().email("Invalid email address").optional(),
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        preferredName: z.string().optional(),
        phone: z.string().optional(),
        role: z.enum(['student', 'instructor', 'admin', 'superadmin']).optional(),
        userStatus: z.enum(['pending', 'active', 'suspended', 'rejected']).optional(),
      });

      const validatedData = editUserSchema.parse(req.body);

      // Only superadmins can assign superadmin role
      if (validatedData.role === 'superadmin' && admin?.role !== 'superadmin') {
        return res.status(403).json({ message: "Only superadmins can assign superadmin role" });
      }

      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Send password reset (Admin+)
  app.post('/api/admin/users/:userId/reset-password', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Note: Replit Auth handles authentication, so we don't have a traditional password reset
      // This endpoint is a placeholder for future integration with password reset functionality
      // For now, we'll just return a success message indicating the admin should direct the user to re-authenticate

      res.json({
        message: "Password reset requested. The user should log out and log back in through Replit Auth.",
        user: { email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      res.status(500).json({ message: "Failed to send password reset" });
    }
  });

  // Delete user (Admin+)
  app.delete('/api/admin/users/:userId', isAuthenticated, requireAdminOrHigher, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      // Prevent self-deletion
      if (userId === adminId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, validatedData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Check if any courses are using this category
      const courses = await storage.getCourses();
      const coursesInCategory = courses.filter(c => c.categoryId === req.params.id);

      if (coursesInCategory.length > 0) {
        return res.status(400).json({
          message: `Cannot delete category. ${coursesInCategory.length} course(s) are still using this category. Please reassign or delete those courses first.`,
          coursesCount: coursesInCategory.length,
          courses: coursesInCategory.map(c => ({
            id: c.id,
            title: c.title,
            abbreviation: c.abbreviation,
            scheduleCount: c.schedules?.length || 0
          }))
        });
      }

      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Reorder categories endpoint
  app.post('/api/categories/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid request: items array required" });
      }

      await storage.reorderCategories(items);
      res.json({ message: "Categories reordered successfully" });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ message: "Failed to reorder categories" });
    }
  });

  // Toggle category home page visibility
  app.patch('/api/categories/:id/home-visibility', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { showOnHomePage } = req.body;
      if (typeof showOnHomePage !== 'boolean') {
        return res.status(400).json({ message: "Invalid request: showOnHomePage must be a boolean" });
      }

      const category = await storage.updateCategory(req.params.id, { showOnHomePage });
      res.json(category);
    } catch (error) {
      console.error("Error updating category visibility:", error);
      res.status(500).json({ message: "Failed to update category visibility" });
    }
  });

  // App settings routes
  app.get('/api/app-settings', async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({ message: "Failed to fetch app settings" });
    }
  });

  app.patch('/api/app-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertAppSettingsSchema.parse(req.body);
      const settings = await storage.updateAppSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating app settings:", error);
      res.status(500).json({ message: "Failed to update app settings" });
    }
  });

  // Course routes
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertCourseSchema.parse({
        ...req.body,
        instructorId: userId,
      });

      const course = await storage.createCourse(validatedData);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Toggle course home page visibility
  app.patch('/api/courses/:id/home-visibility', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { showOnHomePage } = req.body;
      if (typeof showOnHomePage !== 'boolean') {
        return res.status(400).json({ message: "Invalid request: showOnHomePage must be a boolean" });
      }

      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedCourse = await storage.updateCourse(req.params.id, { showOnHomePage });
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course visibility:", error);
      res.status(500).json({ message: "Failed to update course visibility" });
    }
  });

  app.get('/api/instructor/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courses = await storage.getCoursesByInstructor(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching instructor courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get courses with detailed schedule information for calendar display
  app.get('/api/instructor/courses-detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courses = await storage.getCoursesByInstructor(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching detailed instructor courses:", error);
      res.status(500).json({ message: "Failed to fetch detailed courses" });
    }
  });

  // Get deleted courses for instructor
  app.get('/api/instructor/deleted-courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courses = await storage.getDeletedCoursesByInstructor(userId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching deleted courses:", error);
      res.status(500).json({ message: "Failed to fetch deleted courses" });
    }
  });

  // Get deleted schedules for instructor
  app.get('/api/instructor/deleted-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const schedules = await storage.getDeletedSchedulesByInstructor(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching deleted schedules:", error);
      res.status(500).json({ message: "Failed to fetch deleted schedules" });
    }
  });

  // Student unenrollment endpoint
  app.post('/api/student/enrollments/:enrollmentId/unenroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { enrollmentId } = req.params;
      const { requestRefund } = req.body;

      // Verify enrollment belongs to user
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if enrollment is already cancelled
      if (enrollment.status === 'cancelled') {
        return res.status(400).json({ message: "Enrollment is already cancelled" });
      }

      // Calculate days until class starts for refund eligibility
      const schedule = await storage.getCourseSchedule(enrollment.scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const classStartDate = new Date(schedule.startDate);
      const today = new Date();
      const daysUntilClass = Math.ceil((classStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine cancellation reason based on refund policy
      let cancellationReason = 'Student self-unenrollment';
      if (requestRefund && daysUntilClass > 21) {
        cancellationReason = 'Student self-unenrollment - Full refund requested (>21 days notice)';
      } else if (daysUntilClass >= 14 && daysUntilClass <= 21) {
        cancellationReason = 'Student self-unenrollment - Future credit eligible (14-21 days notice)';
      } else if (daysUntilClass < 14 && daysUntilClass >= 0) {
        cancellationReason = 'Student self-unenrollment - Partial future credit eligible (<14 days notice)';
      }

      // Update enrollment status to cancelled
      const updateData: any = {
        status: 'cancelled',
        cancellationDate: new Date(),
        cancellationReason,
      };

      // Track refund request if applicable
      if (requestRefund && daysUntilClass > 21) {
        updateData.refundRequested = true;
        updateData.refundRequestedAt = new Date();
      }

      await storage.updateEnrollment(enrollmentId, updateData);

      // Increase available spots on the schedule
      await storage.updateCourseSchedule(enrollment.scheduleId, {
        availableSpots: schedule.availableSpots + 1,
      });

      // Remove from SMS list if auto-added
      try {
        const smsList = await storage.getSmsListBySchedule(enrollment.scheduleId);
        if (smsList) {
          const membership = await storage.getSmsListMembership(smsList.id, userId);
          if (membership && membership.autoAdded) {
            await storage.removeSmsListMember(smsList.id, userId);
          }
        }
      } catch (error) {
        console.error('Error removing from SMS list:', error);
        // Don't fail the unenrollment if SMS list removal fails
      }

      // Send notification to instructors if refund was requested
      if (requestRefund && daysUntilClass > 21) {
        try {
          const student = await storage.getUser(userId);
          const course = await storage.getCourse(enrollment.courseId);

          if (student && course) {
            // Send email notification to instructor
            const instructor = await storage.getUser(course.instructorId);
            if (instructor && instructor.email) {
              const NotificationEmailService = (await import('./emailService')).NotificationEmailService;
              await NotificationEmailService.sendEmail({
                to: instructor.email,
                subject: `Refund Request - ${course.title}`,
                html: `
                  <h2>Refund Request Received</h2>
                  <p>A student has requested a refund for your course:</p>
                  <ul>
                    <li><strong>Student:</strong> ${student.firstName} ${student.lastName}</li>
                    <li><strong>Email:</strong> ${student.email}</li>
                    <li><strong>Course:</strong> ${course.title}</li>
                    <li><strong>Schedule Date:</strong> ${schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : 'N/A'}</li>
                    <li><strong>Days Until Class:</strong> ${daysUntilClass}</li>
                  </ul>
                  <p>This student is eligible for a full refund as they cancelled more than 21 days before the class start date.</p>
                  <p>Please process this refund within 5-10 business days.</p>
                `,
              });
            }

            console.log(`Refund requested by ${student.firstName} ${student.lastName} for ${course.title}`);
          }
        } catch (error) {
          console.error('Error sending refund notification:', error);
          // Don't fail the unenrollment if email fails
        }
      }

      res.json({
        success: true,
        message: requestRefund && daysUntilClass > 21
          ? "Successfully unenrolled. Refund request has been submitted."
          : "Successfully unenrolled from course"
      });
    } catch (error) {
      console.error("Error unenrolling student:", error);
      res.status(500).json({ message: "Failed to unenroll from course" });
    }
  });

  // Student transfer request endpoints
  // Get available schedules for student transfer (same course, future dates only)
  app.get('/api/student/available-schedules/:courseId/:enrollmentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { courseId, enrollmentId } = req.params;

      // Verify enrollment belongs to user
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get future schedules for the same course, excluding current schedule
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const availableSchedules = course.schedules
        .filter(schedule =>
          !schedule.deletedAt &&
          schedule.id !== enrollment.scheduleId &&
          new Date(schedule.startDate) >= startOfToday &&
          schedule.availableSpots > 0
        )
        .map(schedule => ({
          id: schedule.id,
          courseId: course.id,
          courseTitle: course.title,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          maxSpots: schedule.maxSpots,
          availableSpots: schedule.availableSpots
        }))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      res.json(availableSchedules);
    } catch (error) {
      console.error("Error fetching available schedules:", error);
      res.status(500).json({ message: "Failed to fetch available schedules" });
    }
  });

  // Student request to transfer to a different schedule
  app.post('/api/student/enrollments/:enrollmentId/request-transfer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { enrollmentId } = req.params;
      const { newScheduleId, notes } = req.body;

      // Verify enrollment belongs to user
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!newScheduleId || !notes) {
        return res.status(400).json({ message: "New schedule ID and notes are required" });
      }

      // Update enrollment with transfer request notes
      await storage.updateEnrollment(enrollmentId, {
        notes: `TRANSFER REQUEST: Student requested transfer to schedule ${newScheduleId}. Reason: ${notes}`,
      });

      // TODO: Send notification to instructor about transfer request
      // This can be implemented later using the notification system

      res.json({
        success: true,
        message: "Transfer request submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting transfer request:", error);
      res.status(500).json({ message: "Failed to submit transfer request" });
    }
  });

  // Student request to be placed on hold
  app.post('/api/student/enrollments/:enrollmentId/request-hold', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { enrollmentId } = req.params;
      const { notes } = req.body;

      // Verify enrollment belongs to user
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!notes) {
        return res.status(400).json({ message: "Notes are required" });
      }

      // Update enrollment with hold request notes
      await storage.updateEnrollment(enrollmentId, {
        notes: `HOLD REQUEST: Student requested to be placed on hold. Reason: ${notes}`,
      });

      // TODO: Send notification to instructor about hold request
      // This can be implemented later using the notification system

      res.json({
        success: true,
        message: "Hold request submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting hold request:", error);
      res.status(500).json({ message: "Failed to submit hold request" });
    }
  });

  // Course schedule routes
  app.post('/api/courses/:courseId/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const course = await storage.getCourse(req.params.courseId);

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertCourseScheduleSchema.parse({
        ...req.body,
        courseId: req.params.courseId,
      });

      const schedule = await storage.createCourseSchedule(validatedData);

      // Send notifications to all signups asynchronously (don't block response)
      CourseNotificationEngine.notifySignupsForSchedule(schedule.id, schedule, course)
        .then((result) => {
          console.log(`Notification results for schedule ${schedule.id}:`, {
            emailSent: result.emailSent,
            emailFailed: result.emailFailed,
            smsSent: result.smsSent,
            smsFailed: result.smsFailed,
            errors: result.errors
          });
        })
        .catch((error) => {
          console.error('Error sending notifications:', error);
        });

      // Automatically create SMS list for this schedule (synchronous to ensure it exists before enrollments)
      try {
        const formatDate = (dateString: string | Date) => {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        };

        const listName = `${course.title} - ${formatDate(schedule.startDate)}`;
        const listDescription = `Auto-generated list for ${course.title} scheduled on ${formatDate(schedule.startDate)}`;

        await storage.createSmsList({
          name: listName,
          listType: 'course_schedule',
          scheduleId: schedule.id,
          instructorId: course.instructorId,
          description: listDescription,
          isActive: true,
        });

        console.log(`Successfully created SMS list for schedule ${schedule.id}: ${listName}`);
      } catch (error) {
        console.error(`Error creating SMS list for schedule ${schedule.id}:`, error);
      }

      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating course schedule:", error);
      res.status(500).json({ message: "Failed to create course schedule" });
    }
  });

  // Course notification signup routes
  // Public endpoint for students to sign up for course notifications
  app.post('/api/courses/:courseId/notification-signup', async (req: any, res) => {
    try {
      const courseId = req.params.courseId;

      // Verify course exists and is active
      const course = await storage.getCourse(courseId);
      if (!course || !course.isActive) {
        return res.status(404).json({ message: "Course not found or inactive" });
      }

      const validatedData = insertCourseNotificationSignupSchema.parse({
        ...req.body,
        courseId,
      });

      const signup = await storage.createCourseNotificationSignup(validatedData);
      res.status(201).json({
        success: true,
        message: "Successfully signed up for notifications",
        signup
      });
    } catch (error) {
      console.error("Error creating notification signup:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to sign up for notifications" });
    }
  });

  // Get notification signups for a course (instructor only)
  app.get('/api/instructor/courses/:courseId/notification-signups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = req.params.courseId;

      // Verify instructor has access to this course
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const signups = await storage.getCourseNotificationSignups(courseId);
      res.json(signups);
    } catch (error) {
      console.error("Error fetching notification signups:", error);
      res.status(500).json({ message: "Failed to fetch notification signups" });
    }
  });

  // Delete notification signup (instructor only)
  app.delete('/api/instructor/notification-signups/:signupId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      await storage.deleteCourseNotificationSignup(req.params.signupId);
      res.json({ success: true, message: "Notification signup deleted" });
    } catch (error) {
      console.error("Error deleting notification signup:", error);
      res.status(500).json({ message: "Failed to delete notification signup" });
    }
  });

  // Enrollment routes
  app.post('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertEnrollmentSchema.parse({
        ...req.body,
        studentId: userId,
      });

      const enrollment = await storage.createEnrollment(validatedData);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to create enrollment" });
    }
  });

  // DEPRECATED: Legacy course registration endpoint - Use the new secure flow instead
  // This endpoint bypassed security checks and is now disabled
  app.post('/api/course-registration', async (req: any, res) => {
    res.status(410).json({
      message: "This endpoint has been deprecated for security reasons. Please use the new registration flow: /api/course-registration/initiate",
      newEndpoint: "/api/course-registration/initiate"
    });
  });

  // Single-page registration flow endpoints

  // Step 1: Initiate draft enrollment
  app.post('/api/course-registration/initiate', async (req: any, res) => {
    try {
      const validatedData = initiateRegistrationSchema.parse(req.body);
      const { scheduleId, paymentOption, promoCode, studentInfo, accountCreation } = validatedData;

      let userId = null;
      let accountCreated = false;

      // If user is authenticated, use their existing account
      if (req.user && req.user.id) {
        userId = req.user.id;
      } else {
        // For non-authenticated users, handle account creation if requested
        // but keep draft enrollment with studentId=null until proper login
        if (accountCreation && accountCreation.password) {
          try {
            const existingUser = await storage.getUserByEmail(studentInfo.email);
            if (existingUser) {
              return res.status(400).json({ message: "An account with this email already exists. Please log in." });
            }

            // Create the user account but don't assign it to the enrollment yet
            // User must log in properly to claim the enrollment
            const newUser = await storage.upsertUser({
              email: studentInfo.email,
              firstName: studentInfo.firstName,
              lastName: studentInfo.lastName,
              role: 'student',
            });
            accountCreated = true;
            // Keep userId = null for draft enrollment security
          } catch (error) {
            console.error("Error creating user account:", error);
            return res.status(500).json({ message: "Failed to create user account" });
          }
        }
        // For all non-authenticated users (including those who just created accounts), userId remains null
      }

      // Get the course ID from the schedule
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const draftEnrollment = await storage.initiateRegistration({
        courseId: schedule.courseId,
        scheduleId,
        paymentOption,
        studentId: userId, // Pass userId for authenticated users, null for guests
      });

      // Include account creation status in response
      const response = {
        ...draftEnrollment,
        accountCreated
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Error initiating registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to initiate registration" });
    }
  });

  // Step 2: Create or update payment intent for draft enrollment
  app.post('/api/course-registration/payment-intent', async (req: any, res) => {
    try {
      const validatedData = paymentIntentRequestSchema.parse(req.body);
      const { enrollmentId, promoCode } = validatedData;

      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check ownership: either authenticated user owns it, or it's a guest enrollment
      if (req.isAuthenticated()) {
        const userId = req.user.id;
        // For authenticated users, allow access to:
        // 1. Enrollments they own (studentId matches)
        // 2. Draft enrollments (studentId is null) that they can claim
        if (enrollment.studentId !== null && enrollment.studentId !== userId) {
          return res.status(403).json({ message: "Access denied - enrollment ownership required" });
        }
      } else if (enrollment.studentId !== null) {
        // Guest users can only access enrollments without a studentId (draft enrollments)
        return res.status(403).json({ message: "Access denied - authentication required" });
      }

      const paymentData = await storage.upsertPaymentIntent(enrollmentId, promoCode);

      res.json(paymentData);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Step 3: Finalize enrollment after payment confirmation
  app.post('/api/course-registration/confirm', async (req: any, res) => {
    try {
      const validatedData = confirmEnrollmentSchema.parse(req.body);
      const { enrollmentId, paymentIntentId, studentInfo } = validatedData;

      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check ownership: either authenticated user owns it, guest user matches email, or it's a draft enrollment
      if (req.isAuthenticated()) {
        const userId = req.user.id;
        if (enrollment.studentId !== userId) {
          return res.status(403).json({ message: "Access denied - enrollment ownership required" });
        }
      } else {
        // For guest users, verify email matches the stored studentInfo or it's a draft enrollment
        if (enrollment.studentInfo && enrollment.studentInfo.email !== studentInfo.email) {
          return res.status(403).json({ message: "Access denied - email mismatch" });
        }
      }

      const finalizedEnrollment = await storage.finalizeEnrollment({
        enrollmentId,
        paymentIntentId,
        studentInfo,
      });

      // Trigger enrollment confirmation notifications (educational purpose)
      if (finalizedEnrollment.status === 'confirmed' && finalizedEnrollment.studentId) {
        await NotificationEngine.processEventTriggers('enrollment_confirmed', {
          userId: finalizedEnrollment.studentId,
          courseId: finalizedEnrollment.courseId,
          scheduleId: finalizedEnrollment.scheduleId,
          enrollmentId: finalizedEnrollment.id
        });
      }

      // Auto-add student to SMS list for this schedule (fire-and-forget)
      if (finalizedEnrollment.status === 'confirmed' && finalizedEnrollment.studentId) {
        (async () => {
          try {
            const smsList = await storage.getSmsListBySchedule(finalizedEnrollment.scheduleId);

            if (smsList) {
              const isAlreadyMember = await storage.checkSmsListMembership(smsList.id, finalizedEnrollment.studentId);

              if (!isAlreadyMember) {
                const course = await storage.getCourse(finalizedEnrollment.courseId);
                await storage.addSmsListMember({
                  listId: smsList.id,
                  userId: finalizedEnrollment.studentId,
                  addedBy: course?.instructorId || finalizedEnrollment.studentId,
                  autoAdded: true,
                  notes: 'Auto-added from enrollment',
                });

                console.log(`Successfully added student ${finalizedEnrollment.studentId} to SMS list ${smsList.id}`);
              } else {
                console.log(`Student ${finalizedEnrollment.studentId} already in SMS list ${smsList.id}`);
              }
            } else {
              console.log(`No SMS list found for schedule ${finalizedEnrollment.scheduleId}`);
            }
          } catch (error) {
            console.error(`Error auto-adding student to SMS list for enrollment ${enrollmentId}:`, error);
          }
        })();
      }

      res.status(200).json(finalizedEnrollment);
    } catch (error) {
      console.error("Error finalizing enrollment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to finalize enrollment" });
    }
  });

  app.get('/api/student/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollments = await storage.getEnrollmentsByStudent(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching student enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/instructor/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollments = await storage.getEnrollmentsByInstructor(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching instructor enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.patch('/api/course-form-fields/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { updates } = req.body;

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: "Updates array is required" });
      }

      // Validate updates array
      for (const update of updates) {
        if (!update.id || typeof update.sortOrder !== 'number') {
          return res.status(400).json({ message: "Each update must have id and sortOrder" });
        }
      }

      // Use the correct storage method for reordering
      await storage.reorderCourseInformationFormFields(updates);

      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering form fields:", error);
      res.status(500).json({ message: "Failed to reorder fields" });
    }
  });

  // Get student profile with enrollment history
  app.get('/api/students/:studentId/profile', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

    const { studentId } = req.params;

    try {
      // Get student information
      const student = await db.query.users.findFirst({
        where: eq(users.id, studentId),
      });

      if (!student) {
        return res.status(404).send({ message: 'Student not found' });
      }

      // Get all enrollments for this student with related data
      const allEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.studentId, studentId),
        with: {
          course: true,
          schedule: true,
        },
      });

      // Build enrollment history from all enrollments, sorted by schedule date
      const enrollmentHistory = allEnrollments
        .map(enrollment => ({
          id: enrollment.id,
          courseTitle: enrollment.course.title,
          courseAbbreviation: enrollment.course.abbreviation,
          scheduleDate: enrollment.schedule?.startDate?.toISOString() || 'N/A',
          scheduleStartTime: enrollment.schedule?.startTime || 'N/A',
          scheduleEndTime: enrollment.schedule?.endTime || 'N/A',
          status: enrollment.status,
          paymentStatus: enrollment.paymentStatus,
          completionDate: enrollment.completionDate?.toISOString(),
          certificateIssued: enrollment.status === 'completed' && !!enrollment.completionDate,
        }))
        .sort((a, b) => {
          // Sort by schedule date, most recent first
          const dateA = a.scheduleDate !== 'N/A' ? new Date(a.scheduleDate).getTime() : 0;
          const dateB = b.scheduleDate !== 'N/A' ? new Date(b.scheduleDate).getTime() : 0;
          return dateB - dateA;
        });

      const profile = {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        concealedCarryLicenseExpiration: student.concealedCarryLicenseExpiration?.toISOString(),
        enrollmentHistory: enrollmentHistory,
      };

      res.json(profile);
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      res.status(500).send({ message: 'Failed to fetch student profile' });
    }
  });

  // Get upcoming appointments for a student
  app.get('/api/students/:studentId/upcoming-appointments', isAuthenticated, async (req, res) => {
    const { studentId } = req.params;

    try {
      // Get student's upcoming appointments
      const now = new Date();
      const studentAppointments = await db.query.instructorAppointments.findMany({
        where: and(
          eq(instructorAppointments.studentId, studentId),
          gte(instructorAppointments.startTime, now)
        ),
        with: {
          appointmentType: true,
        },
        orderBy: (instructorAppointments, { asc }) => [asc(instructorAppointments.startTime)],
      });

      const upcomingAppointments = studentAppointments.map(appointment => ({
        id: appointment.id,
        appointmentTypeTitle: appointment.appointmentType?.title || 'Unknown',
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        durationMinutes: appointment.appointmentType?.durationMinutes || 0,
        price: appointment.appointmentType?.price || 0,
      }));

      res.json(upcomingAppointments);
    } catch (error: any) {
      console.error('Error fetching upcoming appointments:', error);
      res.status(500).send({ message: 'Failed to fetch upcoming appointments' });
    }
  });

  // Get all students with enrollments (for instructor view)
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const studentsData = await storage.getStudentsByInstructor(userId);

      // Return the full structured data for Students Management page
      res.json(studentsData);
    } catch (error) {
      console.error("Error fetching students data:", error);
      res.status(500).json({ message: "Failed to fetch students data" });
    }
  });

  app.patch('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const studentId = req.params.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify instructor has access to this student through enrollments
      const studentsData = await storage.getStudentsByInstructor(userId);
      const allStudents = [...studentsData.current, ...studentsData.former];
      const studentExists = allStudents.some(student => student.id === studentId);

      if (!studentExists) {
        return res.status(403).json({ message: "Access denied. Student not found in your courses." });
      }

      // Validate request body
      const updateSchema = z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        concealedCarryLicenseExpiration: z.string().optional(),
        concealedCarryLicenseIssued: z.string().optional(),
        licenseExpirationReminderDays: z.number().optional(),
        enableLicenseExpirationReminder: z.boolean().optional(),
        refresherReminderDays: z.number().optional(),
        enableRefresherReminder: z.boolean().optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Convert date strings to proper format for database
      const updateData = {
        ...validatedData,
        concealedCarryLicenseExpiration: validatedData.concealedCarryLicenseExpiration
          ? new Date(validatedData.concealedCarryLicenseExpiration).toISOString()
          : undefined,
        concealedCarryLicenseIssued: validatedData.concealedCarryLicenseIssued
          ? new Date(validatedData.concealedCarryLicenseIssued).toISOString()
          : undefined,
      };

      const updatedStudent = await storage.updateStudent(studentId, updateData);
      res.json(updatedStudent);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // Waiver instances for enrollment
  app.get('/api/enrollments/:enrollmentId/waiver-instances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const enrollmentId = req.params.enrollmentId;

      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check ownership: student owns enrollment or instructor has access
      const user = await storage.getUser(userId);
      const hasAccess = enrollment.studentId === userId ||
                       ((user?.role === 'instructor' || user?.role === 'superadmin') && (enrollment.course?.instructorId === userId || user?.role === 'superadmin'));

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const waiverInstances = await storage.getWaiverInstancesByEnrollment(enrollmentId);
      res.json(waiverInstances);
    } catch (error) {
      console.error("Error fetching waiver instances:", error);
      res.status(500).json({ message: "Failed to fetch waiver instances" });
    }
  });

  // Payment balance tracking
  app.get('/api/enrollments/:enrollmentId/payment-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const enrollmentId = req.params.enrollmentId;

      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check ownership: either student owns it or instructor has access
      const user = await storage.getUser(userId);
      const hasAccess = enrollment.studentId === userId ||
                       ((user?.role === 'instructor' || user?.role === 'superadmin') && (enrollment.course?.instructorId === userId || user?.role === 'superadmin'));

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const paymentBalance = await storage.getPaymentBalance(enrollmentId);
      res.json(paymentBalance);
    } catch (error) {
      console.error("Error fetching payment balance:", error);
      res.status(500).json({ message: "Failed to fetch payment balance" });
    }
  });

  // Bulk payment balance tracking for student dashboard
  app.get('/api/student/payment-balances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const enrollmentIds = req.query.enrollmentIds as string;

      if (!enrollmentIds) {
        return res.json([]);
      }

      const ids = enrollmentIds.split(',').filter(id => id.trim());
      const balances = await Promise.all(
        ids.map(async (enrollmentId) => {
          try {
            const enrollment = await storage.getEnrollment(enrollmentId);
            if (!enrollment || enrollment.studentId !== userId) {
              return null;
            }

            const paymentBalance = await storage.getPaymentBalance(enrollmentId);
            return {
              enrollmentId,
              ...paymentBalance
            };
          } catch (error) {
            console.error(`Error fetching balance for enrollment ${enrollmentId}:`, error);
            return null;
          }
        })
      );

      res.json(balances.filter(b => b !== null));
    } catch (error) {
      console.error("Error fetching payment balances:", error);
      res.status(500).json({ message: "Failed to fetch payment balances" });
    }
  });

  // Form completion status tracking
  app.get("/api/enrollments/:enrollmentId/form-completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const enrollmentId = req.params.enrollmentId;

      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check ownership: student owns enrollment or instructor has access
      const user = await storage.getUser(userId);
      const hasAccess = enrollment.studentId === userId ||
                       ((user?.role === 'instructor' || user?.role === 'superadmin') && (enrollment.course?.instructorId === userId || user?.role === 'superadmin'));

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const formStatus = await storage.getFormCompletionStatus(enrollmentId);
      res.json(formStatus);
    } catch (error) {
      console.error("Error fetching form completion status:", error);
      res.status(500).json({ message: "Failed to fetch form completion status" });
    }
  });

  // Enrollment feedback endpoints

  // Get feedback for an enrollment
  app.get("/api/enrollments/:enrollmentId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.claims?.sub;
      const enrollmentId = req.params.enrollmentId;

      // Verify enrollment exists and user has access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Check access: student, instructor of the course, or superadmin
      const user = await storage.getUser(userId);
      const hasAccess =
        enrollment.studentId === userId ||
        (user?.role === 'instructor' && enrollment.course?.instructorId === userId) ||
        user?.role === 'superadmin';

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const feedback = await storage.getEnrollmentFeedback(enrollmentId);
      res.json(feedback || null);
    } catch (error) {
      console.error("Error fetching enrollment feedback:", error);
      res.status(500).json({ message: "Failed to fetch enrollment feedback" });
    }
  });

  // Instructor updates feedback for an enrollment
  app.patch("/api/instructor/enrollments/:enrollmentId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.claims?.sub;
      const enrollmentId = req.params.enrollmentId;
      const { positive, opportunities, actionPlan } = req.body;

      // Verify enrollment exists
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Verify instructor access
      const user = await storage.getUser(userId);
      const isInstructor =
        (user?.role === 'instructor' && enrollment.course?.instructorId === userId) ||
        user?.role === 'superadmin';

      if (!isInstructor) {
        return res.status(403).json({ message: "Only instructors can update feedback" });
      }

      const feedback = await storage.updateInstructorFeedback(enrollmentId, userId, {
        positive,
        opportunities,
        actionPlan,
      });

      res.json(feedback);
    } catch (error) {
      console.error("Error updating instructor feedback:", error);
      res.status(500).json({ message: "Failed to update instructor feedback" });
    }
  });

  // Student updates their notes for an enrollment
  app.patch("/api/enrollments/:enrollmentId/student-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.claims?.sub;
      const enrollmentId = req.params.enrollmentId;
      const { notes } = req.body;

      // Verify enrollment exists and belongs to this student
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      if (enrollment.studentId !== userId) {
        return res.status(403).json({ message: "You can only update your own notes" });
      }

      const feedback = await storage.updateStudentNotes(enrollmentId, notes || '');
      res.json(feedback);
    } catch (error) {
      console.error("Error updating student notes:", error);
      res.status(500).json({ message: "Failed to update student notes" });
    }
  });

  // Submit enrollment form responses
  app.post("/api/enrollment-form-submissions", isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, formResponses } = req.body;
      const userId = req.claims.sub;

      if (!enrollmentId || !formResponses) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify the enrollment belongs to this user
      const enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.id, enrollmentId),
          eq(enrollments.studentId, userId)
        ),
        with: {
          course: {
            with: {
              forms: {
                with: {
                  fields: true
                }
              }
            }
          }
        }
      });

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Store form responses
      await db
        .update(enrollments)
        .set({
          formSubmissionData: formResponses,
          formSubmittedAt: new Date()
        })
        .where(eq(enrollments.id, enrollmentId));

      // Update user profile with form data
      const profileUpdateData: any = {};

      // Create a mapping of field IDs to their labels
      const fieldMapping: Record<string, string> = {};
      enrollment.course?.forms?.forEach((form: any) => {
        form.fields?.forEach((field: any) => {
          fieldMapping[field.id] = field.label.toLowerCase().trim();
        });
      });

      // Map form responses to user profile fields
      Object.entries(formResponses).forEach(([fieldId, value]) => {
        const label = fieldMapping[fieldId];
        if (!label || !value || value === '') return;

        // More comprehensive field mapping
        if (label.includes('street') || label.includes('physical address') || (label.includes('current') && label.includes('address'))) {
          profileUpdateData.streetAddress = value;
        } else if (label === 'city') {
          profileUpdateData.city = value;
        } else if (label === 'state') {
          profileUpdateData.state = value;
        } else if (label.includes('zip')) {
          profileUpdateData.zipCode = value;
        } else if ((label.includes('phone') || label.includes('telephone')) && !label.includes('emergency')) {
          profileUpdateData.phone = value;
        } else if (label === 'date of birth' || label === 'birth date') {
          profileUpdateData.dateOfBirth = new Date(value as string);
        } else if (label.includes('emergency') && (label.includes('name') || label.includes('contact')) && !label.includes('phone')) {
          profileUpdateData.emergencyContactName = value;
        } else if (label.includes('emergency') && label.includes('phone')) {
          profileUpdateData.emergencyContactPhone = value;
        } else if (label === 'first name') {
          profileUpdateData.firstName = value;
        } else if (label === 'last name') {
          profileUpdateData.lastName = value;
        } else if (label.includes('email')) {
          profileUpdateData.email = value;
        }
      });

      // Update user profile if there are any changes
      if (Object.keys(profileUpdateData).length > 0) {
        console.log('Updating user profile with form data:', profileUpdateData);
        await storage.updateUser(userId, profileUpdateData);
      }

      res.json({ message: "Form submitted successfully" });
    } catch (error) {
      console.error("Error submitting form:", error);
      res.status(500).json({ message: "Failed to submit form" });
    }
  });

  // Course schedules for export selection
  app.get('/api/instructor/course-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const courses = await storage.getCoursesByInstructor(userId);

      // Format schedules for export selection
      const schedules = courses
        .flatMap(course =>
          course.schedules
            .filter(schedule => !schedule.deletedAt) // Only active schedules
            .map(schedule => ({
              id: schedule.id,
              courseId: course.id,
              courseTitle: course.title,
              courseAbbreviation: course.abbreviation,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              maxSpots: schedule.maxSpots,
              availableSpots: schedule.availableSpots,
              enrollmentCount: schedule.maxSpots - schedule.availableSpots
            }))
        )
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching course schedules:", error);
      res.status(500).json({ message: "Failed to fetch course schedules" });
    }
  });

  // Course roster export routes
  app.get('/api/instructor/roster/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const format = req.query.format || 'excel';
      const scheduleId = req.query.scheduleId as string | undefined;
      const data = await storage.getRosterExportData(userId, scheduleId);

      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'Student ID', 'First Name', 'Last Name', 'Email', 'Phone',
          'Date of Birth', 'License Expiration', 'Course Title', 'Course Code',
          'Schedule Date', 'Start Time', 'End Time', 'Payment Status',
          'Enrollment Status', 'Category', 'Registration Date'
        ];

        const allRows = [...data.current, ...data.former];
        const csvRows = [headers.join(',')];

        allRows.forEach(row => {
          const values = [
            row.studentId, row.firstName, row.lastName, row.email, row.phone,
            row.dateOfBirth, row.licenseExpiration, row.courseTitle, row.courseAbbreviation,
            row.scheduleDate, row.scheduleStartTime, row.scheduleEndTime,
            row.paymentStatus, row.enrollmentStatus, row.category, row.registrationDate
          ];
          // Sanitize CSV values to prevent formula injection
          const sanitizedValues = values.map(v => {
            const str = String(v || '');
            // Escape cells that start with formula characters
            if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
              return `"'${str}"`; // Prefix with single quote to treat as literal
            }
            return `"${str.replace(/"/g, '""')}"`; // Escape quotes
          });
          csvRows.push(sanitizedValues.join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="course-roster-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvRows.join('\n'));

      } else if (format === 'excel') {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.default.Workbook();

        // All Students sheet (combined)
        const allStudentsSheet = workbook.addWorksheet('All Students');
        const headers = [
          'Student ID', 'First Name', 'Last Name', 'Email', 'Phone',
          'Date of Birth', 'License Expiration', 'Course Title', 'Course Code',
          'Schedule Date', 'Start Time', 'End Time', 'Payment Status',
          'Enrollment Status', 'Category', 'Registration Date'
        ];
        allStudentsSheet.addRow(headers);

        const allRows = [...data.current, ...data.former];
        allRows.forEach(row => {
          allStudentsSheet.addRow([
            row.studentId, row.firstName, row.lastName, row.email, row.phone,
            row.dateOfBirth, row.licenseExpiration, row.courseTitle, row.courseAbbreviation,
            row.scheduleDate, row.scheduleStartTime, row.scheduleEndTime,
            row.paymentStatus, row.enrollmentStatus, row.category, row.registrationDate
          ]);
        });

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Course Roster Export Summary']);
        summarySheet.addRow(['Export Date', new Date().toLocaleDateString()]);
        summarySheet.addRow(['Total Current Students', data.summary.totalCurrentStudents]);
        summarySheet.addRow(['Total Former Students', data.summary.totalFormerStudents]);
        summarySheet.addRow(['Total Courses', data.summary.totalCourses]);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="course-roster-${new Date().toISOString().split('T')[0]}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();

      } else {
        res.status(400).json({ message: "Unsupported format. Use 'csv' or 'excel'." });
      }

    } catch (error: any) {
      console.error("Error exporting roster:", error);
      res.status(500).json({ message: "Failed to export roster" });
    }
  });

  // Google Sheets export route
  app.post('/api/instructor/roster/google-sheets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      // Google Sheets integration
      try {
        const { google } = await import('googleapis');

        // Check if credentials are available
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          return res.json({
            message: "Google Sheets integration not configured. Please contact administrator to set up service account credentials.",
            action: "setup_required"
          });
        }

        // Parse service account credentials
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        // Initialize Google Sheets API
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Get roster data
        const scheduleId = req.body.scheduleId as string | undefined;
        const data = await storage.getRosterExportData(userId, scheduleId);
        const allRows = [...data.current, ...data.former];

        if (allRows.length === 0) {
          return res.json({
            message: "No student data available to export.",
            action: "no_data"
          });
        }

        // Create new spreadsheet
        const createResponse = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: `Course Roster - ${new Date().toLocaleDateString()}`
            },
            sheets: [
              {
                properties: { title: 'Summary' },
                data: [{
                  rowData: [
                    { values: [{ userEnteredValue: { stringValue: 'Course Roster Export Summary' } }] },
                    { values: [{ userEnteredValue: { stringValue: 'Export Date' } }, { userEnteredValue: { stringValue: new Date().toLocaleDateString() } }] },
                    { values: [{ userEnteredValue: { stringValue: 'Total Current Students' } }, { userEnteredValue: { numberValue: data.summary.totalCurrentStudents } }] },
                    { values: [{ userEnteredValue: { stringValue: 'Total Former Students' } }, { userEnteredValue: { numberValue: data.summary.totalFormerStudents } }] },
                    { values: [{ userEnteredValue: { stringValue: 'Total Courses' } }, { userEnteredValue: { numberValue: data.summary.totalCourses } }] }
                  ]
                }]
              },
              {
                properties: { title: 'All Students' }
              }
            ]
          }
        });

        const spreadsheetId = createResponse.data.spreadsheetId;
        if (!spreadsheetId) {
          throw new Error('Failed to create spreadsheet - no ID returned');
        }

        // Prepare data for the All Students sheet
        const headers = [
          'Student ID', 'First Name', 'Last Name', 'Email', 'Phone',
          'Date of Birth', 'License Expiration', 'Course Title', 'Course Code',
          'Schedule Date', 'Start Time', 'End Time', 'Payment Status',
          'Enrollment Status', 'Category', 'Registration Date'
        ];

        const values = [
          headers,
          ...allRows.map(row => [
            row.studentId, row.firstName, row.lastName, row.email, row.phone,
            row.dateOfBirth, row.licenseExpiration, row.courseTitle, row.courseAbbreviation,
            row.scheduleDate, row.scheduleStartTime, row.scheduleEndTime,
            row.paymentStatus, row.enrollmentStatus, row.category, row.registrationDate
          ])
        ];

        // Update the All Students sheet with data
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'All Students!A1',
          valueInputOption: 'RAW',
          requestBody: { values }
        });

        // Keep the spreadsheet private (owner-only access)
        // Note: The spreadsheet is accessible only to the service account owner
        // Instructors can access via the returned URL if they have Google account permissions

        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        res.json({
          message: "Google Sheets export created successfully! Note: The spreadsheet is private and accessible only to the service account. You may need to request access or have the administrator share it with your Google account.",
          action: "success",
          spreadsheetUrl,
          spreadsheetId
        });

      } catch (googleError: any) {
        console.error('Google Sheets API error:', googleError);

        if (googleError.message?.includes('credentials')) {
          return res.json({
            message: "Google Sheets credentials not properly configured. Please contact administrator.",
            action: "setup_required"
          });
        }

        throw googleError;
      }

    } catch (error: any) {
      console.error("Error creating Google Sheets export:", error);
      res.status(500).json({ message: "Failed to create Google Sheets export" });
    }
  });

  // Course roster view route (for dialog display)
  app.get('/api/instructor/roster', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'admin' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor or admin role required." });
      }

      const scheduleId = req.query.scheduleId as string | undefined;
      const courseId = req.query.courseId as string | undefined;

      if (!scheduleId && !courseId) {
        return res.status(400).json({ message: "Schedule ID or Course ID is required" });
      }

      console.log(`Fetching roster for ${scheduleId ? 'schedule: ' + scheduleId : 'course: ' + courseId}`);
      const data = await storage.getRosterExportData(userId, scheduleId, courseId);

      // Filter out any remaining null/incomplete enrollments from current list
      data.current = data.current.filter(student =>
        student && student.studentId && student.firstName && student.lastName
      );

      console.log(`Roster data - Current: ${data.current.length}, Former: ${data.former.length}`);

      // Get course details for price calculation
      const course = scheduleId
        ? await storage.getCourseSchedule(scheduleId).then(async schedule => {
            if (schedule) {
              return await storage.getCourse(schedule.courseId);
            }
            return null;
          })
        : courseId
          ? await storage.getCourse(courseId)
          : null;

      const coursePrice = course ? parseFloat(course.price.toString()) : 0;

      // Enrich data with waiver and form completion status
      const enrichedCurrent = await Promise.all(data.current.map(async (student: any) => {
        // Check waiver status
        const studentWaiverInstances = await db.query.waiverInstances.findMany({
          where: eq(waiverInstances.enrollmentId, student.enrollmentId),
        });
        const waiverStatus = studentWaiverInstances.length > 0
          ? (studentWaiverInstances.some(w => w.status === 'signed') ? 'signed' : 'pending')
          : 'not_started';

        // Check form completion status - use formSubmittedAt from enrollment
        const enrollment = await db.query.enrollments.findFirst({
          where: eq(enrollments.id, student.enrollmentId),
        });

        // Get required forms count for this course
        const courseForms = await db.query.courseInformationForms.findMany({
          where: and(
            eq(courseInformationForms.courseId, student.courseId),
            eq(courseInformationForms.isActive, true)
          ),
        });

        const totalRequiredForms = courseForms.filter(f => f.isRequired).length;

        // If formSubmittedAt is set and there are required forms, it's completed
        // If no required forms, it's not_applicable
        // Otherwise check if formSubmissionData exists
        const formStatus = totalRequiredForms === 0
          ? 'not_applicable'
          : enrollment?.formSubmittedAt || enrollment?.formSubmissionData
            ? 'completed'
            : 'not_started';

        return {
          ...student,
          waiverStatus,
          formStatus
        };
      }));

      data.current = enrichedCurrent;

      // Calculate summary statistics for the specific schedule
      const summary = {
        totalEnrolled: data.current.length,
        paidStudents: data.current.filter(s => s.paymentStatus === 'paid').length,
        pendingPayments: data.current.filter(s => s.paymentStatus === 'pending').length,
        totalRevenue: data.current
          .filter(s => s.paymentStatus === 'paid')
          .reduce((sum, s) => {
            // Use the course price for each paid student
            return sum + coursePrice;
          }, 0),
        courseTitle: data.current[0]?.courseTitle || 'Unknown Course',
        scheduleDate: data.current[0]?.scheduleDate || 'Unknown Date',
        scheduleTime: data.current[0] ? `${data.current[0].scheduleStartTime} - ${data.current[0].scheduleEndTime}` : 'Unknown Time',
        location: data.current[0]?.location || 'Unknown Location'
      };

      res.json({
        current: data.current,
        former: data.former,
        summary
      });

    } catch (error: any) {
      console.error("Error fetching roster data:", error);
      res.status(500).json({ message: "Failed to fetch roster data" });
    }
  });

  // Instructor dashboard statistics
  app.get('/api/instructor/dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const stats = await storage.getInstructorDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching instructor dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Get refund requests for instructor
  app.get('/api/instructor/refund-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Get all enrollments for instructor's courses that have refund requests
      const enrollments = await storage.getEnrollmentsByInstructor(userId);
      const refundRequests = enrollments.filter(e =>
        e.refundRequested && !e.refundProcessed
      );

      res.json(refundRequests);
    } catch (error) {
      console.error("Error fetching refund requests:", error);
      res.status(500).json({ message: "Failed to fetch refund requests" });
    }
  });

  // Process refund through Stripe and update enrollment
  app.post('/api/instructor/refund-requests/:enrollmentId/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { enrollmentId } = req.params;

      // Validate request body
      const refundRequestSchema = z.object({
        refundAmount: z.number().positive().optional(),
        refundReason: z.string().optional(),
      });

      const { refundAmount, refundReason } = refundRequestSchema.parse(req.body);

      const enrollment = await storage.getEnrollment(enrollmentId);

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Verify instructor owns this course
      const course = await storage.getCourse(enrollment.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if refund was requested
      if (!enrollment.refundRequested) {
        return res.status(400).json({ message: "No refund was requested for this enrollment" });
      }

      // Check if refund was already processed
      if (enrollment.refundProcessed) {
        return res.status(400).json({ message: "Refund has already been processed" });
      }

      // Process Stripe refund if payment was made
      let stripeRefund = null;
      if (enrollment.stripePaymentIntentId && enrollment.paymentStatus === 'paid') {
        try {
          // Calculate refund amount in cents
          const schedule = await storage.getCourseSchedule(enrollment.scheduleId);
          const coursePrice = schedule?.price || course.price || 0;

          // If refund amount is provided, use it; otherwise refund full amount
          const amountToRefund = refundAmount ? Math.round(refundAmount * 100) : Math.round(coursePrice * 100);

          // Create refund in Stripe
          stripeRefund = await stripe.refunds.create({
            payment_intent: enrollment.stripePaymentIntentId,
            amount: amountToRefund,
            reason: 'requested_by_customer', // Stripe only allows: 'duplicate' | 'fraudulent' | 'requested_by_customer'
            metadata: {
              enrollmentId: enrollment.id,
              studentId: enrollment.studentId || '',
              courseId: enrollment.courseId,
              scheduleId: enrollment.scheduleId,
              refundReason: refundReason || 'Student requested refund',
            }
          });

          console.log('Stripe refund created:', stripeRefund.id);
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError);
          return res.status(500).json({
            message: "Failed to process Stripe refund",
            error: stripeError.message
          });
        }
      }

      // Update enrollment with refund information
      await storage.updateEnrollment(enrollmentId, {
        refundProcessed: true,
        refundProcessedAt: new Date(),
        paymentStatus: 'refunded',
        refundAmount: stripeRefund ? `$${(stripeRefund.amount / 100).toFixed(2)}` : null,
        refundReason: refundReason || 'Student requested refund',
        cancellationReason: `${enrollment.cancellationReason || 'Cancelled'} - Refund processed${refundReason ? ': ' + refundReason : ''}`,
      });

      // Send notification to student about processed refund
      try {
        if (enrollment.studentId) {
          await NotificationEngine.processEventTriggers('refund_processed', {
            userId: enrollment.studentId,
            courseId: enrollment.courseId,
            scheduleId: enrollment.scheduleId,
            enrollmentId: enrollment.id
          });
        }
      } catch (notificationError) {
        console.error('Error sending refund notification:', notificationError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        message: "Refund processed successfully",
        stripeRefundId: stripeRefund?.id,
        amountRefunded: stripeRefund ? stripeRefund.amount / 100 : null,
      });
    } catch (error) {
      console.error("Error processing refund:", error);
      res.status(500).json({ message: "Failed to process refund" });
    }
  });

  // Object storage routes for waivers and course images
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({
        error: "Failed to get upload URL. Object storage may not be configured properly."
      });
    }
  });

  // Course creation endpoint
  app.post("/api/instructor/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Validate required fields
      if (!req.body.title || !req.body.description || !req.body.price || !req.body.category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Convert string values to proper types for database
      const courseData = {
        ...req.body,
        instructorId: userId,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
        depositAmount: req.body.depositAmount ? parseFloat(req.body.depositAmount) : undefined,
        maxStudents: req.body.maxStudents ? parseInt(req.body.maxStudents) : 20,
        rounds: req.body.rounds ? parseInt(req.body.rounds) : undefined,
      };

      const course = await storage.createCourse(courseData);
      res.status(201).json(course);
    } catch (error: any) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course: " + error.message });
    }
  });

  // Update/Edit course endpoint
  app.put("/api/instructor/courses/:courseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;
      const updateData = req.body;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const updatedCourse = await storage.updateCourse(courseId, updateData);
      res.json(updatedCourse);
    } catch (error: any) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course: " + error.message });
    }
  });

  // Duplicate schedule endpoint
  app.post("/api/instructor/schedules/:scheduleId/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Get the schedule and verify it belongs to the instructor's course
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Schedule does not belong to instructor" });
      }

      const duplicatedSchedule = await storage.duplicateCourseSchedule(scheduleId);
      res.json({ message: "Schedule duplicated successfully", schedule: duplicatedSchedule });
    } catch (error: any) {
      console.error("Error duplicating schedule:", error);
      res.status(500).json({ error: "Failed to duplicate schedule: " + error.message });
    }
  });

  // Archive course endpoint
  app.patch("/api/instructor/courses/:courseId/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const archivedCourse = await storage.archiveCourse(courseId);
      res.json({ message: "Course archived successfully", course: archivedCourse });
    } catch (error: any) {
      console.error("Error archiving course:", error);
      res.status(500).json({ error: error.message || "Failed to archive course" });
    }
  });

  // Unpublish course endpoint
  app.patch("/api/instructor/courses/:courseId/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const unpublishedCourse = await storage.unpublishCourse(courseId);
      res.json({ message: "Course unpublished successfully", course: unpublishedCourse });
    } catch (error: any) {
      console.error("Error unpublishing course:", error);
      res.status(500).json({ error: error.message || "Failed to unpublish course" });
    }
  });

  // Publish course endpoint
  app.patch("/api/instructor/courses/:courseId/publish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const publishedCourse = await storage.publishCourse(courseId);
      res.json({ message: "Course published successfully", course: publishedCourse });
    } catch (error: any) {
      console.error("Error publishing course:", error);
      res.status(500).json({ error: error.message || "Failed to publish course" });
    }
  });

  // Reactivate course endpoint
  app.patch("/api/instructor/courses/:courseId/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const reactivatedCourse = await storage.reactivateCourse(courseId);
      res.json({ message: "Course reactivated successfully", course: reactivatedCourse });
    } catch (error: any) {
      console.error("Error reactivating course:", error);
      res.status(500).json({ error: error.message || "Failed to reactivate course" });
    }
  });

  // Duplicate course endpoint
  app.post("/api/instructor/courses/:courseId/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const duplicatedCourse = await storage.duplicateCourse(courseId);
      res.json({ message: "Course duplicated successfully", course: duplicatedCourse });
    } catch (error: any) {
      console.error("Error duplicating course:", error);
      res.status(500).json({ error: "Failed to duplicate course: " + error.message });
    }
  });

  // Delete course endpoint (soft delete)
  app.delete("/api/instructor/courses/:courseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      // Perform soft delete
      const deletedCourse = await storage.deleteCourse(courseId);
      res.json({ message: "Course moved to deleted items", course: deletedCourse });
    } catch (error: any) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course: " + error.message });
    }
  });

  // Permanently delete course endpoint (hard delete)
  app.delete("/api/instructor/courses/:courseId/permanent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Since this is for deleted courses, we need to check directly in the database
      // as the regular getCourse won't return deleted courses
      const courses = await storage.getDeletedCoursesByInstructor(userId);
      const existingCourse = courses.find(c => c.id === courseId);

      if (!existingCourse) {
        return res.status(403).json({ error: "Unauthorized: Course not found in deleted items or does not belong to instructor" });
      }

      console.log(`Permanently deleting course: ${existingCourse.title} (${courseId})`);
      await storage.permanentlyDeleteCourse(courseId);
      console.log(`Successfully deleted course: ${courseId}`);

      res.json({ message: "Course permanently deleted" });
    } catch (error: any) {
      console.error("Error permanently deleting course:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Failed to permanently delete course: " + error.message });
    }
  });

  // Restore course endpoint (undelete)
  app.patch("/api/instructor/courses/:courseId/restore", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course exists in deleted items and belongs to the instructor
      const deletedCourses = await storage.getDeletedCoursesByInstructor(userId);
      const existingCourse = deletedCourses.find(c => c.id === courseId);

      if (!existingCourse) {
        return res.status(403).json({ error: "Unauthorized: Course not found in deleted items or does not belong to instructor" });
      }

      const restoredCourse = await storage.restoreCourse(courseId);
      res.json({ message: "Course restored successfully", course: restoredCourse });
    } catch (error: any) {
      console.error("Error restoring course:", error);
      res.status(500).json({ error: "Failed to restore course: " + error.message });
    }
  });

  // Event creation endpoint (creates course schedules) - MOVED UP
  app.post("/api/instructor/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const eventData = req.body;

      // Validate required fields
      if (!eventData.courseId || !eventData.startDate || !eventData.endDate) {
        return res.status(400).json({ error: "Missing required fields: courseId, startDate, endDate" });
      }

      // Verify the course belongs to the instructor
      const course = await storage.getCourse(eventData.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      // Create the course schedule
      const scheduleData = {
        courseId: eventData.courseId,
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
        startTime: eventData.startTime || "09:00",
        endTime: eventData.endTime || "17:00",
        location: eventData.location || null,
        maxSpots: eventData.maxSpots || 20,
        availableSpots: eventData.availableSpots || eventData.maxSpots || 20,
        isRecurring: eventData.isRecurring || false,
        daysOfWeek: eventData.daysOfWeek || null,
        notes: eventData.notes || null,
        registrationDeadline: eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : null,
        waitlistEnabled: eventData.waitlistEnabled !== undefined ? eventData.waitlistEnabled : true,
        autoConfirmRegistration: eventData.autoConfirmRegistration !== undefined ? eventData.autoConfirmRegistration : true,
      };

      const schedule = await storage.createCourseSchedule(scheduleData);

      res.status(201).json(schedule);
    } catch (error: any) {
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Failed to create event: " + error.message });
    }
  });

  // Delete schedule endpoint (soft delete)
  app.delete("/api/instructor/schedules/:scheduleId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Get schedule to verify ownership
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Verify the course belongs to the instructor
      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Schedule does not belong to instructor" });
      }

      // Perform soft delete
      const deletedSchedule = await storage.deleteCourseSchedule(scheduleId);
      res.json({ message: "Schedule moved to deleted items", schedule: deletedSchedule });
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule: " + error.message });
    }
  });

  // Update schedule endpoint
  app.patch("/api/instructor/schedules/:scheduleId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Get schedule to verify ownership
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Verify the course belongs to the instructor
      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Schedule does not belong to instructor" });
      }

      // Use direct PostgreSQL connection bypassing Drizzle entirely
      const { pool } = await import("./db");

      // Build SQL update manually
      const updateParts = [];
      const values = [];

      if (req.body.location !== undefined) {
        updateParts.push(`location = $${values.length + 1}`);
        values.push(req.body.location);
      }
      if (req.body.startTime !== undefined) {
        updateParts.push(`start_time = $${values.length + 1}`);
        values.push(req.body.startTime);
      }
      if (req.body.endTime !== undefined) {
        updateParts.push(`end_time = $${values.length + 1}`);
        values.push(req.body.endTime);
      }
      if (req.body.maxSpots !== undefined) {
        updateParts.push(`max_spots = $${values.length + 1}`);
        values.push(Number(req.body.maxSpots));
      }
      if (req.body.availableSpots !== undefined) {
        updateParts.push(`available_spots = $${values.length + 1}`);
        values.push(Number(req.body.availableSpots));
      }
      if (req.body.notes !== undefined) {
        updateParts.push(`notes = $${values.length + 1}`);
        values.push(req.body.notes || null);
      }

      // Handle date fields
      if (req.body.startDate !== undefined) {
        updateParts.push(`start_date = $${values.length + 1}`);
        values.push(req.body.startDate);
      }
      if (req.body.endDate !== undefined) {
        updateParts.push(`end_date = $${values.length + 1}`);
        values.push(req.body.endDate);
      }
      if (req.body.registrationDeadline !== undefined) {
        updateParts.push(`registration_deadline = $${values.length + 1}`);
        values.push(req.body.registrationDeadline || null);
      }
      if (req.body.waitlistEnabled !== undefined) {
        updateParts.push(`waitlist_enabled = $${values.length + 1}`);
        values.push(req.body.waitlistEnabled);
      }
      if (req.body.autoConfirmRegistration !== undefined) {
        updateParts.push(`auto_confirm_registration = $${values.length + 1}`);
        values.push(req.body.autoConfirmRegistration);
      }

      // Handle backend details fields
      if (req.body.rangeName !== undefined) {
        updateParts.push(`range_name = $${values.length + 1}`);
        values.push(req.body.rangeName || null);
      }
      if (req.body.classroomName !== undefined) {
        updateParts.push(`classroom_name = $${values.length + 1}`);
        values.push(req.body.classroomName || null);
      }
      if (req.body.arrivalTime !== undefined) {
        updateParts.push(`arrival_time = $${values.length + 1}`);
        values.push(req.body.arrivalTime || null);
      }
      if (req.body.departureTime !== undefined) {
        updateParts.push(`departure_time = $${values.length + 1}`);
        values.push(req.body.departureTime || null);
      }
      if (req.body.dayOfWeek !== undefined) {
        updateParts.push(`day_of_week = $${values.length + 1}`);
        values.push(req.body.dayOfWeek || null);
      }
      if (req.body.googleMapsLink !== undefined) {
        updateParts.push(`google_maps_link = $${values.length + 1}`);
        values.push(req.body.googleMapsLink || null);
      }
      if (req.body.rangeLocationImageUrl !== undefined) {
        updateParts.push(`range_location_image_url = $${values.length + 1}`);
        values.push(req.body.rangeLocationImageUrl || null);
      }

      // Always update timestamp
      updateParts.push(`updated_at = $${values.length + 1}`);
      values.push(new Date().toISOString());

      if (updateParts.length === 1) {
        return res.status(400).json({ error: "No fields to update" });
      }

      const query = `
        UPDATE course_schedules
        SET ${updateParts.join(", ")}
        WHERE id = $${values.length + 1}
        RETURNING *
      `;
      values.push(scheduleId);

      const result = await pool.query(query, values);
      const updatedSchedule = result.rows[0];
      res.json({ message: "Schedule updated successfully", schedule: updatedSchedule });
    } catch (error: any) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Failed to update schedule: " + error.message });
    }
  });

  // Permanently delete schedule endpoint (hard delete)
  app.delete("/api/instructor/schedules/:scheduleId/permanent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Check if schedule exists in deleted schedules
      const deletedSchedules = await storage.getDeletedSchedulesByInstructor(userId);
      const existingSchedule = deletedSchedules.find(s => s.id === scheduleId);

      if (!existingSchedule) {
        return res.status(403).json({ error: "Unauthorized: Schedule not found in deleted items or does not belong to instructor" });
      }

      await storage.permanentlyDeleteCourseSchedule(scheduleId);
      res.json({ message: "Schedule permanently deleted" });
    } catch (error: any) {
      console.error("Error permanently deleting schedule:", error);
      res.status(500).json({ error: "Failed to permanently delete schedule: " + error.message });
    }
  });

  // Cancel schedule endpoint
  app.patch("/api/instructor/schedules/:scheduleId/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Get schedule to verify ownership
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Verify the course belongs to the instructor
      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Schedule does not belong to instructor" });
      }

      // For now, we'll add a notes field to indicate cancellation
      // In a more complete system, you might have a separate status field
      const updatedSchedule = await storage.updateCourseSchedule(scheduleId, {
        notes: (schedule.notes ? schedule.notes + "\n" : "") + `CANCELLED: ${new Date().toISOString()}`
      });

      res.json({ message: "Schedule cancelled successfully", schedule: updatedSchedule });
    } catch (error: any) {
      console.error("Error cancelling schedule:", error);
      res.status(500).json({ error: "Failed to cancel schedule: " + error.message });
    }
  });

  // Unpublish schedule endpoint
  app.patch("/api/instructor/schedules/:scheduleId/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const scheduleId = req.params.scheduleId;

      // Get schedule to verify ownership
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Verify the course belongs to the instructor
      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Schedule does not belong to instructor" });
      }

      // Set available spots to 0 to effectively unpublish
      const updatedSchedule = await storage.updateCourseSchedule(scheduleId, {
        availableSpots: 0,
        notes: (schedule.notes ? schedule.notes + "\n" : "") + `UNPUBLISHED: ${new Date().toISOString()}`
      });

      res.json({ message: "Schedule unpublished successfully", schedule: updatedSchedule });
    } catch (error: any) {
      console.error("Error unpublishing schedule:", error);
      res.status(500).json({ error: "Failed to unpublish schedule: " + error.message });
    }
  });

  // Course image upload endpoint
  app.put("/api/course-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.courseImageURL) {
      return res.status(400).json({ error: "courseImageURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.courseImageURL,
        {
          owner: userId,
          visibility: "public", // Course images should be publicly viewable
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting course image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Product image upload endpoint
  app.put("/api/product-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.productImageURL) {
      return res.status(400).json({ error: "productImageURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.productImageURL,
        {
          owner: userId,
          visibility: "public", // Product images should be publicly viewable
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({
        ...validatedData,
        createdBy: userId,
        updatedBy: userId,
      });
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, {
        ...validatedData,
        updatedBy: userId,
      });
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const productId = req.params.id;

      // First, remove this product from all carts
      await db.delete(cartItems).where(eq(cartItems.productId, productId));

      // Now delete the product
      await storage.deleteProduct(productId);

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Dashboard statistics endpoint
  app.get("/api/instructor/dashboard-stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const stats = await storage.getInstructorDashboardStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats: " + error.message });
    }
  });

  // Put waiver upload endpoint here

  app.put("/api/waivers", isAuthenticated, async (req: any, res) => {
    if (!req.body.waiverURL) {
      return res.status(400).json({ error: "waiverURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.waiverURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting waiver:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(503).json({
        message: "Payment processing is not configured. Please complete the onboarding process and add your Stripe API key."
      });
    }

    try {
      const { enrollmentId, promoCode } = req.body;
      const userId = req.user?.claims?.sub;

      // Fetch enrollment to calculate correct payment amount server-side
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Get course details to access price and deposit amount
      const course = await storage.getCourse(enrollment.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Calculate payment amount based on payment option
      let paymentAmount: number;
      const coursePrice = parseFloat(course.price);

      if (enrollment.paymentOption === 'deposit' && course.depositAmount) {
        paymentAmount = parseFloat(course.depositAmount);
      } else {
        paymentAmount = coursePrice;
      }

      // Validate payment amount
      if (paymentAmount <= 0) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      // Apply promo code discount if provided
      let discountAmount = 0;
      let finalPaymentAmount = paymentAmount;
      let promoCodeInfo = null;

      if (promoCode) {
        const validation = await storage.validatePromoCode(promoCode, userId, enrollment.courseId, paymentAmount);
        if (validation.isValid && validation.discountAmount !== undefined && validation.finalAmount !== undefined) {
          discountAmount = validation.discountAmount;
          finalPaymentAmount = validation.finalAmount;
          promoCodeInfo = {
            code: promoCode,
            discountAmount,
            type: validation.code?.type,
            value: validation.code?.value
          };
          console.log(`✅ Promo code applied: ${promoCode}, discount: $${discountAmount}, final amount: $${finalPaymentAmount}`);
        } else {
          console.log(`❌ Invalid promo code: ${promoCode}, error: ${validation.error}`);
          return res.status(400).json({
            message: `Invalid promo code: ${validation.error}`,
            errorCode: validation.errorCode
          });
        }
      }

      // Calculate tax using Stripe Tax Calculation API on the discounted amount
      let taxCalculation = null;
      let taxAmount = 0;
      let finalAmount = Math.round(finalPaymentAmount * 100);

      try {
        // Use Stripe Tax to calculate taxes based on your dashboard settings
        console.log('Attempting Stripe Tax calculation for Albuquerque, NM...');

        taxCalculation = await stripe.tax.calculations.create({
          currency: 'usd',
          line_items: [{
            amount: Math.round(finalPaymentAmount * 100),
            tax_code: 'txcd_10401000', // Online education services
            reference: `course-${enrollment.courseId}-${enrollment.paymentOption || 'full'}`,
          }],
          customer_details: {
            address: {
              country: 'US',
              state: 'NM',
              city: 'Albuquerque',
              postal_code: '87120', // Albuquerque zip code
            },
            address_source: 'billing',
          },
        });

        console.log('✅ Stripe Tax Calculation Success:', {
          original_amount: paymentAmount,
          discounted_amount: finalPaymentAmount,
          discount_applied: discountAmount,
          promo_code: promoCode || 'none',
          subtotal_cents: Math.round(finalPaymentAmount * 100),
          subtotal_dollars: finalPaymentAmount,
          tax_calculation_id: taxCalculation?.id,
          amount_total_cents: taxCalculation?.amount_total,
          total_dollars: taxCalculation?.amount_total ? (taxCalculation.amount_total / 100) : 0,
          tax_amount_exclusive_cents: taxCalculation?.tax_amount_exclusive,
          tax_dollars: taxCalculation?.tax_amount_exclusive ? (taxCalculation.tax_amount_exclusive / 100) : 0,
          tax_rate_calculated: taxCalculation?.tax_amount_exclusive && finalPaymentAmount ?
            ((taxCalculation.tax_amount_exclusive / 100) / finalPaymentAmount * 100).toFixed(4) + '%' : '0%'
        });

        if (taxCalculation && taxCalculation.amount_total) {
          finalAmount = taxCalculation.amount_total;
          taxAmount = taxCalculation.tax_amount_exclusive || 0;
        }
      } catch (taxError: any) {
        console.error('❌ Stripe Tax calculation failed:', {
          error_message: taxError.message,
          error_type: taxError.type,
          error_code: taxError.code,
          error_decline_code: taxError.decline_code,
          full_error: taxError
        });
        // Continue without tax if calculation fails - using 0% tax
        console.log('Proceeding with 0% tax due to Stripe Tax API error');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalAmount,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          enrollmentId,
          courseId: enrollment.courseId,
          scheduleId: enrollment.scheduleId,
          studentId: userId,
          paymentOption: enrollment.paymentOption || 'full',
          tax_calculation_id: taxCalculation?.id || null,
          promo_code: promoCode || null,
          original_amount: paymentAmount.toString(),
          discount_amount: discountAmount.toString(),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        originalAmount: paymentAmount,
        subtotal: finalPaymentAmount,
        discountAmount,
        tax: taxAmount / 100,
        total: finalAmount / 100,
        tax_included: taxAmount > 0,
        promoCode: promoCodeInfo
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/confirm-enrollment", isAuthenticated, async (req: any, res) => {
    try {
      const { enrollmentId, paymentIntentId } = req.body;
      const userId = req.user?.claims?.sub;

      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment || enrollment.studentId !== userId) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Critical security checks: verify payment intent belongs to this enrollment and user
      if (paymentIntent.metadata.enrollmentId !== enrollmentId) {
        console.error(`Payment intent enrollment mismatch: expected ${enrollmentId}, got ${paymentIntent.metadata.enrollmentId}`);
        return res.status(400).json({ message: "Payment verification failed - enrollment mismatch" });
      }

      if (paymentIntent.metadata.studentId !== userId) {
        console.error(`Payment intent user mismatch: expected ${userId}, got ${paymentIntent.metadata.studentId}`);
        return res.status(400).json({ message: "Payment verification failed - user mismatch" });
      }

      if (paymentIntent.currency !== 'usd') {
        console.error(`Payment intent currency mismatch: expected usd, got ${paymentIntent.currency}`);
        return res.status(400).json({ message: "Payment verification failed - currency mismatch" });
      }

      // Get course details for payment amount verification
      const course = await storage.getCourse(enrollment.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Calculate expected payment amount for verification
      let expectedAmount: number;
      const coursePrice = parseFloat(course.price);

      if (enrollment.paymentOption === 'deposit' && course.depositAmount) {
        expectedAmount = parseFloat(course.depositAmount);
      } else {
        expectedAmount = coursePrice;
      }

      // Verify payment amount matches expectations (within 1 cent tolerance for rounding)
      const paidAmount = paymentIntent.amount / 100; // Convert from cents
      if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error(`Payment amount mismatch: expected ${expectedAmount}, got ${paidAmount}`);
        return res.status(400).json({ message: "Payment amount verification failed" });
      }

      // Determine payment status based on payment option
      const paymentStatus = enrollment.paymentOption === 'deposit' ? 'deposit' : 'paid';

      // Update enrollment status
      const updatedEnrollment = await storage.updateEnrollment(enrollmentId, {
        status: 'confirmed',
        paymentStatus,
        paymentIntentId,
      });

      res.json(updatedEnrollment);
    } catch (error: any) {
      console.error("Error confirming enrollment:", error);
      res.status(500).json({ message: "Error confirming enrollment: " + error.message });
    }
  });

  // Instructor courses endpoint for forms management
  app.get("/api/instructor/courses", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courses = await storage.getCoursesByInstructor(userId);
      res.json(courses);
    } catch (error: any) {
      console.error("Error fetching instructor courses:", error);
      res.status(500).json({ message: "Error fetching instructor courses: " + error.message });
    }
  });

  // Course Information Forms API Routes

  // Get forms for a course
  app.get("/api/course-forms/:courseId", async (req, res) => {
    try {
      const { courseId } = req.params;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify instructor owns the course
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const forms = await storage.getCourseInformationFormsByCourse(courseId);
      console.log(`[DEBUG] Fetched ${forms.length} forms for course ${courseId}:`, JSON.stringify(forms, null, 2));
      res.json(forms);
    } catch (error: any) {
      console.error("Error fetching course forms:", error);
      res.status(500).json({ message: "Error fetching course forms: " + error.message });
    }
  });

  // Create a new course information form
  app.post("/api/course-forms", async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = insertCourseInformationFormSchema.parse({
        ...req.body,
        // Provide defaults for omitted fields
        sortOrder: 0,
        isActive: true
      });

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify instructor owns the course
      const course = await storage.getCourse(validatedData.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const form = await storage.createCourseInformationForm(validatedData);

      res.status(201).json(form);
    } catch (error: any) {
      console.error("Error creating course form:", error);
      res.status(500).json({ message: "Error creating course form: " + error.message });
    }
  });

  // Update a course information form
  app.patch("/api/course-forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, isRequired } = req.body;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify instructor owns the form's course
      const form = await storage.getCourseInformationForm(id);
      if (!form || form.course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedForm = await storage.updateCourseInformationForm(id, {
        title,
        description,
        isRequired: Boolean(isRequired),
      });

      res.json(updatedForm);
    } catch (error: any) {
      console.error("Error updating course form:", error);
      res.status(500).json({ message: "Error updating course form: " + error.message });
    }
  });

  // Delete a course information form
  app.delete("/api/course-forms/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify instructor owns the form's course
      const form = await storage.getCourseInformationForm(id);
      if (!form || form.course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCourseInformationForm(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting course form:", error);
      res.status(500).json({ message: "Error deleting course form: " + error.message });
    }
  });

  // Create a form field
  app.post("/api/course-form-fields", async (req, res) => {
    try {
      // Validate request body with Zod
      const { formId, fieldType, label, placeholder, isRequired, options } = insertCourseInformationFormFieldSchema.parse({
        ...req.body,
        // Provide defaults for omitted fields
        sortOrder: 0
      });

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify instructor owns the form's course
      const form = await storage.getCourseInformationForm(formId);
      if (!form || form.course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current max sort order for this form
      const existingFields = await storage.getCourseInformationFormFields(formId);
      const maxSortOrder = existingFields.length > 0 ? Math.max(...existingFields.map(f => f.sortOrder)) : -1;

      const field = await storage.createCourseInformationFormField({
        formId,
        fieldType,
        label,
        placeholder,
        isRequired: Boolean(isRequired),
        options,
        sortOrder: maxSortOrder + 1,
      });

      res.status(201).json(field);
    } catch (error: any) {
      console.error("Error creating form field:", error);
      res.status(500).json({ message: "Error creating form field: " + error.message });
    }
  });

  // Update a form field
  app.patch("/api/course-form-fields/:fieldId", async (req, res) => {
    try {
      const { fieldId } = req.params;
      const { fieldType, label, placeholder, isRequired, options } = req.body;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // We need to query all forms to find the field and verify ownership
      const forms = await storage.getCourseInformationForms();
      let targetField = null;
      let targetForm = null;

      for (const form of forms) {
        const field = form.fields.find(f => f.id === fieldId);
        if (field) {
          targetField = field;
          targetForm = form;
          break;
        }
      }

      if (!targetField || !targetForm) {
        return res.status(404).json({ message: "Field not found" });
      }

      // Verify instructor owns the form's course
      if (targetForm.course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedField = await storage.updateCourseInformationFormField(fieldId, {
        fieldType,
        label,
        placeholder,
        isRequired: Boolean(isRequired),
        options,
      });

      res.json(updatedField);
    } catch (error: any) {
      console.error("Error updating form field:", error);
      res.status(500).json({ message: "Error updating form field: " + error.message });
    }
  });

  // Delete a form field
  app.delete("/api/course-form-fields/:fieldId", async (req, res) => {
    try {
      const { fieldId } = req.params;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Query all forms to find the field and verify ownership
      const forms = await storage.getCourseInformationForms();
      let targetField = null;
      let targetForm = null;

      for (const form of forms) {
        const field = form.fields.find(f => f.id === fieldId);
        if (field) {
          targetField = field;
          targetForm = form;
          break;
        }
      }

      if (!targetField || !targetForm) {
        return res.status(404).json({ message: "Field not found" });
      }

      // Verify instructor owns the form's course
      if (targetForm.course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCourseInformationFormField(fieldId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting form field:", error);
      res.status(500).json({ message: "Failed to delete field" });
    }
  });

  // Duplicate course form to another course
  app.post('/api/course-forms/:formId/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { formId } = req.params;
      const { targetCourseId } = req.body;

      if (!targetCourseId) {
        return res.status(400).json({ message: "Target course ID is required" });
      }

      // Get the original form with fields
      const originalForm = await storage.getCourseInformationForm(formId);
      if (!originalForm) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Verify user owns both courses
      const [originalCourse, targetCourse] = await Promise.all([
        storage.getCourse(originalForm.courseId),
        storage.getCourse(targetCourseId),
      ]);

      if (!originalCourse || originalCourse.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied to original course" });
      }

      if (!targetCourse || targetCourse.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied to target course" });
      }

      // Create the duplicated form
      const newForm = await storage.createCourseInformationForm({
        courseId: targetCourseId,
        title: originalForm.title,
        description: originalForm.description,
        isRequired: originalForm.isRequired,
        sortOrder: originalForm.sortOrder,
        isActive: originalForm.isActive,
      });

      // Duplicate all fields
      for (const field of originalForm.fields) {
        await storage.createCourseInformationFormField({
          formId: newForm.id,
          fieldType: field.fieldType,
          label: field.label,
          placeholder: field.placeholder,
          isRequired: field.isRequired,
          sortOrder: field.sortOrder,
          options: field.options,
          validation: field.validation,
        });
      }

      res.json({ success: true, form: newForm });
    } catch (error) {
      console.error("Error duplicating form:", error);
      res.status(500).json({ message: "Failed to duplicate form" });
    }
  });


  // Course Notification routes
  app.post("/api/course-notifications", async (req, res) => {
    try {
      const validatedData = insertCourseNotificationSchema.parse(req.body);

      // Check if user is authenticated and get their info if available
      let userId = null;
      if (req.isAuthenticated && req.isAuthenticated()) {
        userId = req.user?.claims?.sub || null;
      }

      // Add userId to the notification data if available
      const notificationData = {
        ...validatedData,
        userId
      };

      const notification = await storage.createCourseNotification(notificationData);
      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating course notification:", error);
      res.status(500).json({ message: "Error creating course notification: " + error.message });
    }
  });

  // Get course notifications (for instructors)
  app.get("/api/course-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { courseType } = req.query;
      const notifications = await storage.getCourseNotifications(courseType as string);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching course notifications:", error);
      res.status(500).json({ message: "Error fetching course notifications: " + error.message });
    }
  });

  // Promo code / coupon routes
  app.get("/api/instructor/coupons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const promoCodes = await storage.getPromoCodesByCreator(userId);
      res.json(promoCodes);
    } catch (error: any) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: "Failed to fetch promo codes: " + error.message });
    }
  });

  app.post("/api/instructor/coupons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const promoCodeData = {
        ...req.body,
        createdBy: userId,
        updatedBy: userId,
      };

      const newPromoCode = await storage.createPromoCode(promoCodeData);
      res.json(newPromoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      res.status(500).json({ error: "Failed to create promo code: " + error.message });
    }
  });

  app.put("/api/instructor/coupons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedPromoCode = await storage.updatePromoCode(id, updateData);
      res.json(updatedPromoCode);
    } catch (error: any) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ error: "Failed to update promo code: " + error.message });
    }
  });

  app.delete("/api/instructor/coupons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      await storage.deletePromoCode(id);
      res.json({ message: "Promo code deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ error: "Failed to delete promo code: " + error.message });
    }
  });

  // Promo code validation during checkout
  app.post("/api/validate-promo-code", isAuthenticated, async (req: any, res) => {
    try {
      const { code, courseId, amount } = req.body;
      const userId = req.user?.claims?.sub;

      if (!code || !courseId || !amount) {
        return res.status(400).json({ error: "Missing required fields: code, courseId, amount" });
      }

      const validation = await storage.validatePromoCode(code, userId, courseId, amount);
      res.json(validation);
    } catch (error: any) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: "Failed to validate promo code: " + error.message });
    }
  });

  // Notification Management API Endpoints for Admin Interface

  // Notification Templates Routes
  app.get("/api/admin/notification-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const templates = await storage.getNotificationTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ error: "Failed to fetch notification templates: " + error.message });
    }
  });

  app.post("/api/admin/notification-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body with Zod
      const validatedData = insertNotificationTemplateSchema.parse(req.body);
      const templateData = {
        ...validatedData,
        createdBy: userId,
        updatedBy: userId,
      };

      const newTemplate = await storage.createNotificationTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error: any) {
      console.error("Error creating notification template:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to create notification template" });
    }
  });

  app.put("/api/admin/notification-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body with Zod
      const validatedData = insertNotificationTemplateSchema.partial().parse(req.body);
      const updateData = {
        ...validatedData,
        updatedBy: userId,
      };

      const updatedTemplate = await storage.updateNotificationTemplate(id, updateData);
      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating notification template:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to update notification template" });
    }
  });

  app.delete("/api/admin/notification-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      await storage.deleteNotificationTemplate(id);
      res.json({ message: "Notification template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting notification template:", error);
      res.status(500).json({ error: "Failed to delete notification template: " + error.message });
    }
  });

  // Notification Schedules Routes
  app.get("/api/admin/notification-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const schedules = await storage.getNotificationSchedules();
      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching notification schedules:", error);
      res.status(500).json({ error: "Failed to fetch notification schedules: " + error.message });
    }
  });

  app.post("/api/admin/notification-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body with Zod
      const scheduleData = insertNotificationScheduleSchema.parse(req.body);

      const newSchedule = await storage.createNotificationSchedule(scheduleData);
      res.status(201).json(newSchedule);
    } catch (error: any) {
      console.error("Error creating notification schedule:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to create notification schedule" });
    }
  });

  app.put("/api/admin/notification-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body with Zod
      const updateData = insertNotificationScheduleSchema.partial().parse(req.body);

      const updatedSchedule = await storage.updateNotificationSchedule(id, updateData);
      res.json(updatedSchedule);
    } catch (error: any) {
      console.error("Error updating notification schedule:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to update notification schedule" });
    }
  });

  app.delete("/api/admin/notification-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      await storage.deleteNotificationSchedule(id);
      res.json({ message: "Notification schedule deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting notification schedule:", error);
      res.status(500).json({ error: "Failed to delete notification schedule: " + error.message });
    }
  });

  // Notification Logs Routes
  app.get("/api/admin/notification-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate query parameters with Zod
      const querySchema = z.object({
        page: z.string().optional().default("1").transform(val => Math.max(1, parseInt(val) || 1)),
        limit: z.string().optional().default("50").transform(val => Math.min(100, Math.max(1, parseInt(val) || 50))),
        templateId: z.string().uuid().optional(),
        type: z.enum(["email", "sms"]).optional(),
        status: z.enum(["sent", "failed", "pending"]).optional(),
        recipientEmail: z.string().email().optional().or(z.literal(""))
      });

      const { page, limit, templateId, type, status, recipientEmail } = querySchema.parse(req.query);
      const offset = (page - 1) * limit;

      const filters = {
        templateId,
        type,
        status,
        recipientEmail: recipientEmail || undefined,
        limit,
        offset
      };

      const result = await storage.getNotificationLogs(filters);
      res.json({
        data: result.logs,
        page,
        limit,
        total: result.total
      });
    } catch (error: any) {
      console.error("Error fetching notification logs:", error);

      // Handle validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to fetch notification logs" });
    }
  });

  // Send One-time Notification Route
  app.post("/api/admin/send-notification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Create and validate send notification schema
      const sendNotificationSchema = z.object({
        templateId: z.string().uuid("Valid template ID is required"),
        recipientType: z.enum(["individual", "course", "all_students"]),
        recipientId: z.string().uuid().optional(),
        courseId: z.string().uuid().optional(),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
      });

      const { templateId, recipientType, recipientId, courseId, customSubject, customBody } = sendNotificationSchema.parse(req.body);

      // Get the template
      const template = await storage.getNotificationTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      let recipients: User[] = [];

      // Determine recipients based on type
      if (recipientType === 'individual' && recipientId) {
        const recipient = await storage.getUser(recipientId);
        if (recipient) {
          recipients = [recipient];
        }
      } else if (recipientType === 'course' && courseId) {
        const enrollments = await storage.getEnrollmentsByCourse(courseId);
        const userIds = enrollments.map(e => e.studentId).filter(Boolean) as string[];
        recipients = await Promise.all(userIds.map(id => storage.getUser(id)));
        recipients = recipients.filter(Boolean);
      } else if (recipientType === 'all_students') {
        recipients = await storage.getAllStudents();
      }

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients found" });
      }

      // Send notification to each recipient
      const results = await Promise.all(
        recipients.map(async (recipient) => {
          try {
            const variables = {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              email: recipient.email,
            };

            const subject = customSubject || template.subject;
            const content = customBody || template.content;

            const logData = {
              templateId: template.id,
              scheduleId: null, // Manual send
              recipientId: recipient.id,
              recipientEmail: recipient.email,
              recipientPhone: recipient.phone,
              type: template.type,
              subject: subject,
              content: content,
              variables: variables,
              status: 'sent',
              sentAt: new Date(),
              sentBy: userId,
            };

            return await storage.createNotificationLog(logData);
          } catch (error) {
            console.error(`Failed to send notification to ${recipient.email}:`, error);
            return null;
          }
        })
      );

      const successful = results.filter(Boolean);
      res.json({
        message: "Notifications sent successfully",
        sent: successful.length,
        total: recipients.length
      });
    } catch (error: any) {
      console.error("Error sending notification:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // ==============================================================
  // WAIVER MANAGEMENT API ROUTES
  // ==============================================================

  // Waiver Templates Routes (Admin only)
  app.get("/api/admin/waiver-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const { scope, courseId, isActive } = req.query;
      const filters: any = {};
      if (scope) filters.scope = scope;
      if (courseId) filters.courseId = courseId;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const templates = await storage.getWaiverTemplates(filters);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching waiver templates:", error);
      res.status(500).json({ error: "Failed to fetch waiver templates" });
    }
  });

  app.get("/api/admin/waiver-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const template = await storage.getWaiverTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Waiver template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error fetching waiver template:", error);
      res.status(500).json({ error: "Failed to fetch waiver template" });
    }
  });

  app.post("/api/admin/waiver-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body
      const templateData = {
        ...insertWaiverTemplateSchema.parse(req.body),
        createdBy: userId,
        updatedBy: userId,
      };

      const template = await storage.createWaiverTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating waiver template:", error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to create waiver template" });
    }
  });

  app.patch("/api/admin/waiver-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body - use partial schema for updates
      const updateData = insertWaiverTemplateSchema.partial().parse({
        ...req.body,
        updatedBy: userId,
      });

      const template = await storage.updateWaiverTemplate(id, updateData);
      res.json(template);
    } catch (error: any) {
      console.error("Error updating waiver template:", error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to update waiver template" });
    }
  });

  app.delete("/api/admin/waiver-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      await storage.deleteWaiverTemplate(id);
      res.json({ message: "Waiver template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting waiver template:", error);
      res.status(500).json({ error: "Failed to delete waiver template" });
    }
  });

  // Waiver Instances Routes
  app.get("/api/waiver-instances/enrollment/:enrollmentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { enrollmentId } = req.params;

      // Verify enrollment access (student owns enrollment or instructor owns course)
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = enrollment.studentId === userId;

      // Fetch course schedule and course to check instructor authorization
      const courseSchedule = await storage.getCourseSchedule(enrollment.scheduleId);
      const course = courseSchedule ? await storage.getCourse(courseSchedule.courseId) : null;
      const isInstructor = (user?.role === 'instructor' || user?.role === 'superadmin') && (course?.instructorId === userId || user?.role === 'superadmin');

      if (!isOwner && !isInstructor) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      const instances = await storage.getWaiverInstancesByEnrollment(enrollmentId);
      res.json(instances);
    } catch (error: any) {
      console.error("Error fetching waiver instances:", error);
      res.status(500).json({ error: "Failed to fetch waiver instances" });
    }
  });

  app.get("/api/waiver-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;

      const instance = await storage.getWaiverInstance(id);
      if (!instance) {
        return res.status(404).json({ error: "Waiver instance not found" });
      }

      // Verify access
      const user = await storage.getUser(userId);
      const isOwner = instance.enrollment.studentId === userId;

      // Fetch course schedule and course to check instructor authorization
      const courseSchedule = await storage.getCourseSchedule(instance.enrollment.scheduleId);
      const course = courseSchedule ? await storage.getCourse(courseSchedule.courseId) : null;
      const isInstructor = (user?.role === 'instructor' || user?.role === 'superadmin') && (course?.instructorId === userId || user?.role === 'superadmin');

      if (!isOwner && !isInstructor) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      res.json(instance);
    } catch (error: any) {
      console.error("Error fetching waiver instance:", error);
      res.status(500).json({ error: "Failed to fetch waiver instance" });
    }
  });

  app.post("/api/waiver-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Validate request body
      const instanceData = insertWaiverInstanceSchema.parse(req.body);

      // Verify enrollment access
      const enrollment = await storage.getEnrollment(instanceData.enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = enrollment.studentId === userId;

      // Fetch course schedule and course to check instructor authorization
      const courseSchedule = await storage.getCourseSchedule(enrollment.scheduleId);
      const course = courseSchedule ? await storage.getCourse(courseSchedule.courseId) : null;
      const isInstructor = (user?.role === 'instructor' || user?.role === 'superadmin') && (course?.instructorId === userId || user?.role === 'superadmin');

      if (!isOwner && !isInstructor) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      const instance = await storage.createWaiverInstance(instanceData);
      res.status(201).json(instance);
    } catch (error: any) {
      console.error("Error creating waiver instance:", error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to create waiver instance" });
    }
  });

  // Waiver Signatures Routes
  app.post("/api/waiver-signatures", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Validate request body
      const signatureData = insertWaiverSignatureSchema.parse(req.body);

      // Verify waiver instance access
      const instance = await storage.getWaiverInstance(signatureData.instanceId);
      if (!instance) {
        return res.status(404).json({ error: "Waiver instance not found" });
      }

      // Only student who owns enrollment can sign
      if (instance.enrollment.studentId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Only the enrolled student can sign" });
      }

      // Create signature and update instance status
      if (!instance.enrollment.student) {
        return res.status(400).json({ error: "Student information not found" });
      }

      const signature = await storage.createWaiverSignature({
        ...signatureData,
        signerEmail: instance.enrollment.student.email || '',
        signerName: `${instance.enrollment.student.firstName || ''} ${instance.enrollment.student.lastName || ''}`,
      });

      // Update instance status to 'signed'
      await storage.updateWaiverInstance(instance.id, {
        status: 'signed',
        signedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(signature);
    } catch (error: any) {
      console.error("Error creating waiver signature:", error);

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to create waiver signature" });
    }
  });

  // Waiver Utility Routes
  app.post("/api/waiver-content/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      const { templateId, enrollmentId } = req.body;

      if (!templateId || !enrollmentId) {
        return res.status(400).json({ error: "templateId and enrollmentId are required" });
      }

      // Verify enrollment access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = enrollment.studentId === userId;

      // Fetch course schedule and course to check instructor authorization
      const courseSchedule = await storage.getCourseSchedule(enrollment.scheduleId);
      const course = courseSchedule ? await storage.getCourse(courseSchedule.courseId) : null;
      const isInstructor = (user?.role === 'instructor' || user?.role === 'superadmin') && (course?.instructorId === userId || user?.role === 'superadmin');

      if (!isOwner && !isInstructor) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      const result = await storage.generateWaiverContent(templateId, enrollmentId);
      res.json(result);
    } catch (error: any) {
      console.error("Error generating waiver content:", error);
      res.status(500).json({ error: "Failed to generate waiver content" });
    }
  });

  app.get("/api/waiver-requirements/:enrollmentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { enrollmentId } = req.params;

      // Verify enrollment access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      const user = await storage.getUser(userId);
      const isOwner = enrollment.studentId === userId;

      // Fetch course schedule and course to check instructor authorization
      const courseSchedule = await storage.getCourseSchedule(enrollment.scheduleId);
      const course = courseSchedule ? await storage.getCourse(courseSchedule.courseId) : null;
      const isInstructor = (user?.role === 'instructor' || user?.role === 'superadmin') && (course?.instructorId === userId || user?.role === 'superadmin');

      if (!isOwner && !isInstructor) {
        return res.status(403).json({ error: "Unauthorized: Access denied" });
      }

      const requirements = await storage.checkWaiverRequirements(enrollmentId);
      res.json(requirements);
    } catch (error: any) {
      console.error("Error checking waiver requirements:", error);
      res.status(500).json({ error: "Failed to check waiver requirements" });
    }
  });

  // Waiver Compliance Reporting (Admin only)
  app.get("/api/admin/waiver-compliance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      const { courseId, startDate, endDate } = req.query;

      const filters: any = {};
      if (courseId) filters.courseId = courseId;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const report = await storage.getWaiverComplianceReport(filters.courseId, filters.startDate, filters.endDate);
      res.json(report);
    } catch (error: any) {
      console.error("Error generating compliance report:", error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  });

  // ==============================================================
  // COMMUNICATIONS DASHBOARD API ROUTES
  // ==============================================================

  // Simple SMS notification for roster
  app.post("/api/notifications/sms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to send SMS notifications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { to, message, purpose = 'educational', studentId, enrollmentId, courseId, scheduleId, appointmentId } = req.body;

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "At least one phone number is required" });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Always process template variables (even if no context is provided)
      let processedMessage = message.trim();
      try {
        const { NotificationEngine } = await import('./notificationEngine');
        const variables = await NotificationEngine.buildVariablesFromContext({
          studentId,
          enrollmentId,
          courseId,
          scheduleId,
          appointmentId,
          instructorId: userId
        });
        processedMessage = NotificationEngine.processTemplate(processedMessage, variables);
      } catch (contextError: any) {
        console.error('Error building notification context:', contextError);
        return res.status(400).json({ 
          error: `Failed to process template variables: ${contextError.message || 'Invalid context data'}`
        });
      }
      
      // Check for unresolved template placeholders
      if (processedMessage.includes('{{')) {
        const unresolvedTokens = processedMessage.match(/\{\{[^}]+\}\}/g) || [];
        console.warn('Unresolved template tokens found in SMS:', unresolvedTokens);
        return res.status(400).json({ 
          error: `Message contains unresolved template variables: ${unresolvedTokens.join(', ')}. Please provide the necessary context data (studentId, appointmentId, enrollmentId, courseId, or scheduleId) to resolve these variables, or remove them from your message.`
        });
      }

      // Filter out students who haven't consented to SMS notifications
      const phoneNumbers = to.filter((phone: string) => phone && phone.trim().length > 0);
      const consentedPhones: string[] = [];
      const excludedPhones: string[] = [];
      const excludedStudents: Array<{ name: string; phone: string }> = [];

      // Check SMS consent for each phone number
      for (const phone of phoneNumbers) {
        try {
          // Look up user by phone number
          const student = await storage.getUserByPhone(phone);
          
          if (student) {
            // Check if student has SMS consent
            if (student.smsConsent === true) {
              consentedPhones.push(phone);
            } else {
              excludedPhones.push(phone);
              excludedStudents.push({
                name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
                phone: phone
              });
            }
          } else {
            // If no user found for this phone number, include it (might be a guest or manual entry)
            consentedPhones.push(phone);
          }
        } catch (lookupError) {
          console.error(`Error looking up user for phone ${phone}:`, lookupError);
          // On error, include the number to avoid blocking legitimate sends
          consentedPhones.push(phone);
        }
      }

      // If all students have opted out, return early
      if (consentedPhones.length === 0) {
        return res.json({
          success: false,
          error: 'All recipients have opted out of SMS notifications',
          excludedCount: excludedStudents.length,
          excludedStudents,
          sentCount: 0,
          failedCount: 0,
        });
      }

      // Import SMS service
      const { NotificationSmsService } = await import('./smsService');

      const result = await NotificationSmsService.sendNotificationSms({
        to: consentedPhones,
        message: processedMessage,
        instructorId: userId,
        purpose,
      });

      // Add exclusion information to the result
      const enhancedResult = {
        ...result,
        excludedCount: excludedStudents.length,
        excludedStudents: excludedStudents.length > 0 ? excludedStudents : undefined,
        totalRecipients: phoneNumbers.length,
      };

      res.json(enhancedResult);
    } catch (error: any) {
      console.error("Error sending SMS notification:", error);
      res.status(500).json({ error: "Failed to send SMS notification" });
    }
  });

  // Check SMS delivery status
  app.get("/api/notifications/sms/:messageSid/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to check SMS status
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { messageSid } = req.params;

      if (!messageSid) {
        return res.status(400).json({ error: "Message SID is required" });
      }

      // Import SMS service
      const { NotificationSmsService } = await import('./smsService');

      const status = await NotificationSmsService.getMessageStatus(messageSid);
      res.json(status);
    } catch (error: any) {
      console.error("Error checking SMS status:", error);
      res.status(500).json({ error: "Failed to check SMS status" });
    }
  });

  // Debug Twilio account info (instructors only)
  app.get("/api/debug/twilio-info", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to check account info
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      // Import SMS service
      const { NotificationSmsService } = await import('./smsService');

      const accountInfo = await NotificationSmsService.getAccountInfo();
      const envInfo = {
        hasSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhone: !!process.env.TWILIO_PHONE_NUMBER,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER, // Safe to show this
      };

      res.json({
        environment: envInfo,
        account: accountInfo
      });
    } catch (error: any) {
      console.error("Error checking Twilio account:", error);
      res.status(500).json({ error: "Failed to check Twilio account" });
    }
  });

  // Simple email notification for roster
  app.post("/api/notifications/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to send email notifications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { to, subject, content, isHtml = false, studentId, enrollmentId, courseId, scheduleId, appointmentId } = req.body;

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "At least one email address is required" });
      }

      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: "Email subject is required" });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Email content is required" });
      }

      // Always process template variables (even if no context is provided)
      let processedSubject = subject.trim();
      let processedContent = content.trim();
      try {
        const { NotificationEngine } = await import('./notificationEngine');
        const variables = await NotificationEngine.buildVariablesFromContext({
          studentId,
          enrollmentId,
          courseId,
          scheduleId,
          appointmentId,
          instructorId: userId
        });
        processedSubject = NotificationEngine.processTemplate(processedSubject, variables);
        processedContent = NotificationEngine.processTemplate(processedContent, variables);
      } catch (contextError: any) {
        console.error('Error building notification context:', contextError);
        return res.status(400).json({ 
          error: `Failed to process template variables: ${contextError.message || 'Invalid context data'}`
        });
      }
      
      // Check for unresolved template placeholders
      const subjectHasTokens = processedSubject.includes('{{');
      const contentHasTokens = processedContent.includes('{{');
      if (subjectHasTokens || contentHasTokens) {
        const unresolvedTokens = [
          ...(processedSubject.match(/\{\{[^}]+\}\}/g) || []),
          ...(processedContent.match(/\{\{[^}]+\}\}/g) || [])
        ];
        console.warn('Unresolved template tokens found in email:', unresolvedTokens);
        return res.status(400).json({ 
          error: `Email contains unresolved template variables: ${unresolvedTokens.join(', ')}. Please provide the necessary context data (studentId, appointmentId, enrollmentId, courseId, or scheduleId) to resolve these variables, or remove them from your message.`
        });
      }

      // Import email service
      const { NotificationEmailService } = await import('./emailService');

      const result = await NotificationEmailService.sendNotificationEmail({
        to,
        subject: processedSubject,
        htmlContent: isHtml ? processedContent : `<pre>${processedContent}</pre>`,
        textContent: isHtml ? undefined : processedContent,
        fromName: `${user.firstName} ${user.lastName} - Practical Defense Training`,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error sending email notification:", error);
      res.status(500).json({ error: "Failed to send email notification" });
    }
  });

  // Payment reminder notification
  app.post("/api/notifications/payment-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to send payment reminders
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor role required" });
      }

      const { method, subject, message, recipients, studentName, courseName, remainingBalance, scheduleDate } = req.body;

      if (!method || !['email', 'sms', 'both'].includes(method)) {
        return res.status(400).json({ error: "Valid method (email, sms, both) is required" });
      }

      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: "Subject is required" });
      }

      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!recipients || (!recipients.email && !recipients.phone)) {
        return res.status(400).json({ error: "At least one recipient contact method is required" });
      }

      const results: any = { success: true, results: [] };

      // Send email if requested
      if ((method === 'email' || method === 'both') && recipients.email) {
        const { NotificationEmailService } = await import('./emailService');

        const emailResult = await NotificationEmailService.sendNotificationEmail({
          to: [recipients.email],
          subject: subject.trim(),
          htmlContent: `<div style="font-family: Arial, sans-serif;">${message.trim().replace(/\n/g, '<br>')}</div>`,
          textContent: message.trim(),
          fromName: `${user.firstName} ${user.lastName} - Practical Defense Training`,
        });

        results.results.push({ method: 'email', ...emailResult });
      }

      // Send SMS if requested
      if ((method === 'sms' || method === 'both') && recipients.phone) {
        const { NotificationSmsService } = await import('./smsService');

        const smsResult = await NotificationSmsService.sendNotificationSms({
          to: [recipients.phone],
          message: message.trim(),
          instructorId: userId,
          purpose: 'administrative',
        });

        results.results.push({ method: 'sms', ...smsResult });
      }

      // Check if any method succeeded
      const hasSuccess = results.results.some((r: any) => r.success);
      if (!hasSuccess) {
        results.success = false;
        results.error = "All notification methods failed";
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error sending payment reminder:", error);
      res.status(500).json({ error: "Failed to send payment reminder" });
    }
  });

  // Send payment reminder for specific enrollment
  app.post("/api/instructor/send-payment-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor role required" });
      }

      const { enrollmentId, method } = req.body;

      if (!enrollmentId || !method) {
        return res.status(400).json({ error: "Missing required fields: enrollmentId, method" });
      }

      // Get enrollment details with student and course information
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      // Verify instructor owns this course
      if (!enrollment.course || enrollment.course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You do not have access to this enrollment" });
      }

      const student = enrollment.student;
      const course = enrollment.course;
      const schedule = enrollment.schedule;

      if (!student || !course || !schedule) {
        return res.status(400).json({ error: "Incomplete enrollment data" });
      }

      // Get payment balance
      const paymentBalance = await storage.getPaymentBalance(enrollmentId);

      if (paymentBalance.remainingBalance <= 0) {
        return res.status(400).json({ error: "No remaining balance for this enrollment" });
      }

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
      };

      const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };

      // Generate payment link - use the first domain from REPLIT_DOMAINS or fallback
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://example.com';
      const paymentLink = `${baseUrl}/checkout?enrollmentId=${enrollmentId}`;

      let result = { success: false, error: '', results: [] as any[] };

      if (method === 'email' || method === 'both') {
        // Send email reminder
        const emailSubject = `Payment Reminder: ${course.title}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Payment Reminder</h2>
            <p>Dear ${student.firstName},</p>
            <p>This is a friendly reminder about your outstanding balance for the following course:</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2c3e50;">${course.title}</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formatDate(schedule.startDate)}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}</p>
              ${schedule.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${schedule.location}</p>` : ''}
            </div>

            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; font-size: 18px;"><strong>Remaining Balance:</strong> <span style="color: #d63031; font-size: 24px;">${formatCurrency(paymentBalance.remainingBalance)}</span></p>
            </div>

            <p>Please submit your payment at your earliest convenience to ensure your enrollment remains active.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" style="display: inline-block; background-color: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Pay Remaining Balance</a>
            </div>

            <p style="color: #7f8c8d; font-size: 14px;">
              Or copy and paste this link into your browser: <a href="${paymentLink}">${paymentLink}</a>
            </p>

            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>

            <p>Best regards,<br>
            ${user.firstName} ${user.lastName}<br>
            Practical Defense Training</p>
          </div>
        `;

        const emailText = `
Payment Reminder

Dear ${student.firstName},

This is a friendly reminder about your outstanding balance for the following course:

${course.title}
Date: ${formatDate(schedule.startDate)}
Time: ${schedule.startTime} - ${schedule.endTime}
${schedule.location ? `Location: ${schedule.location}` : ''}

Remaining Balance: ${formatCurrency(paymentBalance.remainingBalance)}

Please submit your payment at your earliest convenience to ensure your enrollment remains active.

Pay your remaining balance here:
${paymentLink}

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
${user.firstName} ${user.lastName}
Practical Defense Training
jeremy@abqconcealedcarry.com
(505) 944-5247
        `.trim();

        const emailResult = await NotificationEmailService.sendNotificationEmail({
          to: [student.email],
          subject: emailSubject,
          htmlContent: emailHtml,
          textContent: emailText,
        });

        result.results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.error,
        });
      }

      if (method === 'sms' || method === 'both') {
        // Send SMS reminder
        if (!student.phone) {
          result.results.push({
            channel: 'sms',
            success: false,
            error: 'Student phone number not available',
          });
        } else {
          const smsMessage = `Payment Reminder: ${course.title} on ${formatDate(schedule.startDate)}. Balance due: ${formatCurrency(paymentBalance.remainingBalance)}. Pay now: ${paymentLink}`;

          const smsResult = await sendSms({
            to: student.phone,
            body: smsMessage,
            instructorId: userId,
            studentId: student.id,
            purpose: 'administrative',
          });

          result.results.push({
            channel: 'sms',
            success: smsResult.success,
            error: smsResult.error,
          });
        }
      }

      // Determine overall success
      const allSuccessful = result.results.every(r => r.success);
      const anySuccessful = result.results.some(r => r.success);

      result.success = anySuccessful;
      if (!allSuccessful) {
        const failures = result.results.filter(r => !r.success);
        result.error = failures.map(f => `${f.channel}: ${f.error}`).join('; ');
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error sending payment reminder:', error);
      res.status(500).json({ error: "Failed to send payment reminder: " + error.message });
    }
  });

  // Get detailed payment information for enrollment
  app.get("/api/instructor/payment-details/:enrollmentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { enrollmentId } = req.params;

      // Only allow instructors to view payment details
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      // Get enrollment and verify instructor has access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      // Verify instructor owns this course
      const schedule = await storage.getCourseSchedule(enrollment.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Course schedule not found" });
      }

      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You can only view payment details for your own courses" });
      }

      // Get payment balance info
      const paymentBalance = await storage.getPaymentBalance(enrollmentId);

      const paymentDetails = {
        enrollmentId: enrollment.id,
        paymentStatus: enrollment.paymentStatus,
        totalAmount: parseFloat(course.price),
        amountPaid: paymentBalance.paidAmount || 0,
        remainingBalance: paymentBalance.remainingBalance || 0,
        paymentDate: enrollment.paymentDate,
        courseName: course.title,
        scheduleDate: schedule.startDate,
        paymentHistory: [],
      };

      res.json(paymentDetails);
    } catch (error: any) {
      console.error("Error fetching payment details:", error);
      res.status(500).json({ error: "Failed to fetch payment details" });
    }
  });

  // Get available schedules for rescheduling (instructor's courses only)
  app.get("/api/instructor/available-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;

      // Only allow instructors to view available schedules
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { excludeEnrollmentId } = req.query;

      // Get all course schedules for this instructor's courses that are in the future
      const schedules = await storage.getInstructorAvailableSchedules(userId, excludeEnrollmentId as string);

      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching available schedules:", error);
      res.status(500).json({ error: "Failed to fetch available schedules" });
    }
  });

  // Get all available schedules for cross-enrollment (all instructors' courses)
  app.get("/api/cross-enrollment/available-schedules", isAuthenticated, async (req: any, res) => {
    try {
      // Safely access user ID with proper null checks
      const userId = req.user?.claims?.sub || req.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only allow instructors to view cross-enrollment schedules
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { studentId } = req.query;

      // Get all active course schedules from any instructor, excluding student's current enrollments
      const schedules = await storage.getAllAvailableSchedules(studentId as string);

      res.json(schedules);
    } catch (error: any) {
      console.error("Error fetching cross-enrollment schedules:", error);
      res.status(500).json({ error: "Failed to fetch cross-enrollment schedules" });
    }
  });

  // Reschedule student to new schedule
  app.patch("/api/instructor/enrollments/:enrollmentId/reschedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { enrollmentId } = req.params;
      const { newScheduleId, notes } = req.body;

      // Only allow instructors to reschedule students
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      if (!newScheduleId) {
        return res.status(400).json({ error: "New schedule ID is required" });
      }

      // Get enrollment and verify instructor has access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      // Verify instructor owns both current and new course schedules
      const currentSchedule = await storage.getCourseSchedule(enrollment.scheduleId);
      const newSchedule = await storage.getCourseSchedule(newScheduleId);

      if (!currentSchedule || !newSchedule) {
        return res.status(404).json({ error: "Course schedule not found" });
      }

      const currentCourse = await storage.getCourse(currentSchedule.courseId);
      const newCourse = await storage.getCourse(newSchedule.courseId);

      if (!currentCourse || !newCourse) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (currentCourse.instructorId !== userId || newCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You can only reschedule students between your own courses" });
      }

      // Check if new schedule has available spots
      const enrollmentCount = await storage.getScheduleEnrollmentCount(newScheduleId);
      if (enrollmentCount >= newSchedule.maxSpots) {
        return res.status(400).json({ error: "New schedule is full" });
      }

      // Update enrollment with new schedule and set status to confirmed
      // This will move students from held list to current list when rescheduled
      const updatedEnrollment = await storage.updateEnrollment(enrollmentId, {
        scheduleId: newScheduleId,
        courseId: newSchedule.courseId,
        status: 'confirmed', // Set status to confirmed to move from held to current list
        cancellationReason: null, // Clear any hold/cancellation reason
        notes: notes || `Rescheduled from ${currentSchedule.startDate} to ${newSchedule.startDate}`,
      });

      // Auto-add student to SMS list for the new schedule (fire-and-forget)
      if (updatedEnrollment.status === 'confirmed' && updatedEnrollment.studentId) {
        (async () => {
          try {
            const smsList = await storage.getSmsListBySchedule(newScheduleId);

            if (smsList) {
              const isAlreadyMember = await storage.checkSmsListMembership(smsList.id, updatedEnrollment.studentId);

              if (!isAlreadyMember) {
                await storage.addSmsListMember({
                  listId: smsList.id,
                  userId: updatedEnrollment.studentId,
                  addedBy: userId,
                  autoAdded: true,
                  notes: 'Auto-added from rescheduling',
                });

                console.log(`Successfully added student ${updatedEnrollment.studentId} to SMS list ${smsList.id} after reschedule`);
              }
            } else {
              console.log(`No SMS list found for schedule ${newScheduleId}`);
            }
          } catch (error) {
            console.error(`Error auto-adding student to SMS list after reschedule:`, error);
          }
        })();

        // Remove student from old schedule's SMS list
        (async () => {
          try {
            const oldSmsList = await storage.getSmsListBySchedule(enrollment.scheduleId);

            if (oldSmsList) {
              await storage.removeSmsListMemberByUserAndList(oldSmsList.id, updatedEnrollment.studentId);
              console.log(`Successfully removed student ${updatedEnrollment.studentId} from old SMS list ${oldSmsList.id} after reschedule`);
            } else {
              console.log(`No SMS list found for old schedule ${enrollment.scheduleId}`);
            }
          } catch (error) {
            console.error(`Error removing student from old SMS list after reschedule:`, error);
          }
        })();
      }

      res.json({ success: true, enrollment: updatedEnrollment });
    } catch (error: any) {
      console.error("Error rescheduling student:", error);
      res.status(500).json({ error: "Failed to reschedule student" });
    }
  });

  // Place student on hold (remove from schedule)
  app.patch("/api/instructor/enrollments/:enrollmentId/hold", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { enrollmentId } = req.params;
      const { notes } = req.body;

      // Only allow instructors to place students on hold
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      if (!notes || !notes.trim()) {
        return res.status(400).json({ error: "Notes are required when placing a student on hold" });
      }

      // Get enrollment and verify instructor has access
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }

      // Verify instructor owns the course
      const schedule = await storage.getCourseSchedule(enrollment.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Course schedule not found" });
      }

      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You can only place students from your own courses on hold" });
      }

      // Update enrollment status to hold and clear schedule
      // Note: We keep the scheduleId but change status to indicate hold
      const updatedEnrollment = await storage.updateEnrollment(enrollmentId, {
        status: 'hold',
        cancellationReason: notes.trim(),
      });

      res.json({ success: true, enrollment: updatedEnrollment });
    } catch (error: any) {
      console.error("Error placing student on hold:", error);
      res.status(500).json({ error: "Failed to place student on hold" });
    }
  });

  // Cross-enroll student into additional courses
  // Cross-enrollment endpoint for enrolling students into courses
  app.post('/api/instructor/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { studentId, scheduleId, notes } = req.body;

      if (!studentId || !scheduleId) {
        return res.status(400).json({ error: "Student ID and Schedule ID are required" });
      }

      // Verify student exists
      const student = await storage.getUser(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Verify schedule exists and belongs to instructor
      const schedule = await storage.getCourseSchedule(scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const course = await storage.getCourse(schedule.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: You can only enroll students in your own courses" });
      }

      // Check if schedule has available spots
      if (schedule.availableSpots <= 0) {
        return res.status(400).json({ error: "Schedule is full" });
      }

      // Create enrollment
      const enrollment = await storage.createEnrollment({
        studentId,
        courseId: schedule.courseId,
        scheduleId,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentOption: 'full',
        confirmationDate: new Date(),
        notes: notes || `Enrolled by instructor: ${user.firstName} ${user.lastName}`,
      });

      // Auto-add student to SMS list for this schedule (fire-and-forget)
      if (enrollment.status === 'confirmed' && enrollment.studentId) {
        (async () => {
          try {
            const smsList = await storage.getSmsListBySchedule(scheduleId);

            if (smsList) {
              const isAlreadyMember = await storage.checkSmsListMembership(smsList.id, enrollment.studentId);

              if (!isAlreadyMember) {
                await storage.addSmsListMember({
                  listId: smsList.id,
                  userId: enrollment.studentId,
                  addedBy: userId,
                  autoAdded: true,
                  notes: 'Auto-added from cross-enrollment',
                });

                console.log(`Successfully added student ${enrollment.studentId} to SMS list ${smsList.id}`);
              }
            }
          } catch (error) {
            console.error(`Error auto-adding student to SMS list for enrollment ${enrollment.id}:`, error);
          }
        })();
      }

      res.json({ success: true, enrollment });
    } catch (error: any) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ error: "Failed to create enrollment" });
    }
  });

  // ==============================================================
  // COMMUNICATIONS DASHBOARD API ROUTES
  // ==============================================================

  // Get communications with filtering and search
  app.get("/api/communications", isAuthenticated, async (req: any, res) => {
    try {
      // Safely access user ID with proper null checks
      const userId = req.user?.claims?.sub || req.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only allow instructors to access communications dashboard
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      // Validate query parameters with Zod
      const querySchema = z.object({
        page: z.string().optional().default("1").transform(val => Math.max(1, parseInt(val) || 1)),
        limit: z.string().optional().default("50").transform(val => Math.min(100, Math.max(1, parseInt(val) || 50))),
        type: z.enum(["email", "sms"]).optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
        isRead: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
        isFlagged: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
        search: z.string().optional(),
        userId: z.string().optional(),
        courseId: z.string().uuid().optional(),
        enrollmentId: z.string().uuid().optional()
      });

      const { page, limit, type, direction, isRead, isFlagged, search, userId: filterUserId, courseId, enrollmentId } = querySchema.parse(req.query);
      const offset = (page - 1) * limit;

      const filters = {
        type,
        direction,
        isRead,
        isFlagged,
        search,
        userId: filterUserId,
        courseId,
        enrollmentId,
        limit,
        offset
      };

      const result = await storage.getCommunications(filters);
      res.json({
        data: result.communications,
        page,
        limit,
        total: result.total
      });
    } catch (error: any) {
      console.error("Error fetching communications:", error);
      res.status(500).json({
        message: "Failed to fetch communications",
        error: error.message
      });
    }
  });

  // Get single communication by ID
  app.get("/api/communications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { id } = req.params;

      // Only allow instructors to access communications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const communication = await storage.getCommunication(id);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      res.json(communication);
    } catch (error: any) {
      console.error("Error fetching communication:", error);
      res.status(500).json({ error: "Failed to fetch communication" });
    }
  });

  // Mark communication as read
  app.patch("/api/communications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { id } = req.params;

      // Only allow instructors to manage communications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'supersuperadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const communication = await storage.markCommunicationAsRead(id);
      res.json(communication);
    } catch (error: any) {
      console.error("Error marking communication as read:", error);

      if (error.message === 'Communication not found') {
        return res.status(404).json({ error: "Communication not found" });
      }

      res.status(500).json({ error: "Failed to mark communication as read" });
    }
  });

  // Mark communication as unread
  app.patch("/api/communications/:id/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { id } = req.params;

      // Only allow instructors to manage communications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const communication = await storage.markCommunicationAsUnread(id);
      res.json(communication);
    } catch (error: any) {
      console.error("Error marking communication as unread:", error);

      if (error.message === 'Communication not found') {
        return res.status(404).json({ error: "Communication not found" });
      }

      res.status(500).json({ error: "Failed to mark communication as unread" });
    }
  });

  // Flag communication for follow-up
  app.patch("/api/communications/:id/flag", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { id } = req.params;

      // Only allow instructors to manage communications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      // Validate request body
      const flagSchema = z.object({
        note: z.string().optional()
      });

      const { note } = flagSchema.parse(req.body);
      const communication = await storage.flagCommunication(id, note);
      res.json(communication);
    } catch (error: any) {
      console.error("Error flagging communication:", error);

      if (error.message === 'Communication not found') {
        return res.status(404).json({ error: "Communication not found" });
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to flag communication" });
    }
  });

  // Unflag communication
  app.patch("/api/communications/:id/unflag", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.claims.sub;
      const { id } = req.params;

      // Only allow instructors to manage communications
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const communication = await storage.unflagCommunication(id);
      res.json(communication);
    } catch (error: any) {
      console.error("Error unflagging communication:", error);

      if (error.message === 'Communication not found') {
        return res.status(404).json({ error: "Communication not found" });
      }

      res.status(500).json({ error: "Failed to unflag communication" });
    }
  });

  // ==============================================================
  // SMS MANAGEMENT API ROUTES
  // ==============================================================

  // Import Twilio SMS service
  const { twilioSMSService, sendSMSSchema } = await import('./twilioService');

  // Get SMS inbox (received messages)
  app.get("/api/sms/inbox", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access SMS features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { limit, from, status } = req.query;
      const filters: any = {};
      if (limit) filters.limit = parseInt(limit);
      if (from) filters.from = from;
      if (status) filters.status = status;

      const messages = await twilioSMSService.getInboxMessages(filters);
      res.json({
        messages,
        total: messages.length
      });
    } catch (error: any) {
      console.error("Error fetching SMS inbox:", error);
      res.status(500).json({ error: "Failed to fetch SMS inbox: " + error.message });
    }
  });

  // Get all SMS messages
  app.get("/api/sms/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access SMS features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { limit, direction, from, to, status } = req.query;
      const filters: any = {};
      if (limit) filters.limit = parseInt(limit);
      if (direction) filters.direction = direction;
      if (from) filters.from = from;
      if (to) filters.to = to;
      if (status) filters.status = status;

      const messages = await twilioSMSService.getMessages(filters);
      res.json({
        messages,
        total: messages.length
      });
    } catch (error: any) {
      console.error("Error fetching SMS messages:", error);
      res.status(500).json({ error: "Failed to fetch SMS messages: " + error.message });
    }
  });

  // Get SMS message by SID
  app.get("/api/sms/messages/:sid", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { sid } = req.params;

      // Only allow instructors to access SMS features
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const message = await twilioSMSService.getMessage(sid);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      res.json(message);
    } catch (error: any) {
      console.error("Error fetching SMS message:", error);
      res.status(500).json({ error: "Failed to fetch SMS message: " + error.message });
    }
  });

  // Send SMS message
  app.post("/api/sms/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to send SMS
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const validatedData = sendSMSSchema.parse(req.body);
      const message = await twilioSMSService.sendSMS(validatedData);

      // Save the outbound message to the database
      await storage.createCommunication({
        type: 'sms',
        direction: 'outbound',
        fromAddress: message.from,
        toAddress: message.to,
        subject: null,
        content: message.body,
        htmlContent: null,
        deliveryStatus: message.status,
        isRead: true, // Outbound messages are considered "read" by default
        isFlagged: false,
        flagNote: null,
        sentAt: message.dateSent || message.dateCreated,
        readAt: null,
        flaggedAt: null,
        purpose: null,
        userId: userId,
        courseId: null,
        enrollmentId: null
      });

      res.json({
        success: true,
        message: message,
        messageSid: message.sid
      });
    } catch (error: any) {
      console.error("Error sending SMS:", error);

      // Handle Zod validation errors as 400 Bad Request
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }

      res.status(500).json({ error: "Failed to send SMS: " + error.message });
    }
  });

  // Get SMS statistics
  app.get("/api/sms/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access SMS stats
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const stats = await twilioSMSService.getMessageStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching SMS stats:", error);
      res.status(500).json({ error: "Failed to fetch SMS statistics: " + error.message });
    }
  });

  // Get contacts for SMS (students and instructors with phone numbers)
  app.get("/api/sms/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Only allow instructors to access contacts
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ error: "Unauthorized: Instructor access required" });
      }

      const { search, role: filterRole } = req.query;

      // Get all users with phone numbers
      let contacts = await storage.getAllStudents();

      // Filter by role if specified
      if (filterRole && filterRole !== 'all') {
        contacts = contacts.filter(contact => contact.role === filterRole);
      }

      // Filter out contacts without phone numbers
      contacts = contacts.filter(contact => contact.phone);

      // Search filter
      if (search) {
        const searchLower = search.toString().toLowerCase();
        contacts = contacts.filter(contact =>
          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchLower) ||
          contact.email?.toLowerCase().includes(searchLower) ||
          contact.phone?.includes(search.toString())
        );
      }

      // Format contacts for SMS use
      const formattedContacts = contacts.map(contact => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
      }));

      res.json({
        contacts: formattedContacts,
        total: formattedContacts.length
      });
    } catch (error: any) {
      console.error("Error fetching SMS contacts:", error);
      res.status(500).json({ error: "Failed to fetch SMS contacts: " + error.message });
    }
  });

  // Twilio SMS Webhook Endpoint - Receives incoming SMS messages
  app.post("/api/sms/webhook", async (req, res) => {
    console.log("=== WEBHOOK CALLED ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request headers:", JSON.stringify(req.headers, null, 2));

    try {
      // Twilio sends webhook data as form-urlencoded
      const {
        MessageSid,
        From,
        To,
        Body,
        NumMedia,
        MediaUrl0,
        FromCity,
        FromState,
        FromCountry
      } = req.body;

      console.log("Incoming SMS webhook - parsed data:", {
        sid: MessageSid,
        from: From,
        to: To,
        body: Body,
        numMedia: NumMedia
      });

      if (!MessageSid || !From || !To) {
        console.error("Missing required fields in webhook data");
        res.type('text/xml');
        return res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      // Try to find the user by phone number using normalized phone number comparison
      console.log("Looking for matching user using normalized phone:", From);
      const normalizedFromPhone = normalizePhoneNumber(From);
      console.log("Normalized phone number:", normalizedFromPhone);
      
      const matchingUser = normalizedFromPhone ? await storage.getUserByPhone(normalizedFromPhone) : undefined;
      console.log("Matching user:", matchingUser ? `Found: ${matchingUser.id}` : 'Not found');

      // Handle STOP messages (opt-out from SMS)
      const normalizedBody = (Body || '').trim().toUpperCase();
      const stopKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
      if (stopKeywords.includes(normalizedBody)) {
        console.log("STOP message detected - updating SMS consent");
        
        if (matchingUser) {
          try {
            await storage.updateUser(matchingUser.id, {
              smsConsent: false,
            });
            console.log(`✓ SMS consent updated to false for user ${matchingUser.id}`);
          } catch (updateError) {
            console.error("Error updating SMS consent:", updateError);
          }
        } else {
          console.warn("STOP message received but no matching user found");
        }
      }

      // Save the incoming SMS to the communications table
      const communicationData = {
        type: 'sms' as const,
        direction: 'inbound' as const,
        fromAddress: From,
        toAddress: To,
        subject: null,
        content: Body || '',
        htmlContent: null,
        userId: matchingUser?.id || null,
        enrollmentId: null,
        courseId: null,
        purpose: 'general',
        deliveryStatus: 'delivered',
        externalMessageSid: MessageSid, // Store Twilio's Message SID
        sentAt: new Date(), // This is when Twilio *received* it, not sent time. For inbound, this is effectively received time.
        deliveredAt: new Date(), // Same as sentAt for inbound
        readAt: null,
        flaggedAt: null,
        isRead: false,
        isFlagged: false,
      };

      console.log("Saving communication to database...");
      const savedCommunication = await storage.createCommunication(communicationData);

      console.log("✓ SMS saved successfully:", {
        id: savedCommunication.id,
        from: From,
        to: To,
        content: Body,
        userId: matchingUser?.id || 'no user'
      });

      // Respond to Twilio with TwiML (optional - empty response is fine)
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error: any) {
      console.error("!!! Error processing SMS webhook:", error);
      console.error("Error stack:", error.stack);

      // Still respond with 200 to Twilio to prevent retries
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  // E-COMMERCE API ROUTES

  // Product Categories Routes
  app.get('/api/product-categories', async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching product categories:", error);
      res.status(500).json({ error: "Failed to fetch product categories: " + error.message });
    }
  });

  app.get('/api/product-categories/:id', async (req, res) => {
    try {
      const category = await storage.getProductCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Product category not found" });
      }
      res.json(category);
    } catch (error: any) {
      console.error("Error fetching product category:", error);
      res.status(500).json({ error: "Failed to fetch product category: " + error.message });
    }
  });

  app.post('/api/product-categories', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can create product categories" });
      }

      const validatedData = insertProductCategorySchema.parse(req.body);
      const category = await storage.createProductCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating product category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid product category data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product category: " + error.message });
    }
  });

  app.put('/api/product-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can update product categories" });
      }

      const validatedData = insertProductCategorySchema.partial().parse(req.body);
      const category = await storage.updateProductCategory(req.params.id, validatedData);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating product category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid product category data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update product category: " + error.message });
    }
  });

  app.delete('/api/product-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can delete product categories" });
      }

      await storage.deleteProductCategory(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting product category:", error);
      res.status(500).json({ error: "Failed to delete product category: " + error.message });
    }
  });

  // Products Routes
  app.get('/api/products', async (req, res) => {
    try {
      const { category } = req.query;
      let products;

      if (category) {
        products = await storage.getProductsByCategory(category.toString());
      } else {
        products = await storage.getProducts();
      }

      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products: " + error.message });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product: " + error.message });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can create products" });
      }

      const validatedData = insertProductSchema.parse({
        ...req.body,
        createdBy: user.id,
      });

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product: " + error.message });
    }
  });

  app.put('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can update products" });
      }

      const validatedData = insertProductSchema.partial().parse({
        ...req.body,
        updatedBy: user.id,
      });

      const product = await storage.updateProduct(req.params.id, validatedData);
      res.json(product);
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update product: " + error.message });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can delete products" });
      }

      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product: " + error.message });
    }
  });

  // Product Variants Routes
  app.get('/api/products/:productId/variants', async (req, res) => {
    try {
      const variants = await storage.getProductVariants(req.params.productId);
      res.json(variants);
    } catch (error: any) {
      console.error("Error fetching product variants:", error);
      res.status(500).json({ error: "Failed to fetch product variants: " + error.message });
    }
  });

  app.post('/api/products/:productId/variants', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'instructor') {
        return res.status(403).json({ error: "Only instructors can create product variants" });
      }

      const validatedData = insertProductVariantSchema.parse({
        ...req.body,
        productId: req.params.productId,
      });

      const variant = await storage.createProductVariant(validatedData);
      res.status(201).json(variant);
    } catch (error: any) {
      console.error("Error creating product variant:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid product variant data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product variant: " + error.message });
    }
  });

  // Shopping Cart Routes
  app.get('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub; // May be null for guest users
      const sessionId = req.sessionID;

      console.log("GET /api/cart - userId:", userId, "sessionId:", sessionId);

      // Use same logic as POST route: if userId exists, don't use sessionId
      const cartItems = await storage.getCartItems(userId, userId ? null : sessionId);

      console.log("GET /api/cart - found items:", cartItems.length);

      // Convert priceAtTime from string to number for frontend compatibility
      const formattedCartItems = cartItems.map(item => ({
        ...item,
        priceAtTime: Number(item.priceAtTime)
      }));

      res.json(formattedCartItems);
    } catch (error: any) {
      console.error("Error fetching cart items:", error);
      res.status(500).json({ error: "Failed to fetch cart items: " + error.message });
    }
  });

  app.post('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub; // May be null for guest users
      const sessionId = req.sessionID;

      console.log("POST /api/cart - userId:", userId, "sessionId:", sessionId);

      const cartItemSchema = z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).default(1),
        customization: z.object({}).optional(),
        priceAtTime: z.number(),
      });

      const validatedData = cartItemSchema.parse(req.body);

      const cartItem = await storage.addToCart({
        ...validatedData,
        userId: userId || null,
        sessionId: userId ? null : sessionId,
      });

      console.log("POST /api/cart - created item with userId:", cartItem.userId, "sessionId:", cartItem.sessionId);

      res.status(201).json(cartItem);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid cart item data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add to cart: " + error.message });
    }
  });

  app.put('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      const quantitySchema = z.object({
        quantity: z.number().int().min(1),
      });

      const { quantity } = quantitySchema.parse(req.body);
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      res.json(cartItem);
    } catch (error: any) {
      console.error("Error updating cart item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid quantity", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update cart item: " + error.message });
    }
  });

  app.delete('/api/cart/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.removeFromCart(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "Failed to remove from cart: " + error.message });
    }
  });

  app.delete('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const sessionId = req.sessionID;

      await storage.clearCart(userId, sessionId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "Failed to clear cart: " + error.message });
    }
  });

  // E-commerce Orders Routes
  app.get('/api/ecommerce-orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let orders;
      if (user?.role === 'instructor') {
        // Instructors can see all orders
        orders = await storage.getEcommerceOrders();
      } else {
        // Students can only see their own orders
        orders = await storage.getEcommerceOrders(userId);
      }

      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching e-commerce orders:", error);
      res.status(500).json({ error: "Failed to fetch orders: " + error.message });
    }
  });

  app.get('/api/ecommerce-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const order = await storage.getEcommerceOrder(req.params.id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check authorization
      if (user?.role !== 'instructor' && order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error fetching e-commerce order:", error);
      res.status(500).json({ error: "Failed to fetch order: " + error.message });
    }
  });

  // Checkout completion endpoint
  app.post('/api/checkout/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }

      // Verify the payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed" });
      }

      // Get the cart items from metadata
      const cartItems = JSON.parse(paymentIntent.metadata.cartItems || '[]');

      // Create order record
      const order = await storage.createOrder({
        userId,
        stripePaymentIntentId: paymentIntentId,
        subtotal: paymentIntent.amount / 100, // Convert from cents
        tax: 0, // Calculate if needed
        total: paymentIntent.amount / 100,
        status: 'completed',
        paymentStatus: 'paid',
      });

      // Create order items
      for (const item of cartItems) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime,
        });
      }

      // Clear the user's cart
      await storage.clearCart(userId);

      res.json({
        success: true,
        orderId: order.id,
        message: "Order completed successfully"
      });
    } catch (error: any) {
      console.error("Error completing checkout:", error);
      res.status(500).json({ message: "Failed to complete checkout" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, inquiryType, subject, message, preferredContact } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !inquiryType || !subject || !message) {
        return res.status(400).json({ error: "All required fields must be filled" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }

      // Import email service
      const { NotificationEmailService } = await import('./emailService');

      // Create email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">New Contact Form Submission</h2>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Preferred Contact:</strong> ${preferredContact || 'Email'}</p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Inquiry Details</h3>
            <p><strong>Type:</strong> ${inquiryType}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            This message was sent through the Practical Defense Training contact form.
            Please respond to ${email} or call ${phone || 'the provided email'} based on their preferred contact method.
          </p>
        </div>
      `;

      // Send email notification to admin
      const result = await NotificationEmailService.sendNotificationEmail({
        to: ['jeremy@abqconcealedcarry.com'],
        subject: `Contact Form: ${subject}`,
        htmlContent: emailContent,
        textContent: `
New Contact Form Submission

Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone || 'Not provided'}
Inquiry Type: ${inquiryType}
Subject: ${subject}

Message:
${message}

Please respond to ${email} based on their preferred contact method: ${preferredContact || 'Email'}
        `.trim(),
      });

      if (result.success) {
        // Send confirmation email to user
        const confirmationContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Thank You for Contacting Practical Defense Training</h2>

            <p>Dear ${firstName},</p>

            <p>Thank you for reaching out to us. We have received your message and will get back to you within 24 hours.</p>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Your Message Summary</h3>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Inquiry Type:</strong> ${inquiryType}</p>
              <p><strong>Preferred Contact Method:</strong> ${preferredContact || 'Email'}</p>
            </div>

            <p>If you have any urgent questions, please feel free to call us at <strong>(505) 944-5247</strong>.</p>

            <p>Best regards,<br>
            <strong>Jeremy Gill</strong><br>
            Practical Defense Training<br>
            jeremy@abqconcealedcarry.com<br>
            (505) 944-5247</p>
          </div>
        `;

        await NotificationEmailService.sendNotificationEmail({
          to: [email],
          subject: 'Thank you for contacting Practical Defense Training',
          htmlContent: confirmationContent,
          textContent: `
Dear ${firstName},

Thank you for reaching out to us. We have received your message and will get back to you within 24 hours.

Your Message Summary:
Subject: ${subject}
Inquiry Type: ${inquiryType}
Preferred Contact Method: ${preferredContact || 'Email'}

If you have any urgent questions, please feel free to call us at (505) 944-5247.

Best regards,
Jeremy Gill
Practical Defense Training
jeremy@abqconcealedcarry.com
(505) 944-5247
          `,
        });

        res.json({
          success: true,
          message: "Your message has been sent successfully. We'll get back to you within 24 hours."
        });
      } else {
        console.error("Failed to send contact form email:", result.error);
        res.status(500).json({
          error: "Failed to send your message. Please try again or contact us directly."
        });
      }
    } catch (error: any) {
      console.error("Contact form submission error:", error);
      res.status(500).json({
        error: "An error occurred while sending your message. Please try again."
      });
    }
  });

  // SMS Lists Management Routes (Instructor-protected)

  // 1. GET /api/sms-lists - Get all lists for authenticated instructor
  app.get('/api/sms-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const lists = await storage.getSmsListsByInstructor(userId);

      // Add member counts to each list
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const members = await storage.getSmsListMembers(list.id);
          return {
            ...list,
            memberCount: members.length,
          };
        })
      );

      res.json(listsWithCounts);
    } catch (error) {
      console.error("Error fetching SMS lists:", error);
      res.status(500).json({ message: "Failed to fetch SMS lists" });
    }
  });

  // 2. GET /api/sms-lists/:listId - Get single list with full details
  app.get('/api/sms-lists/:listId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const list = await storage.getSmsListWithDetails(req.params.listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      // Verify ownership
      if (list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching SMS list details:", error);
      res.status(500).json({ message: "Failed to fetch SMS list details" });
    }
  });

  // 3. POST /api/sms-lists - Create a new custom list
  app.post('/api/sms-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Validate and ensure listType is 'custom' and instructorId matches
      const validatedData = insertSmsListSchema.parse({
        ...req.body,
        listType: 'custom',
        instructorId: userId,
        scheduleId: null, // Custom lists don't have schedules
      });

      const list = await storage.createSmsList(validatedData);
      res.status(201).json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating SMS list:", error);
      res.status(500).json({ message: "Failed to create SMS list" });
    }
  });

  // 4. PATCH /api/sms-lists/:listId - Update list details
  app.patch('/api/sms-lists/:listId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const existingList = await storage.getSmsList(req.params.listId);

      if (!existingList) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (existingList.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      // Only allow updating specific fields
      const allowedFields = ['name', 'description', 'tags', 'isActive'];
      const updateData: any = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedList = await storage.updateSmsList(req.params.listId, updateData);
      res.json(updatedList);
    } catch (error) {
      console.error("Error updating SMS list:", error);
      res.status(500).json({ message: "Failed to update SMS list" });
    }
  });

  // 5. DELETE /api/sms-lists/:listId - Delete a list
  app.delete('/api/sms-lists/:listId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const existingList = await storage.getSmsList(req.params.listId);

      if (!existingList) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (existingList.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      // Only allow deleting custom lists
      if (existingList.listType !== 'custom') {
        return res.status(400).json({
          message: "Cannot delete course schedule lists. Only custom lists can be deleted."
        });
      }

      await storage.deleteSmsList(req.params.listId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting SMS list:", error);
      res.status(500).json({ message: "Failed to delete SMS list" });
    }
  });

  // 6. GET /api/sms-lists/:listId/members - Get all members of a list
  app.get('/api/sms-lists/:listId/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const list = await storage.getSmsList(req.params.listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      const members = await storage.getSmsListMembers(req.params.listId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching SMS list members:", error);
      res.status(500).json({ message: "Failed to fetch SMS list members" });
    }
  });

  // 7. POST /api/sms-lists/:listId/members - Add member(s) to list
  app.post('/api/sms-lists/:listId/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const list = await storage.getSmsList(req.params.listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      // Accept single userId or array of userIds
      const { userId: singleUserId, userIds } = req.body;

      if (!singleUserId && !userIds) {
        return res.status(400).json({ message: "userId or userIds is required" });
      }

      const userIdsToAdd = singleUserId ? [singleUserId] : userIds;

      if (!Array.isArray(userIdsToAdd) || userIdsToAdd.length === 0) {
        return res.status(400).json({ message: "Invalid user IDs provided" });
      }

      // Check for duplicates and prepare members to add
      const membersToAdd = [];
      const alreadyMembers = [];

      for (const userIdToAdd of userIdsToAdd) {
        const isMember = await storage.checkSmsListMembership(req.params.listId, userIdToAdd);

        if (isMember) {
          alreadyMembers.push(userIdToAdd);
        } else {
          membersToAdd.push({
            listId: req.params.listId,
            userId: userIdToAdd,
            addedBy: userId,
            autoAdded: false,
          });
        }
      }

      // Add members
      const addedMembers = membersToAdd.length > 0
        ? await storage.addSmsListMembers(membersToAdd)
        : [];

      res.json({
        added: addedMembers,
        alreadyMembers: alreadyMembers,
        message: `Successfully added ${addedMembers.length} member(s). ${alreadyMembers.length} already in list.`,
      });
    } catch (error) {
      console.error("Error adding SMS list members:", error);
      res.status(500).json({ message: "Failed to add members to SMS list" });
    }
  });

  // 8. DELETE /api/sms-lists/:listId/members/:userId - Remove member from list
  app.delete('/api/sms-lists/:listId/members/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const instructorId = req.user.id;
      const user = await storage.getUser(instructorId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const { listId, userId } = req.params;

      // Verify list exists and ownership
      const list = await storage.getSmsList(listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (list.instructorId !== instructorId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      // For course schedule lists, don't allow removing auto-added members
      if (list.listType === 'course_schedule') {
        const members = await storage.getSmsListMembers(listId);
        const member = members.find(m => m.userId === userId);

        if (member && member.autoAdded) {
          return res.status(400).json({
            message: "Cannot remove auto-added members from course schedule lists"
          });
        }
      }

      await storage.removeSmsListMemberByUserAndList(listId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing SMS list member:", error);
      res.status(500).json({ message: "Failed to remove member from SMS list" });
    }
  });

  // 9. GET /api/sms-lists/search?q=query - Search lists by name/tags
  app.get('/api/sms-lists/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const query = req.query.q as string;

      if (!query || query.trim() === '') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const lists = await storage.searchSmsLists(userId, query.trim());
      res.json(lists);
    } catch (error) {
      console.error("Error searching SMS lists:", error);
      res.status(500).json({ message: "Failed to search SMS lists" });
    }
  });

  // SMS Broadcast Messages Routes (Instructor-protected)

  // 1. GET /api/sms-lists/:listId/broadcasts - Get all broadcast messages for a list
  app.get('/api/sms-lists/:listId/broadcasts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const list = await storage.getSmsList(req.params.listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      const broadcasts = await storage.getSmsBroadcastsByList(req.params.listId);
      res.json(broadcasts);
    } catch (error) {
      console.error("Error fetching broadcasts:", error);
      res.status(500).json({ message: "Failed to fetch broadcasts" });
    }
  });

  // 2. GET /api/broadcasts/:broadcastId - Get single broadcast with full details
  app.get('/api/broadcasts/:broadcastId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const broadcast = await storage.getSmsBroadcastWithDeliveryStats(req.params.broadcastId);

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      // Verify ownership through list
      const list = await storage.getSmsList(broadcast.listId);

      if (!list || list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this broadcast." });
      }

      res.json(broadcast);
    } catch (error) {
      console.error("Error fetching broadcast:", error);
      res.status(500).json({ message: "Failed to fetch broadcast" });
    }
  });

  // 3. POST /api/sms-lists/:listId/broadcasts - Create new broadcast (draft)
  app.post('/api/sms-lists/:listId/broadcasts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify list exists and ownership
      const list = await storage.getSmsList(req.params.listId);

      if (!list) {
        return res.status(404).json({ message: "SMS list not found" });
      }

      if (list.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this list." });
      }

      // Validate and create broadcast
      const validatedData = insertSmsBroadcastMessageSchema.parse({
        ...req.body,
        listId: req.params.listId,
        instructorId: userId,
        status: 'draft',
        totalRecipients: 0,
        successCount: 0,
        failureCount: 0,
      });

      const broadcast = await storage.createSmsBroadcastMessage(validatedData);
      res.status(201).json(broadcast);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating broadcast:", error);
      res.status(500).json({ message: "Failed to create broadcast" });
    }
  });

  // 4. PATCH /api/broadcasts/:broadcastId - Update broadcast message
  app.patch('/api/broadcasts/:broadcastId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify broadcast exists
      const broadcast = await storage.getSmsBroadcastMessage(req.params.broadcastId);

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      // Verify ownership
      if (broadcast.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this broadcast." });
      }

      // Only allow updating drafts
      if (broadcast.status !== 'draft') {
        return res.status(400).json({ message: "Only draft broadcasts can be updated" });
      }

      // Only allow updating specific fields
      const allowedFields = ['subject', 'messageContent', 'messageHtml', 'messagePlain', 'attachmentUrls', 'dynamicTags', 'scheduledFor'];
      const updateData: any = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedBroadcast = await storage.updateSmsBroadcastMessage(req.params.broadcastId, updateData);
      res.json(updatedBroadcast);
    } catch (error) {
      console.error("Error updating broadcast:", error);
      res.status(500).json({ message: "Failed to update broadcast" });
    }
  });

  // 5. DELETE /api/broadcasts/:broadcastId - Delete a broadcast
  app.delete('/api/broadcasts/:broadcastId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify broadcast exists
      const broadcast = await storage.getSmsBroadcastMessage(req.params.broadcastId);

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      // Verify ownership
      if (broadcast.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this broadcast." });
      }

      // Only allow deleting drafts
      if (broadcast.status !== 'draft') {
        return res.status(400).json({ message: "Only draft broadcasts can be deleted" });
      }

      await storage.deleteSmsBroadcastMessage(req.params.broadcastId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting broadcast:", error);
      res.status(500).json({ message: "Failed to delete broadcast" });
    }
  });

  // 6. POST /api/broadcasts/:broadcastId/send - Send broadcast to all list members
  app.post('/api/broadcasts/:broadcastId/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Get broadcast
      const broadcast = await storage.getSmsBroadcastMessage(req.params.broadcastId);

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      // Verify ownership
      if (broadcast.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this broadcast." });
      }

      // Only allow sending drafts
      if (broadcast.status !== 'draft') {
        return res.status(400).json({ message: "Only draft broadcasts can be sent" });
      }

      // Get list members
      const members = await storage.getSmsListMembers(broadcast.listId);
      const membersWithPhone = members.filter(m => m.user.phone && m.user.phone.trim() !== '');

      if (membersWithPhone.length === 0) {
        return res.status(400).json({ message: "No members with valid phone numbers found" });
      }

      // Check if message is scheduled for later
      if (broadcast.scheduledFor) {
        const scheduledTime = new Date(broadcast.scheduledFor);
        const now = new Date();

        // If scheduled for future, mark as scheduled and return
        if (scheduledTime > now) {
          const updatedBroadcast = await storage.updateSmsBroadcastMessage(req.params.broadcastId, {
            status: 'scheduled',
            totalRecipients: membersWithPhone.length,
          });

          return res.json({
            ...updatedBroadcast,
            message: `Broadcast scheduled for ${scheduledTime.toLocaleString()}`
          });
        }
      }

      // Update broadcast status to 'sending' (for immediate sends)
      await storage.updateSmsBroadcastMessage(req.params.broadcastId, {
        status: 'sending',
        totalRecipients: membersWithPhone.length,
      });

      // Helper function to format phone number to E.164 format
      const formatPhoneNumber = (phone: string): string => {
        let formatted = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove formatting

        // Add country code if missing (assuming US +1)
        if (!formatted.startsWith('+')) {
          if (formatted.length === 10) {
            formatted = '+1' + formatted;
          } else if (formatted.length === 11 && formatted.startsWith('1')) {
            formatted = '+' + formatted;
          } else {
            formatted = '+' + formatted;
          }
        }

        return formatted;
      };

      // Helper function to replace dynamic tags
      const replaceDynamicTags = (message: string, member: any): string => {
        let personalizedMessage = message;

        // Replace common tags
        personalizedMessage = personalizedMessage.replace(/\{\{firstName\}\}/g, member.user.firstName || '');
        personalizedMessage = personalizedMessage.replace(/\{\{lastName\}\}/g, member.user.lastName || '');
        personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/g, member.user.email || '');

        // Add more tag replacements as needed (courseName, etc.)

        return personalizedMessage;
      };

      // Send messages asynchronously (fire-and-forget)
      let successCount = 0;
      let failureCount = 0;

      // Process sends in the background but track results
      const sendPromises = membersWithPhone.map(async (member) => {
        try {
          // Personalize message
          const personalizedMessage = replaceDynamicTags(broadcast.messagePlain, member);

          // Format phone number to E.164 format for consistency
          const formattedPhone = formatPhoneNumber(member.user.phone!);

          // Create delivery record with pending status
          const delivery = await storage.createSmsBroadcastDelivery({
            broadcastId: req.params.broadcastId,
            userId: member.userId,
            phoneNumber: formattedPhone,
            personalizedMessage,
            status: 'pending',
          });

          // Send SMS - use student's userId for proper conversation threading
          const smsResult = await sendSms({
            to: formattedPhone,
            body: personalizedMessage,
            instructorId: userId,
            studentId: member.userId, // Add studentId for proper threading
            purpose: 'educational',
          });

          // Update delivery record based on result
          if (smsResult.success) {
            await storage.updateSmsBroadcastDelivery(delivery.id, {
              status: 'sent',
              twilioMessageSid: smsResult.messageSid,
              sentAt: new Date(),
            });
            successCount++;
          } else {
            await storage.updateSmsBroadcastDelivery(delivery.id, {
              status: 'failed',
              errorMessage: smsResult.error,
            });
            failureCount++;
          }
        } catch (error: any) {
          console.error(`Error sending SMS to ${member.user.phone}:`, error);
          failureCount++;
        }
      });

      // Wait for all sends to complete
      await Promise.all(sendPromises);

      // Update broadcast with final stats
      const updatedBroadcast = await storage.updateSmsBroadcastMessage(req.params.broadcastId, {
        status: 'sent',
        successCount,
        failureCount,
        sentAt: new Date(),
      });

      res.json(updatedBroadcast);
    } catch (error) {
      console.error("Error sending broadcast:", error);

      // Try to update broadcast status to failed
      try {
        await storage.updateSmsBroadcastMessage(req.params.broadcastId, {
          status: 'failed',
        });
      } catch (updateError) {
        console.error("Error updating broadcast status to failed:", updateError);
      }

      res.status(500).json({ message: "Failed to send broadcast" });
    }
  });

  // 7. GET /api/broadcasts/:broadcastId/deliveries - Get delivery status for a broadcast
  app.get('/api/broadcasts/:broadcastId/deliveries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      // Verify broadcast exists
      const broadcast = await storage.getSmsBroadcastMessage(req.params.broadcastId);

      if (!broadcast) {
        return res.status(404).json({ message: "Broadcast not found" });
      }

      // Verify ownership
      if (broadcast.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied. You do not own this broadcast." });
      }

      const deliveries = await storage.getSmsBroadcastDeliveries(req.params.broadcastId);
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  // Background scheduler for sending scheduled broadcasts
  const checkScheduledBroadcasts = async () => {
    try {
      // Get all scheduled broadcasts
      const scheduledBroadcasts = await db
        .select()
        .from(smsBroadcastMessages)
        .where(eq(smsBroadcastMessages.status, 'scheduled'));

      const now = new Date();

      for (const broadcast of scheduledBroadcasts) {
        // Check if it's time to send
        if (broadcast.scheduledFor && new Date(broadcast.scheduledFor) <= now) {
          console.log(`Sending scheduled broadcast ${broadcast.id} (scheduled for ${broadcast.scheduledFor})`);

          try {
            // Get list members
            const members = await storage.getSmsListMembers(broadcast.listId);
            const membersWithPhone = members.filter(m => m.user.phone && m.user.phone.trim() !== '');

            if (membersWithPhone.length === 0) {
              console.log(`Broadcast ${broadcast.id} has no valid recipients, marking as failed`);
              await storage.updateSmsBroadcastMessage(broadcast.id, {
                status: 'failed',
              });
              continue;
            }

            // Update broadcast status to 'sending'
            await storage.updateSmsBroadcastMessage(broadcast.id, {
              status: 'sending',
              totalRecipients: membersWithPhone.length,
            });

            // Helper function to replace dynamic tags
            const replaceDynamicTags = (message: string, member: any): string => {
              let personalizedMessage = message;
              personalizedMessage = personalizedMessage.replace(/\{\{firstName\}\}/g, member.user.firstName || '');
              personalizedMessage = personalizedMessage.replace(/\{\{lastName\}\}/g, member.user.lastName || '');
              personalizedMessage = personalizedMessage.replace(/\{\{email\}\}/g, member.user.email || '');
              return personalizedMessage;
            };

            // Send messages
            let successCount = 0;
            let failureCount = 0;

            const sendPromises = membersWithPhone.map(async (member) => {
              try {
                const personalizedMessage = replaceDynamicTags(broadcast.messagePlain, member);

                // Format phone number to E.164 format for consistency
                const formatPhoneNumber = (phone: string): string => {
                  let formatted = phone.replace(/[\s\-\(\)\.]/g, ''); // Remove formatting

                  // Add country code if missing (assuming US +1)
                  if (!formatted.startsWith('+')) {
                    if (formatted.length === 10) {
                      formatted = '+1' + formatted;
                    } else if (formatted.length === 11 && formatted.startsWith('1')) {
                      formatted = '+' + formatted;
                    } else {
                      formatted = '+' + formatted;
                    }
                  }

                  return formatted;
                };
                const formattedPhone = formatPhoneNumber(member.user.phone!);

                // Create delivery record with pending status
                const delivery = await storage.createSmsBroadcastDelivery({
                  broadcastId: broadcast.id,
                  userId: member.userId,
                  phoneNumber: formattedPhone,
                  personalizedMessage,
                  status: 'pending',
                });

                // Send SMS - use student's userId for proper conversation threading
                const smsResult = await sendSms({
                  to: formattedPhone,
                  body: personalizedMessage,
                  instructorId: broadcast.instructorId,
                  studentId: member.userId, // Add studentId for proper threading
                  purpose: 'educational',
                });

                // Update delivery record based on result
                if (smsResult.success) {
                  await storage.updateSmsBroadcastDelivery(delivery.id, {
                    status: 'sent',
                    twilioMessageSid: smsResult.messageSid,
                    sentAt: new Date(),
                  });
                  successCount++;
                } else {
                  await storage.updateSmsBroadcastDelivery(delivery.id, {
                    status: 'failed',
                    errorMessage: smsResult.error,
                  });
                  failureCount++;
                }
              } catch (error: any) {
                console.error(`Error sending SMS to ${member.user.phone}:`, error);
                failureCount++;
              }
            });

            await Promise.all(sendPromises);

            // Update broadcast with final stats
            await storage.updateSmsBroadcastMessage(broadcast.id, {
              status: 'sent',
              successCount,
              failureCount,
              sentAt: new Date(),
            });

            console.log(`Successfully sent scheduled broadcast ${broadcast.id} (${successCount} success, ${failureCount} failed)`);
          } catch (error) {
            console.error(`Error processing scheduled broadcast ${broadcast.id}:`, error);
            await storage.updateSmsBroadcastMessage(broadcast.id, {
              status: 'failed',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking scheduled broadcasts:', error);
    }
  };

  // Run scheduler every minute
  setInterval(checkScheduledBroadcasts, 60 * 1000);
  console.log('Scheduled broadcast checker started (runs every minute)');

  // Object Storage Upload URL endpoint
  app.post('/api/object-storage/upload-url', isAuthenticated, async (req: any, res) => {
    try {
      const { directory, filename } = req.body;

      if (!directory || !filename) {
        return res.status(400).json({ message: "Directory and filename are required" });
      }

      const bucketId = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0]?.split('/')[1];
      if (!bucketId) {
        return res.status(500).json({ message: "Object storage not configured" });
      }

      const objectPath = `/${bucketId}/${directory}/${filename}`;

      // Parse object path manually: /<bucket_name>/<object_name>
      const parts = objectPath.slice(1).split('/');
      const bucketName = parts[0];
      const objectName = parts.slice(1).join('/');

      const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://0.0.0.0:1106";

      const request = {
        bucket_name: bucketName,
        object_name: objectName,
        method: 'PUT',
        expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
      };

      const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to sign object URL: ${response.status}`);
      }

      const { signed_url } = await response.json();
      res.json({ url: signed_url });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL: " + error.message });
    }
  });

  // ============================================
  // CREDIT SYSTEM ROUTES
  // ============================================

  // Get instructor credit balance
  app.get('/api/credits/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Only instructors can access credits" });
      }

      const credits = await storage.ensureInstructorCredits(userId);
      res.json(credits);
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  // Get available credit packages
  app.get('/api/credits/packages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Only instructors can access credit packages" });
      }

      const packages = await storage.getActiveCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ message: "Failed to fetch credit packages" });
    }
  });

  // Get credit transaction history
  app.get('/api/credits/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Only instructors can access credit transactions" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getCreditTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Failed to fetch credit transactions" });
    }
  });

  // Create payment intent for credit purchase
  app.post('/api/credits/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { packageId } = req.body;

      if (!packageId) {
        return res.status(400).json({ message: "Package ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Only instructors can purchase credits" });
      }

      const pkg = await storage.getCreditPackage(packageId);
      if (!pkg) {
        return res.status(404).json({ message: "Credit package not found" });
      }

      if (!pkg.isActive) {
        return res.status(400).json({ message: "This credit package is no longer available" });
      }

      // Create Stripe payment intent
      const amountInCents = Math.round(parseFloat(pkg.price) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          instructorId: userId,
          packageId: pkg.id,
          smsCredits: pkg.smsCredits.toString(),
          emailCredits: pkg.emailCredits.toString(),
          packageName: pkg.name,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: parseFloat(pkg.price),
        packageName: pkg.name,
        smsCredits: pkg.smsCredits,
        emailCredits: pkg.emailCredits,
      });
    } catch (error) {
      console.error("Error creating credit payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Confirm credit purchase after payment
  app.post('/api/credits/confirm-purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'superadmin')) {
        return res.status(403).json({ message: "Only instructors can purchase credits" });
      }

      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed" });
      }

      // Verify this payment intent belongs to this instructor
      if (paymentIntent.metadata.instructorId !== userId) {
        return res.status(403).json({ message: "This payment intent does not belong to you" });
      }

      // Add credits to instructor's account
      const smsCredits = parseInt(paymentIntent.metadata.smsCredits || '0');
      const emailCredits = parseInt(paymentIntent.metadata.emailCredits || '0');
      const packageId = paymentIntent.metadata.packageId;

      const result = await storage.addCredits(userId, smsCredits, emailCredits, {
        amount: paymentIntent.amount / 100,
        stripePaymentIntentId: paymentIntentId,
        packageId,
        description: `Purchased ${paymentIntent.metadata.packageName}`,
      });

      res.json({
        success: true,
        credits: result.credits,
        transaction: result.transaction,
      });
    } catch (error) {
      console.error("Error confirming credit purchase:", error);
      res.status(500).json({ message: "Failed to confirm credit purchase" });
    }
  });

  // ============================================
  // SUPERADMIN CREDIT MANAGEMENT ROUTES
  // ============================================

  // Get all instructors with their credit balances
  app.get('/api/admin/credits/instructors', isAuthenticated, requireSuperadmin, async (req: any, res) => {
    try {
      const instructors = await storage.getAllInstructorsWithCredits();
      res.json(instructors);
    } catch (error) {
      console.error("Error fetching instructors with credits:", error);
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  // Grant credits to an instructor (superadmin only)
  app.post('/api/admin/credits/grant', isAuthenticated, requireSuperadmin, async (req: any, res) => {
    try {
      const superadminId = req.user.id;
      const { instructorId, smsCredits, emailCredits, description } = req.body;

      if (!instructorId) {
        return res.status(400).json({ message: "Instructor ID is required" });
      }

      if ((smsCredits === undefined || smsCredits < 0) && (emailCredits === undefined || emailCredits < 0)) {
        return res.status(400).json({ message: "At least one credit type must be a positive number" });
      }

      // Verify the target user is an instructor
      const targetUser = await storage.getUser(instructorId);
      if (!targetUser || (targetUser.role !== 'instructor' && targetUser.role !== 'superadmin')) {
        return res.status(400).json({ message: "Target user must be an instructor" });
      }

      const result = await storage.addCredits(
        instructorId,
        smsCredits || 0,
        emailCredits || 0,
        {
          transactionType: 'admin_grant',
          grantedByUserId: superadminId,
          description: description || `Admin granted ${smsCredits || 0} SMS and ${emailCredits || 0} email credits`,
        }
      );

      res.json({
        success: true,
        credits: result.credits,
        transaction: result.transaction,
      });
    } catch (error) {
      console.error("Error granting credits:", error);
      res.status(500).json({ message: "Failed to grant credits" });
    }
  });

  // Mount appointment routes
  app.use('/api/appointments', appointmentRouter);

  const httpServer = createServer(app);
  return httpServer;
}