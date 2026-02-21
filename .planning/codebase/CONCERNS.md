# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Weak Type Safety & Generic "any" Types:**
- Issue: 10+ instances of `req: any`, `response: any`, and generic type assignments bypass TypeScript's type system, creating maintenance risks and masking potential errors
- Files: `server/routes.ts` (lines 84, 117, 180, 200, 211, 257, 280, 304, 340, 370, 393, 436, 470, 488, 506, 541, 564, 597, 657, 676, 707, 737, 775, 805, 817, 855)
- Impact: Runtime errors not caught at compile time, difficult refactoring, inconsistent error handling
- Fix approach: Create proper Express request/response types, use type-safe middleware that properly types `req.user`, avoid casting with `any`

**Missing Test Coverage:**
- Issue: Zero automated test files (0 `.test.ts` or `.spec.ts` files) despite 205 source files with complex business logic
- Files: N/A (no test directory exists)
- Impact: Cannot confidently refactor payment processing, enrollment logic, or notifications; regressions not caught automatically
- Fix approach: Establish test structure at `server/__tests__`, `client/src/__tests__`; prioritize tests for: auth routes, enrollment payment flows, notification scheduling, stripe integration

**Large Monolithic Route File:**
- Issue: `server/routes.ts` is 9,943 lines - contains all HTTP endpoints in a single file with mixed concerns (auth, courses, payments, communications, webhooks)
- Files: `server/routes.ts`
- Impact: Difficult to navigate, high cognitive load, increased merge conflicts, slow IDE performance
- Fix approach: Extract route groups into domain-specific routers: `courseRoutes`, `enrollmentRoutes`, `paymentRoutes`, `communicationsRoutes`, `webhookRoutes`

**Large Storage Utility Class:**
- Issue: `server/storage.ts` is 7,432 lines - monolithic storage abstraction mixing database queries, business logic, and data transformations
- Files: `server/storage.ts`
- Impact: Hard to locate specific functionality, unclear data dependencies, difficult to unit test individual operations
- Fix approach: Break into domain service classes: `CourseService`, `EnrollmentService`, `PaymentService`, `NotificationService`

## Known Bugs

**Inconsistent Session Management:**
- Symptoms: Session storage uses in-memory `memorystore` which loses all sessions on server restart
- Files: `server/index.ts`, `server/auth/routes.ts` (session handling via `req.session`)
- Trigger: Server restarts/deployments - all users logged out, pending operations lost
- Workaround: Use persistent database session store (PostgreSQL via `connect-pg-simple` is already in package.json but not configured)

**N+1 Query Pattern in Roster Export:**
- Symptoms: When exporting roster with waivers/forms, nested `Promise.all()` with individual database queries for each enrollment
- Files: `server/routes.ts` (line 3041-3079) - fetches waiverInstances and courseInformationForms per student in loop
- Trigger: Export roster for courses with 50+ students causes 100+ individual queries
- Workaround: Join queries upfront or batch queries

**Missing Cart Data Validation on Checkout:**
- Symptoms: Cart items passed to payment processing without re-validating product availability/pricing
- Files: `server/routes.ts` (cart endpoints starting ~7693)
- Trigger: Cart modified by concurrent requests - prices change during checkout
- Workaround: Validate entire cart again before creating payment intent

**Race Condition in Credit Deduction:**
- Symptoms: Partial implementation of atomic credit checks; database check for credit availability exists but not comprehensive
- Files: `server/storage.ts` (line 6832-6846) - SQL check prevents negative balance but doesn't account for concurrent deductions
- Trigger: Two simultaneous SMS broadcasts with tight credit margins
- Workaround: Increase credit margins or reduce concurrent operations

## Security Considerations

