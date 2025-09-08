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
