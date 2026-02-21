# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.
**Current focus:** Phase 2 — Vercel Deploy (Phase 1 complete)

## Current Position

Phase: 2 of 4 (Vercel Adapter) — In progress
Plan: 1 of ~3 in phase 2 (4 of 12 total)
Status: In progress
Last activity: 2026-02-21 — Completed 02-01-PLAN.md (Express app factory, Vercel serverless entry point)

Progress: [████░░░░░░] 33% (4 of 12 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 min
- Total execution time: 19 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-replit-cleanup | 3/3 | 17 min | 6 min |
| 02-vercel-adapter | 1/? | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 3 min, 7 min, 7 min, 2 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1 Context]: Switch to Vercel Blob (not GCS) — no existing files to migrate, clean implementation
- [Roadmap]: Single Express function adapter pattern — no per-route Vercel function refactor
- [Roadmap]: Phase 3 must complete within 7 days of Phase 2 going live — Google Calendar watch channel expiry
- [01-01]: Keep moment (used in 4 client files), openai (future use), node-cron (Phase 3), memoizee (not audited)
- [01-01]: UploadResult type defined inline in EditCourseForm.tsx — matches ObjectUploader.tsx construction exactly
- [01-02]: getStripeClient() made synchronous — no async work remains after removing Replit/DB fallbacks
- [01-02]: getStripePromise() always returns Promise<Stripe | null> (not null) — preserves .then() compatibility for 3 callers
- [01-02]: stripeCredentials schema/table left in DB — only storage methods removed; no migration needed in Phase 1
- [01-02]: APP_URL env var now required for all URL construction in emails, notifications, calendar webhooks, payment links
- [01-03]: objectStorageClient export removed — gift cards and routes use @vercel/blob directly or ObjectStorageService
- [01-03]: onGetUploadParameters prop removed from ObjectUploader — server-side FormData upload replaces presigned URL flow
- [01-03]: blobUrl required in ObjectAclPolicy — enables DB lookup of blob URL by pathname without re-constructing
- [01-03]: Gift card theme-image proxy route returns 404 — new uploads return public Vercel Blob URLs directly
- [01-03]: Startup validation uses process.exit(1) — fail-fast for required env vars (DATABASE_URL, SESSION_SECRET, APP_URL, BLOB_READ_WRITE_TOKEN)
- [01-03]: ACL endpoints return full blob URL as objectPath — Vercel Blob URLs stored directly in DB (no normalization)
- [02-01]: Stripe webhook raw body path corrected to /api/online-course/webhook (was /api/webhooks/stripe — pre-existing bug)
- [02-01]: registerRoutes() return value (http.Server) discarded in server/app.ts — server/index.ts creates its own Server via createServer(app)
- [02-01]: appPromise cached at module level in api/index.ts — avoids re-registering routes on Vercel warm invocations
- [02-01]: log imported from ./vite in server/app.ts — only the log function, not setupVite or serveStatic

### Pending Todos

None.

### Blockers/Concerns

- **[Pre-Phase 2]**: Verify which DATABASE_URL the Replit deployment is using — pooled PgBouncer vs. direct. Pooled required for serverless; direct required for Drizzle migrations. Set both as separate env vars.
- **[Pre-Phase 3]**: Confirm who manages auth.instructorops.com and the process for updating the Google OAuth redirect URI. If third-party, may need lead time before Phase 3 starts.
- **[Phase 2]**: Bundle size is unmeasured — risk of exceeding Vercel plan limits. Lazy-import fallback plan (pdfkit, exceljs, googleapis) if first deploy exceeds limit.
- **[Pre-Phase 2]**: Confirm Vercel plan tier (Pro recommended — cron job may exceed 60s Hobby limit).
- **[Note]**: ~646 pre-existing TypeScript errors in codebase — none from our changes, not a blocker for this phase.
- **[Pre-Deploy]**: Run `npm run db:push` on production database to create `blobAclPolicies` table before first file upload.
- **[Pre-Deploy]**: Add BLOB_READ_WRITE_TOKEN env var to Vercel deployment configuration — required for file storage.
- **[Pre-Deploy]**: Add APP_URL env var to Vercel deployment configuration — required for email links, SMS URLs, calendar webhook callbacks, and payment links.
- **[Pre-Deploy]**: Add VITE_STRIPE_PUBLIC_KEY env var to Vercel deployment configuration — required for client-side Stripe initialization.

## Session Continuity

Last session: 2026-02-21T07:41:43Z
Stopped at: Completed 02-01-PLAN.md (Express app factory, Vercel serverless entry point)
Resume file: None