**Overly Permissive Role Checks:**
- Risk: Some endpoints check `requireInstructorOrHigher` when they should check specific roles; no field-level authorization
- Files: Multiple routes in `server/routes.ts` (e.g., user approval, course editing)
- Current mitigation: Basic role checks at endpoint level
- Recommendations:
  - Implement field-level authorization (instructors can only modify own courses)
  - Audit "instructor or higher" checks - many should be "admin only"
  - Add ownership verification before returning/modifying resources

**Missing Request Validation on Several Endpoints:**
- Risk: Some endpoints parse `req.body` with `any` cast before validation, or partial validation
- Files: `server/routes.ts` (scattered throughout, especially older routes)
- Current mitigation: Zod schemas on newer endpoints
- Recommendations: Audit all POST/PUT/PATCH endpoints for input validation; enforce schema validation middleware

**Plaintext Token Storage in Google OAuth:**
- Risk: Google refresh tokens stored in database with hardcoded placeholder strings in some cases
- Files: `server/index.ts` (line 96-100) - stores 'managed-by-central-auth' as token values
- Current mitigation: Tokens managed externally by Central Auth service
- Recommendations: Document clearly that this is placeholder-only; never use these values directly; validate token integrity on use

**API Keys in Environment Variables Exposed in Logs:**
- Risk: `JSON.stringify()` logs may inadvertently log sensitive values
- Files: `server/routes.ts` (lines 151, 155, 7424-7425)
- Current mitigation: Intentional debug logs but could leak via error stacks
- Recommendations: Create sanitized logging function; never log entire request/response bodies; mask sensitive fields

**Cross-Site Session Fixation Risk:**
- Risk: Using in-memory session store without secure session configuration validation
- Files: `server/auth/routes.ts`, `server/index.ts`
- Current mitigation: Express-session default settings (httpOnly, secure in prod)
- Recommendations: Verify `secure: true` is set in production; implement CSRF tokens; set `sameSite: 'Strict'`

## Performance Bottlenecks

**Expensive Roster Export with Data Enrichment:**
- Problem: Roster export fetches all enrollments, then makes N queries for waivers + M queries for forms per student
- Files: `server/routes.ts` (line 2990-3080) - specifically the `enrichedCurrent` mapping
- Cause: Sequential database calls in Promise.all instead of batch operations
- Improvement path: Use single query with JOINs to fetch all enrollment+waiver+form data at once

**Memory-Intensive Student Portal Page:**
- Problem: `client/src/pages/student-portal.tsx` is 4,094 lines with multiple large states and complex renders
- Files: `client/src/pages/student-portal.tsx`
- Cause: All enrollment details, forms, appointments, communications rendered in single component with no virtualization
- Improvement path: Break into smaller components; implement virtualization for long lists; lazy load inactive tabs

**Unoptimized Communications Dashboard:**
- Problem: `client/src/components/CommunicationsDashboard.tsx` (3,687 lines) loads all communication history without pagination/infinite scroll
- Files: `client/src/components/CommunicationsDashboard.tsx`
- Cause: No pagination in message history queries; stores entire history in state
- Improvement path: Implement pagination/infinite scroll; add query-level filtering

**Inefficient Notification Template Query Pattern:**
- Problem: Notification engine fetches templates separately from schedules and does nested queries
- Files: `server/notificationEngine.ts` (line 1-80)
- Cause: Template data not batched with schedule lookups
- Improvement path: Denormalize template data or implement batch query operations

## Fragile Areas

**Enrollment State Machine:**
- Files: `server/routes.ts` (enrollment endpoints), `server/storage.ts` (enrollment queries)
- Why fragile: Multiple status fields (paymentStatus, enrollmentStatus, formSubmittedAt, formSubmissionData) updated in separate operations; no transaction boundaries
- Safe modification: Wrap enrollment status changes in database transactions; create single "update enrollment" function that updates all related fields atomically
- Test coverage: No tests for enrollment state transitions; risk of orphaned data (e.g., payment confirmed but enrollment not marked complete)

