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
  location: varchar("location", { length: 255 }),
  availableSpots: integer("available_spots").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
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
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
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
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

// Extended types with relations
export type CourseWithSchedules = Course & {
  schedules: CourseSchedule[];
  instructor: User;
};

export type EnrollmentWithDetails = Enrollment & {
  course: Course;
  schedule: CourseSchedule;
  student: User;
};
