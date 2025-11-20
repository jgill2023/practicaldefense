# Overview

Tactical Advantage is a full-stack web application designed as a professional firearms training management platform. It enables instructors to manage courses, schedules, and student enrollments, while providing students with a portal to browse, register for, and track their training progress. Key capabilities include integrated payment processing via Stripe, secure document management (waivers, certificates), advanced student management (license tracking, payment balance, form completion), and a comprehensive communications credit system. The platform aims to streamline administration, enhance the student experience, and ensure compliance with communication regulations.

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