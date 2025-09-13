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
  studentId: varchar("student_id").references(() => users.id), // Nullable for draft enrollments
  courseId: uuid("course_id").notNull().references(() => courses.id),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  status: varchar("status").notNull().default('initiated'), // 'initiated', 'pending', 'confirmed', 'completed', 'cancelled'
  paymentStatus: varchar("payment_status").notNull().default('pending'), // 'pending', 'paid', 'failed'
  paymentOption: varchar("payment_option").notNull().default('full'), // 'full' or 'deposit'
  paymentIntentId: varchar("payment_intent_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // For tracking Stripe PI
  promoCodeApplied: varchar("promo_code_applied"), // Store applied promo code
  studentInfo: jsonb("student_info"), // Store student data for draft enrollments
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

// Promo Codes table for discount/coupon functionality
export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Discount configuration
  type: varchar("type", { length: 20 }).notNull(), // 'PERCENT' or 'FIXED_AMOUNT'
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Percentage or dollar amount
  
  // Scope configuration
  scopeType: varchar("scope_type", { length: 20 }).notNull().default('GLOBAL'), // 'GLOBAL', 'COURSES', 'CATEGORIES'
  scopeCourseIds: text("scope_course_ids").array(), // Array of course IDs when scoped to specific courses
  scopeCategoryIds: text("scope_category_ids").array(), // Array of category IDs when scoped to categories
  exclusionCourseIds: text("exclusion_course_ids").array(), // Courses to exclude from discount
  exclusionCategoryIds: text("exclusion_category_ids").array(), // Categories to exclude from discount
  
  // Eligibility criteria
  minCartSubtotal: decimal("min_cart_subtotal", { precision: 10, scale: 2 }),
  firstPurchaseOnly: boolean("first_purchase_only").notNull().default(false),
  newCustomersOnly: boolean("new_customers_only").notNull().default(false),
  allowedUserIds: text("allowed_user_ids").array(), // Specific users who can use this code
  deniedUserIds: text("denied_user_ids").array(), // Users who cannot use this code
  
  // Usage limits
  maxTotalUses: integer("max_total_uses"), // null = unlimited
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  currentUseCount: integer("current_use_count").notNull().default(0),
  
  // Time constraints
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  validDaysOfWeek: varchar("valid_days_of_week", { length: 20 }), // Comma-separated: '1,2,3,4,5' for Mon-Fri
  validTimeStart: varchar("valid_time_start", { length: 8 }), // HH:MM:SS format
  validTimeEnd: varchar("valid_time_end", { length: 8 }), // HH:MM:SS format
  
  // Stacking and application rules
  stackingPolicy: varchar("stacking_policy", { length: 20 }).notNull().default('EXCLUSIVE'), // 'EXCLUSIVE', 'STACKABLE'
  applyToTax: boolean("apply_to_tax").notNull().default(false),
  applyToShipping: boolean("apply_to_shipping").notNull().default(false),
  
  // Status management
  status: varchar("status", { length: 20 }).notNull().default('ACTIVE'), // 'ACTIVE', 'SCHEDULED', 'PAUSED', 'EXPIRED'
  
  // Audit fields
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promo Code Redemptions table to track usage and enforce limits
export const promoCodeRedemptions = pgTable("promo_code_redemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: uuid("promo_code_id").notNull().references(() => promoCodes.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  
  // Redemption details
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment integration
  paymentIntentId: varchar("payment_intent_id"),
  stripeMetadata: jsonb("stripe_metadata"), // Store additional Stripe metadata
  
  // Tracking
  ipAddress: varchar("ip_address", { length: 45 }), // Support IPv6
  userAgent: text("user_agent"),
  redemptionSource: varchar("redemption_source", { length: 50 }).default('CHECKOUT'), // 'CHECKOUT', 'ADMIN', etc.
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_promo_redemptions_code_user").on(table.promoCodeId, table.userId),
  index("idx_promo_redemptions_enrollment").on(table.enrollmentId),
]);

// Relations for promo codes
export const promoCodeRelations = relations(promoCodes, ({ one, many }) => ({
  creator: one(users, {
    fields: [promoCodes.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [promoCodes.updatedBy],
    references: [users.id],
  }),
  redemptions: many(promoCodeRedemptions),
}));

export const promoCodeRedemptionRelations = relations(promoCodeRedemptions, ({ one }) => ({
  promoCode: one(promoCodes, {
    fields: [promoCodeRedemptions.promoCodeId],
    references: [promoCodes.id],
  }),
  user: one(users, {
    fields: [promoCodeRedemptions.userId],
    references: [users.id],
  }),
  enrollment: one(enrollments, {
    fields: [promoCodeRedemptions.enrollmentId],
    references: [enrollments.id],
  }),
}));

// Insert schemas for promo codes
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentUseCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  value: z.number().positive("Discount value must be positive"),
  type: z.enum(['PERCENT', 'FIXED_AMOUNT']),
  scopeType: z.enum(['GLOBAL', 'COURSES', 'CATEGORIES']),
  stackingPolicy: z.enum(['EXCLUSIVE', 'STACKABLE']),
  status: z.enum(['ACTIVE', 'SCHEDULED', 'PAUSED', 'EXPIRED']),
  maxTotalUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  minCartSubtotal: z.number().positive().optional(),
});

export const insertPromoCodeRedemptionSchema = createInsertSchema(promoCodeRedemptions).omit({
  id: true,
  createdAt: true,
});

// Types for promo codes
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCodeRedemption = z.infer<typeof insertPromoCodeRedemptionSchema>;
export type PromoCodeRedemption = typeof promoCodeRedemptions.$inferSelect;

// Extended types for promo codes
export type PromoCodeWithDetails = PromoCode & {
  creator: User;
  updater?: User;
  redemptions: PromoCodeRedemptionWithDetails[];
  redemptionCount: number;
};

export type PromoCodeRedemptionWithDetails = PromoCodeRedemption & {
  promoCode: PromoCode;
  user: User;
  enrollment?: EnrollmentWithDetails;
};

// Promo code validation result type
export type PromoCodeValidationResult = {
  isValid: boolean;
  code?: PromoCode;
  discountAmount?: number;
  finalAmount?: number;
  error?: string;
  errorCode?: 'EXPIRED' | 'NOT_FOUND' | 'USAGE_LIMIT_REACHED' | 'USER_LIMIT_REACHED' | 'MIN_AMOUNT_NOT_MET' | 'NOT_ELIGIBLE' | 'SCOPE_MISMATCH' | 'TIME_RESTRICTION';
};

// Promo code types for better type safety
export type PromoCodeType = 'PERCENT' | 'FIXED_AMOUNT';
export type PromoCodeScopeType = 'GLOBAL' | 'COURSES' | 'CATEGORIES';
export type PromoCodeStackingPolicy = 'EXCLUSIVE' | 'STACKABLE';
export type PromoCodeStatus = 'ACTIVE' | 'SCHEDULED' | 'PAUSED' | 'EXPIRED';
