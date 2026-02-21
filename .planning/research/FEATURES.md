# Features: Express-to-Vercel Migration

**Research Date:** 2026-02-20
**Scope:** Migration capability requirements — what must survive the Replit-to-Vercel move intact.

---

## Context Summary

Practical Defense is a full-stack Express/React/TypeScript monolith currently running on Replit. The backend is a single long-running Node.js process serving both the API and static React assets. Migration target is Vercel, which uses serverless functions for the backend and CDN-hosted static assets for the frontend.

The core tension of this migration: **the app was built assuming a persistent process**, and Vercel's serverless model breaks several of those assumptions.

---

## Table Stakes — Must Work on Day 1

These features, if broken, make the app non-functional or non-deployable.

### 1. Express API Running as Vercel Serverless Functions
**What it is:** The entire backend (`server/routes.ts`, ~9,943 lines) must be reachable as HTTP endpoints on Vercel.

**Current state:** Single Express app started with `server.listen()` on port 5000. Serves both API and React static assets.

**Migration requirement:** Vercel requires a `vercel.json` to route API requests to a serverless function entry point. The Express app can be wrapped using `@vercel/node` adapter — the app instance is exported rather than calling `listen()`. Static frontend is built with `vite build` and served from Vercel's CDN automatically.

**Complexity:** Medium. The Express wrapper pattern is well-understood. The main risk is the 9,943-line `server/routes.ts` — large files can cause cold start memory pressure and hit Vercel's 50MB compressed function size limit. Will likely need chunking or careful tree-shaking.

**Dependencies:** Blocks everything else. Nothing works until the server is reachable.

**Files:** `server/index.ts`, `server/routes.ts`, `server/vite.ts`

---

### 2. Session-Based Authentication (express-session + PostgreSQL Store)
**What it is:** Custom email/password auth using `express-session` with `connect-pg-simple` storing sessions in the `sessions` PostgreSQL table. Four roles: student, instructor, admin, superadmin.

**Current state:** `server/customAuth.ts` configures the session store using `DATABASE_URL`. Session cookie is `httpOnly`, `secure` in production, `sameSite: 'lax'`.

**Migration requirement:** `express-session` with `connect-pg-simple` works in serverless — each function invocation reads/writes the session from PostgreSQL. The key issue is `trust proxy`: currently set to `1` in `setupAuth()`. On Vercel, this must be set correctly or session cookies will not be marked secure.

The `SESSION_SECRET` env var must be set in Vercel. The `sessions` table must already exist in Neon (currently `createTableIfMissing: false`).

**Complexity:** Low-Medium. The PostgreSQL session store is already serverless-compatible because it externalizes state. The main gotcha is cookie configuration under Vercel's proxy headers and ensuring `trust proxy` is correct.

**Dependencies:** All authenticated routes depend on this. RBAC middleware (`isAuthenticated`, `requireInstructorOrHigher`, etc.) will silently fail if sessions don't persist.

**Files:** `server/customAuth.ts`, `server/auth/routes.ts`

---

### 3. Stripe Payment Processing with Raw Body Webhooks
**What it is:** Stripe payment intents for course purchases and gift cards. Stripe Connect for instructor payouts. Two webhook endpoints:
- `/api/stripe-connect/webhook` — Stripe Connect account events
- `/api/webhooks/stripe` — Standard Stripe payment events

Both require `express.raw({ type: 'application/json' })` middleware to preserve the raw body for signature verification. This middleware is registered before `express.json()` in `server/index.ts`.

**Current state:** Stripe credentials use a three-tier fallback: `STRIPE_SECRET_KEY` env var → encrypted database storage → Replit connectors. The Replit connector fallback (`server/stripeClient.ts`, `getCredentialsFromReplit()`) uses `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, and `WEB_REPL_RENEWAL` — all Replit-specific.

**Migration requirement:**
1. Remove the Replit connector fallback path from `getCredentials()`. Only env var and database paths remain.
2. Set `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` as Vercel environment variables.
3. Remove `stripe-replit-sync` from `package.json` (it is in dependencies but not imported anywhere in `server/` — it is safe to drop).
4. Vercel's body parsing: Vercel by default parses request bodies before they reach your function. Raw body access requires configuring `export const config = { api: { bodyParser: false } }` on the function, or using middleware that correctly accesses the raw buffer. The `express.raw()` middleware approach works if the Express adapter is configured correctly.
5. Update Stripe webhook endpoints in Stripe Dashboard to point to the new Vercel URL.

**Complexity:** Medium. The Replit connector code removal is straightforward. The raw body issue on Vercel is a known friction point and needs explicit configuration.

**Dependencies:** File upload signed URLs also use the Stripe client. Gift card delivery uses Stripe. Removing Replit connector path must not break the `getCredentials()` fallback chain.

**Files:** `server/stripeClient.ts`, `server/routes.ts`, `server/stripeConnect/routes.ts`, `package.json`

---

### 4. Google Cloud Storage — Replace Replit Sidecar
**What it is:** File uploads (course images, product images, waivers, gift card theme images) use `@google-cloud/storage`. The current implementation authenticates via a Replit sidecar proxy at `http://127.0.0.1:1106` using an "external account" credential flow.

