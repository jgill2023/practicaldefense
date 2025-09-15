import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCategorySchema, insertCourseSchema, insertCourseScheduleSchema, insertEnrollmentSchema, insertAppSettingsSchema, insertCourseInformationFormSchema, insertCourseInformationFormFieldSchema, initiateRegistrationSchema, paymentIntentRequestSchema, confirmEnrollmentSchema, insertNotificationTemplateSchema, insertNotificationScheduleSchema, insertWaiverTemplateSchema, insertWaiverInstanceSchema, insertWaiverSignatureSchema, type InsertCourseInformationForm, type InsertCourseInformationFormField, type User } from "@shared/schema";
import "./types"; // Import type declarations

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile update route
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
        preferredContactMethods: z.array(z.string()).optional(),
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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

  app.get('/api/instructor/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const schedules = await storage.getDeletedSchedulesByInstructor(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching deleted schedules:", error);
      res.status(500).json({ message: "Failed to fetch deleted schedules" });
    }
  });

  // Course schedule routes
  app.post('/api/courses/:courseId/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const course = await storage.getCourse(req.params.courseId);
      
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertCourseScheduleSchema.parse({
        ...req.body,
        courseId: req.params.courseId,
      });

      const schedule = await storage.createCourseSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating course schedule:", error);
      res.status(500).json({ message: "Failed to create course schedule" });
    }
  });

  // Enrollment routes
  app.post('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      if (req.isAuthenticated()) {
        userId = req.user.claims.sub;
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
        const userId = req.user.claims.sub;
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
        const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const enrollments = await storage.getEnrollmentsByStudent(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching student enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/instructor/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getEnrollmentsByInstructor(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching instructor enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
        return res.status(403).json({ message: "Access denied. Instructor role required." });
      }

      const studentsData = await storage.getStudentsByInstructor(userId);
      res.json(studentsData);
    } catch (error) {
      console.error("Error fetching students data:", error);
      res.status(500).json({ message: "Failed to fetch students data" });
    }
  });

  app.patch('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const studentId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'instructor') {
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

  // Payment balance tracking
  app.get('/api/enrollments/:enrollmentId/payment-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollmentId = req.params.enrollmentId;
      
      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      // Check ownership: either student owns it or instructor has access
      const user = await storage.getUser(userId);
      const hasAccess = enrollment.studentId === userId || 
                       (user?.role === 'instructor' && enrollment.course?.instructorId === userId);
      
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

  // Form completion status tracking
  app.get('/api/enrollments/:enrollmentId/form-completion', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollmentId = req.params.enrollmentId;
      
      // Verify enrollment ownership
      const enrollment = await storage.getEnrollment(enrollmentId);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      // Check ownership: either student owns it or instructor has access
      const user = await storage.getUser(userId);
      const hasAccess = enrollment.studentId === userId || 
                       (user?.role === 'instructor' && enrollment.course?.instructorId === userId);
      
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

  // Course schedules for export selection
  app.get('/api/instructor/course-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
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
              location: schedule.location,
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
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
        
        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Course Roster Export Summary']);
        summarySheet.addRow(['Export Date', new Date().toLocaleDateString()]);
        summarySheet.addRow(['Total Current Students', data.summary.totalCurrentStudents]);
        summarySheet.addRow(['Total Former Students', data.summary.totalFormerStudents]);
        summarySheet.addRow(['Total Courses', data.summary.totalCourses]);
        
        // Current students sheet
        if (data.current.length > 0) {
          const currentSheet = workbook.addWorksheet('Current Students');
          const headers = [
            'Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 
            'Date of Birth', 'License Expiration', 'Course Title', 'Course Code',
            'Schedule Date', 'Start Time', 'End Time', 'Payment Status', 
            'Enrollment Status', 'Registration Date'
          ];
          currentSheet.addRow(headers);
          
          data.current.forEach(row => {
            currentSheet.addRow([
              row.studentId, row.firstName, row.lastName, row.email, row.phone,
              row.dateOfBirth, row.licenseExpiration, row.courseTitle, row.courseAbbreviation,
              row.scheduleDate, row.scheduleStartTime, row.scheduleEndTime, 
              row.paymentStatus, row.enrollmentStatus, row.registrationDate
            ]);
          });
        }
        
        // Former students sheet
        if (data.former.length > 0) {
          const formerSheet = workbook.addWorksheet('Former Students');
          const headers = [
            'Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 
            'Date of Birth', 'License Expiration', 'Course Title', 'Course Code',
            'Schedule Date', 'Start Time', 'End Time', 'Payment Status', 
            'Enrollment Status', 'Registration Date'
          ];
          formerSheet.addRow(headers);
          
          data.former.forEach(row => {
            formerSheet.addRow([
              row.studentId, row.firstName, row.lastName, row.email, row.phone,
              row.dateOfBirth, row.licenseExpiration, row.courseTitle, row.courseAbbreviation,
              row.scheduleDate, row.scheduleStartTime, row.scheduleEndTime, 
              row.paymentStatus, row.enrollmentStatus, row.registrationDate
            ]);
          });
        }
        
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
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

  // Instructor dashboard statistics
  app.get('/api/instructor/dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getInstructorDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching instructor dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Object storage routes for waivers
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
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
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Course creation endpoint
  app.post("/api/instructor/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseData = { ...req.body, instructorId: userId };
      
      // Validate required fields
      if (!courseData.title || !courseData.description || !courseData.price || !courseData.category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

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

  // Archive course endpoint (soft delete - sets archived flag)
  app.patch("/api/instructor/courses/:courseId/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const archivedCourse = await storage.updateCourse(courseId, { isActive: false });
      res.json({ message: "Course archived successfully", course: archivedCourse });
    } catch (error: any) {
      console.error("Error archiving course:", error);
      res.status(500).json({ error: "Failed to archive course: " + error.message });
    }
  });

  // Unpublish course endpoint (deactivate)
  app.patch("/api/instructor/courses/:courseId/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const unpublishedCourse = await storage.updateCourse(courseId, { isActive: false });
      res.json({ message: "Course unpublished successfully", course: unpublishedCourse });
    } catch (error: any) {
      console.error("Error unpublishing course:", error);
      res.status(500).json({ error: "Failed to unpublish course: " + error.message });
    }
  });

  // Publish course endpoint (activate)
  app.patch("/api/instructor/courses/:courseId/publish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      const publishedCourse = await storage.updateCourse(courseId, { isActive: true });
      res.json({ message: "Course published successfully", course: publishedCourse });
    } catch (error: any) {
      console.error("Error publishing course:", error);
      res.status(500).json({ error: "Failed to publish course: " + error.message });
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

      // Since this is for deleted courses, we need to check directly in the database
      // as the regular getCourse won't return deleted courses
      const courses = await storage.getDeletedCoursesByInstructor(userId);
      const existingCourse = courses.find(c => c.id === courseId);
      
      if (!existingCourse) {
        return res.status(403).json({ error: "Unauthorized: Course not found in deleted items or does not belong to instructor" });
      }

      await storage.permanentlyDeleteCourse(courseId);
      res.json({ message: "Course permanently deleted" });
    } catch (error: any) {
      console.error("Error permanently deleting course:", error);
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
              postal_code: '87101', // Albuquerque zip code
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
  app.get("/api/instructor/courses", async (req, res) => {
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
      const { courseId, title, description, isRequired } = insertCourseInformationFormSchema.parse({
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
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const form = await storage.createCourseInformationForm({
        courseId,
        title,
        description,
        isRequired: Boolean(isRequired),
        sortOrder: 0, // Will be handled by database default or UI sorting
      });

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
  app.patch("/api/course-form-fields/:id", async (req, res) => {
    try {
      const { id } = req.params;
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
        const field = form.fields.find(f => f.id === id);
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

      const updatedField = await storage.updateCourseInformationFormField(id, {
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
  app.delete("/api/course-form-fields/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Query all forms to find the field and verify ownership
      const forms = await storage.getCourseInformationForms();
      let targetField = null;
      let targetForm = null;

      for (const form of forms) {
        const field = form.fields.find(f => f.id === id);
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

      await storage.deleteCourseInformationFormField(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting form field:", error);
      res.status(500).json({ message: "Error deleting form field: " + error.message });
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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
      if (!user || user.role !== 'instructor') {
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

  app.put("/api/admin/waiver-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'instructor') {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
      }

      // Validate request body
      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const template = await storage.updateWaiverTemplate(id, updateData);
      res.json(template);
    } catch (error: any) {
      console.error("Error updating waiver template:", error);
      res.status(500).json({ error: "Failed to update waiver template" });
    }
  });

  app.delete("/api/admin/waiver-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { id } = req.params;
      
      // Only allow instructors to access admin features
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'instructor') {
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
      const isInstructor = user?.role === 'instructor' && course?.instructorId === userId;
      
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
      const isInstructor = user?.role === 'instructor' && course?.instructorId === userId;
      
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
      const isInstructor = user?.role === 'instructor' && course?.instructorId === userId;
      
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
      const isInstructor = user?.role === 'instructor' && course?.instructorId === userId;
      
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
      const isInstructor = user?.role === 'instructor' && course?.instructorId === userId;
      
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
      if (!user || user.role !== 'instructor') {
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

  const httpServer = createServer(app);
  return httpServer;
}
