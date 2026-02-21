# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Full-stack monolithic Express/React application with shared TypeScript types and modular backend routes

**Key Characteristics:**
- Express.js backend serving both API and static React frontend
- TypeScript across server, client, and shared code
- Database-driven course management and user system
- Session-based authentication with role-based access control
- Modular routing with feature-specific route files
- React Query for client-side data fetching and caching
- Wouter for lightweight client-side routing

## Layers

**Presentation Layer (Client):**
- Purpose: React UI for students, instructors, and admins
- Location: `client/src/`
- Contains: Page components, UI components, hooks, utilities
- Depends on: React Query for server communication, Wouter for routing
- Used by: End users via browser

**API Layer (Server Routes):**
- Purpose: REST endpoint handlers and business logic
- Location: `server/routes.ts` (main), `server/{feature}/routes.ts` (modular)
- Contains: Express route handlers with request validation via Zod
- Depends on: Storage layer, notification engines, external services
- Used by: Client-side React components via fetch/API calls

**Service/Business Logic Layer:**
- Purpose: Domain-specific operations (appointments, notifications, calendar sync)
- Location: `server/{feature}/service.ts`, `server/notificationEngine.ts`, `server/emailService.ts`
- Contains: Appointment booking logic, notification templating, email/SMS delivery
- Depends on: Database, external APIs (Stripe, Google Calendar, Twilio)
- Used by: Route handlers

**Data Access Layer:**
- Purpose: Database abstraction and type-safe ORM operations
- Location: `server/storage.ts` (primary), `server/db.ts` (connection)
- Contains: CRUD functions mapped to database schema entities
- Depends on: Drizzle ORM, Neon serverless database
- Used by: All server layers

**Shared Layer:**
- Purpose: Centralized type definitions and schemas
- Location: `shared/schema.ts`
- Contains: Drizzle table definitions, Zod schemas, TypeScript types
- Depends on: Zod for validation, Drizzle ORM
- Used by: Server routes, client components, database operations

**Infrastructure/Support Layer:**
- Purpose: Authentication, external service integrations, utilities
- Location: `server/customAuth.ts`, `server/{external}.ts`
- Contains: Session management, Stripe client, email/SMS services, encryption
- Depends on: External APIs, bcrypt, crypto
- Used by: Route handlers, service layer

## Data Flow

**Authentication Flow:**

1. User submits login credentials to `/api/auth/login`
2. Express-session middleware validates password via bcrypt
3. Session stored in PostgreSQL via connect-pg-simple
4. Session ID sent in HttpOnly cookie
5. Client queries `/api/auth/user` to get authenticated user
6. useAuth hook in React caches user data via React Query

**Course Enrollment Flow:**

1. Student views course on public pages or course detail page
2. Student clicks "Register" → navigates to `/course-registration`
3. CourseRegistration component fetches course schedule via React Query
4. Student submits form → `POST /api/enrollments` with courseId, scheduleId
5. Server validates via `insertEnrollmentSchema`
6. Storage layer creates enrollment record + updates schedule capacity
7. If payment enabled: redirect to Stripe checkout
8. After payment: NotificationEngine sends confirmation email via SendGrid
9. Client receives success response, shows confirmation toast

**Notification Flow:**

1. Notification triggered by event (enrollment, appointment, license expiry reminder)
2. NotificationEngine queries notification template from storage
3. Template variables substituted with user/course/schedule data
4. NotificationEmailService formats and sends via SendGrid
5. NotificationSmsService sends SMS via Twilio (if SMS consent enabled)
6. Notification log recorded in database for audit trail

**Calendar Sync Flow (Appointments):**

1. Student books appointment via `/book-appointment`
2. Server creates InstructorAppointment record
3. CalendarService syncs to instructor's Google Calendar via OAuth
4. Reminder scheduled via CronService (notification at configured interval)
5. At reminder time: NotificationEngine sends email/SMS to student
6. On appointment time: student shown appointment details, can join/reschedule