**Current state:** `server/objectStorage.ts` hardcodes `REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106"`. All GCS operations — credential fetching, token exchange, signed URL generation — go through this local sidecar. This endpoint does not exist on Vercel.

**Migration requirement:** Replace the sidecar-based credential config with standard GCS service account credentials:
```typescript
// Replace the external_account credential block with:
const objectStorageClient = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
  projectId: process.env.GCP_PROJECT_ID,
});
```
The signed URL generation in `signObjectURL()` also calls the sidecar (`/object-storage/signed-object-url`). This must be replaced with the native GCS SDK `file.getSignedUrl()` method, which requires the service account to have `roles/iam.serviceAccountTokenCreator`.

The `PUBLIC_OBJECT_SEARCH_PATHS` and `PRIVATE_OBJECT_DIR` env vars remain valid — they define which GCS buckets/paths to use.

**Complexity:** High. This is the deepest Replit coupling in the codebase. Two separate concerns must be replaced: (a) the credential exchange mechanism, and (b) the signed URL generation. The ACL policy system (`server/objectAcl.ts`) uses GCS object metadata — this likely continues to work with direct credentials.

**Dependencies:** Course image upload, product image upload, waiver uploads, gift card theme images, Uppy-based file uploads. If this breaks, users cannot upload any files.

**Files:** `server/objectStorage.ts`, `server/objectAcl.ts`, `server/routes.ts` (upload endpoints), `server/giftCards/routes.ts`

---

### 5. SendGrid Email + Twilio SMS
**What it is:** All transactional and notification emails use SendGrid (`@sendgrid/mail`). All SMS uses Twilio. Both are initialized from environment variables. Both are used in the notification engine and auth flows (password reset, email verification, welcome emails).

**Current state:** Fully env-var-driven. No Replit coupling. `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` are already the correct pattern.

**Migration requirement:** Set these env vars in Vercel's environment settings. No code changes required.

One nuance: `server/emailService.ts` line 245 uses `REPLIT_DEV_DOMAIN` to construct email links (password reset URLs, etc.):
```typescript
const APP_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'https://abqconcealedcarry.com';
```
Replace with a `APP_BASE_URL` env var set to the Vercel URL.

**Complexity:** Low. Pure env var swap plus one URL construction fix.

**Dependencies:** Auth flows (password reset), notification engine, course notifications, appointment reminders.

**Files:** `server/emailService.ts`, `server/smsService.ts`, `server/twilioService.ts`

---

### 6. Environment Variable Replacement (All REPLIT_* References)
**What it is:** Several places in the server reference Replit-specific env vars to construct URLs or detect the environment.

