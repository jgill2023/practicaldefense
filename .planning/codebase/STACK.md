# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- TypeScript 5.6.3 - Used for all backend server code in `server/` and frontend code in `client/src/`
- JavaScript - Configuration files and build tooling

**Secondary:**
- HTML/CSS - Client-side rendering via React

## Runtime

**Environment:**
- Node.js (runtime version from package.json indicates ESNext module support)

**Package Manager:**
- npm - Primary package manager

## Frameworks

**Core:**
- Express 4.21.2 - HTTP server framework for backend API in `server/index.ts`
- React 18.3.1 - Frontend UI framework in `client/src/`
- Drizzle ORM 0.39.1 - Database ORM for PostgreSQL queries in `server/db.ts`

**UI Component Library:**
- Radix UI 1.x (multiple @radix-ui packages) - Accessible component primitives
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Lucide React 0.453.0 - Icon library

**Form Handling:**
- React Hook Form 7.55.0 - Form state management in `client/src/`
- @hookform/resolvers 3.10.0 - Validation schema integration
- Zod 3.24.2 - Type-safe schema validation in both server and client

**Data Fetching:**
- @tanstack/react-query 5.60.5 - Server state management and caching
- @tanstack/react-table 8.21.3 - Data table management

**Build/Dev:**
- Vite 5.4.19 - Frontend build tool with dev server in `vite.config.ts`
- esbuild 0.25.0 - Used in build script for server bundling
- tsx 4.19.1 - TypeScript execution for Node.js scripts
- Tailwind CSS Vite plugin 4.1.3 - Tailwind integration with Vite

**Testing:**
- Not detected in package.json (no Jest, Vitest, or similar testing frameworks)

## Key Dependencies

**Critical:**
- Stripe 20.0.0 - Payment processing integration in `server/stripeClient.ts`, `server/appointments/routes.ts`
- @stripe/react-stripe-js 4.0.0 and @stripe/stripe-js 7.9.0 - Stripe client for React components
- stripe-replit-sync 0.0.12 - Replit-specific Stripe connector sync

**Email & Communication:**
- @sendgrid/mail 8.1.6 - Email service integration in `server/emailService.ts`
- Twilio 5.9.0 - SMS service integration in `server/smsService.ts`, `server/twilioService.ts`

**Database:**
- @neondatabase/serverless 0.10.4 - Serverless PostgreSQL client with connection pooling in `server/db.ts`
- drizzle-kit 0.30.4 - Database migration tool (CLI only)

**Cloud Storage:**
- @google-cloud/storage 7.17.0 - Google Cloud Storage client in `server/objectStorage.ts`

**Calendar & Scheduling:**
- googleapis 159.0.0 - Google APIs SDK for Calendar OAuth integration in `server/routes.ts`
- node-cron 4.2.1 - Cron job scheduling in `server/services/cronService`
- react-big-calendar 1.19.4 - Calendar UI component in `client/src/`

**Authentication:**
- express-session 1.18.1 - Session management in `server/customAuth.ts`
- connect-pg-simple 10.0.0 - PostgreSQL session store for express-session
- passport 0.7.0 - Authentication middleware
- passport-local 1.0.0 - Local username/password authentication strategy
- openid-client 6.7.1 - OpenID Connect client for OAuth flows
- bcrypt 6.0.0 - Password hashing in `server/customAuth.ts`

**File Upload & Processing:**
- @uppy/core 5.0.1, @uppy/dashboard 5.0.1, @uppy/react 5.0.2 - File upload UI
- @uppy/aws-s3 5.0.0 - S3 upload integration
- multer 2.0.2 - Multipart form data handling
- exceljs 4.4.0 - Excel file generation and parsing
- pdfkit 0.17.2 - PDF generation in `server/` (likely for document generation)

**UI Animations & UX:**
- Framer Motion 11.13.1 - Animation library
- Embla Carousel 8.6.0 - Carousel component
- next-themes 0.4.6 - Theme switching (light/dark mode)

**Drag & Drop:**
- @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @dnd-kit/modifiers 9.0.0, @dnd-kit/utilities 3.2.2 - Drag and drop library
- react-resizable-panels 2.1.7 - Resizable panel UI

