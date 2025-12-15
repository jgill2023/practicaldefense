# Overview

Tactical Advantage is a full-stack web application designed as a professional firearms training management platform. It enables instructors to manage courses, schedules, and student enrollments, while providing students with a portal to browse, register for, and track their training progress. Key capabilities include integrated payment processing via Stripe, secure document management (waivers, certificates), advanced student management (license tracking, payment balance, form completion), and a comprehensive communications credit system. The platform aims to streamline administration, enhance the student experience, and ensure compliance with communication regulations.

# Recent Changes

## December 15, 2025 - Course-Specific Handgun Rental Add-on Configuration
Added the ability for instructors to configure handgun rental add-ons on a per-course basis with custom pricing, replacing the previous hardcoded $25.00 fee.

**Features:**
- Toggle to enable/disable handgun rental add-on for each course
- Custom pricing field for rental fee (defaults to $25.00 if not specified)
- Registration modal only shows add-on option when enabled for the course
- Dynamic price display based on course-specific settings

**Schema Changes:**
- Added `handgunRentalEnabled` (boolean, default false) to courses table
- Added `handgunRentalPrice` (decimal, default 25.00) to courses table

**Files Modified:**
- `shared/schema.ts`: Added new course fields
- `client/src/components/EditCourseForm.tsx`: Added add-on configuration UI in Basic Info tab
- `server/storage.ts`: Updated upsertPaymentIntent to use course-specific rental price
- `client/src/components/RegistrationModal.tsx`: Conditional display and dynamic pricing for add-on

**Behavior:**
- When `handgunRentalEnabled` is false, the add-on option is hidden from registration
- When enabled, the course-specific price is used in payment calculations
- Falls back to $25.00 if no custom price is set

## December 14, 2025 - Google Calendar Integration for Appointments
Added Google Calendar integration to automatically sync appointment bookings with the instructor's Google Calendar. When appointments are booked or cancelled, corresponding calendar events are created or deleted.

**Features:**
- OAuth 2.0 flow for connecting Google Calendar with HMAC-signed state parameters
- Automatic event creation when appointments are booked (both authenticated and guest bookings)
- Automatic event deletion when appointments are cancelled (by student or instructor)
- Admin Settings page for managing Google Calendar connection
- Calendar ID configuration for using specific calendars (defaults to primary)
- Auto-refresh of expired tokens

**Schema Changes:**
- Added `googleCalendarCredentials` table for storing OAuth tokens
- Added `googleEventId` column to `instructorAppointments` table

**Files Added/Modified:**
- `shared/schema.ts`: Added googleCalendarCredentials table and googleEventId column
- `server/googleCalendar/service.ts`: Google Calendar API operations (create, update, delete events)
- `server/googleCalendar/routes.ts`: OAuth endpoints (status, oauth-link, callback, disconnect, calendar-id)
- `server/appointments/routes.ts`: Integrated calendar sync into booking and cancellation flows
- `client/src/pages/settings.tsx`: New Settings page with Google Calendar authorization UI
- `client/src/App.tsx`: Registered /settings route
- `client/src/components/Layout.tsx`: Added Settings navigation link for admin users

**Environment Variables Required:**
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

**Security:**
- HMAC-signed OAuth state with 10-minute expiry
- Admin-only access for connecting/disconnecting calendar
- Graceful error handling that doesn't block appointment operations

## December 14, 2025 - Tim Kelly Admin/Instructor Permission Update
Updated Tim Kelly's account to have combined Admin + Instructor permissions. This allows Tim to access all instructor features (course management, appointments, availability, communications) as well as admin features (user management), while keeping superadmin-only features (credit granting) restricted.

**Changes:**
- Updated Tim Kelly's role from 'instructor' to 'admin' in the database
- Created weekly availability templates for Tim Kelly (9 AM - 5 PM, all 7 days)
- Updated 60+ role checks in server/routes.ts to include 'admin' alongside 'instructor' and 'superadmin'
- Admin role now inherits all instructor capabilities by design

