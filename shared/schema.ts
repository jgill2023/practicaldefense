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
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User status enum for account approval workflow
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "suspended", "rejected"]);

// User role enum
export const userRoleEnum = pgEnum("user_role", ["student", "instructor", "admin", "superadmin"]);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  // Password authentication fields
  passwordHash: varchar("password_hash", { length: 255 }),
  // Email verification fields
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  // Password reset fields
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  // Profile fields
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  preferredName: varchar("preferred_name"), // Nickname
  phone: varchar("phone", { length: 20 }),
  streetAddress: varchar("street_address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }), // State abbreviation (e.g., "NM", "TX")
  zipCode: varchar("zip_code", { length: 10 }), // ZIP+4 format
  dateOfBirth: timestamp("date_of_birth"),
  profileImageUrl: varchar("profile_image_url"),
  concealedCarryLicenseExpiration: timestamp("concealed_carry_license_expiration"),
  concealedCarryLicenseIssued: timestamp("concealed_carry_license_issued"),
  // Preferred contact methods (stored as JSON array)
  preferredContactMethods: text("preferred_contact_methods").array(), // ['text', 'email', 'phone']
  // Emergency contact information
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  // Email reminder preferences
  licenseExpirationReminderDays: integer("license_expiration_reminder_days").default(60), // 30, 60, or 90 days
  enableLicenseExpirationReminder: boolean("enable_license_expiration_reminder").default(true),
  // 2-year refresher reminder (24 months after license issued date)
  refresherReminderDays: integer("refresher_reminder_days").default(60), // 30 or 60 days
  enableRefresherReminder: boolean("enable_refresher_reminder").default(true),
  // SMS consent and notification preferences
  smsConsent: boolean("sms_consent").notNull().default(true), // Tracks whether user consented to SMS via Terms of Service
  enableSmsNotifications: boolean("enable_sms_notifications").default(true), // Master SMS toggle
  enableSmsReminders: boolean("enable_sms_reminders").default(true), // SMS for course/license reminders
  enableSmsPaymentNotices: boolean("enable_sms_payment_notices").default(false), // SMS for payment updates
  enableSmsAnnouncements: boolean("enable_sms_announcements").default(false), // SMS for general announcements
  // Instructor-specific settings
  replyToEmail: varchar("reply_to_email"), // Custom reply-to email for instructor communications
  role: userRoleEnum("role").notNull().default('student'), // 'student', 'instructor', 'admin', or 'superadmin'
  // Account status for approval workflow
  userStatus: userStatusEnum("user_status").notNull().default('active'), // 'pending', 'active', 'suspended', or 'rejected'
  statusUpdatedAt: timestamp("status_updated_at"),
  statusReason: text("status_reason"), // Reason for suspension or rejection
  // Stripe Connect fields for instructor payment routing
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }), // Stripe Connect account ID (e.g., "acct_xxxxx")
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false),
  stripeConnectDetailsSubmitted: boolean("stripe_connect_details_submitted").default(false),
  stripeConnectChargesEnabled: boolean("stripe_connect_charges_enabled").default(false),
  stripeConnectPayoutsEnabled: boolean("stripe_connect_payouts_enabled").default(false),
  stripeConnectCreatedAt: timestamp("stripe_connect_created_at"),
  timezone: varchar("timezone", { length: 100 }).default('America/Denver'), // Instructor's timezone for calendar operations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course status enum
export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "unpublished", "archived"]);

