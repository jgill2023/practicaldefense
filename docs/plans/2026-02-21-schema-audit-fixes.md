# Schema Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all identified database schema gaps — add missing indexes, new tables (adminActionLog, taxConfiguration, venues), soft delete columns, unique constraints, and deprecation comments.

**Architecture:** All changes are additive edits to `shared/schema.ts`. No column removals, no enum conversions. User runs `db:push` after all changes to sync to database.

**Tech Stack:** Drizzle ORM, PostgreSQL (Neon serverless), TypeScript, Zod

---

### Task 1: Add indexes to courses table

**Files:**
- Modify: `shared/schema.ts` — courses table definition (line ~113)

**Step 1: Add index function to courses table**

The courses table currently has no index function. Add one:

```typescript
export const courses = pgTable("courses", {
  // ... existing columns unchanged ...
}, (table) => [
  index("idx_courses_instructor_id").on(table.instructorId),
  index("idx_courses_status").on(table.status),
  index("idx_courses_deleted_at").on(table.deletedAt),
  index("idx_courses_show_on_home_page").on(table.showOnHomePage),
]);
```

**Step 2: Run type check**

Run: `cd "/Users/jeremygill/Documents/Practical Defense/practicaldefense" && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to courses table

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "schema: add indexes to courses table"
```

---

### Task 2: Add indexes to enrollments table

**Files:**
- Modify: `shared/schema.ts` — enrollments table definition (line ~205)

**Step 1: Add index function to enrollments table**

```typescript
export const enrollments = pgTable("enrollments", {
  // ... existing columns unchanged ...
}, (table) => [
  index("idx_enrollments_student_id").on(table.studentId),
  index("idx_enrollments_course_id").on(table.courseId),
  index("idx_enrollments_schedule_id").on(table.scheduleId),
  index("idx_enrollments_status").on(table.status),
  index("idx_enrollments_payment_status").on(table.paymentStatus),
]);
```

**Step 2: Run type check**

Run: `cd "/Users/jeremygill/Documents/Practical Defense/practicaldefense" && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "schema: add indexes to enrollments table"
```

---

### Task 3: Add indexes to courseSchedules table

**Files:**
- Modify: `shared/schema.ts` — courseSchedules table definition (line ~151)

**Step 1: Add index function to courseSchedules table**

```typescript
export const courseSchedules = pgTable("course_schedules", {
  // ... existing columns unchanged ...
}, (table) => [
  index("idx_course_schedules_course_id").on(table.courseId),
  index("idx_course_schedules_start_date").on(table.startDate),
  index("idx_course_schedules_deleted_at").on(table.deletedAt),
]);
```

**Step 2: Run type check**

Run: `cd "/Users/jeremygill/Documents/Practical Defense/practicaldefense" && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "schema: add indexes to courseSchedules table"
```

---

### Task 4: Add indexes to instructorAppointments table

**Files:**
- Modify: `shared/schema.ts` — instructorAppointments table definition (line ~368)

**Step 1: Add index function to instructorAppointments table**

```typescript
export const instructorAppointments = pgTable("instructor_appointments", {
  // ... existing columns unchanged ...
}, (table) => [
  index("idx_instructor_appointments_instructor_id").on(table.instructorId),
  index("idx_instructor_appointments_student_id").on(table.studentId),
  index("idx_instructor_appointments_status").on(table.status),
  index("idx_instructor_appointments_start_time").on(table.startTime),
]);
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add indexes to instructorAppointments table"`

---

### Task 5: Add indexes to communications, users, courseNotificationSignups, notificationLogs tables

**Files:**
- Modify: `shared/schema.ts` — four table definitions

**Step 1: Add index functions to all four tables**

**communications** (line ~1504):
```typescript
}, (table) => [
  index("idx_communications_user_id").on(table.userId),
  index("idx_communications_type").on(table.type),
  index("idx_communications_is_read").on(table.isRead),
]);
```

**users** (line ~36):
```typescript
}, (table) => [
  index("idx_users_role").on(table.role),
  index("idx_users_user_status").on(table.userStatus),
]);
```

**courseNotificationSignups** (line ~2253):
```typescript
}, (table) => [
  index("idx_course_notification_signups_course_id").on(table.courseId),
  index("idx_course_notification_signups_email").on(table.email),
]);
```