**Other Utilities:**
- wouter 3.3.5 - Lightweight client-side router (React)
- date-fns 3.6.0 and date-fns-tz 3.2.0 - Date manipulation and timezone handling
- moment 2.30.1 - Date library (legacy, may be deprecated)
- memoizee 0.4.17 - Function memoization for caching
- memorystore 1.6.7 - In-memory session storage fallback
- react-quill 2.0.0 - Rich text editor component
- react-signature-canvas 1.1.0-alpha.2 - Signature capture component
- recharts 2.15.2 - Charts and data visualization
- ws 8.18.0 - WebSocket library
- input-otp 1.4.2 - OTP input component
- vaul 1.1.2 - Drawer/sheet component
- clsx 2.1.1 - Utility for conditional classNames
- tailwind-merge 2.6.0 - Merge Tailwind classes with conflict resolution
- class-variance-authority 0.7.1 - CSS class variance patterns
- cmdk 1.1.1 - Command palette/search component
- zod-validation-error 3.4.0 - Human-readable Zod validation error formatting
- openai 5.20.1 - OpenAI API client (detected in package.json, may be unused or for future features)

## Configuration

**Environment:**
- `DATABASE_URL` - PostgreSQL connection string for Neon serverless database (required)
- `STRIPE_SECRET_KEY` - Stripe API secret key (fallback source)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key for client-side (fallback source)
- `SENDGRID_API_KEY` - SendGrid email service API key (required if email sending enabled)
- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS (required if SMS enabled)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (required if SMS enabled)
- `TWILIO_PHONE_NUMBER` - Twilio phone number for outbound SMS
- `GOOGLE_SERVICE_ACCOUNT_KEY` - JSON service account key for Google APIs (Calendar OAuth)
- `INTERNAL_API_KEY` - Internal API key for calendar operations
- `ENCRYPTION_MASTER_KEY` - Master key for encrypting sensitive data (optional, enables encryption features)
- `PRINTIFY_API_KEY` - Printify API key for print-on-demand integration in `server/printify/service.ts`
- `MOODLE_TOKEN` - Moodle LMS integration token (detected in `server/moodle.ts`)
- `REPLIT_DEPLOYMENT` - Set to '1' in production, determines Stripe environment
- `NODE_ENV` - Set to 'development' or 'production'
- `REPLIT_CONNECTORS_HOSTNAME` - Replit connectors endpoint for credential management (Replit-specific)

**Build:**
- `tsconfig.json` - TypeScript compiler configuration with strict mode enabled, ESNext target
- `vite.config.ts` - Vite build configuration with React plugin, path aliases
- `drizzle.config.ts` - Drizzle ORM configuration for PostgreSQL dialect
- `postcss.config.js` - PostCSS configuration for Tailwind CSS
- `tailwind.config.ts` - Tailwind CSS theme customization and extensions

## Platform Requirements

**Development:**
- Node.js 20.16.11 or compatible version
- npm or compatible package manager
- TypeScript 5.6.3
- PostCSS 8.4.47 for CSS processing
- Git for version control

**Production:**
- Deployed on Replit platform (indicated by Replit-specific environment variables and plugins)
- Requires PostgreSQL database (Neon serverless)
- Requires Stripe account for payment processing
- Requires SendGrid account for email delivery
- Requires Twilio account for SMS messaging
- Requires Google Cloud service account for Calendar API access

## Third-Party Credentials & Services

**Stripe:**
- Credentials source priority: env `STRIPE_SECRET_KEY` → database storage → Replit connectors
- API version: 2025-08-27.basil
- Supports both regular Stripe and Stripe Connect (for instructor payouts)

**Database:**
- PostgreSQL via Neon serverless with WebSocket support
- Connection pooling configured in `server/db.ts` (max 10 connections, 7500 uses limit, 15-minute lifetime)

**Storage:**
- Google Cloud Storage via Replit sidecar at http://127.0.0.1:1106
- Uses external account credentials with token exchange

---

*Stack analysis: 2026-02-20*
