# Live-Fire Range Session Registration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow online NM concealed carry course students to register for required in-person range sessions, gated by login + course purchase verification.

**Architecture:** Reuse existing course schedule + enrollment infrastructure. Add a `requiresOnlineCourseEnrollment` column to courses, a new eligibility API endpoint, enrollment gate logic in the initiate route, and client-side eligibility checking. Fix the existing bug where `'free-course'` paymentIntentId is not handled server-side.

**Tech Stack:** PostgreSQL (Drizzle ORM), Express.js, React, TanStack Query, Wouter

---

### Task 1: Database Migration — Add `requiresOnlineCourseEnrollment` Column

**Files:**
- Modify: `shared/schema.ts:121-161` (courses table definition)
- Create: `migrations/0010_add_requires_online_course_enrollment.sql`

**Step 1: Add column to schema**

In `shared/schema.ts`, add after `courseType` (line 152):

```typescript
requiresOnlineCourseEnrollment: boolean("requires_online_course_enrollment").notNull().default(false),
```

**Step 2: Create migration file**

Create `migrations/0010_add_requires_online_course_enrollment.sql`:

```sql
-- Migration: Add requiresOnlineCourseEnrollment to courses
-- Enables gating course registration behind online course purchase verification

ALTER TABLE courses ADD COLUMN IF NOT EXISTS requires_online_course_enrollment BOOLEAN NOT NULL DEFAULT false;
```

**Step 3: Verify migration applies**

Run: `npx drizzle-kit push`
Expected: Migration applies without errors

**Step 4: Commit**

```bash
git add shared/schema.ts migrations/0010_add_requires_online_course_enrollment.sql
git commit -m "feat: add requiresOnlineCourseEnrollment column to courses table"
```

---

### Task 2: Fix `'free-course'` Handling in `finalizeEnrollment`

**Context:** The client sends `paymentIntentId: 'free-course'` for $0 courses, but `finalizeEnrollment` in storage.ts only handles `'free-enrollment'` (promo code). The `'free-course'` value falls through to Stripe verification, which would fail.

**Files:**
- Modify: `server/storage.ts:3018-3061` (finalizeEnrollment method)

**Step 1: Add `'free-course'` handling**

In `server/storage.ts`, replace the free enrollment check at line 3018-3019:

```typescript
    // Check if this is a free enrollment (100% discount)
    const isFreeEnrollment = data.paymentIntentId === 'free-enrollment';
```

With:

```typescript
    // Check if this is a free enrollment (100% discount or $0 course)
    const isFreeEnrollment = data.paymentIntentId === 'free-enrollment';
    const isFreeCourse = data.paymentIntentId === 'free-course';
```

Then wrap the existing free-enrollment validation so it only runs for promo-based free, and add the free-course validation. Replace the block from line 3021-3061:

```typescript
    if (isFreeCourse) {
      // SECURITY: Server-side validation that course price is actually $0
      const coursePrice = parseFloat(enrollment.course!.price);
      if (coursePrice > 0) {
        throw new Error('Free course claimed but course price is not zero');
      }
    } else if (isFreeEnrollment) {
      // SECURITY: Server-side validation that enrollment actually qualifies as free
      if (!enrollment.promoCodeApplied) {
        throw new Error('Free enrollment claimed but no promo code applied');
      }

      // Re-validate the promo code to confirm it produces 100% discount
      const coursePrice = parseFloat(enrollment.course!.price);
      let verifyAmount = coursePrice;
      if (enrollment.paymentOption === 'deposit' && enrollment.course!.depositAmount) {
        const depositAmt = parseFloat(enrollment.course!.depositAmount);
        verifyAmount = depositAmt > 0 ? depositAmt : 50;
      }

      const promoValidation = await this.validatePromoCode(
        enrollment.promoCodeApplied,
        data.studentInfo.email,
        enrollment.courseId,
        verifyAmount,
        'course'
      );

      if (!promoValidation.isValid || promoValidation.finalAmount === undefined || promoValidation.finalAmount > 0) {
        throw new Error('Free enrollment claimed but promo code does not result in 100% discount');
      }
    } else {
      // Only verify payment with Stripe if it's NOT a free enrollment/course
      const { getStripeClient } = await import('./stripeClient');
      const stripe = await getStripeClient();

      // Verify payment with Stripe FIRST (critical security check)
      const paymentIntent = await stripe.paymentIntents.retrieve(data.paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not completed');
      }

      // Verify payment intent belongs to this enrollment
      if (paymentIntent.metadata.enrollmentId !== data.enrollmentId) {
        throw new Error('Payment verification failed - enrollment mismatch');
      }
    }
```

Also update the stripePaymentIntentId assignment at line 3168:

```typescript
stripePaymentIntentId: (isFreeEnrollment || isFreeCourse) ? null : data.paymentIntentId,
```