**notificationLogs** (line ~1072):
```typescript
}, (table) => [
  index("idx_notification_logs_recipient_id").on(table.recipientId),
  index("idx_notification_logs_status").on(table.status),
]);
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add indexes to communications, users, courseNotificationSignups, notificationLogs"`

---

### Task 6: Add indexes to giftCards, waitlist, merchOrders, ecommerceOrders, onlineCourseEnrollments

**Files:**
- Modify: `shared/schema.ts` — five table definitions

**Step 1: Add index functions**

**giftCards** (line ~2681):
```typescript
}, (table) => [
  index("idx_gift_cards_status").on(table.status),
  index("idx_gift_cards_hashed_code").on(table.hashedCode),
]);
```

**waitlist** (line ~260):
```typescript
}, (table) => [
  index("idx_waitlist_student_id").on(table.studentId),
  index("idx_waitlist_schedule_id").on(table.scheduleId),
]);
```

**merchOrders** (line ~2501):
```typescript
}, (table) => [
  index("idx_merch_orders_user_id").on(table.userId),
  index("idx_merch_orders_status").on(table.status),
]);
```

**ecommerceOrders** (line ~1987):
```typescript
}, (table) => [
  index("idx_ecommerce_orders_user_id").on(table.userId),
  index("idx_ecommerce_orders_status").on(table.status),
]);
```

**onlineCourseEnrollments** (line ~3053):
```typescript
}, (table) => [
  index("idx_online_course_enrollments_user_id").on(table.userId),
  index("idx_online_course_enrollments_status").on(table.status),
  index("idx_online_course_enrollments_email").on(table.email),
]);
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add indexes to giftCards, waitlist, merchOrders, ecommerceOrders, onlineCourseEnrollments"`

---

### Task 7: Add new columns (deletedAt, expiresAt, defaultTaxRate)

**Files:**
- Modify: `shared/schema.ts` — users, products, cartItems, appSettings tables

**Step 1: Add deletedAt to users table** (after updatedAt, line ~94)

```typescript
  deletedAt: timestamp("deleted_at"), // Soft delete — use instead of hard delete
```

**Step 2: Add deletedAt to products table** (after updatedAt, line ~1925)

```typescript
  deletedAt: timestamp("deleted_at"), // Soft delete — preserves order history references
```

**Step 3: Add expiresAt to cartItems table** (after updatedAt, line ~1983)

```typescript
  expiresAt: timestamp("expires_at"), // For abandoned cart cleanup
```

**Step 4: Add defaultTaxRate to appSettings table** (after stripeClientId, line ~281)

```typescript
  defaultTaxRate: decimal("default_tax_rate", { precision: 6, scale: 5 }).default("0.07875"), // NM GRT fallback rate
```

**Step 5: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add deletedAt, expiresAt, defaultTaxRate columns"`

---

### Task 8: Add adminActionLog table

**Files:**
- Modify: `shared/schema.ts` — add after blobAclPolicies section (end of file, line ~3143)

**Step 1: Add table, relations, insert schema, and types**

```typescript
// ============================================
// ADMIN AUDIT LOG
// ============================================

// Tracks all admin mutations for accountability
export const adminActionLog = pgTable("admin_action_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // 'user_role_change', 'user_delete', 'user_status_change', 'course_archive', 'promo_create', etc.
  targetTable: varchar("target_table", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_admin_action_log_admin_id").on(table.adminId),
  index("idx_admin_action_log_action").on(table.action),
  index("idx_admin_action_log_target").on(table.targetTable, table.targetId),
  index("idx_admin_action_log_created_at").on(table.createdAt),
]);

// Relations
export const adminActionLogRelations = relations(adminActionLog, ({ one }) => ({
  admin: one(users, {
    fields: [adminActionLog.adminId],
    references: [users.id],
  }),
}));

// Insert schema
export const insertAdminActionLogSchema = createInsertSchema(adminActionLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertAdminActionLog = z.infer<typeof insertAdminActionLogSchema>;
export type AdminActionLog = typeof adminActionLog.$inferSelect;

export type AdminActionLogWithDetails = AdminActionLog & {
  admin: User;
};
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add adminActionLog table for audit trail"`

---

### Task 9: Add taxConfiguration table

**Files:**
- Modify: `shared/schema.ts` — add after adminActionLog

