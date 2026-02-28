# License Reminder Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically send escalating email/SMS reminders as students' concealed carry licenses approach expiration (renewal) and the 2-year refresher mark, with dynamic links to the next scheduled course of the appropriate type.

**Architecture:** A dedicated `LicenseReminderService` handles all reminder logic — querying eligible students, deduplicating against a log table, finding the next available course, and sending via the existing `NotificationEngine`. A daily cron trigger in `cronService.ts` invokes it at 8am MT. Schema changes add a `courseType` field to courses and a new `license_reminder_logs` table.

**Tech Stack:** Drizzle ORM, PostgreSQL, node-cron, existing NotificationEngine (SendGrid email + Twilio SMS)

---

### Task 1: Schema — Add `courseType` to courses table

**Files:**
- Modify: `shared/schema.ts:120-161` (courses table)
- Create: `migrations/0008_add_license_reminder_system.sql`

**Step 1: Add courseType field to courses table in schema**

In `shared/schema.ts`, add after line 153 (`destinationUrl`):

```typescript
  courseType: varchar("course_type", { length: 20 }), // 'initial', 'refresher', 'renewal' - for license reminder course matching
```

**Step 2: Create the migration SQL file**

Create `migrations/0008_add_license_reminder_system.sql`:

```sql
-- Add courseType to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(20);

-- Create license_reminder_logs table
CREATE TABLE IF NOT EXISTS license_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  reminder_type VARCHAR(30) NOT NULL,
  channel VARCHAR(10) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  license_expiration_date TIMESTAMP,
  license_issued_date TIMESTAMP,
  course_schedule_date TIMESTAMP,
  template_id UUID REFERENCES notification_templates(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_user_id ON license_reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_type ON license_reminder_logs(reminder_type);
CREATE INDEX IF NOT EXISTS idx_license_reminder_logs_user_type ON license_reminder_logs(user_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
```

**Step 3: Add license_reminder_logs table definition to schema**

In `shared/schema.ts`, add after the `notificationLogs` table (after ~line 1145):

```typescript
// License reminder logs - tracks sent reminders to prevent duplicates
export const licenseReminderLogs = pgTable("license_reminder_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reminderType: varchar("reminder_type", { length: 30 }).notNull(), // e.g. 'renewal_45d_before', 'refresher_60d_before', 'post_course_nudge'
  channel: varchar("channel", { length: 10 }).notNull(), // 'email' or 'sms'
  sentAt: timestamp("sent_at").defaultNow(),
  licenseExpirationDate: timestamp("license_expiration_date"), // Snapshot for renewal reminders
  licenseIssuedDate: timestamp("license_issued_date"), // Snapshot for refresher reminders
  courseScheduleDate: timestamp("course_schedule_date"), // Snapshot for post-course nudge
  templateId: uuid("template_id").references(() => notificationTemplates.id),
}, (table) => [
  index("idx_license_reminder_logs_user_id").on(table.userId),
  index("idx_license_reminder_logs_type").on(table.reminderType),
  index("idx_license_reminder_logs_user_type").on(table.userId, table.reminderType),
]);

export type LicenseReminderLog = typeof licenseReminderLogs.$inferSelect;
export type InsertLicenseReminderLog = typeof licenseReminderLogs.$inferInsert;
```

**Step 4: Run the migration**

Run: `cd /Users/jeremygill/Documents/Practical\ Defense/practicaldefense && npx drizzle-kit push`
Expected: Schema changes applied to database.

**Step 5: Commit**

```bash
git add shared/schema.ts migrations/0008_add_license_reminder_system.sql
git commit -m "feat: add courseType field and license_reminder_logs table for automated reminders"
```

---

### Task 2: Storage — Add query methods for license reminders

**Files:**
- Modify: `server/storage.ts:235+` (IStorage interface) and `server/storage.ts:828+` (DatabaseStorage class)

**Step 1: Add interface methods**

In `server/storage.ts`, add to the `IStorage` interface (after the notification log methods around line 465):

