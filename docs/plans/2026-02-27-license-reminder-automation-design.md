# Automated License Expiration Reminder System

**Date:** 2026-02-27
**Status:** Approved

## Problem

The student portal has fields for CCL expiration dates, reminder preferences, and visual warnings, but no automated background process actually sends reminders. Instructors must send them manually.

## Solution

A dedicated `LicenseReminderService` triggered by a daily cron job that:
1. Sends escalating renewal reminders as a student's CCL expiration approaches and passes
2. Sends refresher reminders as the 2-year mark approaches
3. Dynamically includes a link to the next scheduled course of the appropriate type
4. Nudges students to update their CCL expiration date 45 days after completing a renewal course

## Renewal Reminder Cadence

Relative to `concealedCarryLicenseExpiration`:

| When | Channel | Purpose |
|------|---------|---------|
| 45 days before expiration | Email | First heads-up with link to next renewal course |
| 30 days before | SMS | Urgency bump |
| 14 days before | Email | Final pre-expiration warning |
| Day of expiration | Email + SMS | Expired notice — mentions 69-day grace period |
| 30 days past expiration | Email | Grace period running out (39 days left) |
| 45 days past expiration | SMS | Final grace period warning |

## Refresher Reminder Cadence

Relative to 2 years after `concealedCarryLicenseIssued`:

| When | Channel | Purpose |
|------|---------|---------|
| 60 days before 2-year mark | Email | Heads-up with link to next refresher course |
| 30 days before 2-year mark | SMS | Follow-up |

## Post-Course Nudge

| When | Channel | Purpose |
|------|---------|---------|
| 45 days after renewal course completion | Email | Nudge to update CCL expiration date in dashboard |

## Suppression Logic

- **Enrollment suppression**: If a student has an active enrollment (not cancelled/refunded) in a course with matching `courseType` ('renewal' or 'refresher'), skip their reminders for that cadence.
- **Opt-out**: Respect `enableLicenseExpirationReminder` (renewal) and `enableRefresherReminder` (refresher) toggles.
- **SMS consent**: Respect `enableSmsReminders` and `smsConsent` before sending SMS.
- **Dedup**: A `license_reminder_logs` table tracks which milestone was sent to which student, preventing duplicate sends. Includes a snapshot of the license expiration date so that updated dates start a fresh cycle.
- **Once stopped, stays stopped**: If reminders stop due to enrollment, they do not auto-resume on cancellation/refund.

## Dynamic Course Links

Each reminder includes a link to the next upcoming scheduled course of the appropriate type:
- Renewal reminders -> next `courseType = 'renewal'` course with `availableSpots > 0` and `startDate > now`
- Refresher reminders -> next `courseType = 'refresher'` course with available spots
- Fallback: link to the schedule listing page if no course is currently scheduled
- Template variables: `{{nextCourseLink}}`, `{{nextCourseName}}`, `{{nextCourseDate}}`

## Schema Changes

### New field on `courses` table

```
courseType: varchar - nullable
values: 'initial', 'refresher', 'renewal'
```

### New `license_reminder_logs` table

```
id: uuid (PK)
userId: uuid (FK to users)
reminderType: varchar - e.g. 'renewal_45d_before', 'renewal_30d_before', 'renewal_14d_before',
              'renewal_day_of', 'renewal_30d_after', 'renewal_45d_after',
              'refresher_60d_before', 'refresher_30d_before', 'post_course_nudge'
channel: varchar - 'email' or 'sms'
sentAt: timestamp
licenseExpirationDate: timestamp - snapshot of expiration date at time of send
courseScheduleDate: timestamp - snapshot of course date (for post-course nudge)
```

## Architecture

```
cronService.ts
  +-- daily at 8am MT: licenseReminderService.processAllReminders()

server/services/licenseReminderService.ts
  +-- processAllReminders()
  |   +-- processRenewalReminders()
  |   +-- processRefresherReminders()
  |   +-- processPostCourseNudges()
  +-- getNextAvailableCourse(courseType) - finds next scheduled course with spots
  +-- buildReminderVariables(student, course) - template variables including {{nextCourseLink}}

notificationEngine.ts - unchanged, used for template processing and sending
storage.ts - new query methods for reminder logs and course type lookups
```

## Notification Templates

Seeded as defaults (one per milestone) with category `'reminder'`. Instructor can edit wording from the existing notification management UI. Templates use existing variable system plus new variables: `{{nextCourseLink}}`, `{{nextCourseName}}`, `{{nextCourseDate}}`, `{{gracePeriodDays}}`.
