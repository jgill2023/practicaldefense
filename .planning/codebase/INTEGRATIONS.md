# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**Payment Processing:**
- Stripe - Payment processing for course purchases and gift cards
  - SDK/Client: `stripe` (v20.0.0)
  - Client SDK: `@stripe/react-stripe-js` (v4.0.0), `@stripe/stripe-js` (v7.9.0)
  - Auth: `STRIPE_SECRET_KEY` (env var for server), `VITE_STRIPE_PUBLIC_KEY` (env var for client)
  - Implementation: `server/stripeClient.ts` handles credential management with fallback chain
  - Stripe Connect: Supports instructor/marketplace accounts with separate onboarding
  - Webhooks: Endpoints at `/api/stripe-connect/webhook` and `/api/webhooks/stripe` for event handling

**Email Delivery:**
- SendGrid - Email service for transactional and marketing emails
  - SDK/Client: `@sendgrid/mail` (v8.1.6)
  - Auth: `SENDGRID_API_KEY` (env var)
  - Implementation: `server/emailService.ts` with credit-based deduction system
  - Tracks: Open tracking and click tracking enabled via `trackingSettings`
  - Logging: All sent emails logged to `communications` table for audit trail

**SMS Messaging:**
- Twilio - SMS service for notifications and reminders
  - SDK/Client: `twilio` (v5.9.0)
  - Auth: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (env vars)
  - Implementation: `server/smsService.ts` and `server/twilioService.ts` with credit-based deduction
  - Features: Support for media URLs, educational/marketing/administrative categorization
  - Logging: All SMS messages logged to `communications` table

**Calendar & Scheduling:**
- Google Calendar - Instructor calendar integration via OAuth 2.0
  - SDK/Client: `googleapis` (v159.0.0)
  - Auth: OAuth 2.0 via OpenID Connect client
  - Credentials: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON service account key)
  - Implementation: `server/calendar/routes.ts` handles OAuth callback and sync
  - Flow: Instructors authenticate via Central Auth app, credentials stored in `instructorGoogleCredentials` table
  - Callback: `/auth/callback` endpoint receives instructor ID and syncs status

**Authentication & Identity:**
- OpenID Connect (Central Auth) - OAuth provider for instructor authentication
  - SDK/Client: `openid-client` (v6.7.1)
  - Implementation: Google OAuth integration managed by external Central Auth service
  - Token Management: Access/refresh tokens managed by Central Auth, not stored locally

**E-commerce & Marketplace:**
- Printify - Print-on-demand product integration
  - API Key: `PRINTIFY_API_KEY` (env var)
  - Implementation: `server/printify/service.ts`

**LMS Integration:**
- Moodle - Learning management system integration
  - Auth: `MOODLE_TOKEN` (env var)
  - Implementation: `server/moodle.ts` (scope/usage not fully determined from package structure)

## Data Storage

**Databases:**
- PostgreSQL - Primary relational database
  - Provider: Neon (serverless)
  - Connection: `DATABASE_URL` env var
  - Client: `@neondatabase/serverless` with drizzle-orm ORM
  - Schema: `shared/schema.ts` contains all table definitions
  - Session Store: PostgreSQL via `connect-pg-simple` (stores express-session data)
  - Connection Pool: Max 10 connections, rotated after 7500 uses, 15-minute lifetime, 1-minute idle timeout
  - WebSocket: Uses WebSocket for long-polling in serverless environment

**File Storage:**
- Google Cloud Storage - File and document storage
  - Client: `@google-cloud/storage` (v7.17.0)
  - Provider: Google Cloud (accessed via Replit sidecar)
  - Credentials: External account credentials via sidecar token exchange at `http://127.0.0.1:1106`
  - Implementation: `server/objectStorage.ts` with ACL-based permission system
  - Configuration: `PUBLIC_OBJECT_SEARCH_PATHS` (comma-separated bucket paths), `PRIVATE_OBJECT_DIR`
  - Features: Supports public search paths and private directories with ACL policies in `objectAcl.ts`

**Caching:**
- In-Memory Session Store - `memorystore` (v1.6.7) for session fallback
- Memoization - `memoizee` (v0.4.17) for function result caching

## Authentication & Identity

**Auth Provider:**
- Custom Local Authentication - Email/password authentication stored in `users` table
  - Implementation: `server/customAuth.ts`
  - Password Storage: bcrypt hashing (v6.0.0) with secure salt rounds
  - Session: express-session with PostgreSQL store
  - Features: Email verification tokens, password reset tokens with expiry timestamps

