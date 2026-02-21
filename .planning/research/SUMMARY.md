# Project Research Summary

**Project:** Practical Defense — Replit to Vercel Migration
**Domain:** Full-stack Express/React/TypeScript monolith, serverless hosting migration
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

Practical Defense is a mature full-stack TypeScript application (Express backend, React/Vite frontend, Neon PostgreSQL) currently running as a persistent process on Replit. The migration to Vercel is a well-understood problem: the recommended approach is to wrap the existing Express app in a single Vercel serverless function via `api/index.ts` (the "full adapter" pattern), serve the React frontend as Vite static output on Vercel's CDN, and configure routing through `vercel.json`. This preserves virtually all existing Express code without refactoring. The alternative — rewriting each route as an individual Vercel function — is explicitly not recommended; the effort far exceeds the benefit for this codebase.

The migration has four substantive technical blockers that must be resolved before the app can run on Vercel. In severity order: (1) the Google Cloud Storage credential sidecar at `http://127.0.0.1:1106` is hardcoded in `server/objectStorage.ts` and will hard-fail immediately — replace with a standard GCS service account or Vercel Blob; (2) `node-cron` schedules are silently lost in serverless — replace with Vercel Cron + a secured HTTP endpoint; (3) Stripe's Replit connector credential fallback will break payment initialization if `STRIPE_SECRET_KEY` is not set — remove the Replit fallback path and fail fast; (4) all `REPLIT_DOMAINS`/`REPLIT_DEV_DOMAIN` references in email, SMS, and calendar code will produce broken links — replace with a single `APP_URL` environment variable. Session management (`express-session` + `connect-pg-simple`) requires no architectural change because sessions are already stored in PostgreSQL, which is network-accessible from Vercel. WebSockets are a non-issue: the `ws` package is used only as the Neon database transport, not as a WebSocket server.

The recommended migration order is: (1) clean up all Replit-specific dependencies and environment variables in the existing codebase so it passes local tests without any `REPLIT_*` vars; (2) create `api/index.ts`, `vercel.json`, and update `package.json` build scripts; (3) migrate the cron job and file storage; (4) deploy to Vercel and verify auth, payments, and calendar flows. The entire migration can be completed without touching the database schema, without changing the authentication system, and without refactoring the route monolith. These constraints are intentional — doing refactoring and migration simultaneously multiplies risk significantly.

---

## Key Findings

### Recommended Stack

The existing stack requires almost no changes. Express 4.21.2 runs as-is inside Vercel's Node.js runtime via the full adapter pattern. Neon PostgreSQL with `@neondatabase/serverless` is already optimized for serverless. Drizzle ORM, Stripe, SendGrid, Twilio, and GoogleAPIs packages all work without modification. The Node.js version must be pinned to `22.x` in `package.json` engines to avoid breakage from Vercel's default Node.js 24.x. One new package is required: `@vercel/blob` if switching file storage from GCS to Vercel Blob (optional — direct GCS with a service account key is equally valid and avoids a data migration).

**Core technologies (no change required):**
- `express` 4.21.2: Wrapped via `api/index.ts` export — no code changes to existing routes
- `express-session` + `connect-pg-simple`: PostgreSQL session store is serverless-compatible as-is
- `@neondatabase/serverless` 0.10.4: Already designed for serverless; use Neon's pooled connection URL
- `drizzle-orm` 0.39.1: No changes needed
- `stripe` 20.0.0: Remove Replit credential fallback; env var only
- `@sendgrid/mail` + `twilio`: No code changes; set env vars
- `googleapis` 159.0.0: Works with direct service account credentials

**New / changed packages:**
- `@vercel/blob` (optional): Native Vercel file storage; simplest path if migrating away from GCS
- `node-cron`: Remove from production (replaced by Vercel Cron Jobs)
- `memorystore`: Remove (in-memory sessions are useless in serverless)
- `stripe-replit-sync`, `@replit/vite-plugin-*`: Remove entirely

**Node.js version:** Pin to `22.x` in `package.json` engines field.

**Vercel plan:** Pro recommended. Hobby plan limits function duration to 60 seconds, which may be insufficient for the daily cron job that iterates all instructors with 500ms delays.

### Expected Features