```typescript
  // License reminder methods
  getStudentsWithLicenseData(): Promise<User[]>;
  getActiveEnrollmentsByStudentAndCourseType(studentId: string, courseType: string): Promise<any[]>;
  getCompletedEnrollmentsByCourseType(courseType: string, afterDate: Date): Promise<any[]>;
  getNextAvailableCourseByType(courseType: string): Promise<{ course: any; schedule: any } | null>;
  getLicenseReminderLog(userId: string, reminderType: string, snapshotDate: Date): Promise<LicenseReminderLog | null>;
  createLicenseReminderLog(log: InsertLicenseReminderLog): Promise<LicenseReminderLog>;
```

**Step 2: Add imports to storage.ts**

At the top of `server/storage.ts`, add to the schema imports:

```typescript
import { licenseReminderLogs, type LicenseReminderLog, type InsertLicenseReminderLog } from '@shared/schema';
```

**Step 3: Implement the methods in DatabaseStorage**

Add to the `DatabaseStorage` class (at the end, before the closing brace):

```typescript
  // --- License Reminder Methods ---

  async getStudentsWithLicenseData(): Promise<User[]> {
    const students = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, 'student'),
          or(
            isNotNull(users.concealedCarryLicenseExpiration),
            isNotNull(users.concealedCarryLicenseIssued)
          )
        )
      );
    return students;
  }

  async getActiveEnrollmentsByStudentAndCourseType(studentId: string, courseType: string): Promise<any[]> {
    const results = await db
      .select()
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(courses.courseType, courseType),
          notInArray(enrollments.status, ['cancelled']),
          ne(enrollments.paymentStatus, 'refunded')
        )
      );
    return results;
  }

  async getCompletedEnrollmentsByCourseType(courseType: string, afterDate: Date): Promise<any[]> {
    const results = await db
      .select({
        enrollment: enrollments,
        course: courses,
        schedule: courseSchedules,
        student: users,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(courseSchedules, eq(enrollments.scheduleId, courseSchedules.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(
        and(
          eq(courses.courseType, courseType),
          eq(enrollments.status, 'completed'),
          gte(courseSchedules.endDate, afterDate)
        )
      );
    return results;
  }

  async getNextAvailableCourseByType(courseType: string): Promise<{ course: any; schedule: any } | null> {
    const now = new Date();
    const results = await db
      .select({
        course: courses,
        schedule: courseSchedules,
      })
      .from(courseSchedules)
      .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
      .where(
        and(
          eq(courses.courseType, courseType),
          eq(courses.isActive, true),
          gt(courseSchedules.startDate, now),
          gt(courseSchedules.availableSpots, 0),
          isNull(courseSchedules.deletedAt)
        )
      )
      .orderBy(asc(courseSchedules.startDate))
      .limit(1);

    return results.length > 0 ? results[0] : null;
  }

  async getLicenseReminderLog(userId: string, reminderType: string, snapshotDate: Date): Promise<LicenseReminderLog | null> {
    const [log] = await db
      .select()
      .from(licenseReminderLogs)
      .where(
        and(
          eq(licenseReminderLogs.userId, userId),
          eq(licenseReminderLogs.reminderType, reminderType),
          or(
            eq(licenseReminderLogs.licenseExpirationDate, snapshotDate),
            eq(licenseReminderLogs.licenseIssuedDate, snapshotDate)
          )
        )
      )
      .limit(1);
    return log || null;
  }

  async createLicenseReminderLog(log: InsertLicenseReminderLog): Promise<LicenseReminderLog> {
    const [newLog] = await db
      .insert(licenseReminderLogs)
      .values(log)
      .returning();
    return newLog;
  }
```

**Step 4: Add missing drizzle imports if needed**

Verify the following are imported from `drizzle-orm` at the top of `storage.ts`: `and`, `or`, `eq`, `gt`, `gte`, `asc`, `isNotNull`, `isNull`, `notInArray`, `ne`. Add any that are missing.

**Step 5: Commit**

```bash
git add server/storage.ts
git commit -m "feat: add storage methods for license reminder queries"
```

---

### Task 3: Create the LicenseReminderService

**Files:**
- Create: `server/services/licenseReminderService.ts`

**Step 1: Create the service file**

Create `server/services/licenseReminderService.ts`:

```typescript
import { storage } from '../storage';
import { NotificationEngine, type NotificationVariables } from '../notificationEngine';
import type { User } from '@shared/schema';

const APP_URL = process.env.APP_URL || 'https://abqconcealedcarry.com';

// Reminder milestone definitions
const RENEWAL_MILESTONES = [
  { type: 'renewal_45d_before', daysFromExpiration: -45, channel: 'email' as const },
  { type: 'renewal_30d_before', daysFromExpiration: -30, channel: 'sms' as const },
  { type: 'renewal_14d_before', daysFromExpiration: -14, channel: 'email' as const },
  { type: 'renewal_day_of',     daysFromExpiration: 0,   channel: 'both' as const },
  { type: 'renewal_30d_after',  daysFromExpiration: 30,  channel: 'email' as const },
  { type: 'renewal_45d_after',  daysFromExpiration: 45,  channel: 'sms' as const },
];

const REFRESHER_MILESTONES = [
  { type: 'refresher_60d_before', daysFromRefresher: -60, channel: 'email' as const },
  { type: 'refresher_30d_before', daysFromRefresher: -30, channel: 'sms' as const },
];

export class LicenseReminderService {

  /**
   * Main entry point — called daily by cron at 8am MT
   */
  async processAllReminders(): Promise<void> {
    console.log('[LicenseReminder] Starting daily reminder processing...');
    try {
      await this.processRenewalReminders();
      await this.processRefresherReminders();
      await this.processPostCourseNudges();
      console.log('[LicenseReminder] Daily processing complete.');
    } catch (error) {
      console.error('[LicenseReminder] Error during processing:', error);
    }
  }

  /**
   * Process renewal reminders for all eligible students
   */
  private async processRenewalReminders(): Promise<void> {
    const students = await storage.getStudentsWithLicenseData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sent = 0;
    let skipped = 0;

    for (const student of students) {
      if (!student.concealedCarryLicenseExpiration) continue;
      if (!student.enableLicenseExpirationReminder) { skipped++; continue; }

      const expirationDate = new Date(student.concealedCarryLicenseExpiration);
      expirationDate.setHours(0, 0, 0, 0);
      const daysUntilExpiration = Math.round((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if student has active enrollment in a renewal course (suppression)
      const activeEnrollments = await storage.getActiveEnrollmentsByStudentAndCourseType(student.id, 'renewal');
      if (activeEnrollments.length > 0) { skipped++; continue; }

      for (const milestone of RENEWAL_MILESTONES) {
        // Check if this milestone applies today
        // daysFromExpiration is negative for before, positive for after
        // daysUntilExpiration is positive before, negative after
        if (daysUntilExpiration !== -milestone.daysFromExpiration) continue;

        // Check dedup
        const existing = await storage.getLicenseReminderLog(
          student.id, milestone.type, student.concealedCarryLicenseExpiration
        );
        if (existing) continue;

        // Send reminder
        const sentCount = await this.sendRenewalReminder(student, milestone, daysUntilExpiration);
        sent += sentCount;
      }
    }

    console.log(`[LicenseReminder] Renewal: ${sent} sent, ${skipped} skipped`);
  }

  /**
   * Process refresher reminders (2-year mark from license issued)
   */
  private async processRefresherReminders(): Promise<void> {
    const students = await storage.getStudentsWithLicenseData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sent = 0;
    let skipped = 0;

    for (const student of students) {
      if (!student.concealedCarryLicenseIssued) continue;
      if (!student.enableRefresherReminder) { skipped++; continue; }

      // Calculate 2-year mark
      const issuedDate = new Date(student.concealedCarryLicenseIssued);
      const twoYearMark = new Date(issuedDate);
      twoYearMark.setFullYear(twoYearMark.getFullYear() + 2);
      twoYearMark.setHours(0, 0, 0, 0);
      const daysUntilRefresher = Math.round((twoYearMark.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if student has active enrollment in a refresher course (suppression)
      const activeEnrollments = await storage.getActiveEnrollmentsByStudentAndCourseType(student.id, 'refresher');
      if (activeEnrollments.length > 0) { skipped++; continue; }

      for (const milestone of REFRESHER_MILESTONES) {
        if (daysUntilRefresher !== -milestone.daysFromRefresher) continue;

        // Check dedup
        const existing = await storage.getLicenseReminderLog(
          student.id, milestone.type, student.concealedCarryLicenseIssued
        );
        if (existing) continue;

        // Send reminder
        const sentCount = await this.sendRefresherReminder(student, milestone, daysUntilRefresher);
        sent += sentCount;
      }
    }

    console.log(`[LicenseReminder] Refresher: ${sent} sent, ${skipped} skipped`);
  }

  /**
   * Nudge students to update their CCL expiration date 45 days after completing a renewal course
   */
  private async processPostCourseNudges(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look for renewal courses completed around 45 days ago
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - 45);

    // Get completions from a window around 45 days ago (to handle weekends/downtime)
    const windowStart = new Date(targetDate);
    windowStart.setDate(windowStart.getDate() - 1);

    const completions = await storage.getCompletedEnrollmentsByCourseType('renewal', windowStart);

    let sent = 0;

    for (const completion of completions) {
      const { enrollment, student, schedule } = completion;

      // Check if the schedule end date was approximately 45 days ago
      const endDate = new Date(schedule.endDate);
      endDate.setHours(0, 0, 0, 0);
      const daysSinceEnd = Math.round((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceEnd < 44 || daysSinceEnd > 46) continue;

      // Check dedup
      const existing = await storage.getLicenseReminderLog(
        student.id, 'post_course_nudge', schedule.endDate
      );
      if (existing) continue;

      // Send nudge via email
      await this.sendPostCourseNudge(student, schedule.endDate);
      sent++;
    }

    console.log(`[LicenseReminder] Post-course nudges: ${sent} sent`);
  }

  /**
   * Send a renewal reminder for a specific milestone
   */
  private async sendRenewalReminder(
    student: User,
    milestone: typeof RENEWAL_MILESTONES[0],
    daysUntilExpiration: number
  ): Promise<number> {
    let sentCount = 0;
    const nextCourse = await storage.getNextAvailableCourseByType('renewal');
    const variables = this.buildReminderVariables(student, nextCourse, daysUntilExpiration, 'renewal');

    // Find the template by name convention: "License Renewal - {milestone description}"
    const templateName = this.getTemplateName(milestone.type);

    const channels = milestone.channel === 'both'
      ? ['email', 'sms'] as const
      : [milestone.channel] as const;

    for (const channel of channels) {
      // Check channel preferences
      if (channel === 'sms' && (!student.enableSmsReminders || !student.smsConsent)) continue;

      const template = await this.findTemplateByNameAndType(templateName, channel);
      if (!template) {
        console.warn(`[LicenseReminder] Template not found: ${templateName} (${channel})`);
        continue;
      }

      const result = await NotificationEngine.sendNotification({
        templateId: template.id,
        recipientId: student.id,
        variables,
        triggerEvent: 'license_expiration',
        manualSend: false,
      });

      if (result.success) {
        await storage.createLicenseReminderLog({
          userId: student.id,
          reminderType: milestone.type,
          channel,
          licenseExpirationDate: student.concealedCarryLicenseExpiration!,
          templateId: template.id,
        });
        sentCount++;
        console.log(`[LicenseReminder] Sent ${milestone.type} (${channel}) to ${student.email}`);
      } else {
        console.error(`[LicenseReminder] Failed ${milestone.type} (${channel}) to ${student.email}: ${result.error}`);
      }
    }

    return sentCount;
  }

  /**
   * Send a refresher reminder for a specific milestone
   */
  private async sendRefresherReminder(
    student: User,
    milestone: typeof REFRESHER_MILESTONES[0],
    daysUntilRefresher: number
  ): Promise<number> {
    let sentCount = 0;
    const nextCourse = await storage.getNextAvailableCourseByType('refresher');
    const variables = this.buildReminderVariables(student, nextCourse, daysUntilRefresher, 'refresher');

    const templateName = this.getTemplateName(milestone.type);
    const template = await this.findTemplateByNameAndType(templateName, milestone.channel);

    if (!template) {
      console.warn(`[LicenseReminder] Template not found: ${templateName} (${milestone.channel})`);
      return 0;
    }

    // Check channel preferences for SMS
    if (milestone.channel === 'sms' && (!student.enableSmsReminders || !student.smsConsent)) return 0;

    const result = await NotificationEngine.sendNotification({
      templateId: template.id,
      recipientId: student.id,
      variables,
      triggerEvent: 'license_expiration',
      manualSend: false,
    });

    if (result.success) {
      await storage.createLicenseReminderLog({
        userId: student.id,
        reminderType: milestone.type,
        channel: milestone.channel,
        licenseIssuedDate: student.concealedCarryLicenseIssued!,
        templateId: template.id,
      });
      sentCount++;
      console.log(`[LicenseReminder] Sent ${milestone.type} (${milestone.channel}) to ${student.email}`);
    } else {
      console.error(`[LicenseReminder] Failed ${milestone.type} (${milestone.channel}) to ${student.email}: ${result.error}`);
    }

    return sentCount;
  }

  /**
   * Send post-course nudge to update CCL expiration date
   */
  private async sendPostCourseNudge(student: User, courseEndDate: Date): Promise<void> {
    const templateName = 'License Reminder - Update CCL Expiration';
    const template = await this.findTemplateByNameAndType(templateName, 'email');
    if (!template) {
      console.warn(`[LicenseReminder] Template not found: ${templateName}`);
      return;
    }

    const variables: NotificationVariables = {
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
      },
      system: {
        companyName: 'Practical Defense Training',
        companyPhone: '(555) 123-4567',
        companyEmail: 'Info@abqconcealedcarry.com',
        website: 'abqconcealedcarry.com',
        currentDate: new Date().toLocaleDateString(),
      },
    };

    // Add dashboard link as a custom variable via template content
    // Templates can use {{websiteUrl}}/student-portal for the dashboard link

    const result = await NotificationEngine.sendNotification({
      templateId: template.id,
      recipientId: student.id,
      variables,
      triggerEvent: 'license_expiration',
      manualSend: false,
    });

    if (result.success) {
      await storage.createLicenseReminderLog({
        userId: student.id,
        reminderType: 'post_course_nudge',
        channel: 'email',
        courseScheduleDate: courseEndDate,
        templateId: template.id,
      });
      console.log(`[LicenseReminder] Sent post-course nudge to ${student.email}`);
    }
  }

  /**
   * Build template variables with dynamic course link
   */
  private buildReminderVariables(
    student: User,
    nextCourse: { course: any; schedule: any } | null,
    daysRemaining: number,
    reminderCategory: 'renewal' | 'refresher'
  ): NotificationVariables {
    const variables: NotificationVariables = {
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        licenseExpiration: student.concealedCarryLicenseExpiration
          ? new Date(student.concealedCarryLicenseExpiration).toLocaleDateString('en-US')
          : '',
      },
      system: {
        companyName: 'Practical Defense Training',
        companyPhone: '(555) 123-4567',
        companyEmail: 'Info@abqconcealedcarry.com',
        website: 'abqconcealedcarry.com',
        currentDate: new Date().toLocaleDateString(),
      },
    };

    // Add course link variables
    if (nextCourse) {
      const scheduleDate = new Date(nextCourse.schedule.startDate);
      variables.course = {
        name: nextCourse.course.title,
        description: nextCourse.course.description || '',
        price: parseFloat(nextCourse.course.price),
        category: nextCourse.course.category || '',
      };
      variables.schedule = {
        startDate: scheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        endDate: new Date(nextCourse.schedule.endDate).toLocaleDateString('en-US'),
        startTime: this.formatTime(nextCourse.schedule.startTime),
        endTime: this.formatTime(nextCourse.schedule.endTime),
        location: nextCourse.schedule.location || '',
        maxSpots: nextCourse.schedule.maxSpots,
        availableSpots: nextCourse.schedule.availableSpots,
      };
    }

    return variables;
  }

  /**
   * Find a notification template by name and type
   */
  private async findTemplateByNameAndType(name: string, type: string): Promise<any | null> {
    const templates = await storage.getNotificationTemplates();
    return templates.find(t => t.name === name && t.type === type && t.isActive) || null;
  }

  /**
   * Map milestone type to human-readable template name
   */
  private getTemplateName(milestoneType: string): string {
    const nameMap: Record<string, string> = {
      'renewal_45d_before': 'License Renewal - 45 Day Warning',
      'renewal_30d_before': 'License Renewal - 30 Day Warning',
      'renewal_14d_before': 'License Renewal - 14 Day Warning',
      'renewal_day_of': 'License Renewal - Expiration Day',
      'renewal_30d_after': 'License Renewal - 30 Days Past Expiration',
      'renewal_45d_after': 'License Renewal - 45 Days Past Expiration',
      'refresher_60d_before': 'License Refresher - 60 Day Reminder',
      'refresher_30d_before': 'License Refresher - 30 Day Reminder',
      'post_course_nudge': 'License Reminder - Update CCL Expiration',
    };
    return nameMap[milestoneType] || milestoneType;
  }

  /**
   * Format time from HH:MM:SS to 12-hour format
   */
  private formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }
}

export const licenseReminderService = new LicenseReminderService();
```

