# Overview

Practical Defense Training is a full-stack web application designed to be a professional firearms training management platform. It enables instructors to manage courses, schedules, and student enrollments, while providing students with a portal to browse, register for, and track their training progress. Key capabilities include integrated payment processing via Stripe, secure document management for waivers and certificates, advanced student management with license tracking, payment balance monitoring, and form completion status tracking. The platform aims to streamline the administration of firearms training and enhance the student experience.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React 18, TypeScript, Tailwind CSS, and shadcn/ui. It uses Wouter for routing, TanStack Query for state management, React Hook Form with Zod for forms, and Stripe Elements for payments. The application features a role-based routing system for students and instructors.

## Backend Architecture
The server uses a RESTful API design with Node.js and Express.js, written in TypeScript. Authentication is handled via Replit Auth with OpenID Connect, and session management uses Express sessions with PostgreSQL storage.

## Data Storage Solutions
The application utilizes Neon PostgreSQL as its relational database. Drizzle ORM is used for type-safe queries and schema management, with Drizzle Kit for migrations. Key entities include Users (with license management and role-based access), Courses, Course Schedules, Enrollments (with payment status), Sessions, App Settings, Course Information Forms, and Student Form Responses.

## Authentication and Authorization
Authentication is provided by Replit Auth with OpenID Connect. The system uses server-side sessions stored in PostgreSQL and implements role-based access control (student/instructor) with middleware-protected routes, HTTPS enforcement, secure cookies, and CSRF protection.

## Administrative Settings System
Instructors can manage global application configurations, such as home page course display limits, through an admin settings system. These settings are stored in PostgreSQL and feature real-time updates via cache invalidation and server-side validation.

## File Upload and Storage
The platform integrates with Google Cloud Storage for file management, including student waiver uploads and course certificates. It features a custom ACL system for permissions and an ObjectUploader component for progress tracking.

## Payment Processing
Stripe is integrated for secure payment processing, utilizing Stripe Elements for card handling. The payment flow involves enrollment creation followed by payment confirmation, ensuring PCI compliance.

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