**Current state — all occurrences:**
- `server/services/cronService.ts:8` — `REPLIT_DEV_DOMAIN` for webhook callback URL
- `server/emailService.ts:245-246` — `REPLIT_DEV_DOMAIN` for email link base URL
- `server/notificationEngine.ts:106,933,1360,1400,1420` — `REPLIT_DOMAINS` for website URL in notification emails
- `server/routes.ts:6479` — `REPLIT_DOMAINS` for payment link base URL
- `server/stripeClient.ts:8-46` — `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `REPLIT_DEPLOYMENT`, `WEB_REPL_RENEWAL` for Stripe credential fallback
- `server/routes.ts:8937` — `REPLIT_SIDECAR_ENDPOINT` for object storage signed URL
- `vite.config.ts:12` — `REPL_ID` to conditionally load Replit Cartographer plugin

**Migration requirement:** Replace all with a single `APP_BASE_URL` env var set to the Vercel deployment URL (or custom domain). Remove Replit Vite plugins from `vite.config.ts`.

**Complexity:** Low. Mechanical find-and-replace. No logic changes.

**Dependencies:** Correct URLs in emails, SMS, and payment links. Incorrect URLs cause users to follow broken links.

**Files:** All listed above.

---

### 7. Neon PostgreSQL Connection
**What it is:** Database connection using `@neondatabase/serverless` with WebSocket transport. Already serverless-compatible.

**Current state:** `server/db.ts` uses `neonConfig.webSocketConstructor = ws` (the `ws` npm package for WebSocket support). This is specifically designed for serverless environments including Vercel.

**Migration requirement:** No code changes. `DATABASE_URL` must be set as a Vercel env var. The `ws` package is a Node.js WebSocket implementation needed for Neon's serverless driver outside browser environments — it works on Vercel's Node.js runtime.

**Note:** The `ws` package is currently in `package.json` `optionalDependencies` as `bufferutil`, but `ws` itself is in `dependencies`. This is correct.

**Complexity:** Minimal. Already serverless-compatible by design.

**Dependencies:** Every server route depends on database access.

**Files:** `server/db.ts`

---

## Important — Should Work Shortly After Migration

These features are important to the app but can be addressed in a follow-up after the initial deployment is stable.

### 8. node-cron Scheduled Jobs — Replace with Vercel Cron
**What it is:** `server/services/cronService.ts` uses `node-cron` to run a daily maintenance job at midnight (America/Denver timezone). The job: (a) checks Google OAuth token health for all instructors, (b) renews Google Calendar webhook subscriptions.

**Current state:** `cronService.initialize()` is called on server startup in `server/index.ts`. The cron job runs in the same Node.js process.

**Migration requirement:** `node-cron` cannot run on Vercel serverless functions because there is no persistent process. Options:
1. **Vercel Cron Jobs** (recommended): Define a cron schedule in `vercel.json` pointing to a dedicated API route (e.g., `/api/cron/daily-maintenance`). The route handler calls `cronService.runDailyMaintenance()`. Vercel Cron supports timezone scheduling.
2. **External scheduler**: Use a service like Render, Railway, or GitHub Actions to make an authenticated HTTP request to a maintenance endpoint on a schedule.

The `WEBHOOK_CALLBACK_URL` in `cronService.ts` also references `REPLIT_DEV_DOMAIN` — replace with `APP_BASE_URL`.

**Complexity:** Medium. The maintenance logic itself does not need changes. The scheduling mechanism does. Vercel Cron is the cleanest solution but requires adding a protected API route for the maintenance job.

**Dependencies:** Google Calendar webhook renewal is not user-facing critical, but if it lapses, calendar sync stops working. Token health checks keep Google integration functional.

**Files:** `server/services/cronService.ts`, `server/index.ts`

---

### 9. Google Calendar OAuth + Token Management
**What it is:** Instructors authenticate with Google Calendar via OAuth 2.0 through an external "Central Auth" service (`https://auth.instructorops.com`). The callback lands at `/auth/callback` in `server/index.ts`. Tokens are managed by Central Auth, not stored locally (placeholder strings `'managed-by-central-auth'` in the database).

**Current state:** `server/services/calendarService.ts` fetches valid access tokens from `AUTH_BROKER_URL` using `INTERNAL_API_KEY`. The OAuth redirect URL is configured in the Central Auth service.

**Migration requirement:**
1. The `/auth/callback` route must work on Vercel — no changes needed to the route logic itself.
2. The Central Auth service (`auth.instructorops.com`) OAuth redirect URI must be updated to the new Vercel URL. This is a configuration change in the Central Auth service, not in this codebase.
3. `INTERNAL_API_KEY` and `AUTH_SERVICE_URL` must be set in Vercel env vars.
4. `GOOGLE_SERVICE_ACCOUNT_KEY` (referenced in `INTEGRATIONS.md`) may be needed for some Calendar API operations — confirm whether CalendarService uses service account or only instructor OAuth tokens.

**Complexity:** Medium. Code changes are minimal, but coordination with the Central Auth service is required to update the OAuth redirect URI.

**Dependencies:** Appointment scheduling, instructor availability, calendar sync. Without this, instructors cannot connect Google Calendar, but existing connections continue working if tokens are valid.

**Files:** `server/services/calendarService.ts`, `server/services/cronService.ts`, `server/calendar/routes.ts`, `server/index.ts`

---