This is a migration, not a new feature build. The distinction between "table stakes" and "should-have" maps to migration criticality rather than user-facing feature priority.

**Must work on Day 1 (blocks deployment):**
- Express API running as Vercel serverless function — everything else depends on this
- Session-based authentication (`express-session` + PostgreSQL) — all authenticated routes
- Stripe payment processing + raw body webhooks — revenue-critical
- GCS file storage with working credentials — blocks all uploads
- SendGrid email + Twilio SMS — auth flows (password reset, verification) depend on correct `APP_URL`
- All `REPLIT_*` environment variable references replaced with `APP_URL`
- Neon PostgreSQL connection — every route depends on database access

**Important (address shortly after initial deployment):**
- `node-cron` replaced with Vercel Cron Jobs — Google Calendar watch channels expire within 7 days without renewal
- Google Calendar OAuth callback URL updated in Central Auth service and Google Cloud Console
- Vite build cleaned of Replit plugins — build-time failure if not resolved before first deploy (effectively Day 1)

**Nice-to-have (post-migration improvements):**
- Centralized `APP_BASE_URL` standardization (audit hardcoded fallback URLs)
- Structured logging / error tracking (Sentry or pino)
- Cold start optimization (lazy imports for pdfkit, exceljs, googleapis)
- Session cookie `sameSite` hardening if domain architecture changes

**Explicit anti-features — do not do during migration:**
- Do not refactor `server/routes.ts` (9,943 lines) or `server/storage.ts` (7,432 lines) simultaneously
- Do not change database schema
- Do not introduce new auth systems (NextAuth, Clerk, etc.)
- Do not use Vercel Edge Runtime (Node.js-specific APIs like bcrypt, pdfkit are incompatible)
- Do not add new features

### Architecture Approach

The target architecture is a two-target deployment: the React frontend is built by Vite into `dist/public/` and served from Vercel's CDN; the Express backend is exported from `api/index.ts` as a single serverless function that handles all `/api/*` and `/auth/*` traffic. The `vercel.json` rewrites route `/api/(.*)` and `/auth/(.*)` to the Express adapter, and all other paths to `index.html` for SPA client-side routing. Critically, the `/auth/(.*)` rewrite must be explicit — without it, Vercel serves the React SPA for `/auth/callback` and breaks Google OAuth.

The key code change enabling this is splitting `server/index.ts` into two files: `server/app.ts` (Express app setup without `listen()`) and keeping `server/index.ts` as the local-dev entry point that calls `app.listen()`. The `api/index.ts` Vercel entry point simply re-exports the app from `server/app.ts`. This pattern requires zero changes to existing route files.

**Major components and responsibilities:**
1. `api/index.ts` — Vercel entry point; re-exports Express app; no business logic
2. `server/app.ts` — Express app initialization, middleware registration, route mounting (extracted from current `server/index.ts`)
3. `server/index.ts` — Local development entry point only; calls `app.listen()`
4. `dist/public/` — Vite static build; served from Vercel CDN
5. `vercel.json` — Routing, function config, cron schedule
6. `api/internal/cron/daily-maintenance` — Secured HTTP endpoint replacing `node-cron`
7. Neon PostgreSQL — Session store (unchanged), application database (unchanged)

**Session management:** No architecture change. `express-session` + `connect-pg-simple` works in serverless because session data is stored in PostgreSQL (network-accessible). Keep `trust proxy: 1` in Express — Vercel sits behind its own reverse proxy and sets `x-forwarded-proto`.

**Build pipeline change:** Remove the `esbuild` backend bundling step from `package.json` build script. New build: `"build": "vite build"` only. Vercel bundles `api/index.ts` automatically at deploy time.

### Critical Pitfalls

1. **GCS sidecar hard-fail** — `server/objectStorage.ts` hardcodes `http://127.0.0.1:1106` for credential exchange AND signed URL generation. Two separate locations must be replaced: the `Storage` client instantiation (lines 17-30) and `signObjectURL()` (lines 280-298). A third hardcoded reference exists in `server/routes.ts` line 8937. Replace with a GCS service account key in `GOOGLE_APPLICATION_CREDENTIALS_JSON` env var + native `file.getSignedUrl()`. This is a boot-time failure for any storage operation.

