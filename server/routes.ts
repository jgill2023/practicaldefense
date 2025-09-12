import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCategorySchema, insertCourseSchema, insertCourseScheduleSchema, insertEnrollmentSchema, insertAppSettingsSchema } from "@shared/schema";

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

  // Course registration endpoint (supports non-authenticated users with account creation)
  app.post('/api/course-registration', async (req: any, res) => {
    try {
      const { studentInfo, accountCreation, ...enrollmentData } = req.body;

      let studentId;

      // If user is authenticated, use their existing account
      if (req.isAuthenticated()) {
        studentId = req.user.claims.sub;
      } else {
        // Handle non-authenticated registration
        if (accountCreation && accountCreation.password) {
          // Create new user account
          try {
            const existingUser = await storage.getUserByEmail(studentInfo.email);
            if (existingUser) {
              return res.status(400).json({ 
                message: "An account with this email already exists. Please log in instead." 
              });
            }

            const newUser = await storage.upsertUser({
              email: studentInfo.email,
              firstName: studentInfo.firstName,
              lastName: studentInfo.lastName,
              role: 'student',
            });
            studentId = newUser.id;

            // TODO: Store password securely (would need to implement password hashing)
            // For now, we'll create the account without password since we're using Replit Auth
            
          } catch (error) {
            console.error("Error creating user account:", error);
            return res.status(500).json({ message: "Failed to create user account" });
          }
        } else {
          // Create a temporary user record for guest registration
          try {
            const tempUser = await storage.upsertUser({
              email: studentInfo.email,
              firstName: studentInfo.firstName,
              lastName: studentInfo.lastName,
              role: 'student',
            });
            studentId = tempUser.id;
          } catch (error) {
            console.error("Error creating temporary user:", error);
            return res.status(500).json({ message: "Failed to create user record" });
          }
        }
      }

      // Create enrollment with the determined student ID
      const validatedData = insertEnrollmentSchema.parse({
        ...enrollmentData,
        studentId,
      });

      const enrollment = await storage.createEnrollment(validatedData);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error in course registration:", error);
      res.status(500).json({ message: "Failed to complete registration" });
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
      const { enrollmentId } = req.body;
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

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          enrollmentId,
          courseId: enrollment.courseId,
          scheduleId: enrollment.scheduleId,
          studentId: userId,
          paymentOption: enrollment.paymentOption || 'full',
        },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
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

  const httpServer = createServer(app);
  return httpServer;
}