**State Management:**

- **Client-side:** React Query handles server state with stale-time caching
- **Server-side:** Database as single source of truth; session state in PostgreSQL
- **Cache invalidation:** Manual via queryClient.invalidateQueries after mutations
- **Error handling:** Zod validation errors caught in route handlers; thrown errors logged and return 500

## Key Abstractions

**NotificationEngine:**
- Purpose: Unified notification templating and delivery
- Examples: `server/notificationEngine.ts`, `server/emailService.ts`, `server/smsService.ts`
- Pattern: Template variables object interpolated into email/SMS text; supports scheduled vs. immediate delivery

**Storage Layer:**
- Purpose: Abstract database operations into typed functions
- Examples: `storage.getUser()`, `storage.enrollStudent()`, `storage.updateCourse()`
- Pattern: Functions return typed objects from Drizzle ORM; validation at insertion via schema

**Route Modules:**
- Purpose: Organize related endpoints by feature
- Examples: `server/auth/routes.ts`, `server/appointments/routes.ts`, `server/store/routes.ts`
- Pattern: Each file exports Router instance with mounted endpoints; main routes.ts imports all

**Custom Auth Middleware:**
- Purpose: Enforce authentication and role-based access
- Examples: `isAuthenticated`, `requireInstructorOrHigher`, `requireAdminOrHigher`, `requireSuperadmin`
- Pattern: Middleware extracts user from session and attaches to `req.user`; next layer checks role

**React Query Integration:**
- Purpose: Declarative server state management on client
- Examples: `useQuery()` for reads, `useMutation()` for writes
- Pattern: queryKey is API path; on error, components show toast; on success, queryClient invalidates related keys

## Entry Points

**Server Entry Point:**
- Location: `server/index.ts`
- Triggers: Node.js process startup via `npm run dev` or `npm start`
- Responsibilities: Create Express app, set up middleware (JSON parsing, logging), register routes, start HTTP server on port 5000

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Render React App component, initialize Query provider, set up router

**Route Entry Points:**
- Location: `server/routes.ts` (registerRoutes function)
- Triggers: Server initialization
- Responsibilities: Set up all API routes, error handling, SEO middleware, Vite dev/static serving

## Error Handling

**Strategy:** Synchronous try-catch at route level; Zod validation at input level; logged errors do not crash server

**Patterns:**

- **Validation Errors:** Zod parses request body; if invalid, returns 400 with error details
  ```typescript
  try {
    const data = signupSchema.parse(req.body);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
  }
  ```

- **Authorization Errors:** Middleware returns 401 (unauthenticated) or 403 (forbidden)
  ```typescript
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  ```

- **Database Errors:** Caught in catch block, logged to console, return 500 to client
  ```typescript
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
  ```

- **Unhandled Route Errors:** Express error handler (line 51-57 in server/index.ts) catches and logs
  ```typescript
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  ```

## Cross-Cutting Concerns

**Logging:**
- Server: console.log/error to stdout; middleware logs all API requests with duration in `server/index.ts`
- Client: No centralized logging; errors logged to console in development

**Validation:**
- Server: Zod schemas at route boundaries for all user input (`server/auth/routes.ts`, `server/routes.ts`)
- Client: React Hook Form + Zod for form validation before submission

**Authentication:**
- Strategy: Express-session with PostgreSQL store; bcrypt for password hashing; session cookie httpOnly and secure in production
- Session check: `isAuthenticated` middleware in `server/customAuth.ts` queries user by session.userId

**Authorization:**
- Role-based: Four roles (student, instructor, admin, superadmin) defined in schema
- Account status: Active/pending/suspended/rejected tracked per user
- Resource ownership: Routes verify user.id matches resource.instructorId before allowing changes (e.g., appointment routes verify template ownership)

---

*Architecture analysis: 2026-02-20*
