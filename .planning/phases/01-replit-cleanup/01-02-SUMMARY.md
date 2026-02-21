---
phase: 01-replit-cleanup
plan: 02
subsystem: payments
tags: [stripe, env-vars, cleanup, replit]

# Dependency graph
requires: []
provides:
  - Simplified Stripe client initialized from STRIPE_SECRET_KEY env var only
  - Stripe Connect admin module fully removed from server and client
  - All URL construction uses APP_URL env var (no REPLIT_DOMAINS/REPLIT_DEV_DOMAIN)
affects: [01-03-plan, phase-2-vercel-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env-var-only Stripe: getStripeClient() is synchronous, returns Stripe | null, logs warning on startup if unconfigured"
    - "APP_URL env var for all URL construction in emails, notifications, webhooks, payment links"

key-files:
  created: []
  modified:
    - server/stripeClient.ts
    - server/routes.ts
    - server/index.ts
    - server/storage.ts
    - server/seo.ts
    - server/emailService.ts
    - server/notificationEngine.ts
    - server/services/cronService.ts
    - client/src/App.tsx
    - client/src/lib/stripe.ts
    - client/src/components/Layout.tsx
  deleted:
    - server/stripeConnect/routes.ts
    - client/src/pages/stripe-connect.tsx

key-decisions:
  - "getStripeClient() is now synchronous (returns Stripe | null) — all callers that previously awaited it were updated to remove await and check for null"
  - "getStripePromise() in client/src/lib/stripe.ts always returns Promise<Stripe | null> (wraps null in Promise.resolve) to preserve .then() caller compatibility"
  - "getUsersByStripeConnectAccountId removed from storage — only referenced in stripeConnect/routes.ts"
  - "stripeCredentials table and schema types left in place — only storage methods removed"

patterns-established:
  - "Stripe null-check pattern: const stripe = getStripeClient(); if (!stripe) return res.status(503).json({ message: 'Payment processing not configured' })"
  - "APP_URL fallback pattern: process.env.APP_URL || 'http://localhost:5000' for local dev"

# Metrics
duration: 7min
completed: 2026-02-20
---

# Phase 1 Plan 02: Stripe Simplification and REPLIT URL Removal Summary

**Stripe initialized from STRIPE_SECRET_KEY env var only (synchronous, null-safe); all 8 REPLIT_DOMAINS/REPLIT_DEV_DOMAIN references replaced with APP_URL; Stripe Connect admin module deleted from server and client**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-21T06:28:19Z
- **Completed:** 2026-02-21T06:35:21Z
- **Tasks:** 2 of 2
- **Files modified:** 11 files modified, 2 files deleted

## Accomplishments
- Rewrote `server/stripeClient.ts` to synchronous env-var-only initialization — no Replit sidecar, no database credential fallback, no async
- Deleted entire `server/stripeConnect/` directory (misnamed admin key UI, not Stripe Connect marketplace) and client page
- Replaced all 8 REPLIT_DOMAINS/REPLIT_DEV_DOMAIN references across emailService, notificationEngine, cronService, and routes with `process.env.APP_URL`

## Task Commits

Each task was committed atomically:

1. **Task 1: Simplify stripeClient.ts and remove Stripe Connect module** - `6107779` (feat)
2. **Task 2: Replace all REPLIT_DOMAINS and REPLIT_DEV_DOMAIN references with APP_URL** - `a66d9e1` (feat)

**Plan metadata:** *(created next)*

## Files Created/Modified
- `server/stripeClient.ts` - Rewritten: synchronous `getStripeClient(): Stripe | null` and `isStripeConfigured(): boolean`, no imports from storage or encryption
- `server/routes.ts` - Removed stripeConnectRouter import/mount; replaced async `ensureStripeInitialized()` with synchronous const; removed 3 `await ensureStripeInitialized()` calls; replaced REPLIT_DOMAINS payment link with APP_URL
- `server/index.ts` - Removed `/api/stripe-connect/webhook` raw body middleware
- `server/storage.ts` - Removed `getStripeCredentials`, `saveStripeCredentials`, `deleteStripeCredentials` from IStorage interface and DatabaseStorage implementation; removed `getUsersByStripeConnectAccountId`; removed `stripeCredentials` table and type imports
- `server/seo.ts` - Removed `/stripe-connect` Disallow from robots.txt
- `server/emailService.ts` - Replaced REPLIT_DEV_DOMAIN conditional with `process.env.APP_URL || 'http://localhost:5000'`
- `server/notificationEngine.ts` - Replaced 5 REPLIT_DOMAINS references with `process.env.APP_URL`
- `server/services/cronService.ts` - Replaced REPLIT_DEV_DOMAIN conditional with `process.env.APP_URL || 'http://localhost:5000'`
- `client/src/App.tsx` - Removed StripeConnectPage import and `/stripe-connect` route
- `client/src/lib/stripe.ts` - Rewritten: synchronous `getStripePromise()` reads from `VITE_STRIPE_PUBLIC_KEY` env var; always returns `Promise<Stripe | null>` (null wrapped in Promise.resolve) for .then() caller compatibility
- `client/src/components/Layout.tsx` - Removed "Payment Settings" nav links (desktop x2, mobile x1)
- `server/stripeConnect/routes.ts` - DELETED
- `client/src/pages/stripe-connect.tsx` - DELETED

## Decisions Made
- `getStripeClient()` made synchronous because the only async work it did was Replit sidecar/database lookups, which are eliminated. The function now reads `process.env.STRIPE_SECRET_KEY` directly and constructs the client on first call (lazy singleton).
- `getStripePromise()` kept as a returning `Promise<Stripe | null>` (not `Promise<Stripe | null> | null`) to avoid breaking the `.then(promise => {...})` call pattern in RegistrationModal.tsx, checkout.tsx, and course-registration.tsx.
- `stripeCredentials` table and schema left in database — removing storage methods is sufficient; schema migration deferred per plan scope.
- Removed `resetStripePromiseCache()` from stripe.ts (it was only needed when server-side key could change via the now-deleted Stripe Connect admin UI).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ensureStripeInitialized() still called after deletion**
- **Found during:** Task 1 (simplifying routes.ts)
- **Issue:** The plan said to update callers of `getStripeClient()` that do `await getStripeClient()`, but there were also 3 calls to `ensureStripeInitialized()` (lines 9494, 9586, 9852) that became dangling references after the function was removed
- **Fix:** Removed all 3 `await ensureStripeInitialized()` calls — the routes already had `if (!stripe)` null checks immediately after, so removal is safe
- **Files modified:** server/routes.ts
- **Verification:** No `ensureStripeInitialized` references remain in routes.ts
- **Committed in:** 6107779 (Task 1 commit)

**2. [Rule 1 - Bug] resetStripePromiseCache export removed**
- **Found during:** Task 1 (rewriting client/src/lib/stripe.ts)
- **Issue:** The plan's new stripe.ts template omitted `resetStripePromiseCache()` export. It was previously exported and potentially imported elsewhere
- **Fix:** Searched for callers — no imports of `resetStripePromiseCache` found anywhere in the codebase. Removed safely.
- **Files modified:** client/src/lib/stripe.ts
- **Verification:** grep for resetStripePromiseCache returns zero matches
- **Committed in:** 6107779 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both were follow-on cleanup from the planned deletions. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors exist in notificationEngine.ts (line 933: `websiteUrl` property not in type), CommunicationsDashboard.tsx, BookingModal.tsx, appointments/routes.ts, and App.tsx. None of these were introduced by this plan.

## User Setup Required
**New environment variable required:** `APP_URL` must be set to the deployment URL (e.g., `https://practicaldefense.vercel.app`) before server startup. Without it, all email links, SMS messages, calendar webhook callbacks, and payment links will fall back to `http://localhost:5000` or placeholder URLs. Plan 03 adds startup validation that will make this a hard failure if absent.

Also required: `VITE_STRIPE_PUBLIC_KEY` for client-side Stripe to initialize. Without it, Stripe is disabled on the client (logged as warning, graceful degradation).

## Next Phase Readiness
- Plan 03 (startup validation, env var audit, package cleanup) can proceed — the `APP_URL` and `STRIPE_SECRET_KEY` env vars are now the sole sources of truth for their domains
- No Replit runtime dependencies remain in stripeClient.ts, emailService.ts, notificationEngine.ts, cronService.ts, or routes.ts payment link generation
- The GCS sidecar references in objectStorage.ts remain — those are Plan 03 scope

---
*Phase: 01-replit-cleanup*
*Completed: 2026-02-20*
