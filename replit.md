# Overview

Tactical Advantage is a full-stack web application designed as a professional firearms training management platform. It enables instructors to manage courses, schedules, and student enrollments, while providing students with a portal to browse, register for, and track their training progress. Key capabilities include integrated payment processing via Stripe, secure document management (waivers, certificates), advanced student management (license tracking, payment balance, form completion), and a comprehensive communications credit system. The platform aims to streamline administration, enhance the student experience, and ensure compliance with communication regulations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The frontend is built with React 18, TypeScript, Tailwind CSS, and shadcn/ui. It uses Wouter for routing, TanStack Query for state management, React Hook Form with Zod for forms, and Stripe Elements for payments. A role-based routing system is implemented for students and instructors.

## Technical Implementations
The server utilizes a RESTful API with Node.js and Express.js (TypeScript). Authentication is handled via Replit Auth (OpenID Connect) with server-side sessions stored in PostgreSQL. The system employs a four-tier role-based access control (Student, Instructor, Admin, Super Admin) with middleware-protected routes, HTTPS enforcement, secure cookies, and CSRF protection. User accounts have statuses (pending, active, suspended, rejected) with a pending approval workflow. An administrative settings system allows instructors to manage global application configurations. Key features include a unified shopping cart supporting both Printify merchandise and local products, course-specific handgun rental add-on configuration, and internal appointment scheduling with availability rules. Enhanced user management features like password changes and scrollable edit dialogs are present. Accurate course availability is dynamically calculated from real-time enrollment data across all registration flows. Stripe Connect OAuth functionality allows instructors to connect their accounts for direct payment routing.

## System Design Choices
Data storage uses Neon PostgreSQL with Drizzle ORM for type-safe queries and schema management. Key entities include Users, Courses, Course Schedules, Enrollments, Sessions, App Settings, Course Information Forms, and Student Form Responses. File uploads, including waivers and certificates, integrate with Google Cloud Storage, featuring a custom ACL system. Payment processing is handled by Stripe, including robust sales tax calculation with idempotent handling and comprehensive refund management. A communications credit system with atomic credit deduction and Superadmin credit management is implemented. SMS consent management is integrated via Terms of Service, automatic filtering, Twilio STOP message handling via webhooks, and a student SMS preferences dashboard, all supported by phone number normalization for compliance.

# Online Course Enrollment (Moodle LMS Integration)

The platform includes integration with Moodle LMS for online course delivery, specifically designed for the Online NM Concealed Carry Course.

## How It Works
1. Students visit the Online NM CCW course page and click "Enroll Now"
2. They complete an enrollment form with personal information
3. NM Gross Receipts Tax (7.875% Albuquerque combined rate) is calculated on the course price
4. Payment is processed via Stripe
5. Upon successful payment, the student is automatically enrolled in Moodle
6. Login credentials are sent via both email (SendGrid) and SMS (Twilio)

## Required Configuration
To enable Moodle integration, the following environment variables must be set:
- **MOODLE_URL**: The base URL of your Moodle instance (e.g., https://learn.example.com)
- **MOODLE_TOKEN**: Web service token with permissions for user creation and course enrollment
- **MOODLE_COURSE_ID**: The numeric ID of the course in Moodle
- **MOODLE_ROLE_ID** (optional): The role ID for enrolled users (defaults to 5 = Student)

## Moodle Web Services Requirements
The Moodle token must have access to these web service functions:
- `core_user_create_users`: Create new user accounts
- `core_user_get_users_by_field`: Check for existing users by email
- `enrol_manual_enrol_users`: Enroll users in courses
- `core_webservice_get_site_info`: Test connection (optional)

## Database Schema
Online course enrollments are tracked in the `online_course_enrollments` table with comprehensive status tracking:
- `pending_payment`: Initial state, awaiting payment
- `payment_complete`: Payment succeeded
- `moodle_sync_pending`: Moodle enrollment in progress
- `moodle_sync_failed`: Moodle enrollment failed (can be retried)
- `completed`: Successfully enrolled in Moodle
- `refunded`: Payment refunded
- `cancelled`: Enrollment cancelled

## API Endpoints
- `POST /api/online-course/initiate-enrollment`: Start enrollment, create payment intent
- `POST /api/online-course/confirm-payment`: Confirm payment and trigger Moodle sync
- `GET /api/online-course/enrollments`: List all enrollments (admin)
- `POST /api/online-course/retry-moodle-sync/:id`: Retry failed Moodle sync (admin)
- `GET /api/online-course/test-moodle`: Test Moodle connection (admin)

# External Dependencies

## Core Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Replit Auth**: Authentication service with OpenID Connect.
- **Google Cloud Storage**: File storage and management.
- **Twilio**: For SMS communication and consent management.
- **Moodle LMS**: External learning management system for online courses.

## Payment Processing
- **Stripe**: Payment processing platform, including Stripe Connect for instructor payouts.

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