**Step 1: Add table, insert schema, and types**

```typescript
// ============================================
// TAX CONFIGURATION
// ============================================

// Configurable tax rates — replaces hardcoded NM_GRT_RATE in routes.ts
export const taxConfiguration = pgTable("tax_configuration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "New Mexico GRT"
  state: varchar("state", { length: 2 }).notNull(), // State abbreviation
  rate: decimal("rate", { precision: 6, scale: 5 }).notNull(), // e.g., 0.07875 for 7.875%
  appliesTo: text("applies_to").array().default(sql`ARRAY['courses', 'appointments', 'credits']`), // What this rate applies to
  isDefault: boolean("is_default").notNull().default(false), // Fallback rate when no specific match
  isActive: boolean("is_active").notNull().default(true),
  effectiveDate: timestamp("effective_date"), // When this rate takes effect (null = immediately)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tax_configuration_state").on(table.state),
  index("idx_tax_configuration_is_active").on(table.isActive),
]);

// Insert schema
export const insertTaxConfigurationSchema = createInsertSchema(taxConfiguration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertTaxConfiguration = z.infer<typeof insertTaxConfigurationSchema>;
export type TaxConfiguration = typeof taxConfiguration.$inferSelect;
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add taxConfiguration table"`

---

### Task 10: Add venues table

**Files:**
- Modify: `shared/schema.ts` — add after taxConfiguration

**Step 1: Add table, insert schema, and types**

```typescript
// ============================================
// VENUES (Range/Classroom Locations)
// ============================================

// Normalized locations — replaces free-text fields in courseSchedules
export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'range', 'classroom', 'both'
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  googleMapsLink: text("google_maps_link"),
  locationImageUrl: varchar("location_image_url"),
  contactPhone: varchar("contact_phone", { length: 20 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema
export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venues.$inferSelect;
```

**Step 2: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add venues table for normalized locations"`

---

### Task 11: Add unique constraints and deprecation comments

**Files:**
- Modify: `shared/schema.ts` — courseNotificationSignups, smsListMembers, enrollments, instructorAppointments, courses

**Step 1: Add unique constraint to courseNotificationSignups** (line ~2253)

Add index function with unique constraint:
```typescript
}, (table) => [
  index("idx_course_notification_signups_course_id").on(table.courseId),
  index("idx_course_notification_signups_email").on(table.email),
  sql`UNIQUE(${table.courseId}, ${table.email})`,
]);
```

Note: This was already added in Task 5. Replace the index function to add the unique constraint:
```typescript
}, (table) => [
  index("idx_course_notification_signups_course_id").on(table.courseId),
  index("idx_course_notification_signups_email").on(table.email),
  sql`CONSTRAINT uq_course_notification_signups_course_email UNIQUE(course_id, email)`,
]);
```

**Step 2: Add unique constraint to smsListMembers** (line ~1603)

Add index function:
```typescript
}, (table) => [
  index("idx_sms_list_members_list_id").on(table.listId),
  sql`CONSTRAINT uq_sms_list_members_list_user UNIQUE(list_id, user_id)`,
]);
```

**Step 3: Add deprecation comments**

On `enrollments.paymentIntentId` (line ~213):
```typescript
  paymentIntentId: varchar("payment_intent_id"), // DEPRECATED: use stripePaymentIntentId instead
```

On `instructorAppointments.paymentIntentId` (line ~383):
```typescript
  paymentIntentId: varchar("payment_intent_id"), // DEPRECATED: use stripePaymentIntentId instead
```

On `courses.category` (line ~123):
```typescript
  category: varchar("category", { length: 100 }).notNull(), // DEPRECATED: use categoryId FK instead
```

**Step 4: Run type check and commit**

Run: `npx tsc --noEmit`
Then: `git add shared/schema.ts && git commit -m "schema: add unique constraints and deprecation comments"`

---

### Task 12: Final verification

**Step 1: Run full type check**

Run: `cd "/Users/jeremygill/Documents/Practical Defense/practicaldefense" && npx tsc --noEmit`
Expected: Clean — no type errors

**Step 2: Verify all changes look correct**

Run: `git diff --stat HEAD~11` (or however many commits back)
Expected: Only `shared/schema.ts` modified

**Step 3: Review the diff**

Run: `git log --oneline -12`
Expected: 11 clean commits, one per task