2. **Stripe Replit credential fallback** — `server/stripeClient.ts` falls back to Replit connectors when `STRIPE_SECRET_KEY` is missing. On Vercel the fallback throws, Stripe silently becomes `null`, and all payment endpoints fail with a configured warning instead of a hard error. Remove `getCredentialsFromReplit()` entirely. Set `STRIPE_SECRET_KEY` in Vercel env vars before first deployment. Make initialization fail fast.

3. **REPLIT_DOMAINS / REPLIT_DEV_DOMAIN in email and link construction** — Seven distinct locations use Replit env vars to construct URLs: `server/emailService.ts` (password reset, verification links), `server/notificationEngine.ts` (email CTAs, SMS messages), `server/routes.ts` (payment links), `server/services/cronService.ts` (calendar webhook callback URL). Without replacement, all these links point to `localhost:5000` or `undefined`. Replace with a single `APP_URL` env var.

4. **Stripe webhook raw body order** — `server/index.ts` correctly applies `express.raw()` before `express.json()` for webhook paths. This order must be preserved exactly when restructuring for Vercel. If the full adapter pattern is used (recommended), this is automatic. If webhook routes are ever split into separate Vercel function files, each must export `config = { api: { bodyParser: false } }` and implement its own raw body reader.

5. **Replit Vite plugins break the build** — `@replit/vite-plugin-runtime-error-modal` is unconditionally imported in `vite.config.ts`. This will fail `npm run build` on Vercel (build-time, not runtime). Remove both Replit Vite plugins and their `devDependencies` entries before attempting any Vercel deployment.

6. **Neon connection pool exhaustion** — `server/db.ts` configures a pool of `max: 10` connections. In serverless, each cold-start function invocation may create its own pool. Under concurrent traffic, this exhausts Neon's connection limit. Use Neon's pooled connection URL (`DATABASE_URL` should point to the PgBouncer-pooled endpoint) and reduce `max` to 2-3 for serverless.

7. **node-cron silent loss** — `cronService.initialize()` called at server start registers an in-memory timer that is gone when the function terminates. Google Calendar watch channels expire within 7 days. Replace with Vercel Cron + a secured `GET /api/internal/cron/daily-maintenance` endpoint with `CRON_SECRET` header validation.

---

## Implications for Roadmap

Based on research, the migration has a clear dependency chain. Each phase is a prerequisite for the next. The recommended phase structure follows the architecture document's four-phase migration order, with pitfall prevention mapped explicitly to each phase.

### Phase 1: Replit Dependency Cleanup
**Rationale:** All subsequent phases depend on the codebase running cleanly without Replit-specific environment variables. This phase has zero architecture changes — it is pure mechanical cleanup. Completing it first means the local dev environment is the source of truth for what will run on Vercel.
**Delivers:** A codebase that starts and runs locally with no `REPLIT_*` env vars. All Replit-specific packages removed. Build succeeds with `npm run build`.
**Addresses:** Express API foundation (table stakes), env var replacement (table stakes), SendGrid/Twilio URL fixes (table stakes), Vite build cleanup (important)
**Avoids:** Pitfall 5 (Stripe credential chain), Pitfall 7 (REPLIT_DOMAINS broken URLs), Pitfall 10 (Replit Vite plugins break build)
**Tasks:**
- Remove `getCredentialsFromReplit()` from `server/stripeClient.ts`; env var only
- Replace all `REPLIT_*` references with `APP_URL` (7 locations across 4 files)
- Remove Replit Vite plugins from `vite.config.ts` and `package.json` devDependencies
- Remove `stripe-replit-sync`, `memorystore` from dependencies
- Replace GCS sidecar credential block in `server/objectStorage.ts` with service account JSON
- Replace sidecar-based `signObjectURL()` with native GCS `file.getSignedUrl()`
- Remove hardcoded sidecar reference in `server/routes.ts` line 8937
- Verify `npm run build` succeeds with no Replit env vars set

