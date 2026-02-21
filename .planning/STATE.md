# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.
**Current focus:** Phase 1 — Replit Cleanup

## Current Position

Phase: 1 of 4 (Replit Cleanup)
Plan: 2 of 3 in current phase
Status: In progress — Plan 01-02 complete
Last activity: 2026-02-21 — Completed 01-02-PLAN.md (Stripe simplification and REPLIT URL removal)

Progress: [██░░░░░░░░] 17% (2 of 12 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 5 min
- Total execution time: 10 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-replit-cleanup | 2/3 | 10 min | 5 min |

**Recent Trend:**
- Last 5 plans: 3 min, 7 min
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1 Context]: Switch to Vercel Blob (not GCS) — no existing files to migrate, clean implementation
- [Roadmap]: Single Express function adapter pattern — no per-route Vercel function refactor
- [Roadmap]: Phase 3 must complete within 7 days of Phase 2 going live — Google Calendar watch channel expiry
- [01-01]: Keep moment (used in 4 client files), openai (future use), node-cron (Phase 3), memoizee (not audited), @google-cloud/storage (Plan 03)
- [01-01]: UploadResult type defined inline in EditCourseForm.tsx — matches ObjectUploader.tsx construction exactly
- [01-02]: getStripeClient() made synchronous — no async work remains after removing Replit/DB fallbacks
- [01-02]: getStripePromise() always returns Promise<Stripe | null> (not null) — preserves .then() compatibility for 3 callers
- [01-02]: stripeCredentials schema/table left in DB — only storage methods removed; no migration needed in Phase 1
- [01-02]: APP_URL env var now required for all URL construction in emails, notifications, calendar webhooks, payment links

### Pending Todos

None.

### Blockers/Concerns

- **[Pre-Phase 2]**: Verify which DATABASE_URL the Replit deployment is using — pooled PgBouncer vs. direct. Pooled required for serverless; direct required for Drizzle migrations. Set both as separate env vars.
- **[Pre-Phase 3]**: Confirm who manages auth.instructorops.com and the process for updating the Google OAuth redirect URI. If third-party, may need lead time before Phase 3 starts.
- **[Phase 2]**: Bundle size is unmeasured — risk of exceeding Vercel plan limits. Lazy-import fallback plan (pdfkit, exceljs, googleapis) if first deploy exceeds limit.
- **[Pre-Phase 2]**: Confirm Vercel plan tier (Pro recommended — cron job may exceed 60s Hobby limit).
- **[Note]**: 644 pre-existing TypeScript errors in codebase — none from removed packages, not a blocker for this phase.
- **[Pre-Deploy]**: Add APP_URL env var to Vercel deployment configuration before Plan 03 startup validation — required for email links, SMS URLs, calendar webhook callbacks, and payment links.
- **[Pre-Deploy]**: Add VITE_STRIPE_PUBLIC_KEY env var to Vercel deployment configuration — required for client-side Stripe initialization.

## Session Continuity

Last session: 2026-02-21T06:35:21Z
Stopped at: Completed 01-02-PLAN.md (Stripe simplification and REPLIT URL removal)
Resume file: None
