# Express-to-Vercel Migration Pitfalls

**Research Date:** 2026-02-20
**Scope:** Replit → Vercel migration for the Practical Defense full-stack Express/React/TypeScript app

---

## Overview

This document catalogs the critical mistakes and gotchas specific to migrating this Express monolith to Vercel serverless. Each pitfall is tied to concrete code locations in this codebase, not generic advice. Pitfalls are ordered from highest to lowest blast radius if ignored.

---

## Pitfall 1: GCS Sidecar (127.0.0.1:1106) Will Hard-Fail Immediately

**What goes wrong:** The entire file upload and download system will throw 500 errors the moment any storage operation is attempted on Vercel. The Replit sidecar is a local process that proxies Google Cloud Storage credentials — it does not exist outside Replit.

**This codebase specifically:**
- `server/objectStorage.ts` line 12: `const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106"` — hardcoded sidecar address used for credential exchange AND for signing upload URLs
- `server/objectStorage.ts` lines 17-30: The `Storage` client is instantiated with `external_account` credentials that call `http://127.0.0.1:1106/token` and `http://127.0.0.1:1106/credential` — both calls will timeout immediately on Vercel
- `server/objectStorage.ts` lines 280-298: The `signObjectURL` function also POSTs to `http://127.0.0.1:1106/object-storage/signed-object-url` — this will fail for every file upload
- `server/routes.ts` line 8937: A second hardcoded sidecar reference exists inline in an upload-URL endpoint: `const REPLIT_SIDECAR_ENDPOINT = process.env.REPLIT_SIDECAR_ENDPOINT || "http://0.0.0.0:1106"`
- `server/giftCards/routes.ts` lines 13-23: Multer is used for gift card theme image uploads and passes files to `objectStorageClient` — this entire flow breaks

**Warning signs:**
- Any attempt to upload a file (gift card themes, waivers, course images) returns a network timeout or ECONNREFUSED
- Signed URL generation fails, breaking `@uppy/aws-s3` direct-upload flows on the client

**Prevention strategy:**
- Replace the `external_account` credential pattern with a real Google service account JSON key stored in a Vercel environment variable (`GOOGLE_APPLICATION_CREDENTIALS_JSON`)
- Remove the sidecar signed-URL generation and replace with GCS's native `file.getSignedUrl()` method using the service account key
- Alternatively, migrate object storage to Vercel Blob (`@vercel/blob`) or AWS S3 — Uppy already has the `@uppy/aws-s3` plugin installed

**Phase:** Must be resolved before any deployment attempt. This is a boot-time failure for any feature that touches file storage.

---

## Pitfall 2: node-cron Schedules Are Lost on Every Request

**What goes wrong:** `node-cron` schedules a job by setting a timer in the Node.js process. Vercel serverless functions spin up to handle one request and terminate. There is no persistent process — `cronService.initialize()` called at server startup (as it is today) simply does nothing durable.

**This codebase specifically:**
- `server/index.ts` line 133: `cronService.initialize()` is called inside the `server.listen()` callback — this runs at process start, which does not apply to Vercel
- `server/services/cronService.ts` lines 243-248: `cron.schedule('0 0 * * *', ...)` — this schedule is registered in-memory and is gone when the function terminates
- `server/services/cronService.ts` line 8: `WEBHOOK_CALLBACK_URL` is built using `REPLIT_DEV_DOMAIN` which also needs replacing