### Phase 2: Vercel Adapter Setup
**Rationale:** Once the codebase is Replit-free, setting up the Vercel adapter is low-risk mechanical work. This phase produces the first deployable artifact. No route logic changes, no database changes.
**Delivers:** A working Vercel deployment where the Express app is reachable, the React frontend is served from CDN, and session auth is functional.
**Addresses:** Express as Vercel serverless function (table stakes), session auth validation (table stakes), Neon PostgreSQL (table stakes)
**Avoids:** Pitfall 3 (express-session trust proxy), Pitfall 4 (Stripe webhook raw body), Pitfall 6 (Neon connection pool), Pitfall 8 (bundle size — discover here)
**Tasks:**
- Extract `server/app.ts` from `server/index.ts` (Express setup without `listen()`)
- Create `api/index.ts` exporting the Express app
- Create `vercel.json` with rewrites (`/api/(.*)`, `/auth/(.*)`, SPA fallback), function config, `maxDuration: 30`
- Update `package.json` build script to `"vite build"` only; pin `engines.node` to `"22.x"`
- Set all environment variables in Vercel dashboard (carry-over vars + new `APP_URL`, `CRON_SECRET`)
- Use Neon's pooled connection URL for `DATABASE_URL`; reduce pool `max` to 3
- Verify session login/logout round-trips and cookie behavior on Vercel domain
- Verify Stripe webhook raw body parsing works (use Stripe CLI)

### Phase 3: Cron and Calendar
**Rationale:** Google Calendar watch channels expire within 7 days of migration. This phase must land within that window after Phase 2 deployment. The cron logic itself needs no changes — only the scheduler mechanism changes.
**Delivers:** Daily maintenance job running reliably on Vercel. Google Calendar push notifications renewing correctly at the new domain.
**Addresses:** node-cron replacement (important), Google Calendar OAuth callback URL (important)
**Avoids:** Pitfall 2 (node-cron silent loss), Pitfall 9 (Google Calendar OAuth redirect mismatch)
**Tasks:**
- Add secured `GET /api/internal/cron/daily-maintenance` route in Express; validate `CRON_SECRET` header
- Add cron entry to `vercel.json` (`"schedule": "0 7 * * *"`)
- Remove `node-cron` from dependencies and `server/index.ts` initialization
- Update Google Cloud Console with new Vercel redirect URI for OAuth
- Update redirect URI in Central Auth service (`auth.instructorops.com`)
- Set `WEBHOOK_CALLBACK_URL` in Vercel env vars to new domain
- Manually trigger `cronService.renewAllCalendarWatches()` after deployment to re-register push channels

### Phase 4: Verification and Cutover
**Rationale:** End-to-end validation before treating the Vercel deployment as production. Covers all user-facing flows.
**Delivers:** Confirmed working deployment covering auth, payments, file uploads, email/SMS, calendar, and cron.
**Avoids:** Any remaining undetected issues with webhook URL registration, bundle size, or cold start latency
**Tasks:**
- Test complete auth flow: signup, login, email verification, password reset (verify links use `APP_URL`)
- Test payment flow end-to-end with Stripe test mode
- Verify both Stripe webhook endpoints receive and process test events
- Test file upload (gift card themes, course images) and download/signed URL generation
- Test instructor Google Calendar connection and availability sync
- Verify Vercel function logs show cron job execution
- Verify Vercel deployment logs confirm bundle size is within limits (250MB Pro, 50MB Hobby)
- Update Stripe Dashboard webhook endpoints to Vercel URL
- Monitor Neon connection count during testing to confirm pool exhaustion is not occurring

### Phase Ordering Rationale

- Phase 1 before Phase 2: The Vercel adapter cannot be properly tested if the codebase still has Replit-specific startup failures. Cleaning first means Phase 2 errors are Vercel configuration issues, not Replit dependency issues — much easier to debug.
- Phase 2 before Phase 3: The cron endpoint must exist in a deployed Express app before the Vercel Cron schedule can call it.
- Phase 3 must complete within 7 days of Phase 2 going live: Google Calendar watch channels have a maximum lifetime. The cron job must fire before they expire.
- Phase 4 is non-optional: With payments, file storage, and calendar integrations involved, explicit end-to-end verification before treating this as production is essential.

### Research Flags