**Step 2: Commit**

```bash
git add server/services/licenseReminderService.ts
git commit -m "feat: create LicenseReminderService with renewal, refresher, and nudge logic"
```

---

### Task 4: Update NotificationEngine with new template variables

**Files:**
- Modify: `server/notificationEngine.ts:21-98` (NotificationVariables interface)
- Modify: `server/notificationEngine.ts:114-196` (FLAT_ALIAS_MAP)

**Step 1: Add nextCourseLink, nextCourseName, nextCourseDate, gracePeriodDays, dashboardLink to FLAT_ALIAS_MAP**

In `server/notificationEngine.ts`, add these entries to the `FLAT_ALIAS_MAP` object (after the system aliases, before the closing `};` around line 196):

```typescript
    // License reminder aliases
    nextCourseName: 'course.name',
    nextCourseDate: 'schedule.startDate',
    nextCourseTime: 'schedule.startTime',
    nextCourseLocation: 'schedule.location',
    nextCourseAvailableSpots: 'schedule.availableSpots',
```

**Step 2: Add to getAvailableVariables**

In `server/notificationEngine.ts`, update `getAvailableVariables()` (around line 1040) to include the new variables in the student array:

```typescript
      student: [
        'name', 'firstName', 'lastName', 'email', 'phone',
        'address', 'city', 'state', 'zipCode', 'licenseNumber', 'licenseExpiration'
      ],
```

