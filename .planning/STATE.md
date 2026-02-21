# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.
**Current focus:** Phase 1 — Replit Cleanup

## Current Position

Phase: 1 of 4 (Replit Cleanup)
Plan: 1 of 3 in current phase
Status: In progress — Plan 01-01 complete
Last activity: 2026-02-21 — Completed 01-01-PLAN.md (Remove Replit build dependencies)

Progress: [█░░░░░░░░░] 8% (1 of 12 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 3 min
- Total execution time: 3 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-replit-cleanup | 1/3 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 3 min
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

### Pending Todos

None.

### Blockers/Concerns

- **[Pre-Phase 2]**: Verify which DATABASE_URL the Replit deployment is using — pooled PgBouncer vs. direct. Pooled required for serverless; direct required for Drizzle migrations. Set both as separate env vars.
- **[Pre-Phase 3]**: Confirm who manages auth.instructorops.com and the process for updating the Google OAuth redirect URI. If third-party, may need lead time before Phase 3 starts.
- **[Phase 2]**: Bundle size is unmeasured — risk of exceeding Vercel plan limits. Lazy-import fallback plan (pdfkit, exceljs, googleapis) if first deploy exceeds limit.
- **[Pre-Phase 2]**: Confirm Vercel plan tier (Pro recommended — cron job may exceed 60s Hobby limit).
- **[Note]**: 644 pre-existing TypeScript errors in codebase — none from removed packages, not a blocker for this phase.

## Session Continuity

Last session: 2026-02-21T06:29:30Z
Stopped at: Completed 01-01-PLAN.md (Replit build dependency removal)
Resume file: None