**OAuth & Identity:**
- OpenID Connect - Used for Google OAuth flows
  - Client: `openid-client` (v6.7.1)
  - Usage: Instructor authentication via Central Auth service
  - Integration: `server/routes.ts` and `server/calendar/routes.ts` handle OAuth callbacks

**Authorization Levels:**
- Role-based: student, instructor, admin, superadmin (stored in `users.role`)
- Status-based: pending, active, suspended, rejected (stored in `users.userStatus`)

## Monitoring & Observability

**Error Tracking:**
- Not detected - Application may log to console or file

**Logs:**
- Console logging throughout codebase
- Request logging in `server/index.ts` with timing information for `/api` routes
- Database connection error handling with non-fatal recovery in `db.ts`
- Integration logging: Stripe validation errors, SendGrid send failures, Twilio account checks

**Structured Logging:**
- Communication history table (`communications`) logs all emails and SMS with delivery status
- Credit transaction table tracks deductions/refunds for email and SMS usage

## CI/CD & Deployment

**Hosting:**
- Replit (indicated by environment variables like `REPLIT_DEV_DOMAIN`, `REPLIT_DEPLOYMENT`, `REPL_IDENTITY`)

**Build & Deployment:**
- Vite for frontend build: `npm run build`
- esbuild for server bundling: included in build script
- Scripts: `dev` (local development), `build` (production build), `start` (run production build)
- Type checking: `npm run check` runs TypeScript compiler

**Database Migrations:**
- Drizzle Kit: `npm run db:push` for schema synchronization

## Environment Configuration

**Required env vars for basic functionality:**
- `DATABASE_URL` - PostgreSQL connection string (critical)
- `NODE_ENV` - development or production
- `VITE_STRIPE_PUBLIC_KEY` - Stripe client-side key (for payments)

**Optional but recommended:**
- `STRIPE_SECRET_KEY` - Stripe server-side key (required for payment processing)
- `SENDGRID_API_KEY` - SendGrid email key (required if email feature enabled)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS (required if SMS feature enabled)
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Google APIs (required for Calendar integration)
- `ENCRYPTION_MASTER_KEY` - Enables encryption for sensitive credential storage
- `INTERNAL_API_KEY` - Internal API authentication key

**Replit-specific:**
- `REPLIT_DEPLOYMENT` - Set to '1' in production environment
- `REPLIT_DEV_DOMAIN` - Dev environment domain (auto-provided by Replit)
- `REPL_IDENTITY` - Replit sidecar authentication token
- `WEB_REPL_RENEWAL` - Deployment identity token
- `REPLIT_CONNECTORS_HOSTNAME` - Connectors service hostname

**Secrets location:**
- Environment variables managed via Replit Secrets tool or standard `.env` files
- Credential hierarchy for Stripe: env vars → database encrypted storage → Replit connectors
- Sensitive keys can be encrypted and stored in database using `ENCRYPTION_MASTER_KEY` via `server/utils/encryption.ts`

## Webhooks & Callbacks

**Incoming Webhooks:**
- `/api/stripe-connect/webhook` - Stripe Connect account events (webhook signature validation required)
- `/api/webhooks/stripe` - Standard Stripe payment events (webhook signature validation required)
- `/auth/callback` - Google OAuth 2.0 callback endpoint in `server/index.ts`
- Note: Both Stripe webhook endpoints require raw body middleware (see `app.use('/api/stripe-connect/webhook', express.raw(...)`)

**Outgoing Webhooks/Callbacks:**
- Not detected in codebase

## Integration Patterns & Utilities

**Credit System:**
- Email credits tracked via `deductCredits(instructorId, 0, 1, ...)` in `server/emailService.ts`
- SMS credits tracked via `deductCredits(instructorId, 1, 0, ...)` in `server/smsService.ts`
- Automatic refund on failed sends
- Credit balance validation before sending

**Error Handling:**
- Stripe: Validation via `validateStripeSecretKey()`, fallback credential sources
- SendGrid: Credit check before send, structured error response with insufficient credit message
- Twilio: Account validity check via `getTwilioAccountBalance()`
- Google Calendar: OAuth callback validation with instructor ID verification

**Data Encryption:**
- Sensitive fields encrypted in database using `server/utils/encryption.ts`
- Stripe credentials can be stored encrypted with `ENCRYPTION_MASTER_KEY`
- AES-256-GCM encryption with IV and auth tag

---

*Integration audit: 2026-02-20*
