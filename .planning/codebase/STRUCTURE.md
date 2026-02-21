# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
practicaldefense/
├── client/                          # React frontend application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Images, icons, media
│   │   ├── components/              # Reusable React components
│   │   │   └── ui/                  # Shadcn/Radix UI primitives
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities and helpers
│   │   ├── pages/                   # Page-level components (51 pages)
│   │   ├── App.tsx                  # Main app router
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles (Tailwind)
│   └── src (Vite-specific)
├── server/                          # Express backend application
│   ├── appointments/                # Appointment booking feature
│   │   ├── routes.ts                # Appointment API endpoints
│   │   ├── service.ts               # Appointment business logic
│   │   └── templateVariables.ts     # Notification variable mapping
│   ├── auth/                        # Authentication routes
│   │   └── routes.ts                # Login, signup, password reset
│   ├── calendar/                    # Google Calendar integration
│   │   └── routes.ts                # Calendar sync endpoints
│   ├── giftCards/                   # Gift card feature
│   │   ├── routes.ts                # Gift card API
│   │   ├── service.ts               # Delivery and validation logic
│   │   └── delivery.ts              # Email delivery for gift cards
│   ├── printify/                    # Printify POD integration
│   │   └── service.ts               # Product syncing
│   ├── services/                    # Shared backend services
│   │   ├── calendarService.ts       # Calendar operations
│   │   └── cronService.ts           # Scheduled jobs (reminders)
│   ├── store/                       # E-commerce store feature
│   │   └── routes.ts                # Store API endpoints
│   ├── stripeConnect/               # Stripe Connect for instructor payouts
│   │   └── routes.ts                # Connect onboarding endpoints
│   ├── utils/                       # Utilities
│   │   └── encryption.ts            # Data encryption
│   ├── contentFilter.ts             # Content moderation
│   ├── customAuth.ts                # Session auth middleware
│   ├── db.ts                        # Database connection
│   ├── emailService.ts              # SendGrid email delivery
│   ├── index.ts                     # Server entry point
│   ├── moodle.ts                    # Moodle LMS integration
│   ├── notificationEngine.ts        # Unified notification system
│   ├── objectAcl.ts                 # File access control
│   ├── objectStorage.ts             # Google Cloud Storage integration
│   ├── routes.ts                    # Main API routes (9943 lines)
│   ├── seoMiddleware.ts             # SEO metadata injection
│   ├── seo.ts                       # Sitemap and robots.txt generation
│   ├── smsService.ts                # Twilio SMS delivery
│   ├── storage.ts                   # Data access layer (7432 lines)
│   ├── stripeClient.ts              # Stripe initialization
│   ├── types.ts                     # TypeScript type extensions
│   ├── twilioService.ts             # Twilio service utilities
│   └── vite.ts                      # Vite dev server setup
├── shared/                          # Shared code (server + client)
│   ├── schema.ts                    # Drizzle tables, Zod schemas, types
│   └── money.ts                     # Money/currency utilities
├── migrations/                      # Database migrations
│   └── meta/
├── attached_assets/                 # User-generated content
│   ├── generated_images/            # Generated course images
│   └── waivers/                     # Student waiver files
├── public/                          # Public static files
├── .planning/                       # GSD planning documents
│   └── codebase/                    # Architecture documentation
├── components.json                  # Shadcn config
├── drizzle.config.ts                # Drizzle ORM config
├── package.json                     # Dependencies and scripts
├── postcss.config.js                # PostCSS config
├── tailwind.config.ts               # Tailwind CSS config
├── tsconfig.json                    # TypeScript config (unified)
├── vite.config.ts                   # Vite build config
├── .replit                          # Replit deployment config
└── .gitignore
```

## Directory Purposes

**client/**
- Purpose: React-based user interface for all user types (students, instructors, admins)
- Contains: Page components, reusable UI components, custom hooks, utilities, assets
- Key files: `App.tsx` (route definitions), `pages/*` (51 page components)

**server/**
- Purpose: Express.js backend providing REST API and server-side logic
- Contains: Route handlers, business logic, database operations, external service integrations
- Key files: `routes.ts` (main endpoints), `storage.ts` (data access), `notificationEngine.ts` (messaging)

**shared/**
- Purpose: Shared TypeScript definitions and utilities used by both client and server
- Contains: Drizzle ORM table schemas, Zod validation schemas, TypeScript type definitions
- Key files: `schema.ts` (complete data model), `money.ts` (currency handling)

**server/{feature}/**
- Purpose: Modular organization of feature-specific routes and services
- Contains: Routes, services, and utilities scoped to a single feature
- Examples: `appointments/`, `auth/`, `calendar/`, `giftCards/`, `store/`, `stripeConnect/`

**migrations/**
- Purpose: Database migration history for schema changes
- Contains: Auto-generated migration files from Drizzle ORM
- Generated: Yes (do not commit manual changes)
- Committed: Yes (for version control and deployment)

**attached_assets/**
- Purpose: Storage for user-generated content (waivers, course images)
- Contains: Subdirectories for different asset types
- Generated: Yes (populated at runtime)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `server/index.ts`: Server startup, middleware setup, port binding
- `client/src/main.tsx`: React DOM render, App mount
- `server/routes.ts`: Route registration, all API endpoints

**Configuration:**
- `tsconfig.json`: TypeScript settings for all three code areas (server, client, shared)
- `vite.config.ts`: Build and dev settings for React frontend
- `drizzle.config.ts`: Database connection and migration settings
- `tailwind.config.ts`: Tailwind CSS theme and plugin configuration

**Core Logic:**
- `server/storage.ts`: All database read/write operations (CRUD functions)
- `server/notificationEngine.ts`: Template-based email/SMS delivery
- `shared/schema.ts`: Source of truth for data model and validation

**Testing & Utilities:**
- `server/customAuth.ts`: Authentication middleware and password utilities
- `server/contentFilter.ts`: Message moderation and content validation
- `client/src/lib/queryClient.ts`: React Query configuration and fetch wrapper
- `client/src/lib/authUtils.ts`: Client-side authorization checks

## Naming Conventions

**Files:**
- Routes: `routes.ts` (Express route definitions)
- Services: `service.ts` (domain logic), `{name}Service.ts` (utilities like cronService)
- Utilities: `{name}.ts` lowercase with descriptive name (e.g., `encryption.ts`, `contentFilter.ts`)
- Pages: PascalCase for TSX (e.g., `instructor-dashboard.tsx`, `course-management.tsx`)
- Components: PascalCase for reusable UI (e.g., `EditCourseForm.tsx`, `RosterDialog.tsx`)

**Directories:**
- Feature modules: lowercase plural (e.g., `appointments/`, `giftCards/`, `stripeConnect/`)
- Component subdirectories: `components/ui/` for UI primitives, `components/` for feature components
- Utilities: `lib/` for client utilities, `utils/` for server utilities, `services/` for shared services

**Database Objects:**
- Table names: lowercase plural (e.g., `users`, `courses`, `enrollments`)
- Columns: camelCase converted to snake_case in SQL (e.g., `firstName` → `first_name`)
- Enum types: camelCase (e.g., `userStatusEnum`, `userRoleEnum`)

**Functions:**
- Async data operations: `async function getCourse()`, `async function createEnrollment()`
- Middleware: `isAuthenticated()`, `requireAdminOrHigher()`
- React hooks: `useAuth()`, `useQuery()`, `useMutation()`
- Utilities: `normalizePhoneNumber()`, `safeConvertDate()`

## Where to Add New Code

**New Feature (e.g., Testimonials System):**
- Primary code: `server/{feature}/` directory with `routes.ts` and optional `service.ts`
- Database: Add tables to `shared/schema.ts`, create migration via drizzle-kit push
- Data access: Add functions to `server/storage.ts`
- API: Export router from `server/{feature}/routes.ts`, import and mount in `server/routes.ts`
- Client pages: Create feature pages in `client/src/pages/{feature}.tsx`
- Tests: Create `server/{feature}/service.test.ts` if complex logic exists

**New API Endpoint:**
- If simple: Add directly to `server/routes.ts` with Zod validation
- If complex with business logic: Create `server/{feature}/service.ts`, call from route handler
- Always validate input via Zod schema before processing
- Return 400 for validation errors, 401 for auth errors, 403 for authorization errors, 500 for server errors

**New React Component:**
- Reusable UI: `client/src/components/{ComponentName}.tsx`
- Page-level: `client/src/pages/{pageName}.tsx`
- Use React Query for server state: `useQuery()` for reads, `useMutation()` for writes
- Import UI primitives from `client/src/components/ui/`
- Use Wouter `useLocation()` for navigation, `useAuth()` for auth checks

**New Database Table:**
- Define Drizzle table in `shared/schema.ts`
- Export Zod insert/select schemas via `createInsertSchema()`
- Add CRUD functions to `server/storage.ts`
- Run `npm run db:push` to sync schema to database
- Import table in `server/routes.ts` if needed for direct queries

**New Utility/Helper:**
- Client utilities: `client/src/lib/{name}.ts`
- Server utilities: `server/{name}.ts` or `server/utils/{name}.ts`
- Shared utilities: `shared/{name}.ts`
- Always export named functions, not default exports

**New Authentication/Authorization Rule:**
- Add role/permission check to `server/customAuth.ts` as new middleware function
- Export middleware and use in route handlers via chaining: `.post('/path', isAuthenticated, requireInstructorOrHigher, handler)`
- For resource ownership checks: Add verification function in feature route file (see `server/appointments/routes.ts` for pattern)

## Special Directories

**node_modules/**
- Purpose: NPM dependencies (excluded from git)
- Generated: Yes (by npm install)
- Committed: No (git ignored)

**dist/**
- Purpose: Build output for server and client
- Generated: Yes (by vite build and esbuild)
- Committed: No (git ignored)

**migrations/meta/**
- Purpose: Drizzle ORM migration snapshot tracking
- Generated: Yes (by drizzle-kit)
- Committed: Yes (for consistent deployments)

**.replit**
- Purpose: Replit platform deployment configuration
- Generated: No (manually maintained)
- Committed: Yes (for deployment instructions)

---

*Structure analysis: 2026-02-20*