No change needed here — `licenseExpiration` already exists and the course/schedule variables are already documented. The new aliases just make them more discoverable for license reminder templates.

**Step 3: Commit**

```bash
git add server/notificationEngine.ts
git commit -m "feat: add license reminder template variable aliases to NotificationEngine"
```

---

### Task 5: Register cron job in cronService

**Files:**
- Modify: `server/services/cronService.ts:1-6` (imports) and `server/services/cronService.ts:262-293` (initialize method)

**Step 1: Add import**

In `server/services/cronService.ts`, add after line 7 (`import { runAbandonedCartRecovery }...`):

```typescript
import { licenseReminderService } from './licenseReminderService';
```

**Step 2: Add cron schedule**

In `server/services/cronService.ts`, inside the `initialize()` method, add after the abandoned cart cron job (after line 289, before `this.isInitialized = true`):

```typescript
    // License expiration reminder check - daily at 8am MT
    cron.schedule('0 8 * * *', async () => {
      console.log('[CronService] License reminder job triggered');
      try {
        await licenseReminderService.processAllReminders();
      } catch (error) {
        console.error('[CronService] License reminder job failed:', error);
      }
    }, {
      timezone: 'America/Denver',
    });
```

**Step 3: Commit**

```bash
git add server/services/cronService.ts
git commit -m "feat: register daily license reminder cron job at 8am MT"
```

