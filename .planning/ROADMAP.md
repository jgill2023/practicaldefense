# Roadmap: Practical Defense — Replit to Vercel Migration

## Overview

Practical Defense is a fully functional self-defense training platform currently running on Replit. This roadmap migrates it to Vercel serverless hosting through four sequential phases: strip all Replit-specific dependencies from the codebase, wire the Express app into the Vercel adapter pattern, replace the cron scheduler and reconnect Google Calendar, then verify every integrated system works end-to-end. No new features. No schema changes. A clean break from Replit, landing on a standard stack.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Replit Cleanup** - Remove all Replit-specific code, packages, and env var references so the codebase runs cleanly without any Replit context
- [ ] **Phase 2: Vercel Adapter** - Wire the Express app into Vercel's serverless function pattern, configure routing and build, deploy first working version
- [ ] **Phase 3: Cron and Calendar** - Replace node-cron with Vercel Cron, reconnect Google Calendar OAuth for the new domain
- [ ] **Phase 4: Verification** - Confirm every integrated system works end-to-end on Vercel before treating it as production

## Phase Details

### Phase 1: Replit Cleanup
**Goal**: The codebase starts and runs locally with no Replit packages installed and no REPLIT_* environment variables set — Vercel Blob replacing the GCS sidecar
**Depends on**: Nothing (first phase)
**Requirements**: REPL-01, REPL-02, REPL-03, REPL-04, REPL-05, REPL-06, STOR-01, STOR-02
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes without error (Replit Vite plugins removed)
  2. Server starts locally with only standard env vars — no REPL_*, REPLIT_DEPLOYMENT, REPL_IDENTITY
  3. File upload and download use Vercel Blob SDK, not the GCS sidecar at 127.0.0.1:1106
  4. Stripe client initializes directly from STRIPE_SECRET_KEY — no Replit credential fallback path exists in the code
  5. All URLs constructed in emailService, notificationEngine, cronService, and routes use APP_URL — no REPLIT_DOMAINS or REPLIT_DEV_DOMAIN references remain
**Plans:** 3 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Remove Replit Vite plugins and uninstall dead packages (REPL-01, REPL-02, REPL-05)
- [x] 01-02-PLAN.md — Simplify Stripe to env-var-only, remove Stripe Connect, replace REPLIT env vars with APP_URL (REPL-03, REPL-04, REPL-06)
- [x] 01-03-PLAN.md — Replace GCS sidecar with Vercel Blob, add startup validation and .env.example (STOR-01, STOR-02)

### Phase 2: Vercel Adapter
**Goal**: The app is deployed on Vercel — Express running as a serverless function, React served from CDN, sessions working, Stripe webhooks verified
**Depends on**: Phase 1
**Requirements**: VRCL-01, VRCL-02, VRCL-03, VRCL-04, VRCL-05, VRCL-06, VRCL-07, STOR-03
**Success Criteria** (what must be TRUE):
  1. A user can log in, navigate authenticated pages, and log out — session persists across requests on the Vercel domain
  2. The React frontend loads from Vercel's CDN; all /api/* and /auth/* traffic routes to the Express function
  3. A Stripe test webhook event is received, signature-validated, and processed without error
  4. File upload completes and the resulting signed URL is accessible (end-to-end storage flow on Vercel)
  5. Bundle size is within Vercel plan limits (verified in deployment logs on first deploy)
**Plans:** 3 plans in 3 waves

Plans:
- [ ] 02-01-PLAN.md — Extract server/app.ts, create api/index.ts, fix Stripe webhook raw body path (VRCL-01, VRCL-02, VRCL-04)
- [ ] 02-02-PLAN.md — Create vercel.json, configure Neon pooled connection, set env vars, first deploy (VRCL-03, VRCL-05)
- [ ] 02-03-PLAN.md — Verify session persistence, Stripe webhook signature, file upload end-to-end (VRCL-06, VRCL-07, STOR-03)

### Phase 3: Cron and Calendar
**Goal**: The daily maintenance job runs on a Vercel Cron schedule, and Google Calendar OAuth works with the new Vercel domain — calendar watch channels renewed before 7-day expiry
**Depends on**: Phase 2 (must complete within 7 days of Phase 2 deployment)
**Requirements**: CRON-01, CRON-02, CRON-03, GCAL-01, GCAL-02
**Success Criteria** (what must be TRUE):
  1. Vercel function logs show the daily-maintenance cron endpoint firing on schedule (0 7 * * *)
  2. The cron endpoint returns 401 when called without the correct CRON_SECRET — and 200 when called with it
  3. An instructor can connect their Google Calendar — the OAuth callback redirects correctly to the Vercel domain and completes without error
  4. Calendar availability sync works after OAuth — instructor free/busy data reflects in appointment booking
**Plans**: TBD

Plans:
- [ ] 03-01: Create secured cron HTTP endpoint, add Vercel Cron config, remove node-cron (CRON-01, CRON-02, CRON-03)
- [ ] 03-02: Update Google OAuth redirect URI in Cloud Console and Central Auth service, verify calendar sync end-to-end (GCAL-01, GCAL-02)

### Phase 4: Verification
**Goal**: Every integrated system — auth, payments, notifications, file storage, calendar, and cron — is confirmed working end-to-end on Vercel
**Depends on**: Phase 3
**Requirements**: VRFY-01, VRFY-02, VRFY-03, VRFY-04, VRFY-05, VRFY-06
**Success Criteria** (what must be TRUE):
  1. A user can sign up, verify email (link uses APP_URL), log in, and access role-appropriate pages
  2. A student can complete a Stripe checkout — payment processes, webhook delivers, instructor is credited
  3. Email and SMS notifications deliver with correct URLs (not localhost or Replit domains)
  4. File upload (course image or waiver) and retrieval via signed URL works end-to-end
  5. Vercel Cron execution is confirmed in function logs and Neon connection count stays below pool limit during load
  6. Bundle size is within Vercel plan limits (confirmed, not estimated)
**Plans**: TBD

Plans:
- [ ] 04-01: Verify auth, payment, and notification flows (VRFY-01, VRFY-02, VRFY-03)
- [ ] 04-02: Verify file storage, cron execution, and bundle size (VRFY-04, VRFY-05, VRFY-06)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Replit Cleanup | 3/3 | Complete | 2026-02-21 |
| 2. Vercel Adapter | 0/3 | Not started | - |
| 3. Cron and Calendar | 0/2 | Not started | - |
| 4. Verification | 0/2 | Not started | - |