### 10. WebSocket Usage Audit
**What it is:** The `ws` package is listed in dependencies and used in `server/db.ts` as the WebSocket constructor for Neon's serverless PostgreSQL driver. The codebase also `import`s `ws` in the Neon setup.

**Current state:** No WebSocket server is created in the application code. The `httpServer` returned from `registerRoutes()` is a plain HTTP server (no WebSocket upgrade handler). The `ws` package in `package.json` exists purely to provide a Node.js WebSocket implementation for Neon's client, not for a real-time WebSocket server.

**Assessment:** There is no WebSocket server to migrate. The `ws` import in `server/db.ts` is a Neon driver requirement and works on Vercel's Node.js runtime without changes. This concern from the project requirements list is a non-issue based on actual code inspection.

**Complexity:** None. No migration work needed.

**Files:** `server/db.ts`

---

### 11. Vite Build for Vercel Static Hosting
**What it is:** The React frontend is built with Vite (`vite build`) outputting to `dist/public`. In production on Replit, `server/vite.ts`'s `serveStatic()` serves these files from Express. On Vercel, static assets are served from the CDN.

**Current state:** `vite.config.ts` includes Replit-specific plugins:
- `@replit/vite-plugin-runtime-error-modal` (devDependencies) — runtime error overlay for Replit environment
- `@replit/vite-plugin-cartographer` (devDependencies) — Replit code navigation tool, only loaded if `REPL_ID` is set

**Migration requirement:**
1. Remove `runtimeErrorOverlay()` from Vite plugins (or keep conditionally — it only runs in dev, but the import will fail if the package is removed).
2. Remove the `cartographer()` conditional block.
3. Remove `@replit/vite-plugin-runtime-error-modal` and `@replit/vite-plugin-cartographer` from `devDependencies`.
4. Configure `vercel.json` to route all non-API requests to the static build output.
5. API routes in `vercel.json` should match `/api/*` and route to the Express serverless function.

**Complexity:** Low. Plugin removal is clean. The Vite build output directory path (`dist/public`) may need to align with Vercel's expected static output directory configuration.

**Files:** `vite.config.ts`, `package.json`, new `vercel.json`

---

## Nice-to-Have — Can Be Improved Post-Migration

These are improvements that would make the migration cleaner or the system more robust, but they are not required for the app to be functional on Vercel.

### 12. Dedicated APP_BASE_URL Environment Variable
**What it is:** Centralizing all URL construction through a single `APP_BASE_URL` env var rather than scattered `REPLIT_DOMAINS` checks.

**Why nice-to-have:** The Replit env var replacements (item 6 above) are required. But going further to audit all hardcoded fallback URLs (e.g., `'https://abqconcealedcarry.com'`, `'https://example.com'`) and standardize them would make future domain changes easier.

**Files:** `server/notificationEngine.ts`, `server/emailService.ts`, `server/routes.ts`

---

### 13. Vercel Blob or AWS S3 as GCS Alternative
**What it is:** Instead of direct GCS credentials (item 4), switch to Vercel Blob Storage or AWS S3, which have simpler Vercel-native integration patterns.

**Why nice-to-have:** Direct GCS with a service account (item 4) is fully viable. Vercel Blob is simpler to configure and has native integration with Vercel's environment. However, it would require migrating existing stored files.

**Tradeoff:** Migrating stored files is non-trivial. Stick with GCS direct credentials for the migration phase; evaluate Vercel Blob after migration if operational simplicity is wanted.

---

### 14. Structured Logging / Error Tracking
**What it is:** Currently, the app logs to `console.log`/`console.error`. On Vercel, these appear in the Vercel function logs. Adding structured logging (e.g., `pino`) or error tracking (e.g., Sentry) would improve observability.

**Why nice-to-have:** Not required for migration. Console logging works on Vercel. But debugging production issues without request tracing will be harder than on Replit's integrated log viewer.

---

### 15. Session Cookie SameSite Hardening
**What it is:** Currently `sameSite: 'lax'` in session config. On Vercel with a custom domain (different from the API domain), this may need to be `'none'` with `secure: true` if the frontend is ever served from a different subdomain.

**Why nice-to-have:** For the initial migration with a single Vercel URL serving both frontend and API, `'lax'` is fine. If the architecture later splits frontend and backend to different domains, this becomes required.

**Files:** `server/customAuth.ts`

---

### 16. Cold Start Optimization
**What it is:** Vercel serverless functions have cold starts. The large `server/routes.ts` (9,943 lines) and heavy imports (Stripe, SendGrid, Twilio, GoogleAPIs, ExcelJS, PDFKit) will increase cold start time.