**Step 2: Commit**

```bash
git add server/storage.ts
git commit -m "fix: handle 'free-course' paymentIntentId in finalizeEnrollment"
```

---

### Task 3: Storage Method — Check Online Course Enrollment

**Files:**
- Modify: `server/storage.ts` (add new method near online course enrollment methods)

**Step 1: Find the IStorage interface**

Search for `interface IStorage` or the storage class definition to understand where to add the method.

**Step 2: Add `hasOnlineCourseEnrollment` method**

Add this method to the storage class (near other online course enrollment methods):

```typescript
async hasOnlineCourseEnrollment(userId: string): Promise<boolean> {
  const enrollment = await db.query.onlineCourseEnrollments.findFirst({
    where: and(
      eq(onlineCourseEnrollments.userId, userId),
      not(eq(onlineCourseEnrollments.status, 'cancelled'))
    ),
  });
  return !!enrollment;
}
```

Also add the method signature to the `IStorage` interface if one exists:

```typescript
hasOnlineCourseEnrollment(userId: string): Promise<boolean>;
```

**Step 3: Add `hasActiveEnrollmentForCourse` method**

This checks if a student already has a confirmed enrollment for any schedule of a given course:

```typescript
async hasActiveEnrollmentForCourse(userId: string, courseId: string): Promise<{ hasActive: boolean; enrollment?: any }> {
  const activeEnrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, userId),
      eq(enrollments.courseId, courseId),
      eq(enrollments.status, 'confirmed')
    ),
    with: {
      schedule: true,
    },
  });
  return {
    hasActive: !!activeEnrollment,
    enrollment: activeEnrollment || undefined,
  };
}
```

Add to `IStorage` interface as well:

```typescript
hasActiveEnrollmentForCourse(userId: string, courseId: string): Promise<{ hasActive: boolean; enrollment?: any }>;
```

**Step 4: Commit**

```bash
git add server/storage.ts
git commit -m "feat: add hasOnlineCourseEnrollment and hasActiveEnrollmentForCourse storage methods"
```

---

### Task 4: Eligibility API Endpoint

**Files:**
- Modify: `server/routes.ts` (add new route near course-registration routes, ~line 1365)

**Step 1: Add the eligibility endpoint**

Add before the `POST /api/course-registration/initiate` route:

```typescript
app.get('/api/courses/:courseId/enrollment-eligibility', async (req: any, res) => {
  try {
    const { courseId } = req.params;

    const course = await storage.getCourse(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // If course doesn't require online enrollment, everyone is eligible
    if (!course.requiresOnlineCourseEnrollment) {
      return res.json({ eligible: true });
    }

    // Must be authenticated
    if (!req.user || !req.user.id) {
      return res.json({
        eligible: false,
        reason: 'authentication_required',
        message: 'You must be logged in to register for this course.',
      });
    }

    // Check online course enrollment
    const hasOnlineEnrollment = await storage.hasOnlineCourseEnrollment(req.user.id);
    if (!hasOnlineEnrollment) {
      return res.json({
        eligible: false,
        reason: 'online_course_required',
        message: 'This session is only available to students enrolled in our Online NM Concealed Carry Course.',
      });
    }

    // Check for existing active registration
    const { hasActive, enrollment: activeEnrollment } = await storage.hasActiveEnrollmentForCourse(req.user.id, courseId);
    if (hasActive) {
      return res.json({
        eligible: false,
        reason: 'already_registered',
        message: 'You are already registered for a range session.',
        activeRegistration: {
          scheduleId: activeEnrollment.scheduleId,
          startDate: activeEnrollment.schedule?.startDate,
          location: activeEnrollment.schedule?.location,
        },
      });
    }

    return res.json({ eligible: true });
  } catch (error) {
    console.error("Error checking enrollment eligibility:", error);
    res.status(500).json({ message: "Failed to check eligibility" });
  }
});
```

**Step 2: Commit**

```bash
git add server/routes.ts
git commit -m "feat: add enrollment eligibility API endpoint"
```

---

### Task 5: Gate Logic in Registration Initiation Route

**Files:**
- Modify: `server/routes.ts:1365-1432` (POST /api/course-registration/initiate)

**Step 1: Add gate logic after schedule lookup**

In the initiate route, after the schedule lookup at line 1405-1408, add the gate check before creating the draft enrollment:

```typescript
    // Get the course ID from the schedule
    const schedule = await storage.getCourseSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Gate: Check if course requires online course enrollment
    const course = await storage.getCourse(schedule.courseId);
    if (course?.requiresOnlineCourseEnrollment) {
      // Must be authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: "You must be logged in to register for this course.",
          code: 'authentication_required',
        });
      }

      // Must have online course enrollment
      const hasOnlineEnrollment = await storage.hasOnlineCourseEnrollment(req.user.id);
      if (!hasOnlineEnrollment) {
        return res.status(403).json({
          message: "This session is only available to students enrolled in our Online NM Concealed Carry Course.",
          code: 'online_course_required',
        });
      }

      // Must not already have an active registration for this course
      const { hasActive } = await storage.hasActiveEnrollmentForCourse(req.user.id, schedule.courseId);
      if (hasActive) {
        return res.status(409).json({
          message: "You are already registered for a range session. Please cancel your existing registration before registering for a new date.",
          code: 'already_registered',
        });
      }
    }

    const draftEnrollment = await storage.initiateRegistration({
```

**Step 2: Commit**

```bash
git add server/routes.ts
git commit -m "feat: add online course enrollment gate to registration initiation"
```

---

### Task 6: Client-Side Eligibility Check on Registration Page

**Files:**
- Modify: `client/src/pages/course-registration.tsx`

**Step 1: Add eligibility query**

Near the existing course query (around the top of the component), add:

```typescript
// Check enrollment eligibility for gated courses
const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
  queryKey: [`/api/courses/${courseId}/enrollment-eligibility`],
  enabled: !!courseId,
});
```

**Step 2: Add eligibility gate UI**

Before the registration form renders (after the course data loads), add a check. Find where the form content starts rendering and add before it:

```typescript
{/* Eligibility gate for courses requiring online enrollment */}
{eligibility && !eligibility.eligible && (
  <Card className="max-w-2xl mx-auto mt-8">
    <CardContent className="pt-6 text-center">
      {eligibility.reason === 'authentication_required' && (
        <>
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">{eligibility.message}</p>
          <Button onClick={() => setLocation('/auth')}>Log In</Button>
        </>
      )}
      {eligibility.reason === 'online_course_required' && (
        <>
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Online Course Required</h2>
          <p className="text-muted-foreground mb-4">{eligibility.message}</p>
          <Button onClick={() => setLocation('/courses')}>
            View Online Course
          </Button>
        </>
      )}
      {eligibility.reason === 'already_registered' && (
        <>
          <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Already Registered</h2>
          <p className="text-muted-foreground mb-2">{eligibility.message}</p>
          {eligibility.activeRegistration && (
            <p className="text-sm text-muted-foreground mb-4">
              Your current session: {new Date(eligibility.activeRegistration.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {eligibility.activeRegistration.location && ` at ${eligibility.activeRegistration.location}`}
            </p>
          )}
          <Button variant="outline" onClick={() => setLocation('/student-portal')}>
            Go to Student Portal
          </Button>
        </>
      )}
    </CardContent>
  </Card>
)}
```

**Step 3: Hide the form when not eligible**

Wrap the main form rendering in a condition:

```typescript
{(!eligibility || eligibility.eligible) && (
  // ... existing form content ...
)}
```

**Step 4: Commit**

```bash
git add client/src/pages/course-registration.tsx
git commit -m "feat: add eligibility gate to course registration page"
```

---

### Task 7: Student Portal — Show Active Range Registration

**Files:**
- Modify: `client/src/pages/student-portal.tsx:1730-1882` (LiveFireRangeSessionsSection)

**Step 1: Add query for student's enrollments**

Inside `LiveFireRangeSessionsSection`, after the existing courses query, add:

```typescript
const { user } = useAuth();

// Check if student already has an active range session registration
const { data: studentEnrollments = [] } = useQuery({
  queryKey: ["/api/student/enrollments"],
  enabled: !!user,
});

const activeRangeRegistration = useMemo(() => {
  if (!liveFireCourse || !studentEnrollments.length) return null;
  return studentEnrollments.find(
    (e: any) => e.courseId === liveFireCourse.id && e.status === 'confirmed'
  );
}, [liveFireCourse, studentEnrollments]);
```

**Step 2: Add active registration display**

Inside the CardContent, before the schedule list, add:

```typescript
{activeRangeRegistration && (
  <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-green-800 dark:text-green-200 flex items-center">
          <Check className="mr-2 h-4 w-4" />
          You're registered!
        </p>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          {new Date(activeRangeRegistration.schedule?.startDate).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
          {activeRangeRegistration.schedule?.startTime && ` at ${activeRangeRegistration.schedule.startTime}`}
          {activeRangeRegistration.schedule?.location && ` — ${activeRangeRegistration.schedule.location}`}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Trigger cancel/reschedule flow
          if (confirm('Cancel this registration? You can then register for a different date.')) {
            cancelRegistrationMutation.mutate(activeRangeRegistration.id);
          }
        }}
      >
        Reschedule
      </Button>
    </div>
  </div>
)}
```

**Step 3: Add cancel mutation**