// Course categories table for better organization
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default('#3b82f6'), // Hex color for UI
  sortOrder: integer("sort_order"), // For custom ordering of categories
  isActive: boolean("is_active").notNull().default(true),
  showOnHomePage: boolean("show_on_home_page").notNull().default(true), // Control home page visibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  briefDescription: varchar("brief_description", { length: 500 }),
  abbreviation: varchar("abbreviation", { length: 10 }), // Course abbreviation (e.g., "CCW", "PDT")
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
  // Add-on options
  handgunRentalEnabled: boolean("handgun_rental_enabled").notNull().default(false),
  handgunRentalPrice: decimal("handgun_rental_price", { precision: 10, scale: 2 }).default("25.00"),
  // Sale pricing fields
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  saleStartDate: timestamp("sale_start_date"),
  saleEndDate: timestamp("sale_end_date"),
  saleEnabled: boolean("sale_enabled").notNull().default(false),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  status: courseStatusEnum("status").notNull().default("published"), // Course lifecycle status
  archivedAt: timestamp("archived_at"), // Archive timestamp
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  imageUrl: varchar("image_url"),
  showOnHomePage: boolean("show_on_home_page").notNull().default(true), // Control home page visibility
  sortOrder: integer("sort_order").default(0), // For display ordering on home page
  destinationUrl: varchar("destination_url", { length: 500 }), // External registration URL (e.g., for Hosted Courses)
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
  // Backend Details - for notifications and course logistics
  rangeName: varchar("range_name", { length: 255 }), // Specific range location
  classroomName: varchar("classroom_name", { length: 255 }), // Classroom location
  arrivalTime: varchar("arrival_time", { length: 8 }), // HH:MM:SS format
  departureTime: varchar("departure_time", { length: 8 }), // HH:MM:SS format
  dayOfWeek: varchar("day_of_week", { length: 20 }), // e.g., "Monday", "Tuesday"
  googleMapsLink: text("google_maps_link"), // Google Maps URL for location
  rangeLocationImageUrl: varchar("range_location_image_url"), // Image URL from object storage
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
  status: varchar("status").notNull().default('initiated'), // 'initiated', 'pending', 'confirmed', 'completed', 'cancelled', 'hold'
  paymentStatus: varchar("payment_status").notNull().default('pending'), // 'pending', 'paid', 'failed', 'refunded'
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
  refundRequested: boolean("refund_requested").default(false),
  refundRequestedAt: timestamp("refund_requested_at"),
  refundProcessed: boolean("refund_processed").default(false),
  refundProcessedAt: timestamp("refund_processed_at"),
  refundAmount: varchar("refund_amount"), // Amount refunded (formatted string, e.g., "$165.00")
  refundReason: text("refund_reason"), // Reason for refund provided by instructor
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }), // e.g., 0.0825 for 8.25%
  notes: text("notes"),
  // Handgun rental upsell
  handgunRentalAdded: boolean("handgun_rental_added").default(false),
  handgunRentalFee: decimal("handgun_rental_fee", { precision: 10, scale: 2 }),
  // Form submission tracking
  formSubmissionData: jsonb("form_submission_data"),
  formSubmittedAt: timestamp("form_submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course enrollment feedback - instructor feedback and student notes
export const courseEnrollmentFeedback = pgTable("course_enrollment_feedback", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: uuid("enrollment_id").notNull().unique().references(() => enrollments.id, { onDelete: "cascade" }),
  // Instructor feedback fields
  instructorFeedbackPositive: text("instructor_feedback_positive"), // Positive feedback
  instructorFeedbackOpportunities: text("instructor_feedback_opportunities"), // Areas of opportunity
  instructorFeedbackActionPlan: text("instructor_feedback_action_plan"), // Action plan
  instructorId: varchar("instructor_id").references(() => users.id), // Who provided the feedback
  instructorFeedbackDate: timestamp("instructor_feedback_date"), // When instructor last updated feedback
  // Student notes field
  studentNotes: text("student_notes"), // Student's own notes/reflections
  studentNotesDate: timestamp("student_notes_date"), // When student last updated notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Waitlist management for when events are full
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  position: integer("position").notNull(),
  status: varchar("status").notNull().default('waiting'), // 'waiting', 'invited', 'enrolled', 'removed'
  notes: text("notes"), // Student message or admin notes
  invitedAt: timestamp("invited_at"),
  enrolledAt: timestamp("enrolled_at"),
  removedAt: timestamp("removed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application settings for configurable UI preferences
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  homeCoursesLimit: integer("home_courses_limit").notNull().default(20),
  // Stripe configuration - tracks whether admin has completed Stripe setup
  stripeOnboarded: boolean("stripe_onboarded").notNull().default(false), // Set to true when admin confirms Stripe is configured
  stripeClientId: varchar("stripe_client_id", { length: 255 }), // Legacy - no longer used for Connect
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Encrypted Stripe credentials storage (separate table for security)
export const stripeCredentials = pgTable("stripe_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Encrypted secret key (AES-256-GCM)
  encryptedSecretKey: text("encrypted_secret_key").notNull(),
  secretKeyIv: text("secret_key_iv").notNull(), // Initialization vector
  secretKeyAuthTag: text("secret_key_auth_tag").notNull(), // Authentication tag for GCM
  // Masked display value (e.g., "sk_live_...abc123")
  secretKeyLast4: varchar("secret_key_last_4", { length: 8 }),
  secretKeyPrefix: varchar("secret_key_prefix", { length: 10 }), // "sk_live_" or "sk_test_"
  // Optional publishable key (stored encrypted)
  encryptedPublishableKey: text("encrypted_publishable_key"),
  publishableKeyIv: text("publishable_key_iv"),
  publishableKeyAuthTag: text("publishable_key_auth_tag"),
  publishableKeyLast4: varchar("publishable_key_last_4", { length: 8 }),
  publishableKeyPrefix: varchar("publishable_key_prefix", { length: 10 }), // "pk_live_" or "pk_test_"
  // Metadata
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// APPOINTMENT SCHEDULING SYSTEM (Calendly-style)
// ============================================

// Appointment types that instructors can offer (e.g., "One-on-One Consultation", "Range Assessment")
export const appointmentTypes = pgTable("appointment_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(), // e.g., 30, 60, 90 - base duration for fixed, or used as slot increment for variable
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Fixed price or price per hour when isVariableDuration is true
  requiresApproval: boolean("requires_approval").notNull().default(false), // Auto-confirm or require instructor approval
  bufferBefore: integer("buffer_before").notNull().default(0), // Minutes before appointment
  bufferAfter: integer("buffer_after").notNull().default(0), // Minutes after appointment
  maxPartySize: integer("max_party_size").notNull().default(1), // Number of people allowed
  color: varchar("color", { length: 7 }).default('#3b82f6'), // Hex color for calendar display
  // Variable duration fields
  isVariableDuration: boolean("is_variable_duration").notNull().default(false), // Enable variable-duration booking
  minimumDurationHours: integer("minimum_duration_hours"), // Minimum hours for variable duration (e.g., 2)
  maximumDurationHours: integer("maximum_duration_hours"), // Maximum hours for variable duration (e.g., 8)
  durationIncrementMinutes: integer("duration_increment_minutes"), // Increment in minutes (e.g., 60 for 1-hour increments)
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }), // Price per hour for variable duration bookings
  // Tiered pricing fields - e.g., $60 for first hour, $50 for each additional hour
  useTieredPricing: boolean("use_tiered_pricing").notNull().default(false), // Enable tiered pricing (first hour different rate)
  firstHourPrice: decimal("first_hour_price", { precision: 10, scale: 2 }), // Price for the first hour
  additionalHourPrice: decimal("additional_hour_price", { precision: 10, scale: 2 }), // Price for each additional hour
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0), // For display ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weekly availability templates (e.g., "Available Mon-Fri 9am-5pm")
export const instructorWeeklyTemplates = pgTable("instructor_weekly_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS format
  breaks: jsonb("breaks"), // Array of {startTime, endTime} for lunch/breaks
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Date-specific availability overrides (add/remove specific dates or date ranges)
export const instructorAvailabilityOverrides = pgTable("instructor_availability_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  overrideType: varchar("override_type", { length: 20 }).notNull(), // 'add', 'remove', 'blackout'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  startTime: varchar("start_time", { length: 8 }), // For 'add' type - HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }), // For 'add' type - HH:MM:SS format
  reason: varchar("reason", { length: 255 }), // e.g., "Vacation", "Conference", "Extra hours"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual appointment bookings
export const instructorAppointments = pgTable("instructor_appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentTypeId: uuid("appointment_type_id").notNull().references(() => appointmentTypes.id),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  studentId: varchar("student_id").references(() => users.id), // Nullable for draft appointments
  studentInfo: jsonb("student_info"), // Store student data for draft appointments
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status").notNull().default('pending'), // 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'
  partySize: integer("party_size").notNull().default(1),
  // Variable duration support
  actualDurationMinutes: integer("actual_duration_minutes"), // Actual duration selected by student (for variable-duration appointments)
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }), // Total price calculated (for variable-duration appointments)
  // Payment tracking
  paymentStatus: varchar("payment_status").notNull().default('pending'), // 'pending', 'paid', 'failed', 'refunded'
  paymentIntentId: varchar("payment_intent_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }), // e.g., 0.0825 for 8.25%
  // Status tracking
  bookedAt: timestamp("booked_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by"), // 'student', 'instructor', 'system'
  completedAt: timestamp("completed_at"),
  // Notes
  studentNotes: text("student_notes"), // Notes from student when booking
  instructorNotes: text("instructor_notes"), // Private notes for instructor
  // Form submission data (for appointment type forms)
  formSubmissionData: jsonb("form_submission_data"), // Stores form responses as key-value pairs {fieldId: response}
  formSubmittedAt: timestamp("form_submitted_at"),
  // Google Calendar integration
  googleEventId: varchar("google_event_id", { length: 255 }), // Google Calendar event ID for sync
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification templates for appointment events (customizable by instructor)
export const appointmentNotificationTemplates = pgTable("appointment_notification_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'booked', 'confirmed', 'rejected', 'cancelled', 'reminder'
  recipientType: varchar("recipient_type", { length: 20 }).notNull(), // 'student', 'instructor'
  channelType: varchar("channel_type", { length: 20 }).notNull(), // 'email', 'sms'
  subject: varchar("subject", { length: 255 }), // For email only
  body: text("body").notNull(), // Template with merge variables like {studentName}, {appointmentDate}, etc.
  // Available variables: {studentName}, {studentFirstName}, {studentLastName}, {studentEmail},
  // {appointmentType}, {appointmentDate}, {appointmentTime}, {appointmentDuration},
  // {instructorName}, {price}
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automatic reminder schedules (e.g., "Send reminder 24 hours before appointment")
export const appointmentReminderSchedules = pgTable("appointment_reminder_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  reminderName: varchar("reminder_name", { length: 100 }).notNull(), // e.g., "24 Hour Reminder"
  minutesBefore: integer("minutes_before").notNull(), // e.g., 1440 for 24 hours, 60 for 1 hour
  templateId: uuid("template_id").references(() => appointmentNotificationTemplates.id),
  sendEmail: boolean("send_email").notNull().default(true),
  sendSms: boolean("send_sms").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  waitlistEntries: many(waitlist),
  appointmentTypes: many(appointmentTypes),
  weeklyTemplates: many(instructorWeeklyTemplates),
  availabilityOverrides: many(instructorAvailabilityOverrides),
  appointmentsAsInstructor: many(instructorAppointments, { relationName: 'instructorAppointments' }),
  appointmentsAsStudent: many(instructorAppointments, { relationName: 'studentAppointments' }),
  appointmentNotificationTemplates: many(appointmentNotificationTemplates),
  appointmentReminderSchedules: many(appointmentReminderSchedules),
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
  forms: many(courseInformationForms),
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
  feedback: one(courseEnrollmentFeedback, {
    fields: [enrollments.id],
    references: [courseEnrollmentFeedback.enrollmentId],
  }),
}));

export const courseEnrollmentFeedbackRelations = relations(courseEnrollmentFeedback, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [courseEnrollmentFeedback.enrollmentId],
    references: [enrollments.id],
  }),
  instructor: one(users, {
    fields: [courseEnrollmentFeedback.instructorId],
    references: [users.id],
  }),
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  student: one(users, {
    fields: [waitlist.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [waitlist.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [waitlist.scheduleId],
    references: [courseSchedules.id],
  }),
}));

// Appointment system relations
export const appointmentTypeRelations = relations(appointmentTypes, ({ one, many }) => ({
  instructor: one(users, {
    fields: [appointmentTypes.instructorId],
    references: [users.id],
  }),
  appointments: many(instructorAppointments),
  forms: many(courseInformationForms),
}));

export const instructorWeeklyTemplateRelations = relations(instructorWeeklyTemplates, ({ one }) => ({
  instructor: one(users, {
    fields: [instructorWeeklyTemplates.instructorId],
    references: [users.id],
  }),
}));

export const instructorAvailabilityOverrideRelations = relations(instructorAvailabilityOverrides, ({ one }) => ({
  instructor: one(users, {
    fields: [instructorAvailabilityOverrides.instructorId],
    references: [users.id],
  }),
}));

export const instructorAppointmentRelations = relations(instructorAppointments, ({ one, many }) => ({
  appointmentType: one(appointmentTypes, {
    fields: [instructorAppointments.appointmentTypeId],
    references: [appointmentTypes.id],
  }),
  instructor: one(users, {
    fields: [instructorAppointments.instructorId],
    references: [users.id],
    relationName: 'instructorAppointments',
  }),
  student: one(users, {
    fields: [instructorAppointments.studentId],
    references: [users.id],
    relationName: 'studentAppointments',
  }),
  formResponses: many(studentFormResponses),
}));

export const appointmentNotificationTemplateRelations = relations(appointmentNotificationTemplates, ({ one, many }) => ({
  instructor: one(users, {
    fields: [appointmentNotificationTemplates.instructorId],
    references: [users.id],
  }),
  reminderSchedules: many(appointmentReminderSchedules),
}));

export const appointmentReminderScheduleRelations = relations(appointmentReminderSchedules, ({ one }) => ({
  instructor: one(users, {
    fields: [appointmentReminderSchedules.instructorId],
    references: [users.id],
  }),
  template: one(appointmentNotificationTemplates, {
    fields: [appointmentReminderSchedules.templateId],
    references: [appointmentNotificationTemplates.id],
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

export const insertCourseEnrollmentFeedbackSchema = createInsertSchema(courseEnrollmentFeedback).omit({
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
  stripeClientId: z.string().optional().nullable().refine(
    (val) => !val || val.startsWith('ca_'),
    { message: "Stripe Client ID must start with 'ca_'" }
  ),
});

export const insertStripeCredentialsSchema = createInsertSchema(stripeCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Appointment system insert schemas
export const insertAppointmentTypeSchema = createInsertSchema(appointmentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInstructorWeeklyTemplateSchema = createInsertSchema(instructorWeeklyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInstructorAvailabilityOverrideSchema = createInsertSchema(instructorAvailabilityOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInstructorAppointmentSchema = createInsertSchema(instructorAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentNotificationTemplateSchema = createInsertSchema(appointmentNotificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentReminderScheduleSchema = createInsertSchema(appointmentReminderSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type InsertCourseEnrollmentFeedback = z.infer<typeof insertCourseEnrollmentFeedbackSchema>;
export type CourseEnrollmentFeedback = typeof courseEnrollmentFeedback.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertStripeCredentials = z.infer<typeof insertStripeCredentialsSchema>;
export type StripeCredentials = typeof stripeCredentials.$inferSelect;

// Appointment system types
export type InsertAppointmentType = z.infer<typeof insertAppointmentTypeSchema>;
export type AppointmentType = typeof appointmentTypes.$inferSelect;
export type InsertInstructorWeeklyTemplate = z.infer<typeof insertInstructorWeeklyTemplateSchema>;
export type InstructorWeeklyTemplate = typeof instructorWeeklyTemplates.$inferSelect;
export type InsertInstructorAvailabilityOverride = z.infer<typeof insertInstructorAvailabilityOverrideSchema>;
export type InstructorAvailabilityOverride = typeof instructorAvailabilityOverrides.$inferSelect;
export type InsertInstructorAppointment = z.infer<typeof insertInstructorAppointmentSchema>;
export type InstructorAppointment = typeof instructorAppointments.$inferSelect;
export type InsertAppointmentNotificationTemplate = z.infer<typeof insertAppointmentNotificationTemplateSchema>;
export type AppointmentNotificationTemplate = typeof appointmentNotificationTemplates.$inferSelect;
export type InsertAppointmentReminderSchedule = z.infer<typeof insertAppointmentReminderScheduleSchema>;
export type AppointmentReminderSchedule = typeof appointmentReminderSchedules.$inferSelect;

// Extended appointment types with relations
export type AppointmentTypeWithDetails = AppointmentType & {
  instructor: User;
};

export type InstructorAppointmentWithDetails = InstructorAppointment & {
  appointmentType: AppointmentType;
  instructor: User;
  student?: User;
};

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
  student: User | null; // Nullable for draft enrollments
  feedback?: CourseEnrollmentFeedback | null; // Optional feedback from instructor and student
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
export type WaitlistStatus = 'waiting' | 'invited' | 'enrolled' | 'removed';

// Course Information Forms - for post-registration student forms
// Can be associated with either courses OR appointment types
export const courseInformationForms = pgTable("course_information_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  appointmentTypeId: uuid("appointment_type_id").references(() => appointmentTypes.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [{
  // Ensure either courseId or appointmentTypeId is set, but not both
  checkEitherCourseOrAppointment: sql`CHECK ((${table.courseId} IS NOT NULL AND ${table.appointmentTypeId} IS NULL) OR (${table.courseId} IS NULL AND ${table.appointmentTypeId} IS NOT NULL))`
}]);

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
  showWhenFieldId: uuid("show_when_field_id"), // Reference to another field in the same form
  showWhenValue: varchar("show_when_value", { length: 255 }), // Value that triggers visibility
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentFormResponses = pgTable("student_form_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id, { onDelete: 'cascade' }),
  appointmentId: uuid("appointment_id").references(() => instructorAppointments.id, { onDelete: 'cascade' }),
  formId: uuid("form_id").notNull().references(() => courseInformationForms.id, { onDelete: 'cascade' }),
  fieldId: uuid("field_id").notNull().references(() => courseInformationFormFields.id, { onDelete: 'cascade' }),
  response: text("response"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [{
  // Ensure either enrollmentId or appointmentId is set, but not both
  checkEitherEnrollmentOrAppointment: sql`CHECK ((${table.enrollmentId} IS NOT NULL AND ${table.appointmentId} IS NULL) OR (${table.enrollmentId} IS NULL AND ${table.appointmentId} IS NOT NULL))`,
  // Unique constraint for enrollment-field pairs
  uniqueEnrollmentField: sql`UNIQUE NULLS NOT DISTINCT(${table.enrollmentId}, ${table.fieldId})`,
  // Unique constraint for appointment-field pairs
  uniqueAppointmentField: sql`UNIQUE NULLS NOT DISTINCT(${table.appointmentId}, ${table.fieldId})`
}]);

// Relations for course information forms
export const courseInformationFormsRelations = relations(courseInformationForms, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseInformationForms.courseId],
    references: [courses.id],
  }),
  appointmentType: one(appointmentTypes, {
    fields: [courseInformationForms.appointmentTypeId],
    references: [appointmentTypes.id],
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
  appointment: one(instructorAppointments, {
    fields: [studentFormResponses.appointmentId],
    references: [instructorAppointments.id],
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
}).refine(
  (data) => (data.courseId && !data.appointmentTypeId) || (!data.courseId && data.appointmentTypeId),
  {
    message: "Must provide either courseId or appointmentTypeId, but not both",
  }
);

export const insertCourseInformationFormFieldSchema = createInsertSchema(courseInformationFormFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentFormResponseSchema = createInsertSchema(studentFormResponses).omit({
  id: true,
  submittedAt: true,
}).refine(
  (data) => (data.enrollmentId && !data.appointmentId) || (!data.enrollmentId && data.appointmentId),
  {
    message: "Must provide either enrollmentId or appointmentId, but not both",
  }
);

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
  course?: Course;
  appointmentType?: AppointmentType;
};

export type StudentFormResponseWithDetails = StudentFormResponse & {
  field: CourseInformationFormField;
  form: CourseInformationForm;
  enrollment: EnrollmentWithDetails;
};

export const formFieldTypeEnum = pgEnum('form_field_type', [
  'text',
  'email',
  'phone',
  'textarea',
  'select',
  'checkbox',
  'date',
  'number',
  'header',
  'body',
]);

export type FormFieldType = typeof formFieldTypeEnum.enumValues[number];

// Course Notifications table for users who want to be notified about upcoming courses
export const courseNotifications = pgTable("course_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Optional - null for non-logged-in users
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  courseType: varchar("course_type", { length: 255 }).notNull(), // e.g., "2-day defensive handgun"
  courseCategory: varchar("course_category", { length: 100 }), // e.g., "defensive handgun", "concealed carry"
  notificationSent: boolean("notification_sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  isActive: boolean("is_active").notNull().default(true), // Allow users to unsubscribe
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for course notifications
export const courseNotificationsRelations = relations(courseNotifications, ({ one }) => ({
  user: one(users, {
    fields: [courseNotifications.userId],
    references: [users.id],
  }),
}));

// Insert schema for course notifications
export const insertCourseNotificationSchema = createInsertSchema(courseNotifications).omit({
  id: true,
  notificationSent: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types for course notifications
export type InsertCourseNotification = z.infer<typeof insertCourseNotificationSchema>;
export type CourseNotification = typeof courseNotifications.$inferSelect;

export type CourseNotificationWithUser = CourseNotification & {
  user?: User;
};

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

// Notification Templates table for email and SMS templates
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // 'email' or 'sms'
  category: varchar("category", { length: 50 }).notNull(), // 'course_specific', 'payment_notice', 'announcement', 'welcome', 'certificate', 'reminder'
  subject: varchar("subject", { length: 500 }), // Only for email templates
  content: text("content").notNull(), // HTML for email, plain text for SMS
  replyToEmail: varchar("reply_to_email"), // Custom reply-to email for this template
  variables: text("variables").array(), // Available variables like {{student_name}}, {{course_name}}

  // Course associations
  courseId: uuid("course_id").references(() => courses.id), // null for global templates
  scheduleId: uuid("schedule_id").references(() => courseSchedules.id), // null for course-wide templates

  // Template settings
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // For custom ordering

  // Audit fields
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Schedules table for automatic notifications
export const notificationSchedules = pgTable("notification_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => notificationTemplates.id, { onDelete: 'cascade' }),

  // Trigger configuration
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(), // 'course_start', 'enrollment_created', 'enrollment_confirmed', 'payment_completed'
  triggerTiming: varchar("trigger_timing", { length: 20 }).notNull().default('before'), // 'before', 'after'
  delayDays: integer("delay_days").default(0), // Days before/after course start
  delayHours: integer("delay_hours").default(0), // Additional hours before/after

  // Scope configuration
  courseId: uuid("course_id").references(() => courses.id), // null for global schedules
  scheduleId: uuid("schedule_id").references(() => courseSchedules.id), // null for course-wide schedules

  // Settings
  isActive: boolean("is_active").notNull().default(true),
  sendEmail: boolean("send_email").notNull().default(true),
  sendSms: boolean("send_sms").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Logs table for tracking sent notifications
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").notNull().references(() => notificationTemplates.id),
  scheduleId: uuid("schedule_id").references(() => notificationSchedules.id), // null for manual sends

  // Recipient information
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  recipientPhone: varchar("recipient_phone", { length: 20 }),

  // Message details
  type: varchar("type", { length: 10 }).notNull(), // 'email' or 'sms'
  subject: varchar("subject", { length: 500 }), // Email subject (after variable substitution)
  content: text("content").notNull(), // Final message content (after variable substitution)
  variables: jsonb("variables"), // Variables used for substitution

  // Delivery tracking
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),

  // External service tracking
  externalId: varchar("external_id", { length: 255 }), // SendGrid message ID, Twilio SID, etc.
  externalStatus: varchar("external_status", { length: 50 }),

  // Context
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id), // Associated enrollment if applicable
  courseId: uuid("course_id").references(() => courses.id), // Associated course if applicable

  // Audit
  sentBy: varchar("sent_by").references(() => users.id), // null for automatic sends
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Relations for notification system
export const notificationTemplateRelations = relations(notificationTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [notificationTemplates.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [notificationTemplates.updatedBy],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [notificationTemplates.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [notificationTemplates.scheduleId],
    references: [courseSchedules.id],
  }),
  schedules: many(notificationSchedules),
  logs: many(notificationLogs),
}));

export const notificationScheduleRelations = relations(notificationSchedules, ({ one, many }) => ({
  template: one(notificationTemplates, {
    fields: [notificationSchedules.templateId],
    references: [notificationTemplates.id],
  }),
  course: one(courses, {
    fields: [notificationSchedules.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [notificationSchedules.scheduleId],
    references: [courseSchedules.id],
  }),
  logs: many(notificationLogs),
}));

export const notificationLogRelations = relations(notificationLogs, ({ one }) => ({
  template: one(notificationTemplates, {
    fields: [notificationLogs.templateId],
    references: [notificationTemplates.id],
  }),
  schedule: one(notificationSchedules, {
    fields: [notificationLogs.scheduleId],
    references: [notificationSchedules.id],
  }),
  recipient: one(users, {
    fields: [notificationLogs.recipientId],
    references: [users.id],
  }),
  sender: one(users, {
    fields: [notificationLogs.sentBy],
    references: [users.id],
  }),
  enrollment: one(enrollments, {
    fields: [notificationLogs.enrollmentId],
    references: [enrollments.id],
  }),
  course: one(courses, {
    fields: [notificationLogs.courseId],
    references: [courses.id],
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
  scopeType: z.enum(['GLOBAL', 'COURSES', 'CATEGORIES', 'APPOINTMENTS']),
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

// Insert schemas for notification system
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,  // Backend sets this from session user
  updatedBy: true,  // Backend sets this from session user
});

export const insertNotificationScheduleSchema = createInsertSchema(notificationSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  sentAt: true,
  createdAt: true,
});

// Types for promo codes
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCodeRedemption = z.infer<typeof insertPromoCodeRedemptionSchema>;
export type PromoCodeRedemption = typeof promoCodeRedemptions.$inferSelect;

// Types for notification system
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationSchedule = z.infer<typeof insertNotificationScheduleSchema>;
export type NotificationSchedule = typeof notificationSchedules.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// Extended types for notification system
export type NotificationTemplateWithDetails = NotificationTemplate & {
  creator: User;
  course?: Course;
  schedule?: CourseSchedule;
  schedules: NotificationSchedule[];
};

export type NotificationScheduleWithDetails = NotificationSchedule & {
  template: NotificationTemplate;
  course?: Course;
  schedule?: CourseSchedule;
};

export type NotificationLogWithDetails = NotificationLog & {
  template: NotificationTemplate;
  schedule?: NotificationSchedule;
  recipient: User;
  sender?: User;
  enrollment?: Enrollment;
  course?: Course;
};

// Waiver Management Tables
export const waiverTemplates = pgTable("waiver_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text HTML content
  version: integer("version").notNull().default(1),
  
  // Template type - 'fta' for FTA Release and Waiver, 'generic' for custom waivers
  type: varchar("type", { length: 20 }).notNull().default('generic'),

  // Scope configuration
  scope: varchar("scope", { length: 20 }).notNull().default('course'), // 'global', 'course', 'category'
  courseIds: text("course_ids").array(), // Array of course IDs when scope is 'course'
  categoryIds: text("category_ids").array(), // Array of category IDs when scope is 'category'

  // Waiver settings
  validityDays: integer("validity_days").default(365), // How long waiver is valid (null = forever)
  requiresGuardian: boolean("requires_guardian").notNull().default(false), // For minors
  isActive: boolean("is_active").notNull().default(true),
  forceReSign: boolean("force_re_sign").notNull().default(false), // Force re-sign on version update

  // Merge fields available for this template
  availableFields: text("available_fields").array().default(sql`ARRAY['studentName', 'courseName', 'date', 'instructorName', 'location']`),

  // Initial fields configuration - sections that require initials
  // Format: [{ id: string, label: string, description: string }]
  initialFields: jsonb("initial_fields"),

  // Audit fields
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const waiverInstances = pgTable("waiver_instances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: uuid("enrollment_id").notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  templateId: uuid("template_id").notNull().references(() => waiverTemplates.id, { onDelete: 'restrict' }),

  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'signed', 'expired', 'cancelled'
  signerType: varchar("signer_type", { length: 20 }).notNull().default('student'), // 'student', 'guardian'

  // Compliance tracking
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at"),
  expiresAt: timestamp("expires_at"),

  // File storage
  pdfUrl: varchar("pdf_url"), // URL to signed PDF
  renderedContent: text("rendered_content"), // HTML after merge field substitution

  // Audit trail
  auditTrail: jsonb("audit_trail"), // JSON array of events

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const waiverSignatures = pgTable("waiver_signatures", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: uuid("instance_id").notNull().references(() => waiverInstances.id, { onDelete: 'cascade' }),

  // Signer information
  signerName: varchar("signer_name", { length: 255 }).notNull(),
  signerEmail: varchar("signer_email", { length: 255 }).notNull(),
  signerRole: varchar("signer_role", { length: 20 }).notNull().default('student'), // 'student', 'guardian'

  // Signature data
  signatureData: text("signature_data").notNull(), // Base64 signature image
  signatureMethod: varchar("signature_method", { length: 20 }).notNull().default('canvas'), // 'canvas', 'typed', 'uploaded'

  // Consent checkboxes and acknowledgments
  consentCheckboxes: jsonb("consent_checkboxes"), // Array of checkbox confirmations
  acknowledgementsCompleted: boolean("acknowledgements_completed").notNull().default(false),

  // Compliance data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for waiver system
export const waiverTemplateRelations = relations(waiverTemplates, ({ one, many }) => ({
  creator: one(users, {
    fields: [waiverTemplates.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [waiverTemplates.updatedBy],
    references: [users.id],
  }),
  instances: many(waiverInstances),
}));

export const waiverInstanceRelations = relations(waiverInstances, ({ one, many }) => ({
  enrollment: one(enrollments, {
    fields: [waiverInstances.enrollmentId],
    references: [enrollments.id],
  }),
  template: one(waiverTemplates, {
    fields: [waiverInstances.templateId],
    references: [waiverTemplates.id],
  }),
  signatures: many(waiverSignatures),
}));

export const waiverSignatureRelations = relations(waiverSignatures, ({ one }) => ({
  instance: one(waiverInstances, {
    fields: [waiverSignatures.instanceId],
    references: [waiverInstances.id],
  }),
}));

// Insert schemas for waiver system
export const insertWaiverTemplateSchema = createInsertSchema(waiverTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWaiverInstanceSchema = createInsertSchema(waiverInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWaiverSignatureSchema = createInsertSchema(waiverSignatures).omit({
  id: true,
  createdAt: true,
});

// Types for waiver system
export type InsertWaiverTemplate = z.infer<typeof insertWaiverTemplateSchema>;
export type WaiverTemplate = typeof waiverTemplates.$inferSelect;
export type InsertWaiverInstance = z.infer<typeof insertWaiverInstanceSchema>;
export type WaiverInstance = typeof waiverInstances.$inferSelect;
export type InsertWaiverSignature = z.infer<typeof insertWaiverSignatureSchema>;
export type WaiverSignature = typeof waiverSignatures.$inferSelect;

// Extended types for waiver system
export type WaiverTemplateWithDetails = WaiverTemplate & {
  creator: User;
  updater?: User;
  instanceCount: number;
  signedCount: number;
};

export type WaiverInstanceWithDetails = WaiverInstance & {
  template: WaiverTemplate;
  enrollment: EnrollmentWithDetails;
  signatures: WaiverSignature[];
};

export type WaiverSignatureWithDetails = WaiverSignature & {
  instance: WaiverInstanceWithDetails;
};

// Prohibited words table for SHAFT-compliant content filtering
export const prohibitedWords = pgTable("prohibited_words", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  word: varchar("word", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'sex', 'hate', 'alcohol', 'firearms', 'tobacco', 'variations'
  isRegex: boolean("is_regex").default(false), // For pattern matching like l33t speak
  isActive: boolean("is_active").default(true),
  severity: varchar("severity", { length: 20 }).default('high'), // 'high', 'medium', 'low'
  description: text("description"), // Context for why this word is prohibited
  addedBy: varchar("added_by").references(() => users.id), // Super admin who added it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message audit log for SMS compliance tracking
export const messageAuditLog = pgTable("message_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  messageContent: text("message_content").notNull(), // Original message content
  intendedRecipients: text("intended_recipients").array(), // Phone numbers that were supposed to receive the message
  recipientCount: integer("recipient_count").notNull().default(0),
  messageType: varchar("message_type", { length: 50 }).notNull(), // 'course_reminder', 'payment_notice', 'announcement', etc.
  status: varchar("status", { length: 20 }).notNull(), // 'sent', 'blocked', 'failed'
  blockedReason: text("blocked_reason"), // If blocked, what prohibited content was found
  prohibitedWords: text("prohibited_words").array(), // Specific words that triggered the block
  twilioMessageSid: varchar("twilio_message_sid", { length: 255 }), // Twilio's message ID if sent
  deliveryStatus: varchar("delivery_status", { length: 50 }), // 'delivered', 'undelivered', 'failed', 'pending'
  errorMessage: text("error_message"), // Any error details
  attemptedAt: timestamp("attempted_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

// Communications table for tracking all emails and text messages
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // Communication type and direction
  type: varchar("type", { length: 10 }).notNull(), // 'email' or 'sms'
  direction: varchar("direction", { length: 10 }).notNull(), // 'outbound' or 'inbound'
  purpose: varchar("purpose", { length: 20 }), // 'educational', 'marketing', 'administrative', etc.

  // Participants
  fromAddress: varchar("from_address", { length: 255 }), // Email from address or SMS from number
  toAddress: varchar("to_address", { length: 255 }).notNull(), // Email to address or SMS to number

  // Message content
  subject: varchar("subject", { length: 500 }), // Email subject (null for SMS)
  content: text("content").notNull(), // Message body
  htmlContent: text("html_content"), // HTML version for emails

  // User associations
  userId: varchar("user_id").references(() => users.id), // Associated student/instructor
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id), // Related enrollment if applicable
  courseId: uuid("course_id").references(() => courses.id), // Related course if applicable

  // Status tracking
  isRead: boolean("is_read").notNull().default(false), // Has the message been read/viewed
  isFlagged: boolean("is_flagged").notNull().default(false), // Flagged for follow-up
  flagNote: text("flag_note"), // Optional note when flagged

  // Delivery tracking
  deliveryStatus: varchar("delivery_status", { length: 50 }).default('pending'), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  externalMessageId: varchar("external_message_id", { length: 255 }), // SendGrid message ID or Twilio SID
  errorMessage: text("error_message"), // Any delivery error details

  // Timestamps
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"), // When marked as read
  flaggedAt: timestamp("flagged_at"), // When flagged
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prohibited words insert schema
export const insertProhibitedWordSchema = createInsertSchema(prohibitedWords).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Message audit log insert schema
export const insertMessageAuditLogSchema = createInsertSchema(messageAuditLog).omit({
  id: true,
  attemptedAt: true,
  deliveredAt: true
});

// Communications insert schema
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  readAt: true,
  flaggedAt: true,
});

// Content filtering validation result type
export type ContentValidationResult = {
  isValid: boolean;
  violations: Array<{
    word: string;
    category: string;
    severity: string;
    matchType: 'exact' | 'variation' | 'regex';
  }>;
  sanitizedMessage?: string;
  blockedReason?: string;
};

// Types for the new tables
export type ProhibitedWord = typeof prohibitedWords.$inferSelect;
export type InsertProhibitedWord = z.infer<typeof insertProhibitedWordSchema>;
export type MessageAuditLog = typeof messageAuditLog.$inferSelect;
export type InsertMessageAuditLog = z.infer<typeof insertMessageAuditLogSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// SMS Lists - for managing broadcast messaging lists
export const smsLists = pgTable("sms_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  listType: varchar("list_type", { length: 50 }).notNull(), // 'custom' or 'course_schedule'
  scheduleId: uuid("schedule_id").references(() => courseSchedules.id).unique(), // For auto-generated course lists - unique to prevent duplicates
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  tags: text("tags").array(), // Custom tags for the list
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsListMembers = pgTable("sms_list_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: uuid("list_id").notNull().references(() => smsLists.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  addedBy: varchar("added_by").notNull().references(() => users.id), // Who added this member
  autoAdded: boolean("auto_added").default(false), // True if auto-added from enrollment
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const smsBroadcastMessages = pgTable("sms_broadcast_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: uuid("list_id").notNull().references(() => smsLists.id),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 255 }), // For display/tracking
  messageContent: text("message_content").notNull(), // Rich text content
  messageHtml: text("message_html"), // HTML version if rich text
  messagePlain: text("message_plain").notNull(), // Plain text version for SMS
  templateId: uuid("template_id"), // If loaded from template
  attachmentUrls: text("attachment_urls").array(), // URLs of attached files/images
  dynamicTags: jsonb("dynamic_tags"), // Tags used for personalization
  scheduledFor: timestamp("scheduled_for"), // For future sends
  status: varchar("status", { length: 50 }).notNull(), // 'draft', 'sending', 'sent', 'failed'
  totalRecipients: integer("total_recipients").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smsBroadcastDeliveries = pgTable("sms_broadcast_deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  broadcastId: uuid("broadcast_id").notNull().references(() => smsBroadcastMessages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  personalizedMessage: text("personalized_message").notNull(), // Message with replaced tags
  twilioMessageSid: varchar("twilio_message_sid", { length: 255 }), // Twilio's message ID
  status: varchar("status", { length: 50 }).notNull(), // 'pending', 'sent', 'delivered', 'failed', 'undelivered'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SMS Lists relations
export const smsListsRelations = relations(smsLists, ({ one, many }) => ({
  schedule: one(courseSchedules, {
    fields: [smsLists.scheduleId],
    references: [courseSchedules.id],
  }),
  instructor: one(users, {
    fields: [smsLists.instructorId],
    references: [users.id],
  }),
  members: many(smsListMembers),
  broadcasts: many(smsBroadcastMessages),
}));

export const smsListMembersRelations = relations(smsListMembers, ({ one }) => ({
  list: one(smsLists, {
    fields: [smsListMembers.listId],
    references: [smsLists.id],
  }),
  user: one(users, {
    fields: [smsListMembers.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [smsListMembers.addedBy],
    references: [users.id],
  }),
}));

export const smsBroadcastMessagesRelations = relations(smsBroadcastMessages, ({ one, many }) => ({
  list: one(smsLists, {
    fields: [smsBroadcastMessages.listId],
    references: [smsLists.id],
  }),
  instructor: one(users, {
    fields: [smsBroadcastMessages.instructorId],
    references: [users.id],
  }),
  deliveries: many(smsBroadcastDeliveries),
}));

export const smsBroadcastDeliveriesRelations = relations(smsBroadcastDeliveries, ({ one }) => ({
  broadcast: one(smsBroadcastMessages, {
    fields: [smsBroadcastDeliveries.broadcastId],
    references: [smsBroadcastMessages.id],
  }),
  user: one(users, {
    fields: [smsBroadcastDeliveries.userId],
    references: [users.id],
  }),
}));

// SMS Lists insert schemas
export const insertSmsListSchema = createInsertSchema(smsLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsListMemberSchema = createInsertSchema(smsListMembers).omit({
  id: true,
  createdAt: true,
});

export const insertSmsBroadcastMessageSchema = createInsertSchema(smsBroadcastMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledFor: z.union([z.date(), z.string().transform(str => str ? new Date(str) : null), z.null()]).optional(),
  sentAt: z.union([z.date(), z.string().transform(str => str ? new Date(str) : null), z.null()]).optional(),
});

export const insertSmsBroadcastDeliverySchema = createInsertSchema(smsBroadcastDeliveries).omit({
  id: true,
  createdAt: true,
});

// SMS Lists types
export type SmsList = typeof smsLists.$inferSelect;
export type InsertSmsList = z.infer<typeof insertSmsListSchema>;
export type SmsListMember = typeof smsListMembers.$inferSelect;
export type InsertSmsListMember = z.infer<typeof insertSmsListMemberSchema>;
export type SmsBroadcastMessage = typeof smsBroadcastMessages.$inferSelect;
export type InsertSmsBroadcastMessage = z.infer<typeof insertSmsBroadcastMessageSchema>;
export type SmsBroadcastDelivery = typeof smsBroadcastDeliveries.$inferSelect;
export type InsertSmsBroadcastDelivery = z.infer<typeof insertSmsBroadcastDeliverySchema>;

// Extended types for SMS Lists with relations
export type SmsListWithDetails = SmsList & {
  schedule?: CourseSchedule;
  instructor: User;
  members: SmsListMemberWithUser[];
  broadcasts: SmsBroadcastMessage[];
};

export type SmsListMemberWithUser = SmsListMember & {
  user: User;
  addedByUser: User;
  list: SmsList;
};

export type SmsBroadcastMessageWithDetails = SmsBroadcastMessage & {
  list: SmsList;
  instructor: User;
  deliveries: SmsBroadcastDelivery[];
};

export type SmsBroadcastDeliveryWithDetails = SmsBroadcastDelivery & {
  broadcast: SmsBroadcastMessage;
  user: User;
};

// SMS broadcast status types
export type SmsBroadcastStatus = 'draft' | 'sending' | 'sent' | 'failed';
export type SmsDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
export type SmsListType = 'custom' | 'course_schedule';

// Waiver enums and types
export type WaiverScope = 'global' | 'course' | 'category';
export type WaiverStatus = 'pending' | 'signed' | 'expired' | 'cancelled';
export type SignerType = 'student' | 'guardian';
export type SignatureMethod = 'canvas' | 'typed' | 'uploaded';

// Notification enums and types
export type NotificationType = 'email' | 'sms';
export type NotificationCategory = 'course_specific' | 'payment_notice' | 'announcement' | 'welcome' | 'certificate' | 'reminder';
export type TriggerEvent = 'registration' | 'payment_received' | 'payment_failed' | 'course_approaching' | 'course_cancelled' | 'license_expiration';
export type TriggerTiming = 'before' | 'after';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

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

// Relations for communications
export const communicationsRelations = relations(communications, ({ one }) => ({
  user: one(users, {
    fields: [communications.userId],
    references: [users.id],
  }),
  enrollment: one(enrollments, {
    fields: [communications.enrollmentId],
    references: [enrollments.id],
  }),
  course: one(courses, {
    fields: [communications.courseId],
    references: [courses.id],
  }),
}));

// Extended type for communications with relations
export type CommunicationWithDetails = Communication & {
  user?: User;
  enrollment?: EnrollmentWithDetails;
  course?: Course;
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

// Course registration API validation schemas
export const studentInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Valid email is required").max(255),
});

export const accountCreationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
}).optional();

export const initiateRegistrationSchema = z.object({
  scheduleId: z.string().uuid("Valid schedule ID is required"),
  paymentOption: z.enum(['full', 'deposit'], {
    errorMap: () => ({ message: "Payment option must be 'full' or 'deposit'" })
  }),
  promoCode: z.string().max(50).optional(),
  studentInfo: studentInfoSchema,
  accountCreation: accountCreationSchema,
});

export const paymentIntentRequestSchema = z.object({
  enrollmentId: z.string().uuid("Valid enrollment ID is required"),
  promoCode: z.string().max(50).optional(),
  handgunRentalAdded: z.boolean().optional(),
});

export const confirmEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid("Valid enrollment ID is required"),
  paymentIntentId: z.string().min(1, "Payment intent ID is required").max(255),
  studentInfo: studentInfoSchema.optional(),
  accountCreation: accountCreationSchema,
});

// Types for course registration API
export type StudentInfo = z.infer<typeof studentInfoSchema>;
export type AccountCreation = z.infer<typeof accountCreationSchema>;
export type InitiateRegistration = z.infer<typeof initiateRegistrationSchema>;
export type PaymentIntentRequest = z.infer<typeof paymentIntentRequestSchema>;
export type ConfirmEnrollment = z.infer<typeof confirmEnrollmentSchema>;

// E-COMMERCE TABLES

// Product categories for e-commerce
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  parentId: varchar("parent_id").references(() => productCategories.id),
  imageUrl: varchar("image_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table - main product catalog
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 500 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: varchar("category_id").references(() => productCategories.id),
  sku: varchar("sku", { length: 100 }).unique().notNull(),

  // Product type and fulfillment
  productType: varchar("product_type", { length: 20 }).notNull().default('physical'), // 'physical', 'digital', 'service'
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull().default('manual'), // 'download', 'manual'

  // Status and visibility
  status: varchar("status", { length: 20 }).default('draft'), // 'draft', 'active', 'inactive'
  featured: boolean("featured").default(false),
  sortOrder: integer("sort_order").default(0),

  // Sale pricing fields
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  saleStartDate: timestamp("sale_start_date"),
  saleEndDate: timestamp("sale_end_date"),
  saleEnabled: boolean("sale_enabled").notNull().default(false),

  // Media
  primaryImageUrl: varchar("primary_image_url"),
  imageUrls: text("image_urls").array(),

  // Organization
  tags: text("tags").array(),

  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product variants (sizes, colors, etc.)
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),

  // Variant attributes (size, color, etc.)
  attributes: jsonb("attributes"), // {size: "XL", color: "Blue", material: "Cotton"}

  // Inventory
  stockQuantity: integer("stock_quantity").default(0),
  weight: decimal("weight", { precision: 8, scale: 2 }),

  // Images
  imageUrl: varchar("image_url"),

  // Status
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopping cart for guest and logged-in users (supports both local products and Printify items)
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Null for guest users
  sessionId: varchar("session_id"), // For guest users
  
  // Local product reference (optional - null for Printify items)
  productId: varchar("product_id").references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id),
  
  // Printify product reference (optional - null for local items)
  printifyProductId: varchar("printify_product_id"),
  printifyVariantId: varchar("printify_variant_id"),
  
  // Display info (required for all items, but especially important for Printify items)
  productTitle: varchar("product_title", { length: 255 }),
  variantTitle: varchar("variant_title", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  
  // Common fields
  quantity: integer("quantity").notNull().default(1),
  customization: jsonb("customization"), // For personalized items
  priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(), // Price when added to cart
  
  // Item type indicator
  itemType: varchar("item_type", { length: 20 }).notNull().default('local'), // 'local' or 'printify'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// E-commerce orders
export const ecommerceOrders = pgTable("ecommerce_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).unique().notNull(),
  userId: varchar("user_id").references(() => users.id), // Null for guest orders

  // Customer information
  customerEmail: varchar("customer_email").notNull(),
  customerPhone: varchar("customer_phone"),
  customerFirstName: varchar("customer_first_name").notNull(),
  customerLastName: varchar("customer_last_name").notNull(),

  // Billing address
  billingAddress: jsonb("billing_address").notNull(), // {name, address1, address2, city, state, zip, country}

  // Shipping address
  shippingAddress: jsonb("shipping_address"), // Same structure as billing

  // Order totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).default('0'),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),

  // Payment information
  paymentStatus: varchar("payment_status").default('pending'), // 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'
  paymentMethod: varchar("payment_method"), // 'stripe', 'paypal', etc.
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),

  // Order status and fulfillment
  status: varchar("status").default('pending'), // 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  fulfillmentStatus: varchar("fulfillment_status").default('pending'), // 'pending', 'processing', 'fulfilled', 'partial'

  // Shipping information
  shippingCarrier: varchar("shipping_carrier"),
  trackingNumber: varchar("tracking_number"),
  trackingUrl: varchar("tracking_url"),

  // Applied discounts
  promoCodesApplied: text("promo_codes_applied").array(),

  // Order notes
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// E-commerce order items
export const ecommerceOrderItems = pgTable("ecommerce_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => ecommerceOrders.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id),

  // Item details at time of purchase (snapshot for historical accuracy)
  productName: varchar("product_name").notNull(),
  productSku: varchar("product_sku").notNull(),
  variantName: varchar("variant_name"),
  variantAttributes: jsonb("variant_attributes"),

  // Pricing and quantity
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),

  // Customization and fulfillment
  customization: jsonb("customization"), // Custom designs, text, etc.
  fulfillmentStatus: varchar("fulfillment_status").default('pending'), // 'pending', 'processing', 'fulfilled', 'failed'

  // Digital products
  downloadToken: varchar("download_token"), // For digital products
  downloadCount: integer("download_count").default(0),
  downloadExpiresAt: timestamp("download_expires_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// E-commerce relations
export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: "categoryParent",
  }),
  children: many(productCategories, {
    relationName: "categoryParent",
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  createdByUser: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [products.updatedBy],
    references: [users.id],
  }),
  variants: many(productVariants),
  cartItems: many(cartItems),
  orderItems: many(ecommerceOrderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(ecommerceOrderItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ one, many }) => ({
  user: one(users, {
    fields: [ecommerceOrders.userId],
    references: [users.id],
  }),
  items: many(ecommerceOrderItems),
}));

export const ecommerceOrderItemsRelations = relations(ecommerceOrderItems, ({ one }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceOrderItems.orderId],
    references: [ecommerceOrders.id],
  }),
  product: one(products, {
    fields: [ecommerceOrderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [ecommerceOrderItems.variantId],
    references: [productVariants.id],
  }),
}));

// E-commerce insert schemas
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().optional(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEcommerceOrderSchema = createInsertSchema(ecommerceOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
});

export const insertEcommerceOrderItemSchema = createInsertSchema(ecommerceOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// E-commerce types
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertEcommerceOrder = z.infer<typeof insertEcommerceOrderSchema>;
export type EcommerceOrder = typeof ecommerceOrders.$inferSelect;

export type InsertEcommerceOrderItem = z.infer<typeof insertEcommerceOrderItemSchema>;
export type EcommerceOrderItem = typeof ecommerceOrderItems.$inferSelect;

// Extended types with relations
export type ProductWithDetails = Product & {
  category?: ProductCategory;
  variants: ProductVariant[];
  createdByUser?: User;
  updatedByUser?: User;
};

export type ProductCategoryWithProducts = ProductCategory & {
  products: Product[];
  children: ProductCategory[];
  parent?: ProductCategory;
};

export type CartItemWithDetails = CartItem & {
  product?: Product;  // Optional for Printify items
  variant?: ProductVariant;
  user?: User;
};

export type EcommerceOrderWithDetails = EcommerceOrder & {
  items: EcommerceOrderItemWithDetails[];
  user?: User;
};

export type EcommerceOrderItemWithDetails = EcommerceOrderItem & {
  product: Product;
  variant?: ProductVariant;
  order: EcommerceOrder;
};

// E-commerce enums
export type ProductType = 'physical' | 'digital' | 'service';
export type FulfillmentType = 'download' | 'manual';
export type ProductStatus = 'draft' | 'active' | 'inactive';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfillmentStatus = 'pending' | 'processing' | 'fulfilled' | 'failed' | 'partial';

// Course notification signups table
export const courseNotificationSignups = pgTable("course_notification_signups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").notNull().references(() => courses.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  preferredChannel: varchar("preferred_channel", { length: 20 }).default('email'), // 'email', 'sms', 'both'
  createdAt: timestamp("created_at").defaultNow(),
});

// Course notification delivery logs table
export const courseNotificationDeliveryLogs = pgTable("course_notification_delivery_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  signupId: uuid("signup_id").notNull().references(() => courseNotificationSignups.id),
  scheduleId: uuid("schedule_id").notNull().references(() => courseSchedules.id),
  channel: varchar("channel", { length: 20 }).notNull(), // 'email' or 'sms'
  status: varchar("status", { length: 20 }).notNull(), // 'sent', 'failed', 'pending'
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Relations for notification signups
export const courseNotificationSignupsRelations = relations(courseNotificationSignups, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseNotificationSignups.courseId],
    references: [courses.id],
  }),
  deliveryLogs: many(courseNotificationDeliveryLogs),
}));

export const courseNotificationDeliveryLogsRelations = relations(courseNotificationDeliveryLogs, ({ one }) => ({
  signup: one(courseNotificationSignups, {
    fields: [courseNotificationDeliveryLogs.signupId],
    references: [courseNotificationSignups.id],
  }),
  schedule: one(courseSchedules, {
    fields: [courseNotificationDeliveryLogs.scheduleId],
    references: [courseSchedules.id],
  }),
}));

// Insert schemas
export const insertCourseNotificationSignupSchema = createInsertSchema(courseNotificationSignups).omit({
  id: true,
  createdAt: true,
});

export const insertCourseNotificationDeliveryLogSchema = createInsertSchema(courseNotificationDeliveryLogs).omit({
  id: true,
  sentAt: true,
});

// Types
export type InsertCourseNotificationSignup = z.infer<typeof insertCourseNotificationSignupSchema>;
export type CourseNotificationSignup = typeof courseNotificationSignups.$inferSelect;

export type InsertCourseNotificationDeliveryLog = z.infer<typeof insertCourseNotificationDeliveryLogSchema>;
export type CourseNotificationDeliveryLog = typeof courseNotificationDeliveryLogs.$inferSelect;

// Extended types with relations
export type CourseNotificationSignupWithDetails = CourseNotificationSignup & {
  course?: Course;
  deliveryLogs?: CourseNotificationDeliveryLog[];
};

// Notification enums
export type NotificationChannel = 'email' | 'sms' | 'both';
export type NotificationDeliveryStatus = 'sent' | 'failed' | 'pending';

// Product schema validation
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  shortDescription: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Price must be a valid non-negative number"),
  categoryId: z.string().uuid("Please select a category"),
  sku: z.string().min(1, "SKU is required"),
  productType: z.enum(["physical", "digital", "service"]).default("physical"),
  fulfillmentType: z.enum(["download", "manual"]).default("manual"),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
  featured: z.boolean().default(false),
  primaryImageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sortOrder: z.number().int().min(0).default(0),
});

// CREDIT SYSTEM TABLES

// Credit transaction type enum
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "purchase", 
  "usage", 
  "refund", 
  "adjustment", 
  "initial_grant",
  "admin_grant"
]);

// Instructor credits - tracks current balance for each instructor
export const instructorCredits = pgTable("instructor_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().unique().references(() => users.id),
  smsCredits: integer("sms_credits").notNull().default(0),
  emailCredits: integer("email_credits").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit packages - defines available packages for purchase
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  smsCredits: integer("sms_credits").notNull().default(0),
  emailCredits: integer("email_credits").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  isPopular: boolean("is_popular").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit transactions - audit trail for all credit activity
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  transactionType: creditTransactionTypeEnum("transaction_type").notNull(),
  smsCredits: integer("sms_credits").notNull().default(0),
  emailCredits: integer("email_credits").notNull().default(0),
  balanceAfterSms: integer("balance_after_sms").notNull(),
  balanceAfterEmail: integer("balance_after_email").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }), // e.g., 0.0825 for 8.25%
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  packageId: varchar("package_id").references(() => creditPackages.id),
  communicationId: uuid("communication_id").references(() => communications.id),
  grantedByUserId: varchar("granted_by_user_id").references(() => users.id), // For admin grants
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for credit system
export const instructorCreditsRelations = relations(instructorCredits, ({ one }) => ({
  instructor: one(users, {
    fields: [instructorCredits.instructorId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  instructor: one(users, {
    fields: [creditTransactions.instructorId],
    references: [users.id],
  }),
  package: one(creditPackages, {
    fields: [creditTransactions.packageId],
    references: [creditPackages.id],
  }),
  communication: one(communications, {
    fields: [creditTransactions.communicationId],
    references: [communications.id],
  }),
}));

// Insert schemas for credit system
export const insertInstructorCreditsSchema = createInsertSchema(instructorCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

// Types for credit system
export type InsertInstructorCredits = z.infer<typeof insertInstructorCreditsSchema>;
export type InstructorCredits = typeof instructorCredits.$inferSelect;

export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Extended types with relations
export type InstructorCreditsWithDetails = InstructorCredits & {
  instructor?: User;
};

export type CreditTransactionWithDetails = CreditTransaction & {
  instructor?: User;
  package?: CreditPackage;
  communication?: Communication;
};

// Credit transaction types
export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'adjustment' | 'initial_grant';

// ============================================
// MERCH STORE TABLES (Printify Integration)
// ============================================

// Merch order status enum
export const merchOrderStatusEnum = pgEnum("merch_order_status", [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded"
]);

// Discount type enum
export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed_amount",
  "free_shipping"
]);

// Merch discount codes table
export const merchDiscountCodes = pgTable("merch_discount_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(), // Percentage (0-100) or fixed amount
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }), // Minimum order to apply
  maxUsageCount: integer("max_usage_count"), // Null means unlimited
  currentUsageCount: integer("current_usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Merch orders table
export const merchOrders = pgTable("merch_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Customer info (can be guest or logged-in user)
  userId: varchar("user_id").references(() => users.id), // Null for guest checkout
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerFirstName: varchar("customer_first_name", { length: 100 }).notNull(),
  customerLastName: varchar("customer_last_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  // Shipping address
  shippingAddress1: varchar("shipping_address1", { length: 255 }).notNull(),
  shippingAddress2: varchar("shipping_address2", { length: 255 }),
  shippingCity: varchar("shipping_city", { length: 100 }).notNull(),
  shippingState: varchar("shipping_state", { length: 100 }).notNull(),
  shippingZip: varchar("shipping_zip", { length: 20 }).notNull(),
  shippingCountry: varchar("shipping_country", { length: 100 }).notNull().default('US'),
  // Order details
  status: merchOrderStatusEnum("status").notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default('0'),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  discountCodeId: uuid("discount_code_id").references(() => merchDiscountCodes.id),
  discountCodeUsed: varchar("discount_code_used", { length: 50 }),
  // Payment tracking
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripePaymentStatus: varchar("stripe_payment_status", { length: 50 }),
  // Printify tracking
  printifyOrderId: varchar("printify_order_id"),
  printifyStatus: varchar("printify_status", { length: 50 }),
  trackingNumber: varchar("tracking_number"),
  trackingUrl: text("tracking_url"),
  // Timestamps
  paidAt: timestamp("paid_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Merch order items table
export const merchOrderItems = pgTable("merch_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => merchOrders.id),
  printifyProductId: varchar("printify_product_id", { length: 100 }).notNull(),
  printifyVariantId: varchar("printify_variant_id", { length: 100 }).notNull(),
  productTitle: varchar("product_title", { length: 255 }).notNull(),
  variantTitle: varchar("variant_title", { length: 255 }), // e.g., "Large / Black"
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for merch orders
export const merchOrdersRelations = relations(merchOrders, ({ one, many }) => ({
  user: one(users, {
    fields: [merchOrders.userId],
    references: [users.id],
  }),
  discountCode: one(merchDiscountCodes, {
    fields: [merchOrders.discountCodeId],
    references: [merchDiscountCodes.id],
  }),
  items: many(merchOrderItems),
}));

export const merchOrderItemsRelations = relations(merchOrderItems, ({ one }) => ({
  order: one(merchOrders, {
    fields: [merchOrderItems.orderId],
    references: [merchOrders.id],
  }),
}));

// Insert schemas for merch
export const insertMerchDiscountCodeSchema = createInsertSchema(merchDiscountCodes).omit({
  id: true,
  currentUsageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMerchOrderItemSchema = createInsertSchema(merchOrderItems).omit({
  id: true,
  createdAt: true,
});

// Types for merch
export type InsertMerchDiscountCode = z.infer<typeof insertMerchDiscountCodeSchema>;
export type MerchDiscountCode = typeof merchDiscountCodes.$inferSelect;

export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;
export type MerchOrder = typeof merchOrders.$inferSelect;

export type InsertMerchOrderItem = z.infer<typeof insertMerchOrderItemSchema>;
export type MerchOrderItem = typeof merchOrderItems.$inferSelect;

// Extended types with relations
export type MerchOrderWithItems = MerchOrder & {
  items: MerchOrderItem[];
  discountCode?: MerchDiscountCode;
};

// Cart item type (for frontend cart state)
export type CartItem = {
  printifyProductId: string;
  printifyVariantId: string;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
};

// ============================================
// GIFT CARD SYSTEM
// ============================================

// Gift card status enum
export const giftCardStatusEnum = pgEnum("gift_card_status", [
  "active",
  "partially_used",
  "redeemed",
  "expired",
  "voided"
]);

// Gift card delivery method enum
export const giftCardDeliveryMethodEnum = pgEnum("gift_card_delivery_method", [
  "email",
  "download"
]);

// Gift card delivery status enum
export const giftCardDeliveryStatusEnum = pgEnum("gift_card_delivery_status", [
  "pending",
  "sent",
  "failed"
]);

// Text position mapping type for gift card elements
export const textPositionSchema = z.object({
  x: z.number().min(0).max(100).default(50), // Percentage from left
  y: z.number().min(0).max(100).default(50), // Percentage from top
  fontSize: z.number().min(8).max(72).default(16), // Font size in pixels
  fontColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'), // Hex color
  fontWeight: z.enum(['normal', 'bold']).default('normal'),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
});

export type TextPosition = z.infer<typeof textPositionSchema>;

// Gift card themes table - visual styles for gift cards
export const giftCardThemes = pgTable("gift_card_themes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  previewImageUrl: varchar("preview_image_url", { length: 500 }),
  backgroundImageUrl: varchar("background_image_url", { length: 500 }),
  accentColor: varchar("accent_color", { length: 7 }).default('#3b82f6'), // Hex color
  fontFamily: varchar("font_family", { length: 100 }).default('Inter'),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  // Text position mappings for gift card elements
  recipientNamePosition: jsonb("recipient_name_position").$type<TextPosition>(),
  senderNamePosition: jsonb("sender_name_position").$type<TextPosition>(),
  amountPosition: jsonb("amount_position").$type<TextPosition>(),
  codePosition: jsonb("code_position").$type<TextPosition>(),
  messagePosition: jsonb("message_position").$type<TextPosition>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gift cards table - main gift card records
export const giftCards = pgTable("gift_cards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hashedCode: varchar("hashed_code", { length: 255 }).notNull(), // bcrypt hashed code
  last4: varchar("last_4", { length: 4 }).notNull(), // Last 4 characters for admin reference
  initialValue: decimal("initial_value", { precision: 10, scale: 2 }).notNull(),
  remainingBalance: decimal("remaining_balance", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('USD'),
  status: giftCardStatusEnum("status").notNull().default("active"),
  expirationDate: timestamp("expiration_date").notNull(),
  themeId: uuid("theme_id").references(() => giftCardThemes.id),
  deliveryMethod: giftCardDeliveryMethodEnum("delivery_method").notNull(),
  deliveryStatus: giftCardDeliveryStatusEnum("delivery_status").notNull().default("pending"),
  scheduledDeliveryDate: timestamp("scheduled_delivery_date"), // Optional scheduled delivery
  purchaserEmail: varchar("purchaser_email", { length: 255 }).notNull(),
  purchaserName: varchar("purchaser_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }), // Required for email delivery
  recipientName: varchar("recipient_name", { length: 255 }),
  personalMessage: text("personal_message"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  orderId: varchar("order_id").references(() => ecommerceOrders.id), // Link to e-commerce order if applicable
  isManuallyIssued: boolean("is_manually_issued").notNull().default(false), // Admin-issued cards
  issuedByUserId: varchar("issued_by_user_id").references(() => users.id), // Admin who issued
  voidedAt: timestamp("voided_at"),
  voidedByUserId: varchar("voided_by_user_id").references(() => users.id),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gift card redemptions table - tracks each use of a gift card
export const giftCardRedemptions = pgTable("gift_card_redemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  giftCardId: uuid("gift_card_id").notNull().references(() => giftCards.id),
  orderId: varchar("order_id").references(() => ecommerceOrders.id), // E-commerce order
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id), // Course enrollment
  appointmentId: uuid("appointment_id").references(() => instructorAppointments.id), // Appointment booking
  amountApplied: decimal("amount_applied", { precision: 10, scale: 2 }).notNull(),
  remainingBalanceAfter: decimal("remaining_balance_after", { precision: 10, scale: 2 }).notNull(),
  userId: varchar("user_id").references(() => users.id), // User who redeemed
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// Gift card balance adjustments for admin audit trail
export const giftCardBalanceAdjustments = pgTable("gift_card_balance_adjustments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  giftCardId: uuid("gift_card_id").notNull().references(() => giftCards.id),
  previousBalance: decimal("previous_balance", { precision: 10, scale: 2 }).notNull(),
  newBalance: decimal("new_balance", { precision: 10, scale: 2 }).notNull(),
  adjustmentAmount: decimal("adjustment_amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  adjustedByUserId: varchar("adjusted_by_user_id").notNull().references(() => users.id),
  adjustedAt: timestamp("adjusted_at").defaultNow(),
});

// Gift card validation attempts for rate limiting and security
export const giftCardValidationAttempts = pgTable("gift_card_validation_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address", { length: 45 }),
  userId: varchar("user_id").references(() => users.id),
  attemptedCode: varchar("attempted_code", { length: 50 }), // Partial code for logging (not full)
  wasSuccessful: boolean("was_successful").notNull(),
  failureReason: varchar("failure_reason", { length: 100 }),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Relations for gift cards
export const giftCardThemesRelations = relations(giftCardThemes, ({ many }) => ({
  giftCards: many(giftCards),
}));

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  theme: one(giftCardThemes, {
    fields: [giftCards.themeId],
    references: [giftCardThemes.id],
  }),
  order: one(ecommerceOrders, {
    fields: [giftCards.orderId],
    references: [ecommerceOrders.id],
  }),
  issuedBy: one(users, {
    fields: [giftCards.issuedByUserId],
    references: [users.id],
    relationName: "giftCardIssuedBy",
  }),
  voidedBy: one(users, {
    fields: [giftCards.voidedByUserId],
    references: [users.id],
    relationName: "giftCardVoidedBy",
  }),
  redemptions: many(giftCardRedemptions),
  balanceAdjustments: many(giftCardBalanceAdjustments),
}));

export const giftCardRedemptionsRelations = relations(giftCardRedemptions, ({ one }) => ({
  giftCard: one(giftCards, {
    fields: [giftCardRedemptions.giftCardId],
    references: [giftCards.id],
  }),
  order: one(ecommerceOrders, {
    fields: [giftCardRedemptions.orderId],
    references: [ecommerceOrders.id],
  }),
  enrollment: one(enrollments, {
    fields: [giftCardRedemptions.enrollmentId],
    references: [enrollments.id],
  }),
  appointment: one(instructorAppointments, {
    fields: [giftCardRedemptions.appointmentId],
    references: [instructorAppointments.id],
  }),
  user: one(users, {
    fields: [giftCardRedemptions.userId],
    references: [users.id],
  }),
}));

export const giftCardBalanceAdjustmentsRelations = relations(giftCardBalanceAdjustments, ({ one }) => ({
  giftCard: one(giftCards, {
    fields: [giftCardBalanceAdjustments.giftCardId],
    references: [giftCards.id],
  }),
  adjustedBy: one(users, {
    fields: [giftCardBalanceAdjustments.adjustedByUserId],
    references: [users.id],
  }),
}));

// Insert schemas for gift cards
export const insertGiftCardThemeSchema = createInsertSchema(giftCardThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGiftCardRedemptionSchema = createInsertSchema(giftCardRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export const insertGiftCardBalanceAdjustmentSchema = createInsertSchema(giftCardBalanceAdjustments).omit({
  id: true,
  adjustedAt: true,
});

export const insertGiftCardValidationAttemptSchema = createInsertSchema(giftCardValidationAttempts).omit({
  id: true,
  attemptedAt: true,
});

// Types for gift cards
export type InsertGiftCardTheme = z.infer<typeof insertGiftCardThemeSchema>;
export type GiftCardTheme = typeof giftCardThemes.$inferSelect;

export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type GiftCard = typeof giftCards.$inferSelect;

export type InsertGiftCardRedemption = z.infer<typeof insertGiftCardRedemptionSchema>;
export type GiftCardRedemption = typeof giftCardRedemptions.$inferSelect;

export type InsertGiftCardBalanceAdjustment = z.infer<typeof insertGiftCardBalanceAdjustmentSchema>;
export type GiftCardBalanceAdjustment = typeof giftCardBalanceAdjustments.$inferSelect;

export type InsertGiftCardValidationAttempt = z.infer<typeof insertGiftCardValidationAttemptSchema>;
export type GiftCardValidationAttempt = typeof giftCardValidationAttempts.$inferSelect;

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

// Instructor Google Credentials for OAuth token storage
export const instructorGoogleCredentials = pgTable("google_credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  primaryCalendarId: varchar("primary_calendar_id"),
  // Webhook subscription fields
  webhookResourceId: varchar("webhook_resource_id", { length: 255 }), // Google's resourceId for watch verification
  webhookChannelId: varchar("webhook_channel_id", { length: 255 }), // Our channel ID for the subscription
  webhookExpiry: timestamp("webhook_expiry"), // When the watch subscription expires
  // Token health status
  syncStatus: varchar("sync_status", { length: 20 }).default('active'), // 'active', 'sync_error', 'revoked'
  lastSyncError: text("last_sync_error"), // Error message if sync failed
  lastSyncAt: timestamp("last_sync_at"), // Last successful token refresh
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for Google credentials
export const instructorGoogleCredentialsRelations = relations(instructorGoogleCredentials, ({ one }) => ({
  instructor: one(users, {
    fields: [instructorGoogleCredentials.instructorId],
    references: [users.id],
  }),
}));

// Insert schema
export const insertInstructorGoogleCredentialsSchema = createInsertSchema(instructorGoogleCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertInstructorGoogleCredentials = z.infer<typeof insertInstructorGoogleCredentialsSchema>;
export type InstructorGoogleCredentials = typeof instructorGoogleCredentials.$inferSelect;

// FTA Waiver Submission table for legally binding digital waivers
export const ftaWaiverSubmissions = pgTable("fta_waiver_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Student information
  studentName: varchar("student_name", { length: 255 }).notNull(),
  studentEmail: varchar("student_email", { length: 255 }).notNull(),
  // Activity being participated in
  activityName: varchar("activity_name", { length: 500 }).notNull(),
  // Section initials (3 required initial inputs)
  initialRiskAssumption: varchar("initial_risk_assumption", { length: 10 }).notNull(), // Section 1: Risk Assumption
  initialReleaseOfLiability: varchar("initial_release_of_liability", { length: 10 }).notNull(), // Section 2: Release of Liability
  initialJuryTrialWaiver: varchar("initial_jury_trial_waiver", { length: 10 }).notNull(), // Section 3: Waiver of Jury Trial
  // Signature data (base64 encoded image from signature canvas)
  signatureData: text("signature_data").notNull(),
  signatureType: varchar("signature_type", { length: 20 }).notNull().default('drawn'), // 'drawn' or 'typed'
  typedSignature: varchar("typed_signature", { length: 255 }), // For typed signatures
  // Printed name and address from form
  printedName: varchar("printed_name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  // Electronic consent
  electronicConsent: boolean("electronic_consent").notNull().default(false),
  // Full waiver text version (for legal record of what was signed)
  waiverTextVersion: text("waiver_text_version").notNull(),
  waiverVersion: varchar("waiver_version", { length: 50 }).notNull().default('2021-v1'),
  // Capture metadata
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv6 can be up to 45 chars
  browserUserAgent: text("browser_user_agent").notNull(),
  // Timestamps
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  emailSentAt: timestamp("email_sent_at"),
  // Optional link to enrollment if applicable
  enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for FTA Waiver Submissions
export const ftaWaiverSubmissionRelations = relations(ftaWaiverSubmissions, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [ftaWaiverSubmissions.enrollmentId],
    references: [enrollments.id],
  }),
}));

// Insert schema for FTA Waiver Submission
export const insertFtaWaiverSubmissionSchema = createInsertSchema(ftaWaiverSubmissions).omit({
  id: true,
  createdAt: true,
  signedAt: true,
  emailSentAt: true,
});

// Types for FTA Waiver Submission
export type InsertFtaWaiverSubmission = z.infer<typeof insertFtaWaiverSubmissionSchema>;
export type FtaWaiverSubmission = typeof ftaWaiverSubmissions.$inferSelect;

// Extended types with relations
export type GiftCardWithDetails = GiftCard & {
  theme?: GiftCardTheme;
  redemptions?: GiftCardRedemption[];
  balanceAdjustments?: GiftCardBalanceAdjustment[];
  issuedBy?: User;
  voidedBy?: User;
};

export type GiftCardRedemptionWithDetails = GiftCardRedemption & {
  giftCard?: GiftCard;
  user?: User;
};

// Gift card status type
export type GiftCardStatus = 'active' | 'partially_used' | 'redeemed' | 'expired' | 'voided';

// Gift card delivery method type
export type GiftCardDeliveryMethod = 'email' | 'download';

// Gift card delivery status type
export type GiftCardDeliveryStatus = 'pending' | 'sent' | 'failed';

// Gift card purchase request schema (for API validation)
export const giftCardPurchaseRequestSchema = z.object({
  amount: z.number().min(10).max(500),
  themeId: z.string().uuid(),
  deliveryMethod: z.enum(['email', 'download']),
  purchaserEmail: z.string().email(),
  purchaserName: z.string().min(1).max(255),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().min(1).max(255).optional(),
  personalMessage: z.string().max(500).optional(),
  scheduledDeliveryDate: z.string().datetime().optional(),
});

export type GiftCardPurchaseRequest = z.infer<typeof giftCardPurchaseRequestSchema>;

// Gift card validation result type
export type GiftCardValidationResult = {
  isValid: boolean;
  giftCard?: GiftCard;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'VOIDED' | 'NO_BALANCE' | 'RATE_LIMITED';
  errorMessage?: string;
  remainingBalance?: number;
};

// Student Feedback table - for instructor notes on students
export const studentFeedback = pgTable("student_feedback", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  instructorId: varchar("instructor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  feedbackType: varchar("feedback_type", { length: 50 }).notNull().default('general'), // general, performance, behavior, commendation
  isPrivate: boolean("is_private").notNull().default(false), // If true, only visible to admins/superadmins
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations for Student Feedback
export const studentFeedbackRelations = relations(studentFeedback, ({ one }) => ({
  student: one(users, {
    fields: [studentFeedback.studentId],
    references: [users.id],
    relationName: 'studentFeedback',
  }),
  instructor: one(users, {
    fields: [studentFeedback.instructorId],
    references: [users.id],
    relationName: 'instructorFeedback',
  }),
}));

// Insert schema for Student Feedback
export const insertStudentFeedbackSchema = createInsertSchema(studentFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for Student Feedback
export type InsertStudentFeedback = z.infer<typeof insertStudentFeedbackSchema>;
export type StudentFeedback = typeof studentFeedback.$inferSelect;

// Extended type with relations
export type StudentFeedbackWithDetails = StudentFeedback & {
  student?: User;
  instructor?: User;
};