---

### Task 6: Seed default notification templates

**Files:**
- Create: `server/services/seedLicenseReminderTemplates.ts`
- Modify: `server/index.ts:51` (call seeder after initialize)

**Step 1: Create the seeder**

Create `server/services/seedLicenseReminderTemplates.ts`:

```typescript
import { storage } from '../storage';

const APP_URL = process.env.APP_URL || 'https://abqconcealedcarry.com';

interface TemplateSeed {
  name: string;
  type: 'email' | 'sms';
  category: string;
  subject?: string;
  content: string;
}

const TEMPLATES: TemplateSeed[] = [
  // --- RENEWAL REMINDERS ---
  {
    name: 'License Renewal - 45 Day Warning',
    type: 'email',
    category: 'reminder',
    subject: '{{firstName}}, Your NM Concealed Carry License Expires Soon',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expires on <strong>{{licenseExpiration}}</strong> — that's just 45 days away.</p>
<p>To keep your license current, you'll need to complete a renewal course before it expires.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">View All Upcoming Courses & Register</a></p>
<p>Don't wait — spots fill up fast!</p>
<p>— Practical Defense Training<br>
${APP_URL}<br>
Info@abqconcealedcarry.com</p>`,
  },
  {
    name: 'License Renewal - 30 Day Warning',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL expires on {{licenseExpiration}} (30 days). Register for a renewal course: ${APP_URL}/schedule`,
  },
  {
    name: 'License Renewal - 14 Day Warning',
    type: 'email',
    category: 'reminder',
    subject: 'Urgent: Your NM CCL Expires in 14 Days',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expires on <strong>{{licenseExpiration}}</strong> — only 14 days from now.</p>
<p>If you haven't already registered for a renewal course, now is the time.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register Now</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - Expiration Day',
    type: 'email',
    category: 'reminder',
    subject: 'Your NM Concealed Carry License Has Expired',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expired today (<strong>{{licenseExpiration}}</strong>).</p>
<p><strong>Important:</strong> You have a <strong>69-day grace period</strong> to complete a renewal course. After that, you'll need to take the full initial CCL course again.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register for a Renewal Course</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - Expiration Day',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL expired today. You have 69 days to renew before needing the full initial course. Register: ${APP_URL}/schedule`,
  },
  {
    name: 'License Renewal - 30 Days Past Expiration',
    type: 'email',
    category: 'reminder',
    subject: 'Your NM CCL Grace Period Is Running Out',
    content: `<p>Hi {{firstName}},</p>
<p>Your New Mexico Concealed Carry License expired 30 days ago. You have <strong>39 days remaining</strong> in your grace period to complete a renewal course.</p>
<p>After the grace period ends, you'll need to take the full initial CCL course again, which is longer and more expensive.</p>
<p><strong>Next Available Renewal Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">Register Now — Don't Miss Your Window</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Renewal - 45 Days Past Expiration',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, only 24 days left in your CCL grace period! After that you'll need the full initial course. Register now: ${APP_URL}/schedule`,
  },
  // --- REFRESHER REMINDERS ---
  {
    name: 'License Refresher - 60 Day Reminder',
    type: 'email',
    category: 'reminder',
    subject: '{{firstName}}, Your 2-Year CCL Refresher Is Coming Up',
    content: `<p>Hi {{firstName}},</p>
<p>It's been almost 2 years since your NM Concealed Carry License was issued. New Mexico requires a refresher course between months 22-26 of your license.</p>
<p>Your refresher window opens soon — now is a great time to get it scheduled.</p>
<p><strong>Next Available Refresher Course:</strong><br>
{{courseName}} — {{startDate}} at {{startTime}}<br>
Location: {{location}}</p>
<p><a href="${APP_URL}/schedule">View Refresher Courses</a></p>
<p>— Practical Defense Training</p>`,
  },
  {
    name: 'License Refresher - 30 Day Reminder',
    type: 'sms',
    category: 'reminder',
    content: `{{firstName}}, your NM CCL 2-year refresher is due in 30 days. Register for a refresher course: ${APP_URL}/schedule`,
  },
  // --- POST-COURSE NUDGE ---
  {
    name: 'License Reminder - Update CCL Expiration',
    type: 'email',
    category: 'reminder',
    subject: 'Update Your CCL Expiration Date in Your Dashboard',
    content: `<p>Hi {{firstName}},</p>
<p>Congratulations on completing your renewal course! By now you should have received your updated license from the state.</p>
<p>Please take a moment to <strong>update your CCL expiration date</strong> in your student dashboard so we can continue to send you timely reminders.</p>
<p><a href="${APP_URL}/student-portal">Update Your Dashboard</a></p>
<p>If you haven't received your updated license yet, no worries — you can update it when it arrives.</p>
<p>— Practical Defense Training</p>`,
  },
];