**Form Completion Submission Logic:**
- Files: `server/routes.ts` (form submission endpoints), `client/src/pages/student-portal.tsx` (form UI)
- Why fragile: Form data stored as JSON string in `formSubmissionData` field; no schema validation on submit; autopopulation logic fragile to label name changes
- Safe modification: Validate form responses against stored form schema; create migration script if field labels change
- Test coverage: No tests for form submission with various field types and validations

**Stripe Payment Integration:**
- Files: `server/routes.ts` (payment initiation ~1200 lines), `server/stripeConnect/routes.ts`
- Why fragile: Initialization happens at module load (line 34-50); webhook signatures may not validate correctly if stripe instance is null
- Safe modification: Make Stripe initialization synchronous or fail fast; add webhook signature validation tests; verify all payment state transitions
- Test coverage: No tests for webhook signature validation or idempotency

**Calendar/Appointment Sync:**
- Files: `server/calendar/routes.ts`, `server/appointments/routes.ts`
- Why fragile: Bidirectional sync between app and Google Calendar; no conflict resolution if both systems modified simultaneously
- Safe modification: Implement last-write-wins strategy or conflict detection; add idempotency keys to prevent duplicate operations
- Test coverage: No tests for concurrent calendar modifications

**Notification Scheduling Cron Jobs:**
- Files: `server/services/cronService.ts`, `server/notificationEngine.ts`
- Why fragile: Cron jobs may overlap if processing takes longer than schedule interval; no distributed lock mechanism
- Safe modification: Implement job locking (Redis or database-based); add timeout mechanisms; implement job queue
- Test coverage: No tests for concurrent notification processing

## Scaling Limits

**In-Memory Session Storage:**
- Current capacity: Limited to available server memory, typically 1-2GB for Node.js
- Limit: Fails when active users exceed ~10,000 simultaneous sessions
- Scaling path: Migrate to PostgreSQL session store using `connect-pg-simple` (already in package.json); consider Redis for very high scale

**Single Server Deployment:**
- Current capacity: Single Node.js process on one server
- Limit: Breaks with >50 concurrent requests if handling heavy computation (PDF generation, image processing)
- Scaling path: Implement load balancing; separate job processing to worker processes; use message queue for notifications

**Database Query Complexity:**
- Current capacity: Drizzle ORM queries are readable but not optimized; N+1 queries undetected
- Limit: Performance degrades with >5,000 enrollments or complex permission checks
- Scaling path: Implement query monitoring; denormalize frequently accessed data; add database indexes for filter/sort operations

**File Storage on Filesystem:**
- Current capacity: Attached assets stored locally in `attached_assets/` directory
- Limit: Disk fills with large PDF waivers/images; no backup mechanism shown
- Scaling path: Migrate to cloud storage (Google Cloud Storage already integrated for some use cases); implement S3/GCS for reliable scaling

## Dependencies at Risk

**Stripe SDK Version (`stripe@20.0.0`):**
- Risk: Major version 20; may have breaking changes; soft initialization allows operation without Stripe
- Impact: Payment features silently disabled if Stripe credentials missing; may cause checkout failures in production
- Migration plan: Pin to specific minor version; make Stripe initialization fail-fast in production; add health check endpoint

**Older Dependencies:**
- Risk: `moment@2.30.1` is deprecated in favor of date-fns; `pdfkit@0.17.2` has unmaintained status
- Impact: Security vulnerabilities, lack of bugfixes, potential license issues
- Migration plan: Replace moment.js with date-fns (already used); evaluate pdfkit alternatives or vendorize

**OpenID Connect Client (`openid-client@6.7.1`):**
- Risk: OIDC flow for external auth; minor version library may have vulnerabilities
- Impact: Authentication bypass if OIDC protocol mishandled
- Migration plan: Regular security audits; pin to specific minor version; add OIDC token validation tests