**What the cron job does:** Daily midnight maintenance that (1) checks Google Calendar OAuth token health for all instructors and (2) renews Google Calendar webhook watch channels. Without this running, instructor calendar sync will silently degrade as watch channels expire (typically within 7 days per Google's limit).

**Warning signs:**
- No console logs showing `[CronService] Midnight cron job triggered` in Vercel function logs
- Google Calendar webhook channels expire and stop delivering push notifications
- Instructor calendar sync silently stops reflecting new/changed events

**Prevention strategy:**
- Use Vercel Cron Jobs (`vercel.json` `crons` configuration) to make a scheduled HTTP request to a dedicated internal endpoint (e.g., `GET /api/internal/cron/daily-maintenance`)
- That endpoint calls `cronService.runDailyMaintenance()` directly — the cron service's business logic is already well-structured and reusable
- Secure the endpoint with a shared secret header checked against a `CRON_SECRET` environment variable
- Remove the `node-cron` package from production or guard it to only run in persistent environments

**Phase:** Address before or during API restructuring. Calendar sync will silently degrade within a week of launch without it.

---

## Pitfall 3: express-session Has No Persistent Process to Anchor To

**What goes wrong:** `express-session` with `connect-pg-simple` stores sessions in PostgreSQL and reads/writes the `sessions` table on each request. This works fine in serverless — the session store itself is fine. The pitfall is that the `SESSION_SECRET` must be a stable, non-rotating value, and the session cookie's `secure` and `sameSite` attributes must be correctly set for Vercel's domain.

**A secondary pitfall (already partially present):** The `CONCERNS.md` notes an inconsistency bug where `memorystore` was previously used. Review that `getSession()` in `server/customAuth.ts` is the only session configuration path and that `memorystore` is fully removed from any code paths.

**This codebase specifically:**
- `server/customAuth.ts` lines 12-41: `getSession()` uses `connect-pg-simple` (good) but the `sameSite: 'lax'` setting may cause session cookies to be rejected if the Vercel domain differs from the API domain during a transition period
- `server/customAuth.ts` line 63: `app.set("trust proxy", 1)` — this must remain set for Vercel (which sits behind Vercel's edge proxy), otherwise `secure` cookies will not be set because Express will not trust the `x-forwarded-proto: https` header
- `server/index.ts` line 14: `setupAuth(app)` is called within `registerRoutes` — the session middleware must be applied before route handlers, which is the current behavior; verify this order is preserved when restructuring for Vercel

**Warning signs:**
- Users are logged out on every request (session cookie not being sent or rejected)
- `req.session` is defined but `req.session.userId` is undefined despite successful login
- Browser shows the session cookie as blocked (sameSite or secure mismatch)

**Prevention strategy:**
- Set `SESSION_SECRET` as a fixed Vercel environment variable — never rotate it during an active session period without a migration plan
- Keep `trust proxy: 1` — Vercel's reverse proxy sets `x-forwarded-proto`
- After going live, test cookie round-trips explicitly: log in, call `/api/auth/user`, verify 200 with user data
- If using a custom domain alongside Vercel's `.vercel.app` subdomain, confirm the cookie domain is correctly scoped

**Phase:** Validate in the first Vercel test deployment before any other testing.

---

## Pitfall 4: Stripe Webhook Raw Body Is Destroyed if Middleware Order Changes

**What goes wrong:** Stripe webhook signature verification (`stripe.webhooks.constructEvent`) requires the raw, unparsed request body as a `Buffer`. If `express.json()` middleware runs first and parses the body, the raw bytes are gone and verification throws `No signatures found matching the expected signature` — causing all webhooks to 400.

**This codebase specifically:**
- `server/index.ts` lines 12-13: `express.raw()` is correctly applied to both webhook paths BEFORE `express.json()` on lines 15-16 — this is correct and must be preserved exactly
- `server/routes.ts` line 9885: `stripe.webhooks.constructEvent(req.body, sig, webhookSecret)` — this works because `req.body` is a `Buffer` (from `express.raw`) not a parsed object

**The Vercel-specific risk:** When restructuring the Express app into Vercel serverless functions (via a single catch-all API route or split routes), it is easy to accidentally apply `express.json()` globally before registering the webhook-specific raw middleware. In Vercel's serverless model, each function file has its own middleware stack — if the webhook endpoints become separate function files, they need to configure their own raw body parsing.

**Warning signs:**
- Stripe Dashboard shows webhook deliveries with 400 responses
- Server logs show `Webhook Error: No signatures found matching the expected signature`
- Payment confirmations and Stripe Connect events stop being processed

**Prevention strategy:**
- If using a catch-all Express adapter on Vercel (recommended for this migration): keep the existing middleware order in `server/index.ts` exactly as-is — raw before json
- If splitting into individual Vercel function files: each webhook function must use a raw body parser and must export `config = { api: { bodyParser: false } }` to disable Vercel's automatic body parsing
- Test both webhook endpoints (`/api/stripe-connect/webhook` and `/api/webhooks/stripe`) with a real Stripe CLI test event before going live

**Phase:** Verify during API restructuring phase before any payment testing.

---

## Pitfall 5: The Replit Credential Fallback Chain Will Break Stripe Initialization

**What goes wrong:** `server/stripeClient.ts` has a three-tier credential fallback: env var → database → Replit connectors. On Vercel, the Replit connectors (`REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL`) do not exist. If `STRIPE_SECRET_KEY` is not set in Vercel env vars, the code will fall through to the Replit connector fetch, which will fail with a network error or missing auth header. This means Stripe initializes as `null`, silently disabling all payment processing with a warning log instead of a hard failure.

**This codebase specifically:**
- `server/stripeClient.ts` lines 7-47: `getCredentialsFromReplit()` attempts to fetch from `https://${process.env.REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection` — this will throw because `hostname` is undefined on Vercel
- `server/stripeClient.ts` lines 83-106: `getCredentials()` falls through to `getCredentialsFromReplit()` only when the env var is missing — but the fallback throws rather than returning null gracefully, so `getStripeClient()` will throw and Stripe becomes `null`
- `server/routes.ts` lines 34-47: `ensureStripeInitialized()` catches the error and sets `stripe = null` with a warning — payments silently fail
- `stripe-replit-sync` package (line 105 in `package.json`) — this package is Replit-specific and must be removed entirely

**Warning signs:**
- Server logs show `⚠️ Stripe not configured. Payment processing is disabled.` on startup
- Any payment endpoint returns an error about Stripe not being configured
- `REPLIT_CONNECTORS_HOSTNAME` throws `TypeError: Cannot read properties of undefined` in logs

**Prevention strategy:**
- Set `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` as Vercel environment variables before first deployment
- Remove the `getCredentialsFromReplit()` function and its fallback from `stripeClient.ts` — on Vercel, env vars are the only credential source
- Remove `stripe-replit-sync` from `package.json` dependencies
- Make Stripe initialization fail fast (throw immediately) rather than silently degrade to null — a misconfigured payment system should not serve traffic

**Phase:** Before first deployment. Remove Replit-specific credential code in the cleanup phase.

---

## Pitfall 6: WebSocket (ws) Is Used for Neon Database Connections — Verify Compatibility

**What goes wrong:** The `ws` library is not used for a WebSocket server in this app — it is used as the WebSocket transport for `@neondatabase/serverless` (Neon requires a WebSocket connection for its serverless driver). However, Vercel's Node.js serverless runtime does support the `ws` package. The risk is not incompatibility — it is that the connection pool configuration does not suit cold-start behavior.

**This codebase specifically:**
- `server/db.ts` lines 1-6: `import ws from "ws"` and `neonConfig.webSocketConstructor = ws` — this is the correct pattern for Neon serverless and will work on Vercel
- `server/db.ts` lines 15-22: Pool configured with `max: 10`, `maxLifetimeSeconds: 900`, `idleTimeoutMillis: 60000` — a pool of 10 connections that live for 15 minutes is fine for a persistent server but creates connection pressure on cold starts where multiple function instances each create their own pool

**The actual risk:** On Vercel, each serverless function invocation may create a new pool. With high concurrency or cold starts, this can exhaust Neon's connection limit (typically 100 on free tier, 400 on paid). PgBouncer connection pooling (available with Neon's connection pooling URL) should be used.

**Warning signs:**
- Neon dashboard shows connection count spiking near the limit during traffic bursts
- Database errors: `remaining connection slots are reserved for non-replication superuser connections`
- Slow queries during cold starts (connection setup overhead per invocation)

**Prevention strategy:**
- Use Neon's connection pooling endpoint (the `DATABASE_URL` in Vercel should point to the pooled connection string, not the direct connection string — Neon provides both)
- Reduce `max` pool size to 2-3 for serverless usage (Neon's PgBouncer handles pooling externally)
- Consider using `@neondatabase/serverless`'s HTTP driver (single-query-per-request, no pool) for functions that only run simple queries, reserving the pool for functions with multiple sequential queries

**Phase:** Configure before load testing. Not a hard failure on day one but will bite under any real traffic.

---

## Pitfall 7: REPLIT_DOMAINS and REPLIT_DEV_DOMAIN Are Used for App URLs in Emails and Links

**What goes wrong:** Several files construct absolute URLs (for emails, payment links, calendar webhook callbacks) using `REPLIT_DOMAINS` or `REPLIT_DEV_DOMAIN`. These environment variables do not exist on Vercel. Links in emails and SMS will point to `undefined` or fall back to hardcoded placeholder values like `'https://example.com'`.

**This codebase specifically:**
- `server/emailService.ts` lines 245-246: `const APP_URL = process.env.REPLIT_DEV_DOMAIN ? https://${...} : 'http://localhost:5000'` — email verification and password reset links will be broken
- `server/emailService.ts` line 276: `${APP_URL}/verify-email?token=` — verification emails will link to localhost
- `server/emailService.ts` line 331: `${APP_URL}/reset-password?token=` — password reset emails will link to localhost
- `server/notificationEngine.ts` line 106: `process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://abqconcealedcarry.com'` — notification emails use this as the website URL
- `server/notificationEngine.ts` lines 1360, 1400, 1420: CTA buttons and SMS messages use the first `REPLIT_DOMAINS` value
- `server/routes.ts` lines 6478-6480: Payment links use `REPLIT_DOMAINS`
- `server/services/cronService.ts` line 8: Google Calendar webhook callback URL uses `REPLIT_DEV_DOMAIN`

**Warning signs:**
- Password reset emails link to `http://localhost:5000/reset-password?token=...`
- Email verification links are broken
- SMS notifications contain garbled or placeholder URLs
- Google Calendar webhook push notifications stop arriving (wrong callback URL registered)

**Prevention strategy:**
- Add a single `APP_URL` environment variable to Vercel (e.g., `https://practicaldefense.vercel.app` or eventual custom domain)
- Do a global replacement of all `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN` references with `process.env.APP_URL`
- Add `APP_URL` to the required environment variable list — fail fast if it is missing at startup

**Phase:** Must be done as part of the Replit cleanup phase, before any user-facing testing or sending test emails.

---

## Pitfall 8: Serverless Function Bundle Size — The 9,943-Line routes.ts May Hit Limits

**What goes wrong:** Vercel has a 50MB compressed bundle limit per serverless function. A single Express catch-all function that imports `server/routes.ts` (9,943 lines) and `server/storage.ts` (7,432 lines) plus all their transitive dependencies (googleapis, pdfkit, exceljs, twilio, stripe, etc.) is at risk of approaching this limit. This is a soft limit with a hard consequence — Vercel will refuse to deploy functions that exceed it.

**This codebase specifically:**
- `server/routes.ts`: 9,943 lines importing 20+ external SDKs
- `server/storage.ts`: 7,432 lines
- Dependencies that are large: `googleapis` (~20MB), `pdfkit`, `exceljs`, `twilio`, `@google-cloud/storage`
- The build script in `package.json` line 8 uses esbuild with `--bundle --packages=external` — because packages are external, they are not bundled into the output but are still required at runtime

**Warning signs:**
- Vercel deployment fails with "Function size is too large" or "Serverless Function has a maximum size of 50 MB"
- Build succeeds but deployment step fails

**Prevention strategy:**
- Start with a catch-all adapter approach (entire Express app as one Vercel function) rather than splitting into individual function files — this avoids the code duplication of shared modules
- Check bundle size during initial deployment attempt: Vercel will report the size in deployment logs
- If size is an issue, tree-shake by lazily importing large SDKs (pdfkit, exceljs, googleapis) only in the routes that need them
- The Vercel Hobby plan has a 50MB function limit; the Pro plan has a 250MB limit — upgrading resolves this if needed

**Phase:** Discover during first deployment attempt. Have a fallback plan ready (lazy imports or plan upgrade).

---

## Pitfall 9: Google Calendar OAuth Callback URL Must Be Updated in the Central Auth Service

**What goes wrong:** The Google Calendar OAuth flow redirects to `/auth/callback` after instructor authorization. This callback URL is registered with the external "Central Auth" service and likely also in Google Cloud Console as an authorized redirect URI. When the app moves from `https://{repl}.replit.app/auth/callback` to `https://practicaldefense.vercel.app/auth/callback`, the old redirect URI will no longer work — Google OAuth will return an error: `redirect_uri_mismatch`.

**This codebase specifically:**
- `server/index.ts` lines 64-109: The `/auth/callback` handler stores Google credential status in the database — this route itself is fine, it just needs to exist at the new domain
- `server/services/cronService.ts` line 8: The Google Calendar push notification webhook URL (`WEBHOOK_CALLBACK_URL`) also uses the app domain — this must be updated and re-registered when watches are renewed

**Warning signs:**
- Instructors trying to connect their Google Calendar get `redirect_uri_mismatch` error from Google OAuth
- Calendar webhook pushes stop arriving or route to the old Replit URL
- `[Google OAuth Callback]` logs never appear in Vercel function logs

**Prevention strategy:**
- Add the new Vercel URL as an authorized redirect URI in Google Cloud Console before testing instructor calendar flows
- Update the redirect URI in the Central Auth service configuration
- Set `WEBHOOK_CALLBACK_URL` as a Vercel environment variable pointing to the new domain — the cron service already reads it from the environment variable, so no code change is needed, just the env var
- After first deployment, manually trigger `cronService.renewAllCalendarWatches()` to re-register all push notification channels with the new URL

**Phase:** Before testing any instructor-facing calendar features. Set up the env var before first deployment.

---

## Pitfall 10: Vercel Vite Plugin and Replit-Specific Vite Plugins Break the Build

**What goes wrong:** `vite.config.ts` conditionally loads `@replit/vite-plugin-cartographer` when `REPL_ID` is set (lines 10-16). It also always loads `@replit/vite-plugin-runtime-error-modal`. On Vercel, `REPL_ID` will not be set (so `cartographer` is skipped correctly), but `@replit/vite-plugin-runtime-error-modal` is still applied unconditionally. This plugin may cause build failures or unexpected behavior on Vercel, or may fail to install in CI because it depends on Replit-specific APIs.

**This codebase specifically:**
- `vite.config.ts` line 4: `import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"` — unconditional import
- `vite.config.ts` line 8: `runtimeErrorOverlay()` — unconditional plugin registration
- `package.json` devDependencies: `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` — both Replit-specific
- `package.json` devDependencies: `@replit/vite-plugin-runtime-error-modal` — this must be removed or guarded behind a Replit environment check before the Vercel build

**Warning signs:**
- `npm run build` fails with a module resolution error on `@replit/vite-plugin-runtime-error-modal`
- Vite build exits with a non-zero code during Vercel's build step

**Prevention strategy:**
- Guard the runtime error modal plugin the same way `cartographer` is guarded: only apply it when `REPL_ID` is defined
- Remove `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` from devDependencies entirely — they have no purpose outside Replit
- Run `npm run build` locally (without Replit env vars set) to confirm the build succeeds before pushing to Vercel

**Phase:** Fix in the Replit cleanup phase. This is a build-time failure, not a runtime failure — it will block deployment immediately.

---

## Pitfall 11: File Uploads via multer Have No Persistent Filesystem on Vercel

**What goes wrong:** `multer.memoryStorage()` is used in `server/giftCards/routes.ts` — this stores uploads in RAM, not on disk. This is safe for serverless. However, any route that uses `multer.diskStorage()` or writes files to the local filesystem (e.g., `attached_assets/` directory) will silently succeed but the files will be gone when the function instance terminates. Vercel's serverless filesystem is read-only except for `/tmp` (with a 512MB limit).

**This codebase specifically:**
- `server/giftCards/routes.ts` line 14: `multer.memoryStorage()` — safe for serverless, files go to RAM then are forwarded to GCS
- `attached_assets/` directory in the project root — any code writing to this path (waivers, generated images) will fail on Vercel
- PDF generation via `pdfkit` — if PDFs are written to disk before being served, that will fail; they must be streamed directly to the response or to cloud storage

**Warning signs:**
- File upload endpoints return 200 but files are never retrievable
- PDF generation returns 500 errors referencing filesystem paths
- Waiver documents are lost after upload

**Prevention strategy:**
- Audit all code paths that write to `attached_assets/` or any local path — redirect those writes to GCS (which will be replaced as part of Pitfall 1 resolution)
- Ensure PDFs generated by `pdfkit` are piped directly to the HTTP response or to a GCS upload stream, never written to disk
- For `/tmp` writes (if needed for intermediate processing), keep files small and do not assume they persist across requests

**Phase:** Audit during the storage migration phase (same phase as Pitfall 1 resolution).

---

## Pitfall 12: Cold Start Latency on the isAuthenticated Middleware

**What goes wrong:** Every authenticated API request hits `isAuthenticated` in `server/customAuth.ts`, which does a database query (`db.query.users.findFirst`) to load the full user record. On a cold start, this query runs while the database connection pool is also being established — adding 200-600ms of latency to the first request. For a training platform where instructors log in and immediately interact with dashboards, this is noticeable.

**This codebase specifically:**
- `server/customAuth.ts` lines 69-92: `isAuthenticated` runs a full `findFirst` on the `users` table on every authenticated request
- `server/db.ts` lines 15-22: Pool connection setup happens lazily on the first query

**Warning signs:**
- First request after cold start takes 1-3 seconds instead of 100-200ms
- Vercel function duration metrics show occasional 2000ms+ durations on otherwise fast endpoints

**Prevention strategy:**
- Use Neon's HTTP driver for the session user lookup (eliminates WebSocket connection overhead for this single query)
- Consider caching the user object in the session payload itself (`req.session.user`) rather than re-querying on every request — only re-query when the session is first established or when user data mutations are known to have occurred
- Set `POSTGRES_URL_NON_POOLING` for migrations (which require direct connections) and `DATABASE_URL` to the pooled/HTTP endpoint for application queries

**Phase:** Optimize after initial deployment is verified working. Not a correctness issue, a performance issue.

---

## Summary: Phase Mapping

| Phase | Pitfalls to Address |
|-------|---------------------|
| Replit cleanup (before first deploy) | P5 (Stripe credential chain), P7 (REPLIT_DOMAINS URLs), P10 (Replit Vite plugins) |
| Storage migration | P1 (GCS sidecar), P11 (multer/filesystem) |
| API restructuring for Vercel | P4 (Stripe webhook raw body), P6 (Neon connection pooling), P12 (cold start auth) |
| Cron replacement | P2 (node-cron) |
| Session and auth validation | P3 (express-session) |
| OAuth and external callback URLs | P9 (Google Calendar OAuth redirect) |
| Deployment attempt | P8 (bundle size) |

---

## Environment Variables Required on Vercel (Not on Replit)

The following variables must be added to Vercel that replace Replit-specific equivalents:

| New Variable | Replaces | Purpose |
|---|---|---|
| `APP_URL` | `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN` | Base URL for emails, links, webhooks |
| `WEBHOOK_CALLBACK_URL` | Auto-built from `REPLIT_DEV_DOMAIN` | Google Calendar push notification endpoint |
| `CRON_SECRET` | (new) | Secures internal cron trigger endpoint |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Replit sidecar token exchange | GCS authentication |

Remove from Vercel (do not carry over):
- `REPLIT_DEPLOYMENT`
- `REPLIT_CONNECTORS_HOSTNAME`
- `REPL_IDENTITY`
- `WEB_REPL_RENEWAL`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_DOMAINS`
- `REPL_ID`
- `PUBLIC_OBJECT_SEARCH_PATHS` (replace with GCS bucket name variable)
- `PRIVATE_OBJECT_DIR` (replace with GCS bucket name variable)

---

*Research: 2026-02-20*