/**
 * Seed license reminder notification templates if they don't already exist.
 * Safe to call multiple times — skips templates that already exist by name+type.
 */
export async function seedLicenseReminderTemplates(): Promise<void> {
  try {
    const existingTemplates = await storage.getNotificationTemplates();

    let created = 0;
    let skipped = 0;

    for (const seed of TEMPLATES) {
      const exists = existingTemplates.some(t => t.name === seed.name && t.type === seed.type);
      if (exists) {
        skipped++;
        continue;
      }

      // We need a createdBy user ID — use the first instructor/admin found
      const adminUsers = existingTemplates.length > 0 ? existingTemplates[0].createdBy : null;
      if (!adminUsers) {
        console.warn('[SeedTemplates] No existing templates found to derive createdBy. Skipping seed.');
        return;
      }

      await storage.createNotificationTemplate({
        name: seed.name,
        type: seed.type,
        category: seed.category,
        subject: seed.subject || null,
        content: seed.content,
        isActive: true,
        sortOrder: 0,
        createdBy: adminUsers,
        variables: ['firstName', 'lastName', 'licenseExpiration', 'courseName', 'startDate', 'startTime', 'location'],
      });
      created++;
    }

    console.log(`[SeedTemplates] License reminder templates: ${created} created, ${skipped} already existed`);
  } catch (error) {
    console.error('[SeedTemplates] Error seeding license reminder templates:', error);
  }
}
```

**Step 2: Call seeder from server startup**

In `server/index.ts`, add import at top:

```typescript
import { seedLicenseReminderTemplates } from './services/seedLicenseReminderTemplates';
```

Then after `cronService.initialize();` (line 51), add:

```typescript
  // Seed license reminder templates (idempotent)
  seedLicenseReminderTemplates();
