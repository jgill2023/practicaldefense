# Overview

ProTrain Academy is a professional firearms training management platform built as a full-stack web application. The system enables instructors to manage courses, schedules, and student enrollments while providing students with a portal to browse, register for, and track their training progress. The platform includes integrated payment processing via Stripe and secure document management for training waivers and certificates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side application is built using React 18 with TypeScript and follows a modern component-based architecture:

- **UI Framework**: React with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Handling**: React Hook Form with Zod validation schemas
- **Payment Processing**: Stripe Elements for secure payment handling

The application uses a role-based routing system that redirects users to appropriate dashboards based on their role (student/instructor). Course management functionality is consolidated on the dedicated Course Management page to avoid confusion and provide a unified experience for instructors.

## Backend Architecture
The server follows a RESTful API design pattern built on Node.js:

- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints organized by resource (courses, enrollments, users)
- **Authentication**: Replit Auth integration with OpenID Connect (OIDC) for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple

## Data Storage Solutions
The application uses a relational database approach with PostgreSQL:

- **Database**: Neon PostgreSQL (serverless PostgreSQL)
- **ORM**: Drizzle ORM for type-safe database queries and schema management
- **Schema Management**: Drizzle Kit for migrations and schema versioning
- **Connection**: Connection pooling via @neondatabase/serverless for optimal performance

### Database Schema
Key entities include:
- **Users**: Stores user profiles with role-based access (student/instructor)
- **Courses**: Course information with pricing, capacity, and categorization
- **Course Schedules**: Multiple schedule instances per course for recurring training
- **Enrollments**: Links students to course schedules with payment status tracking
- **Sessions**: Persistent session storage for authentication
- **App Settings**: Global application configuration including home page course display limits

## Authentication and Authorization
The system implements a secure authentication flow:

- **Provider**: Replit Auth with OpenID Connect integration
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Role-Based Access**: User roles (student/instructor) determine available features and routes
- **Protected Routes**: Middleware-based route protection with automatic redirects
- **Security**: HTTPS enforcement, secure cookies, and CSRF protection

## Administrative Settings System
The platform includes a comprehensive admin settings system for instructors:

- **App Settings Management**: Centralized configuration stored in PostgreSQL
- **Home Page Controls**: Configurable course display limits (1-50 courses) for landing page
- **Real-time Updates**: Settings changes automatically update the home page via cache invalidation
- **Validation**: Server-side validation ensures settings remain within acceptable ranges
- **UI Integration**: Settings panel integrated into Course Management page with form validation

## File Upload and Storage
The platform includes a comprehensive file management system:

- **Storage Provider**: Google Cloud Storage integration
- **Access Control**: Custom ACL (Access Control List) system for file permissions
- **Upload Interface**: Custom ObjectUploader component with progress tracking
- **Use Cases**: Student waiver uploads and course certificate management
- **Form Integration**: Upload buttons properly configured with type="button" to prevent unintended form submissions

## Payment Processing
Integrated Stripe payment system handles course enrollments:

- **Payment Provider**: Stripe with Elements for secure card processing
- **Flow**: Two-step process - enrollment creation followed by payment confirmation
- **Security**: PCI-compliant payment handling with no sensitive card data storage
- **Integration**: Seamless checkout experience within the application

## Development and Build System
The project uses modern development tooling:

- **Build Tool**: Vite for fast development and optimized production builds
- **Development**: Hot module replacement and development server
- **TypeScript**: Strict type checking across frontend and backend
- **Path Aliases**: Organized imports with @ and @shared path aliases
- **Environment**: Separate development and production configurations

# External Dependencies

## Core Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Replit Auth**: Authentication service with OpenID Connect support
- **Google Cloud Storage**: File storage and management service

## Payment Processing
- **Stripe**: Payment processing platform with PCI compliance
  - Stripe Elements for secure payment forms
  - Server-side payment intent creation and confirmation

## Development Services
- **Replit**: Development environment and deployment platform
- **Vite**: Build tool and development server
- **npm**: Package management and dependency resolution

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI components for accessibility
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Data and API Management
- **TanStack Query**: Server state management and API caching
- **Drizzle ORM**: Type-safe database ORM
- **Zod**: Runtime type validation and schema definition

## File Management
- **Uppy**: File upload library with progress tracking
- **Google Cloud Storage SDK**: Cloud storage integration