```typescript
const cancelRegistrationMutation = useMutation({
  mutationFn: async (enrollmentId: string) => {
    return await apiRequest("POST", `/api/enrollments/${enrollmentId}/cancel`, {
      reason: 'Student requested reschedule',
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/student/enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    toast({ title: "Registration cancelled", description: "You can now register for a different date." });
  },
  onError: () => {
    toast({ title: "Error", description: "Failed to cancel registration. Please try again.", variant: "destructive" });
  },
});
```

**Step 4: Disable register buttons when already registered**

In the schedule map, update the Register button:

```typescript
<Button
  onClick={() => handleRegisterClick(schedule)}
  disabled={schedule.availableSpots === 0 || !!activeRangeRegistration}
  className="ml-4"
>
  {activeRangeRegistration ? 'Registered' : 'Register'}
</Button>
```

**Step 5: Commit**

```bash
git add client/src/pages/student-portal.tsx
git commit -m "feat: show active range registration in student portal with reschedule option"
```

---

### Task 8: Verify Cancel Enrollment Endpoint Exists

**Files:**
- Modify: `server/routes.ts` (if endpoint doesn't exist)

**Step 1: Search for existing cancel/unenroll endpoint**

Search for `cancel` or `unenroll` in routes.ts. The student portal already has an "Unenroll" button, so there should be an existing endpoint.

**Step 2: Verify or add cancel endpoint**

If an endpoint like `POST /api/enrollments/:id/cancel` exists, verify it works for this use case. If not, add one:

```typescript
app.post('/api/enrollments/:enrollmentId/cancel', isAuthenticated, async (req: any, res) => {
  try {
    const { enrollmentId } = req.params;
    const { reason } = req.body;

    const enrollment = await storage.getEnrollment(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Verify ownership
    if (enrollment.studentId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only allow cancelling confirmed enrollments
    if (enrollment.status !== 'confirmed') {
      return res.status(400).json({ message: "Enrollment is not in a cancellable state" });
    }

    await storage.cancelEnrollment(enrollmentId, reason || 'Student requested cancellation');

    res.json({ message: "Enrollment cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling enrollment:", error);
    res.status(500).json({ message: "Failed to cancel enrollment" });
  }
});
```

**Step 3: Commit (if changes made)**

```bash
git add server/routes.ts
git commit -m "feat: add or verify enrollment cancellation endpoint"
```

---

### Task 9: End-to-End Manual Testing

**Step 1: Verify the migration applied**

Check the database has the new column:

```bash
# In a database client or via the app's admin panel
# Verify courses table has requires_online_course_enrollment column
```

**Step 2: Create a test course**

Via the instructor dashboard, create a course:
- Title: "Live-Fire Range Session"
- Price: $0.00
- Set `requiresOnlineCourseEnrollment` to true (may need a direct DB update if not in the admin UI yet)

**Step 3: Create a test schedule**

Create a schedule for the test course with a future date.

**Step 4: Test eligibility scenarios**

1. **Not logged in** → Visit course registration page → Should see "Login Required" message
2. **Logged in, no online enrollment** → Should see "Online Course Required" message
3. **Logged in, has online enrollment** → Should see the registration form with "Complete Free Registration" button, no payment form
4. **Register successfully** → Should see confirmation, enrollment created with status 'confirmed'
5. **Try to register again** → Should see "Already Registered" with current registration details
6. **Cancel and re-register** → Should be able to cancel from student portal and register for a new date

**Step 5: Verify student portal**

1. Student with online enrollment sees the LiveFireRangeSessionsSection
2. After registering, shows "You're registered!" card with date/location
3. Reschedule button works (cancels and allows new registration)

**Step 6: Commit any fixes found during testing**

---

### Task 10: Add `requiresOnlineCourseEnrollment` to Instructor Course Form

**Files:**
- Modify: The instructor's course creation/editing form (find the form that creates/edits courses)

**Step 1: Find the course edit form**

Search for the form component used to create/edit courses in the instructor dashboard.

**Step 2: Add a checkbox**

Add a checkbox for `requiresOnlineCourseEnrollment` in the course settings section:

```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="requiresOnlineCourseEnrollment"
    checked={formData.requiresOnlineCourseEnrollment}
    onCheckedChange={(checked) =>
      setFormData(prev => ({ ...prev, requiresOnlineCourseEnrollment: !!checked }))
    }
  />
  <Label htmlFor="requiresOnlineCourseEnrollment">
    Require online course enrollment to register
  </Label>
</div>
<p className="text-xs text-muted-foreground ml-6">
  Students must have purchased the Online NM Concealed Carry Course to register for this course.
</p>
```

**Step 3: Ensure the field is included in the API request**

Verify the course create/update API accepts and stores `requiresOnlineCourseEnrollment`.

**Step 4: Commit**

```bash
git add client/src/components/CourseForm.tsx  # or wherever the form lives
git commit -m "feat: add requiresOnlineCourseEnrollment toggle to course form"
```