```

**Step 3: Commit**

```bash
git add server/services/seedLicenseReminderTemplates.ts server/index.ts
git commit -m "feat: seed default license reminder notification templates on startup"
```

---

### Task 7: Add `getNotificationTemplates` to storage if missing

**Files:**
- Modify: `server/storage.ts` (only if method doesn't exist)

**Step 1: Check if method exists**

Search for `getNotificationTemplates` in `server/storage.ts`. If it exists, skip this task.

If missing, add to `IStorage` interface:

```typescript
  getNotificationTemplates(): Promise<any[]>;
```

And to `DatabaseStorage`:

```typescript
  async getNotificationTemplates(): Promise<any[]> {
    return await db.select().from(notificationTemplates);
  }
```

**Step 2: Check if `createNotificationTemplate` exists**

Similarly verify `createNotificationTemplate` exists. If missing, add:

```typescript
  async createNotificationTemplate(data: any): Promise<any> {
    const [template] = await db.insert(notificationTemplates).values(data).returning();
    return template;
  }
```

**Step 3: Commit (if changes made)**

```bash
git add server/storage.ts
git commit -m "feat: add missing notification template storage methods"
```

---

### Task 8: Add courseType UI to instructor course management

**Files:**
- Modify: Instructor dashboard or course edit form (find the course creation/editing form component)

**Step 1: Find the course edit form**

Search for the course creation/editing form in the client. Look for the component that handles `POST /api/courses` or `PUT /api/courses/:id`.

**Step 2: Add courseType dropdown**

Add a `<Select>` field for `courseType` with options:
- (empty/null) — No type
- `initial` — Initial CCL Course
- `refresher` — 2-Year Refresher
- `renewal` — License Renewal

Place it near the category field in the form.

**Step 3: Update the course create/update API endpoints**

In `server/routes.ts`, find the course POST and PUT endpoints and ensure `courseType` is accepted and persisted.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add courseType selector to course management UI"
```

---

### Task 9: Test the full flow manually

**Step 1: Verify migration applied**

Run: `cd /Users/jeremygill/Documents/Practical\ Defense/practicaldefense && npx drizzle-kit push`

**Step 2: Set a test course's courseType**

Using the UI or database directly, set an existing renewal course's `course_type` to `'renewal'` and a refresher course to `'refresher'`.

**Step 3: Verify templates were seeded**

Check the notification templates page in the instructor dashboard for the new license reminder templates.

**Step 4: Test the cron job manually**

Add a temporary route or call `licenseReminderService.processAllReminders()` directly to verify:
- Students with license dates are found
- Milestone matching works
- Dedup prevents re-sending
- Template variables are populated
- Course links are included

**Step 5: Commit any test fixes**

```bash
git add -A
git commit -m "fix: adjustments from manual testing of license reminder system"
```
