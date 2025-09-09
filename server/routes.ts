import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCourseSchema, insertCourseScheduleSchema, insertEnrollmentSchema } from "@shared/schema";

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

  // Delete course endpoint (hard delete)
  app.delete("/api/instructor/courses/:courseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const courseId = req.params.courseId;

      // Verify the course belongs to the instructor
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse || existingCourse.instructorId !== userId) {
        return res.status(403).json({ error: "Unauthorized: Course not found or does not belong to instructor" });
      }

      // Check if course has any enrollments or schedules
      const hasEnrollments = existingCourse.schedules?.some(schedule => 
        schedule.enrollments && schedule.enrollments.length > 0
      );
      
      if (hasEnrollments) {
        return res.status(400).json({ 
          error: "Cannot delete course with existing enrollments. Archive it instead." 
        });
      }

      // Check if course has any schedules (even without enrollments)
      const hasSchedules = existingCourse.schedules && existingCourse.schedules.length > 0;
      
      if (hasSchedules) {
        return res.status(400).json({ 
          error: "Cannot delete course with existing schedules. Archive it instead or delete all events first." 
        });
      }

      await storage.deleteCourse(courseId);
      res.json({ message: "Course deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course: " + error.message });
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

  // Delete schedule endpoint
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

      // Check if schedule has enrollments
      const enrollments = await storage.getEnrollmentsByScheduleId(scheduleId);
      if (enrollments.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete schedule with existing enrollments. Cancel it instead." 
        });
      }

      await storage.deleteCourseSchedule(scheduleId);
      res.json({ message: "Schedule deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule: " + error.message });
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
      const { amount, courseId, scheduleId } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          courseId,
          scheduleId,
          studentId: req.user?.claims?.sub,
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

      // Update enrollment status
      const updatedEnrollment = await storage.updateEnrollment(enrollmentId, {
        status: 'confirmed',
        paymentStatus: 'paid',
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
