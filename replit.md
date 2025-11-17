# Overview

Tactical Advantage is a full-stack web application designed to be a professional firearms training management platform. It enables instructors to manage courses, schedules, and student enrollments, while providing students with a portal to browse, register for, and track their training progress. Key capabilities include integrated payment processing via Stripe, secure document management for waivers and certificates, advanced student management with license tracking, payment balance monitoring, and form completion status tracking. The platform aims to streamline the administration of firearms training and enhance the student experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React 18, TypeScript, Tailwind CSS, and shadcn/ui. It uses Wouter for routing, TanStack Query for state management, React Hook Form with Zod for forms, and Stripe Elements for payments. The application features a role-based routing system for students and instructors.

## Backend Architecture
The server uses a RESTful API design with Node.js and Express.js, written in TypeScript. Authentication is handled via Replit Auth with OpenID Connect, and session management uses Express sessions with PostgreSQL storage.

## Template Setup

This is a template for firearms instructors. New instructors should:

1. Fork this Repl to create their own instance
2. Add required Stripe secret via Replit Secrets
3. Optionally add Twilio and SendGrid secrets for advanced communications features
4. See INSTRUCTOR_SETUP.md for detailed setup instructions

## Data Storage Solutions
The application utilizes Neon PostgreSQL as its relational database. Drizzle ORM is used for type-safe queries and schema management, with Drizzle Kit for migrations. Key entities include Users (with license management and role-based access), Courses, Course Schedules, Enrollments (with payment status), Sessions, App Settings, Course Information Forms, and Student Form Responses.

## Authentication and Authorization
Authentication is provided by Replit Auth with OpenID Connect. The system uses server-side sessions stored in PostgreSQL and implements role-based access control (student/instructor/superadmin) with middleware-protected routes, HTTPS enforcement, secure cookies, and CSRF protection.

### Role Hierarchy and User Management
The platform implements a comprehensive four-tier role hierarchy with strict privilege levels:
- **Student**: Access to student portal, course browsing, enrollment, and personal profile management
- **Instructor**: Inherits student privileges plus full access to instructor dashboard, course management, student management, communications, and scheduling features
- **Admin**: Inherits all instructor privileges plus user account management, including creating accounts and approving/rejecting pending registrations
- **Super Admin**: Inherits all admin and instructor privileges plus exclusive access to system administration features (credit management, advanced settings)

Permission helpers enforce the hierarchy consistently:
- Backend middleware: `requireInstructorOrHigher`, `requireAdminOrHigher`, `requireSuperadmin`, `requireActiveAccount`
- Frontend utilities: `isInstructorOrHigher(user)`, `isAdminOrHigher(user)`, `isSuperAdmin(user)`, `canCreateAccounts(user)`, `isActiveAccount(user)`

### User Status and Pending Approval Workflow
All user accounts have a status that controls access to the platform:
- **pending**: New self-registrations default to pending status and must be approved by Instructor/Admin/Super Admin before gaining access
- **active**: Approved accounts with full access to features based on their role
- **suspended**: Temporarily restricted accounts (future feature)
- **rejected**: Denied registrations with optional reason stored

Pending users can only access:
- Landing page and public information pages
- Pending approval status page (`/pending-approval`)
- Contact and support pages

### User Management Interface
Admin and Super Admin users can access the User Management page (`/admin/users`) which provides:
- **User Listing**: Complete user directory with role, status, and account details
- **Filtering**: Quick filter by user status (All, Pending, Active, Suspended, Rejected)
- **Pending Badge Counter**: Real-time notification in navigation showing pending approval count
- **Manual Account Creation**: Create accounts directly with any role and active status (Admin+ only)
- **Approve/Reject Actions**: Process pending registrations with optional rejection reasons
- **Role Visibility**: Color-coded role badges for quick identification

The system tracks status changes with timestamps (`statusUpdatedAt`) and reasons (`statusReason`) for audit purposes.

To designate role elevations:
```sql
-- Promote to Admin
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

-- Promote to Super Admin
UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com';
```

## Administrative Settings System
Instructors can manage global application configurations, such as home page course display limits, through an admin settings system. These settings are stored in PostgreSQL and feature real-time updates via cache invalidation and server-side validation.

## File Upload and Storage
The platform integrates with Google Cloud Storage for file management, including student waiver uploads and course certificates. It features a custom ACL system for permissions and an ObjectUploader component for progress tracking.

## Payment Processing
Stripe is integrated for secure payment processing, utilizing Stripe Elements for card handling. The payment flow involves enrollment creation followed by payment confirmation, ensuring PCI compliance.