**Google APIs (`googleapis@159.0.0`):**
- Risk: Very high version number suggests rapid iteration; may have breaking changes
- Impact: Calendar sync breaks if Google changes API response format
- Migration plan: Add integration tests with Google API sandbox; implement response schema validation

## Missing Critical Features

**Distributed Job Queue for Notifications:**
- Problem: All notifications processed synchronously during request handling; no retry mechanism for failed sends
- Blocks: Cannot reliably send 1000+ SMS/emails in bulk without user request timing out
- Impact: Bulk communications fail silently if network issues or API rate limits hit

**Audit Logging:**
- Problem: No comprehensive audit trail of who changed what data and when
- Blocks: Cannot investigate data discrepancies; compliance/legal issues
- Impact: Cannot determine if enrollment was modified maliciously or by bug

**Idempotency Keys:**
- Problem: Payment endpoints and webhook handlers lack idempotency keys; concurrent requests can create duplicate charges
- Blocks: Cannot safely retry failed operations
- Impact: Risk of double-charging students

**Request Rate Limiting:**
- Problem: No per-user or per-IP rate limiting on API endpoints
- Blocks: Cannot prevent brute force attacks on auth endpoints; cannot prevent API abuse
- Impact: Vulnerable to DoS; signup endpoint vulnerable to credential stuffing

**CORS Configuration:**
- Problem: Not visible in codebase; may be too permissive if not configured
- Blocks: Cross-origin requests from mobile apps or third-party integrations
- Impact: Security risk or feature unavailable depending on configuration

## Test Coverage Gaps

**Authentication Flow:**
- What's not tested: Signup validation, password reset token expiry, email verification workflow, session persistence across requests
- Files: `server/auth/routes.ts`
- Risk: Auth bypass possible if logic is refactored; password reset could allow unauthorized access
- Priority: High

**Payment Processing:**
- What's not tested: Payment intent creation, webhook signature validation, idempotency handling, partial refunds, subscription renewals
- Files: `server/routes.ts` (payment endpoints), `server/stripeConnect/routes.ts`
- Risk: Silent payment failures; duplicate charges; refund discrepancies
- Priority: High

**Enrollment State Transitions:**
- What's not tested: Valid state transitions, payment → enrollment flow, form completion, waiver signing, unenrollment cascades
- Files: `server/routes.ts`, `server/storage.ts`
- Risk: Data inconsistency; orphaned enrollments; payment without enrollment or vice versa
- Priority: High

**Notification Scheduling:**
- What's not tested: Cron job execution, template variable interpolation, delivery retry logic, concurrent schedule overlap
- Files: `server/notificationEngine.ts`, `server/services/cronService.ts`
- Risk: Notifications sent to wrong users; missed schedule windows; duplicate sends
- Priority: High

**Calendar Synchronization:**
- What's not tested: Google OAuth flow, bidirectional sync, conflict resolution, appointment cancellation cascade
- Files: `server/calendar/routes.ts`, `server/appointments/routes.ts`
- Risk: Calendar out of sync with database; appointments created twice; orphaned calendar events
- Priority: Medium

**Form Submission Validation:**
- What's not tested: Form field types, conditional visibility, required field enforcement, data type conversion
- Files: `server/routes.ts` (form endpoints), `client/src/pages/student-portal.tsx`
- Risk: Invalid data in formSubmissionData; missing required information; type mismatches
- Priority: Medium

**Permission & Authorization:**
- What's not tested: Instructors accessing other instructors' data, students accessing admin endpoints, role elevation
- Files: `server/routes.ts` (all protected endpoints)
- Risk: Unauthorized data access; privilege escalation
- Priority: High

**Client-Side State Management:**
- What's not tested: React Query cache invalidation, form state during async operations, optimistic UI updates, error recovery
- Files: `client/src/pages/*.tsx`, `client/src/components/*.tsx`
- Risk: Stale UI data; inconsistent state; failed operations leave UI in broken state
- Priority: Medium

---

*Concerns audit: 2026-02-20*
