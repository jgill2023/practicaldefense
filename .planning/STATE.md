# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.
**Current focus:** Phase 1 — Replit Cleanup

## Current Position

Phase: 1 of 4 (Replit Cleanup)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-02-20 — Roadmap created, all 27 v1 requirements mapped across 4 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Keep GCS direct credentials (not Vercel Blob) — avoids migrating existing stored files
- [Roadmap]: Single Express function adapter pattern — no per-route Vercel function refactor
- [Roadmap]: Phase 3 must complete within 7 days of Phase 2 going live — Google Calendar watch channel expiry

### Pending Todos

None yet.

### Blockers/Concerns

- **[Pre-Phase 2]**: Verify which DATABASE_URL the Replit deployment is using — pooled PgBouncer vs. direct. Pooled required for serverless; direct required for Drizzle migrations. Set both as separate env vars.
- **[Pre-Phase 3]**: Confirm who manages auth.instructorops.com and the process for updating the Google OAuth redirect URI. If third-party, may need lead time before Phase 3 starts.
- **[Phase 2]**: Bundle size is unmeasured — risk of exceeding Vercel plan limits. Lazy-import fallback plan (pdfkit, exceljs, googleapis) if first deploy exceeds limit.
- **[Pre-Phase 2]**: Confirm Vercel plan tier (Pro recommended — cron job may exceed 60s Hobby limit).

## Session Continuity

Last session: 2026-02-20
Stopped at: Roadmap created, STATE.md initialized. Next step: run /gsd:plan-phase 1
Resume file: None