## Refund Processing
The platform features comprehensive refund management integrated with Stripe. Instructors can process refunds for student enrollments through the instructor portal. The system supports full or partial refunds, validates refund amounts, stores refund reasons, and automatically updates enrollment payment status. When a refund is processed, the system creates a Stripe refund transaction, stores refund details (amount and reason) in the database, and triggers automatic notifications to students via the notification engine.

## Communications Credit System
The platform includes a comprehensive credit tracking and purchasing system for managing SMS and email communications. Instructors must purchase credits to send messages through the communications dashboard. The system features atomic credit deduction with database-level constraints to prevent race conditions and negative balances. Credits can be purchased through Stripe-integrated packages or granted by superadmins. Every credit transaction is recorded with complete audit trails including purchase history, usage tracking, and refunds.

### Superadmin Credit Management
Superadmin accounts have elevated privileges to manually grant free message credits to instructors without payment. This administrative feature includes:
- **Instructor Overview**: View all instructors with current SMS and email credit balances in a centralized dashboard
- **Credit Granting**: Award free credits to instructors with customizable amounts and optional descriptions
- **Audit Trail**: All admin grants are tracked with the `admin_grant` transaction type and include the granting superadmin's user ID (`grantedByUserId`) for complete accountability
- **Access Control**: Admin credit management routes are protected by `requireSuperadmin` middleware, ensuring only authorized users can grant credits

To designate a superadmin account, update the user's role in the database:
```sql
UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com';
```

The Admin Credits page is accessible via the navigation menu (visible only to superadmin users) at `/admin/credits`.

## SMS Consent Management System
The platform implements comprehensive SMS consent and opt-out management to ensure legal compliance and respect user preferences. The system integrates consent collection, filtering, webhook handling, and student preference management.

### Consent Collection via Terms of Service
- SMS consent is integrated into the Terms of Service checkbox during registration
- Users must accept the Terms (which includes SMS consent language) to create an account
- The `smsConsent` field defaults to `true` when users accept Terms during registration
- No separate SMS checkbox is required - consent is embedded in the Terms agreement

### Automatic SMS Filtering
- All SMS broadcasts automatically exclude students where `smsConsent=false`
- Instructors receive real-time notifications showing the count of excluded students before sending
- The filtering system honors both the master `smsConsent` flag and individual notification preferences
- Phone number normalization ensures reliable matching across different formats (E.164, 10-digit, formatted)

### Twilio STOP Message Handling
- Webhook endpoint (`/api/twilio/sms-webhook`) processes Twilio STOP messages automatically
- When students text STOP (or variations: STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT), the system:
  - Normalizes the incoming phone number to E.164 format for reliable matching
  - Updates the user's `smsConsent` field to `false` in the database
  - Syncs with Twilio's block list to ensure compliance
- All inbound SMS messages are logged in the communications table for audit purposes

### Student SMS Preferences Dashboard
Students can manage their SMS preferences through the Student Portal profile settings:
- **Master SMS Consent Toggle**: Top-level control to enable/disable all SMS communications
- **Cascading Preference Controls**: When SMS consent is disabled, all sub-preferences are automatically disabled:
  - SMS Course & License Reminders
  - SMS Payment Notifications
  - SMS Announcements
- Profile updates properly persist `smsConsent` changes through validated backend endpoints

### Phone Number Normalization
To ensure reliable STOP message handling and user matching:
- **Normalization Function**: `normalizePhoneNumber()` converts all phone formats to E.164 (+1XXXXXXXXXX)
- **Database Lookup**: `getUserByPhone()` uses normalized comparison to handle format differences
- **Twilio Integration**: Webhook normalizes incoming phone numbers before database lookup
- This prevents STOP message failures due to format mismatches between storage and Twilio

### Compliance and Audit Trail
- All SMS consent changes are tracked with timestamps and reasons
- Inbound SMS messages (including STOP replies) are logged with message SIDs and user associations
- Instructors can review excluded student counts to ensure proper filtering
- The system maintains complete audit trails for compliance verification

## Development and Build System
The project uses Vite for fast development and optimized production builds, TypeScript for strict type checking, and path aliases for organized imports.

# External Dependencies

## Core Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Auth**: Authentication service with OpenID Connect.
- **Google Cloud Storage**: File storage and management.

## Payment Processing
- **Stripe**: Payment processing platform.

## Development Services
- **Replit**: Development environment and deployment.
- **Vite**: Build tool and development server.
- **npm**: Package management.

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Headless UI components.
- **shadcn/ui**: Component library.
- **Lucide React**: Icon library.

## Data and API Management
- **TanStack Query**: Server state management and API caching.
- **Drizzle ORM**: Type-safe database ORM.
- **Zod**: Runtime type validation.

## File Management
- **Uppy**: File upload library.
- **Google Cloud Storage SDK**: Cloud storage integration.