Phases with standard patterns (research not needed during planning):
- **Phase 1:** Mechanical find-and-replace work. All code locations are identified in PITFALLS.md. No unknown territory.
- **Phase 2:** The full adapter pattern is officially documented by Vercel and widely deployed. Session compatibility with Neon PostgreSQL is confirmed. Standard configuration work.
- **Phase 4:** Verification work. No research needed.

Phases that may benefit from deeper investigation:
- **Phase 3 — Central Auth coordination:** The OAuth redirect URI update requires coordinating with the external `auth.instructorops.com` service. How that service is configured and who manages it should be confirmed before starting Phase 3. If self-managed, this is straightforward; if it requires a third party, it adds lead time.
- **Phase 2 — Bundle size validation:** The 250MB (Pro) / 50MB (Hobby) function bundle limit with the current dependency set (googleapis, pdfkit, exceljs, twilio, stripe) has not been measured. The first deployment attempt will reveal this. Have a lazy-import fallback plan ready.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology decisions based on official Vercel Node.js runtime documentation. Package compatibility verified against known serverless constraints. |
| Features | HIGH | Based on direct codebase inspection of `server/`, `shared/`, and `.planning/` documents. Migration requirements are code-level, not speculative. |
| Architecture | HIGH | Full adapter pattern is officially documented and the recommended approach for Express-on-Vercel. Session compatibility confirmed (Neon is network-accessible). WebSocket concern resolved (ws is Neon driver only, no WebSocket server exists). |
| Pitfalls | HIGH | All pitfalls tied to specific file paths and line numbers in this codebase. Not generic advice. The 7 identified pitfalls are the complete set of Replit-specific coupling points. |

**Overall confidence: HIGH**

### Gaps to Address

- **Bundle size**: The `api/index.ts` bundle size with all transitive dependencies (googleapis, pdfkit, exceljs, twilio, stripe, etc.) has not been measured. Will be discovered on first deployment. If it exceeds limits, lazy imports for PDF/Excel/GCS SDK are the mitigation. Verify during Phase 2.
- **Central Auth service configuration**: The `auth.instructorops.com` OAuth redirect URI update is an external dependency. The process for updating it (self-managed vs. third party, lead time) is not documented in the planning files. Confirm before Phase 3.
- **Neon pooled vs. direct URL**: Confirm which `DATABASE_URL` the current Replit deployment is using (pooled PgBouncer endpoint vs. direct connection). The pooled endpoint is required for serverless; the direct endpoint is required for Drizzle migrations. Both should be set as separate env vars.
- **Existing GCS files**: If switching to Vercel Blob, existing stored files (course images, waivers, gift card themes) would need to be migrated. The research recommends staying with direct GCS credentials to avoid this. Confirm this decision is acceptable before Phase 1.
- **Vercel plan tier**: Pro plan is recommended for 300-second function timeout (cron job may exceed 60-second Hobby limit). Confirm plan before Phase 2 deployment.

---

## Sources

### Primary (HIGH confidence)
- Vercel Node.js runtime docs: https://vercel.com/docs/functions/runtimes/node-js
- Vercel Node.js versions: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Vercel project configuration (vercel.json): https://vercel.com/docs/project-configuration/vercel-json
- Vercel Cron Jobs quickstart: https://vercel.com/docs/cron-jobs/quickstart
- Vercel Blob SDK: https://vercel.com/docs/vercel-blob/using-blob-sdk
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute
- Vercel function limitations: https://vercel.com/docs/functions/limitations
- Direct codebase inspection: `server/objectStorage.ts`, `server/stripeClient.ts`, `server/customAuth.ts`, `server/routes.ts`, `server/services/cronService.ts`, `server/emailService.ts`, `server/notificationEngine.ts`, `vite.config.ts`, `server/db.ts`

### Secondary (MEDIUM confidence)
- `@vercel/blob` ACL model (binary public/private access) vs. current custom GCS ACL — migration of fine-grained permissions requires simplification; exact behavior at scale not tested

### Tertiary (LOW confidence / needs validation)
- Bundle size estimate for the full dependency set — estimated at risk of exceeding 50MB Hobby limit based on known large packages; needs actual measurement at deploy time
- Vercel Pro cron timeout sufficiency for `renewAllCalendarWatches` — depends on number of active instructors at migration time; 500ms sleep between instructors is the variable

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
