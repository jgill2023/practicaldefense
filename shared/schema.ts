import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('student'), // 'student' or 'instructor'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  maxStudents: integer("max_students").notNull().default(20),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseSchedules = pgTable("course_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS format
  location: varchar("location", { length: 255 }),
  maxSpots: integer("max_spots").notNull(),
  availableSpots: integer("available_spots").notNull(),
  isMultiDay: boolean("is_multi_day").notNull().default(false),
  // Recurring event fields
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 50 }), // 'daily', 'weekly', 'monthly', 'custom'
  recurrenceInterval: integer("recurrence_interval").default(1), // Every X days/weeks/months
  recurrenceEndDate: timestamp("recurrence_end_date"),
  daysOfWeek: varchar("days_of_week", { length: 20 }), // Comma-separated: '1,3,5' for Mon,Wed,Fri
  // Registration management
  registrationDeadline: timestamp("registration_deadline"),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  autoConfirmRegistration: boolean("auto_confirm_registration").notNull().default(true),
  // Event specific category (more granular than course category)
  eventCategory: varchar("event_category", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual sessions for multi-day events
export const eventSessions = pgTable("event_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  sessionDate: timestamp("session_date").notNull(),
  startTime: varchar("start_time", { length: 8 }).notNull(),
  endTime: varchar("end_time", { length: 8 }).notNull(),
  sessionTitle: varchar("session_title", { length: 255 }),
  sessionDescription: text("session_description"),
  location: varchar("location", { length: 255 }),
  maxSpots: integer("max_spots"),
  availableSpots: integer("available_spots"),
  isRequired: boolean("is_required").notNull().default(true),
  sessionOrder: integer("session_order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  status: varchar("status").notNull().default('pending'), // 'pending', 'confirmed', 'completed', 'cancelled'
  paymentStatus: varchar("payment_status").notNull().default('pending'), // 'pending', 'paid', 'failed'
  paymentIntentId: varchar("payment_intent_id"),
  waiverUrl: varchar("waiver_url"),
  registrationDate: timestamp("registration_date").defaultNow(),
  confirmationDate: timestamp("confirmation_date"),
  completionDate: timestamp("completion_date"),
  cancellationDate: timestamp("cancellation_date"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Waitlist management for when events are full
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  position: integer("position").notNull(),
  status: varchar("status").notNull().default('waiting'), // 'waiting', 'offered', 'enrolled', 'expired'
  offerDate: timestamp("offer_date"),
  offerExpiryDate: timestamp("offer_expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  waitlistEntries: many(waitlist),
}));

export const courseRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  schedules: many(courseSchedules),
  enrollments: many(enrollments),
}));

export const courseScheduleRelations = relations(courseSchedules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseSchedules.courseId],
    references: [courses.id],
  }),
  enrollments: many(enrollments),
  eventSessions: many(eventSessions),
  waitlistEntries: many(waitlist),
}));

export const eventSessionRelations = relations(eventSessions, ({ one }) => ({
  schedule: one(courseSchedules, {
    fields: [eventSessions.scheduleId],
    references: [courseSchedules.id],
  }),
}));

export const enrollmentRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [enrollments.scheduleId],
    references: [courseSchedules.id],
  }),
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  student: one(users, {
    fields: [waitlist.studentId],
    references: [users.id],
  }),
  schedule: one(courseSchedules, {
    fields: [waitlist.scheduleId],
    references: [courseSchedules.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseScheduleSchema = createInsertSchema(courseSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSessionSchema = createInsertSchema(eventSessions).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourseSchedule = z.infer<typeof insertCourseScheduleSchema>;
export type CourseSchedule = typeof courseSchedules.$inferSelect;
export type InsertEventSession = z.infer<typeof insertEventSessionSchema>;
export type EventSession = typeof eventSessions.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlist.$inferSelect;

// Extended types with relations
export type CourseWithSchedules = Course & {
  schedules: CourseScheduleWithSessions[];
  instructor: User;
};

export type CourseScheduleWithSessions = CourseSchedule & {
  eventSessions: EventSession[];
  enrollments: EnrollmentWithDetails[];
  waitlistEntries: WaitlistWithUser[];
};

export type EnrollmentWithDetails = Enrollment & {
  course: Course;
  schedule: CourseSchedule;
  student: User;
};

export type WaitlistWithUser = WaitlistEntry & {
  student: User;
  schedule: CourseSchedule;
};

// Event management types
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'custom';
export type EventCategory = 'basic' | 'advanced' | 'concealed' | 'specialty' | 'refresher';
export type RegistrationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type WaitlistStatus = 'waiting' | 'offered' | 'enrolled' | 'expired';