**Permission Model:**
- **Student**: Basic access to courses, enrollments, profile
- **Instructor**: Course management, appointments, availability, communications
- **Admin**: All instructor features + user management (Tim Kelly's level)
- **Superadmin**: All admin features + credit granting

## December 2, 2025 - Stripe Connect OAuth Integration for Instructor Payment Routing
Added Stripe Connect OAuth functionality allowing instructors to connect their existing Stripe accounts to receive payments directly. This enables a self-service flow where instructors can link their accounts and the platform automatically routes payments to them.

**Features:**
- OAuth flow with HMAC-signed state parameters and HTTPS-enforced redirects
- Admin configuration panel for setting Stripe Client ID
- Instructor connection status dashboard showing account verification status
- Automatic payment routing for course enrollments and appointments when instructor has connected account
- Webhook processing for account synchronization and status updates
- Disconnect functionality with proper cleanup

**Schema Changes:**
- Added `stripeClientId` to appSettings for platform configuration
- Added Stripe Connect fields to users table: `stripeConnectAccountId`, `stripeConnectOnboardingComplete`, `stripeConnectDetailsSubmitted`, `stripeConnectChargesEnabled`, `stripeConnectPayoutsEnabled`, `stripeConnectCreatedAt`

**Files Added/Modified:**
- `server/stripeConnect/routes.ts`: OAuth endpoints, config, status, disconnect, webhooks
- `client/src/pages/stripe-connect.tsx`: Payment Settings page with role-gated access
- `server/storage.ts`: Updated payment intent creation with connected account routing
- `server/appointments/routes.ts`: Updated appointment payments with connected account routing
- `client/src/components/Layout.tsx`: Added Payment Settings navigation link
- `client/src/App.tsx`: Registered new route

**Security:**
- HMAC-signed OAuth state with timestamp validation (10-minute expiry)
- HTTPS-only redirects in production (localhost exception for development)
- Role-based access: Admins configure Client ID, Instructors connect accounts
- All interactive elements have data-testid attributes for testing

## November 23, 2025 - Enhanced User Management: Scrollable Edit Dialog and Password Change Feature
Added the ability to change user passwords directly from the Edit User dialog in the admin user management interface. Also fixed modal scrollability to accommodate all form fields.

**Changes:**
- Made Edit User dialog scrollable by adding `max-h-[90vh] overflow-y-auto` classes to DialogContent
- Added optional password field to the edit user form (frontend and backend schemas)
- Implemented password hashing on the backend when updating user passwords
- Added security enhancement to exclude sensitive fields (passwordHash, password reset tokens, email verification tokens) from API responses
- Password field includes helpful placeholder text: "Leave blank to keep current password"
- Empty password field preserves existing user password

**Security:**
- User update API responses now properly exclude passwordHash and all token fields
- Password hashing is performed server-side before storing in database
- Only admin and superadmin users can access the user management functionality

**Files Modified:**
- `client/src/pages/user-management.tsx`: Added password field to form and made dialog scrollable
- `server/routes.ts`: Added password hashing logic and response sanitization

## November 21, 2025 - Fixed Appointment Type Edit Dialog Price Display Error
Fixed a bug where editing appointment types caused a runtime error: "typeForm.pricePerHour.toFixed is not a function". The issue occurred because database decimal values are returned as strings to preserve precision, and calling `.toFixed()` on a string fails.

**Changes:**
- Modified `appointments.tsx` line 1027 to wrap `pricePerHour` with `Number()` before calling `.toFixed(2)`
- Modified `appointments.tsx` line 350 to ensure form initialization converts `pricePerHour` to a number
- Cleared Vite cache to ensure browser receives updated code

**Testing:**
- End-to-end test passed successfully
- Verified appointment types can be edited without errors
- Confirmed price displays correctly (e.g., "$150.00/hour")

## November 21, 2025 - Comprehensive Fix for Course Available Spots Calculation
Fixed a critical bug where course schedules displayed incorrect available spots throughout all registration flows. The system was relying on a stale `availableSpots` field in the database that wasn't updated with new enrollments. All components now calculate availability dynamically from real-time enrollment data.

**Changes:**
- Modified `CourseCard.tsx` to calculate available spots from confirmed/pending enrollments
- Modified `schedule-list.tsx` to calculate available spots from confirmed/pending enrollments
- Modified `RegistrationModal.tsx` to calculate spots for schedule selection and display
- Modified `course-registration.tsx` to calculate spots for schedule filtering and display
- Updated `landing.tsx` waitlist check to use dynamic spot calculations
- Added proper numeric coercion to prevent NaN calculation errors
- Calculation logic: `actualAvailableSpots = Math.max(0, maxSpots - enrollmentCount)` where enrollmentCount only includes confirmed and pending enrollments

**Testing:**
- End-to-end tests passed successfully
- Verified correct calculation across all registration views (course cards, modals, registration pages)
- Confirmed waitlist logic triggers only when courses are actually full

This ensures the UI always displays accurate availability based on real-time enrollment status rather than stale database values. All stale `schedule.availableSpots` references have been eliminated from the codebase.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend is built with React 18, TypeScript, Tailwind CSS, and shadcn/ui. It uses Wouter for routing, TanStack Query for state management, React Hook Form with Zod for forms, and Stripe Elements for payments. A role-based routing system is implemented for students and instructors.

## Technical Implementations
The server utilizes a RESTful API with Node.js and Express.js (TypeScript). Authentication is handled via Replit Auth (OpenID Connect) with server-side sessions stored in PostgreSQL. The system employs a four-tier role-based access control (Student, Instructor, Admin, Super Admin) with middleware-protected routes, HTTPS enforcement, secure cookies, and CSRF protection. User accounts have statuses (pending, active, suspended, rejected) with a pending approval workflow. An administrative settings system allows instructors to manage global application configurations.

## System Design Choices
Data storage uses Neon PostgreSQL with Drizzle ORM for type-safe queries and schema management. Key entities include Users, Courses, Course Schedules, Enrollments, Sessions, App Settings, Course Information Forms, and Student Form Responses. File uploads, including waivers and certificates, integrate with Google Cloud Storage, featuring a custom ACL system. Payment processing is handled by Stripe, including robust sales tax calculation with idempotent handling and comprehensive refund management. A communications credit system with atomic credit deduction and Superadmin credit management is implemented. SMS consent management is integrated via Terms of Service, automatic filtering, Twilio STOP message handling via webhooks, and a student SMS preferences dashboard, all supported by phone number normalization for compliance.

# External Dependencies

## Core Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Auth**: Authentication service with OpenID Connect.
- **Google Cloud Storage**: File storage and management.

## Payment Processing
- **Stripe**: Payment processing platform.

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Component library.

## Data and API Management
- **TanStack Query**: Server state management and API caching.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Runtime type validation.

## Development Services
- **Replit**: Development environment and deployment.
- **Vite**: Build tool and development server.