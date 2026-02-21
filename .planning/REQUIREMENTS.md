# Requirements: Practical Defense

**Defined:** 2026-02-20
**Core Value:** Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.

## v1 Requirements

Requirements for Replit → Vercel migration. Each maps to roadmap phases.

### Replit Cleanup

- [ ] **REPL-01**: Remove Replit Vite plugin imports from vite.config.ts
- [ ] **REPL-02**: Remove stripe-replit-sync package dependency
- [ ] **REPL-03**: Remove Replit credential fallback from server/stripeClient.ts
- [ ] **REPL-04**: Replace all REPLIT_DEV_DOMAIN / REPLIT_DOMAINS references with APP_BASE_URL env var
- [ ] **REPL-05**: Remove Replit-specific env var checks (REPLIT_DEPLOYMENT, REPL_IDENTITY, etc.)
- [ ] **REPL-06**: Remove Replit sidecar references from server/objectStorage.ts

### Vercel Deployment

- [ ] **VRCL-01**: Create api/index.ts that exports Express app as serverless function
- [ ] **VRCL-02**: Extract Express app setup into server/app.ts (separate from listen)
- [ ] **VRCL-03**: Create vercel.json with API rewrites and SPA fallback
- [ ] **VRCL-04**: Configure Vite build for Vercel static frontend output
- [ ] **VRCL-05**: Set up all environment variables in Vercel project
- [ ] **VRCL-06**: Verify Stripe webhook signature validation with Vercel raw body handling
- [ ] **VRCL-07**: Verify express-session works correctly behind Vercel proxy

### File Storage

- [ ] **STOR-01**: Replace GCS sidecar auth with direct service account credentials
- [ ] **STOR-02**: Update signed URL generation to use native GCS SDK
- [ ] **STOR-03**: Verify file upload flow works end-to-end on Vercel

### Cron & Scheduling

- [ ] **CRON-01**: Replace node-cron with Vercel Cron endpoint
- [ ] **CRON-02**: Secure cron endpoint with CRON_SECRET bearer token
- [ ] **CRON-03**: Configure cron schedule in vercel.json

### Calendar & OAuth

- [ ] **GCAL-01**: Update Google Calendar OAuth redirect URI for Vercel domain
- [ ] **GCAL-02**: Verify calendar sync flow works end-to-end on Vercel

### Verification

- [ ] **VRFY-01**: Auth flow works (login, session persistence, role-based access)
- [ ] **VRFY-02**: Payment flow works (Stripe checkout, webhook delivery)
- [ ] **VRFY-03**: Email/SMS notifications deliver correctly
- [ ] **VRFY-04**: File upload and retrieval works
- [ ] **VRFY-05**: Cron jobs fire on schedule
- [ ] **VRFY-06**: Bundle size within Vercel limits

## v2 Requirements

Deferred to after migration is complete.

### Post-Migration Improvements

- **IMPR-01**: Extract heavy feature routers into separate Vercel functions (reduce bundle size)
- **IMPR-02**: Add error tracking service (Sentry or similar)
- **IMPR-03**: Add structured logging (replace console.log)
- **IMPR-04**: Optimize cold start performance (lazy-load heavy SDKs)
- **IMPR-05**: Consider Neon pooled connection URL for better serverless scaling
- **IMPR-06**: Custom domain setup

## Out of Scope

| Feature | Reason |
|---------|--------|
| New product features | Migration first, features later |
| Database migration | Neon PostgreSQL stays as-is |
| JWT/token auth rewrite | express-session works in serverless with pg store |
| WebSocket server replacement | ws is only used as Neon DB transport, not a WS server |
| Mobile app | Web-first |
| Next.js rewrite | Keep existing React/Vite/Express stack — minimize rewrite surface |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REPL-01 | Phase 1 | Pending |
| REPL-02 | Phase 1 | Pending |
| REPL-03 | Phase 1 | Pending |
| REPL-04 | Phase 1 | Pending |
| REPL-05 | Phase 1 | Pending |
| REPL-06 | Phase 1 | Pending |
| STOR-01 | Phase 1 | Pending |
| STOR-02 | Phase 1 | Pending |
| VRCL-01 | Phase 2 | Pending |
| VRCL-02 | Phase 2 | Pending |
| VRCL-03 | Phase 2 | Pending |
| VRCL-04 | Phase 2 | Pending |
| VRCL-05 | Phase 2 | Pending |
| VRCL-06 | Phase 2 | Pending |
| VRCL-07 | Phase 2 | Pending |
| STOR-03 | Phase 2 | Pending |
| CRON-01 | Phase 3 | Pending |
| CRON-02 | Phase 3 | Pending |
| CRON-03 | Phase 3 | Pending |
| GCAL-01 | Phase 3 | Pending |
| GCAL-02 | Phase 3 | Pending |
| VRFY-01 | Phase 4 | Pending |
| VRFY-02 | Phase 4 | Pending |
| VRFY-03 | Phase 4 | Pending |
| VRFY-04 | Phase 4 | Pending |
| VRFY-05 | Phase 4 | Pending |
| VRFY-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation — all 27 requirements mapped*
