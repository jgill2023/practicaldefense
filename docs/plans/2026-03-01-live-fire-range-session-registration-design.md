# Live-Fire Range Session Registration

## Context

The live-fire range session is NOT a standalone class. It is a required in-person component of the Online NM Concealed Carry Course. Students must complete this session to fulfill their course requirements.

Students must be logged in and must have purchased the online course to register for a range session. Legacy WordPress students will be imported via the existing CSV import system before this feature launches.

## Approach

Reuse existing course schedule + enrollment infrastructure. Create the range session as a regular course with `price: 0` and a new `requiresOnlineCourseEnrollment` flag. No new tables needed.

## Data Model

**Course:** "Live-Fire Range Session" with `price: '0'`, `requiresOnlineCourseEnrollment: true`.

**New column:** `requiresOnlineCourseEnrollment` (boolean, default `false`) on the `courses` table. When `true`, registration requires the user to have an `onlineCourseEnrollments` record.

**Schedules:** Standard `courseSchedules` records with `eventCategory: 'range-session'`. Each schedule represents one range day.

**Enrollments:** Standard enrollment records. `paymentStatus: 'paid'`, `stripePaymentIntentId: 'free-course'`. No payment fields used.

**Custom form:** Attached via existing `courseInformationForms` system to collect equipment info, experience level, etc.

## Registration Flow

### Entry Points

1. **Student portal** - existing `LiveFireRangeSessionsSection` shows range sessions to online course students with "Register" button.
2. **Public course detail page** - lists upcoming range session dates. Anyone can browse; login + enrollment verification required to register.

### Steps (Student Perspective)

1. Select a date from available range sessions
2. Login gate - prompted to log in if not authenticated
3. Enrollment verification - server checks `onlineCourseEnrollments` for this user
4. Student info confirmation - pre-populated from profile
5. Custom form - equipment, experience, etc.
6. "Complete Free Registration" button - no payment step

### Cancellation / Rescheduling

- Cancel from student portal (existing "Unenroll" functionality)
- Reschedule = cancel + register for a different date
- Server prevents registering for a second range session while one is active

## Server-Side Gate Logic

### Registration initiation (`POST /api/course-registration/initiate`)

When `course.requiresOnlineCourseEnrollment` is `true`:
1. Require authentication (reject guest registration)
2. Query `onlineCourseEnrollments` for a record matching the user's ID with non-cancelled status
3. If no record: return `403` with error message
4. If student already has a `confirmed` enrollment for any schedule of this course: return `409`

### Eligibility endpoint (`GET /api/courses/:courseId/enrollment-eligibility`)

Returns `{ eligible, reason?, hasActiveRegistration? }`. Called by client before showing registration form to display helpful messages upfront.

### Payment flow

No changes. Existing `price: 0` path handles free registration. The `'free-course'` payment intent ID is already recognized.

## Client-Side Changes

### Course registration page

- Call eligibility endpoint before rendering form
- Not eligible: show reason + link to online course purchase page
- Already registered: show existing registration + option to cancel
- Skip payment options, handgun rental, and promo code steps when `course.price === 0`

### Student portal

- Show confirmed range session registration with date/location
- "Cancel Registration" button for rescheduling

### Course detail page

No structural changes. Eligibility check happens on the registration page after clicking "Register".

## Migration & Rollout

1. Import all WordPress online course students via CSV import (creates `onlineCourseEnrollment` records)
2. Create "Live-Fire Range Session" course with `price: '0'`, `requiresOnlineCourseEnrollment: true`
3. Attach custom form for equipment/experience questions
4. Create first range session schedules