**Why nice-to-have:** The app will still function with cold starts — they just add latency on first request. For a training platform with moderate traffic, this is acceptable. Optimization (lazy imports, function splitting, warm-up pings) is a post-migration improvement.

---

## Anti-Features — Things NOT to Do During Migration

These are actions that seem helpful but would make the migration harder or riskier.

### Do NOT refactor the monolith during migration
`server/routes.ts` is 9,943 lines and `server/storage.ts` is 7,432 lines. The CONCERNS.md correctly identifies these as tech debt. Breaking them into smaller modules is the right long-term move — but doing it simultaneously with the Vercel migration multiplies risk. Refactor after the migration is stable and deployed.

### Do NOT change the database schema during migration
Neon PostgreSQL is staying. No schema changes, no new migrations. The migration risk is the hosting layer, not the data layer.

### Do NOT add new features during migration
Per PROJECT.md: "New features beyond migration — will scope after migration is complete." Scope creep during a migration is a common failure mode.

### Do NOT switch authentication systems
The custom email/password + express-session system works. Do not introduce NextAuth, Clerk, or any other auth system during migration. The session store (connect-pg-simple with Neon) is already serverless-compatible.

### Do NOT use Vercel's Edge Runtime
Vercel offers an Edge Runtime (using Web API-compatible runtime) that some guides recommend. This codebase uses Node.js-specific APIs (bcrypt, crypto, pdfkit, node-cron, googleapis). The Edge Runtime does not support these. Use Vercel's standard Node.js serverless functions only (`@vercel/node`).

### Do NOT use in-memory memorystore for sessions on Vercel
`memorystore` is in `package.json`. In a serverless environment, in-memory state is lost between invocations. Sessions must use the PostgreSQL store (`connect-pg-simple`) exclusively. Confirm `memorystore` is not used as the session store in any code path.

---

## Dependency Map

```
Vercel serverless function running Express
├── Neon PostgreSQL (DATABASE_URL)           — no changes needed
├── express-session + connect-pg-simple      — trust proxy config needed
├── Stripe payments                          — remove Replit connector, set env vars
│   └── Raw body middleware for webhooks     — explicit Vercel config needed
├── Google Cloud Storage (direct auth)       — replace sidecar with service account
│   └── Uppy file uploads                   — depends on GCS
├── SendGrid email                           — set env vars, fix APP_BASE_URL
├── Twilio SMS                               — set env vars
├── Google Calendar (Central Auth tokens)   — update OAuth redirect URI in Central Auth
│   └── node-cron maintenance               — replace with Vercel Cron
└── Vite static frontend                     — remove Replit plugins, configure vercel.json
```

---

## Complexity Summary

| Feature | Category | Complexity | Code Changes | Config Changes |
|---------|----------|------------|--------------|----------------|
| Express as serverless function | Table Stakes | Medium | Low (wrap with adapter) | High (vercel.json) |
| Session auth (express-session + PG) | Table Stakes | Low-Medium | Minimal | Set SESSION_SECRET |
| Stripe payments + raw webhooks | Table Stakes | Medium | Remove Replit connector | Set STRIPE_SECRET_KEY, update webhook URL |
| GCS — replace Replit sidecar | Table Stakes | High | Significant (objectStorage.ts) | Set GOOGLE_SERVICE_ACCOUNT_KEY |
| SendGrid + Twilio | Table Stakes | Low | Fix REPLIT_DEV_DOMAIN refs | Set API keys |
| Remove all REPLIT_* env vars | Table Stakes | Low | Mechanical find/replace | Set APP_BASE_URL |
| Neon PostgreSQL connection | Table Stakes | None | None | Set DATABASE_URL |
| node-cron → Vercel Cron | Important | Medium | Add cron route handler | vercel.json cron config |
| Google Calendar OAuth | Important | Medium | None | Update Central Auth redirect URI |
| WebSocket audit | Important | None | None (non-issue) | None |
| Vite build for Vercel | Important | Low | Remove Replit plugins | vercel.json build config |
| APP_BASE_URL standardization | Nice-to-have | Low | Minor | One env var |
| Cold start optimization | Nice-to-have | Medium | Lazy imports | None |
| Structured logging | Nice-to-have | Low | Add logger | None |

---

*Research complete: 2026-02-20. Based on direct codebase inspection of server/, shared/, and .planning/ documents.*
