---
phase: 02-vercel-adapter
plan: 01
subsystem: infra
tags: [express, vercel, serverless, typescript, stripe, vite]

# Dependency graph
requires:
  - phase: 01-replit-cleanup
    provides: server/index.ts with startup validation, cronService, and Vite setup already in place
provides:
  - server/app.ts: async createApp() factory returning fully-configured Express app
  - api/index.ts: Vercel serverless entry point with warm-invocation app reuse
  - server/index.ts: refactored local-dev-only entry point (process.exit, Vite, cron, listen)
affects: [02-vercel-adapter, vercel.json configuration, deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Express app factory pattern: createApp() separates app construction from HTTP listener lifecycle"
    - "Module-level promise caching for serverless warm invocations"

key-files:
  created:
    - server/app.ts
    - api/index.ts
  modified:
    - server/index.ts

key-decisions:
  - "Stripe webhook raw body path fixed to /api/online-course/webhook (was incorrectly /api/webhooks/stripe)"
  - "registerRoutes() return value (http.Server) discarded in app.ts — server/index.ts creates its own Server via createServer(app)"
  - "appPromise cached at module level in api/index.ts — avoids re-registering routes on Vercel warm invocations"
  - "log imported from ./vite in server/app.ts — only the log function, not setupVite or serveStatic"

patterns-established:
  - "createApp(): pure Express factory — no listener, no cron, no Vite; suitable for serverless and local dev"
  - "server/index.ts: local-dev gate — process.exit validation, Vite setup, cron init, server.listen all isolated here"

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 2 Plan 1: Vercel Adapter — Express App Factory Summary

**Express app factory pattern with createApp() in server/app.ts, thin Vercel handler in api/index.ts, and Stripe webhook raw body path corrected to /api/online-course/webhook**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-21T07:39:55Z
- **Completed:** 2026-02-21T07:41:43Z
- **Tasks:** 2
- **Files modified:** 3 (server/app.ts created, api/index.ts created, server/index.ts refactored)

## Accomplishments

- Created `server/app.ts` with `async createApp()` factory containing all Express middleware, routes, error handler, SEO, and Google OAuth callback
- Fixed pre-existing bug: Stripe webhook raw body middleware now registered on `/api/online-course/webhook` instead of incorrect `/api/webhooks/stripe`
- Created `api/index.ts` at project root as a thin Vercel serverless entry point with warm-invocation app reuse via module-level promise cache
- Refactored `server/index.ts` to local-dev-only: process.exit startup validation, Vite setup, cronService init, and server.listen remain isolated here

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server/app.ts and refactor server/index.ts** - `355103c` (feat)
2. **Task 2: Create api/index.ts Vercel serverless entry point** - `ab5c605` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `server/app.ts` - Async Express app factory; exports `createApp()`; contains all middleware, routes, error handler, SEO middleware, Google OAuth callback
- `api/index.ts` - Vercel serverless handler; lazily creates and reuses Express app across warm invocations
- `server/index.ts` - Local dev entry point only; imports `createApp()`, creates HTTP server, sets up Vite or static serving, starts listener, initializes cron

## Decisions Made

- **Stripe webhook path fix:** The existing `/api/webhooks/stripe` path for `express.raw()` was wrong — corrected to `/api/online-course/webhook` to match the actual route defined in routes.ts (research finding #4 from 02-RESEARCH.md).
- **registerRoutes return value discarded in app.ts:** `registerRoutes(app)` internally calls `createServer(app)` and returns a Server. In `server/app.ts`, this return value is discarded because app.ts only needs the Express app. `server/index.ts` creates its own `createServer(app)` for Vite setup and listening.
- **appPromise module-level cache:** The Promise is cached at module scope in `api/index.ts` to ensure `createApp()` runs once per cold start. Subsequent warm invocations reuse the same app instance, avoiding repeated route registration.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `server/app.ts` and `api/index.ts` are ready — the Vercel adapter foundation is in place.
- Next plan (02-02) should configure `vercel.json` to route all traffic through `api/index.ts`.
- No blockers from this plan.

---
*Phase: 02-vercel-adapter*
*Completed: 2026-02-21*
