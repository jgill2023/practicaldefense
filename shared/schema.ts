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

// Course categories table for better organization
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default('#3b82f6'), // Hex color for UI
  sortOrder: integer("sort_order"), // For custom ordering of categories
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  briefDescription: varchar("brief_description", { length: 500 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  duration: varchar("duration", { length: 100 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  category: varchar("category", { length: 100 }).notNull(), // Keep for backward compatibility
  // Firearms-specific fields
  classroomTime: varchar("classroom_time", { length: 50 }), // e.g., "4 hours", "2 days"
  rangeTime: varchar("range_time", { length: 50 }), // e.g., "6 hours", "1 day"
  rounds: integer("rounds"), // Number of rounds required
  prerequisites: text("prerequisites"), // Course prerequisites
  maxStudents: integer("max_students").notNull().default(20),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
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
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
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
  paymentOption: varchar("payment_option").notNull().default('full'), // 'full' or 'deposit'
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

// Application settings for configurable UI preferences
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  homeCoursesLimit: integer("home_courses_limit").notNull().default(20),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  waitlistEntries: many(waitlist),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const courseRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
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

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
}).extend({
  homeCoursesLimit: z.number().int().min(1).max(50),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
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
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;

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

// Course Information Forms - for post-registration student forms
export const courseInformationForms = pgTable("course_information_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courseInformationFormFields = pgTable("course_information_form_fields", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: uuid("form_id").notNull().references(() => courseInformationForms.id, { onDelete: 'cascade' }),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // text, email, phone, select, checkbox, textarea, date
  label: varchar("label", { length: 255 }).notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  options: jsonb("options"), // JSON object for select/radio options
  validation: jsonb("validation"), // JSON object for validation rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentFormResponses = pgTable("student_form_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  formId: uuid("form_id").notNull().references(() => courseInformationForms.id, { onDelete: 'cascade' }),
  fieldId: uuid("field_id").notNull().references(() => courseInformationFormFields.id, { onDelete: 'cascade' }),
  response: text("response"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [{
  uniqueEnrollmentField: sql`UNIQUE(${table.enrollmentId}, ${table.fieldId})`
}]);

// Relations for course information forms
export const courseInformationFormsRelations = relations(courseInformationForms, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseInformationForms.courseId],
    references: [courses.id],
  }),
  fields: many(courseInformationFormFields),
  responses: many(studentFormResponses),
}));

export const courseInformationFormFieldsRelations = relations(courseInformationFormFields, ({ one, many }) => ({
  form: one(courseInformationForms, {
    fields: [courseInformationFormFields.formId],
    references: [courseInformationForms.id],
  }),
  responses: many(studentFormResponses),
}));

export const studentFormResponsesRelations = relations(studentFormResponses, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [studentFormResponses.enrollmentId],
    references: [enrollments.id],
  }),
  form: one(courseInformationForms, {
    fields: [studentFormResponses.formId],
    references: [courseInformationForms.id],
  }),
  field: one(courseInformationFormFields, {
    fields: [studentFormResponses.fieldId],
    references: [courseInformationFormFields.id],
  }),
}));

// Coupon/Promo Code Management
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' or 'fixed'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }),
  maxUsageTotal: integer("max_usage_total"), // null = unlimited
  maxUsagePerUser: integer("max_usage_per_user").notNull().default(1),
  currentUsageCount: integer("current_usage_count").notNull().default(0),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  // Course restrictions (null = applies to all courses)
  applicableCourseIds: text("applicable_course_ids").array(), // Array of course IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const couponUsage = pgTable("coupon_usage", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => [
  // Ensure a user can only use a coupon once per enrollment
  sql`UNIQUE(${table.couponId}, ${table.userId}, ${table.enrollmentId})`
]);

// Relations for coupons
export const couponRelations = relations(coupons, ({ one, many }) => ({
  creator: one(users, {
    fields: [coupons.createdBy],
    references: [users.id],
  }),
  usage: many(couponUsage),
}));

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsage.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponUsage.userId],
    references: [users.id],
  }),
  enrollment: one(enrollments, {
    fields: [couponUsage.enrollmentId],
    references: [enrollments.id],
  }),
}));

// Insert schemas for course information forms
export const insertCourseInformationFormSchema = createInsertSchema(courseInformationForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseInformationFormFieldSchema = createInsertSchema(courseInformationFormFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentFormResponseSchema = createInsertSchema(studentFormResponses).omit({
  id: true,
  submittedAt: true,
});

// Insert schemas for coupons
export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  currentUsageCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  discountValue: z.number().positive(),
  maxUsageTotal: z.number().int().positive().optional(),
  maxUsagePerUser: z.number().int().positive().min(1),
  minimumOrderAmount: z.number().positive().optional(),
});

export const insertCouponUsageSchema = createInsertSchema(couponUsage).omit({
  id: true,
  usedAt: true,
});

// Types for course information forms
export type InsertCourseInformationForm = z.infer<typeof insertCourseInformationFormSchema>;
export type CourseInformationForm = typeof courseInformationForms.$inferSelect;
export type InsertCourseInformationFormField = z.infer<typeof insertCourseInformationFormFieldSchema>;
export type CourseInformationFormField = typeof courseInformationFormFields.$inferSelect;
export type InsertStudentFormResponse = z.infer<typeof insertStudentFormResponseSchema>;
export type StudentFormResponse = typeof studentFormResponses.$inferSelect;

// Extended types for course information forms
export type CourseInformationFormWithFields = CourseInformationForm & {
  fields: CourseInformationFormField[];
  course: Course;
};

export type StudentFormResponseWithDetails = StudentFormResponse & {
  field: CourseInformationFormField;
  form: CourseInformationForm;
  enrollment: EnrollmentWithDetails;
};

export type FormFieldType = 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea' | 'date' | 'number';

// Types for coupons
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
export type CouponUsage = typeof couponUsage.$inferSelect;

// Extended types for coupons
export type CouponWithUsage = Coupon & {
  usage: CouponUsage[];
  creator: User;
};

export type CouponUsageWithDetails = CouponUsage & {
  coupon: Coupon;
  user: User;
  enrollment: EnrollmentWithDetails;
};

export type DiscountType = 'percentage' | 'fixed';
