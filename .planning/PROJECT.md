# Practical Defense

## What This Is

A full-stack training platform for a self-defense school. Students browse courses, enroll, book appointments with instructors, and make payments. Instructors manage schedules, courses, and receive notifications. Admins oversee the platform with role-based access control. Currently deployed on Replit — migrating to Vercel.

## Core Value

Students can find, enroll in, and pay for self-defense courses, and instructors can manage their offerings — all from one platform.

## Requirements

### Validated

<!-- Inferred from existing codebase -->

- ✓ Custom email/password authentication with role-based access (student, instructor, admin, superadmin) — existing
- ✓ Course creation, scheduling, and management by instructors/admins — existing
- ✓ Student course enrollment with schedule selection — existing
- ✓ Stripe payment processing for course purchases — existing
- ✓ Stripe Connect for instructor payouts — existing
- ✓ Appointment booking system with instructor availability — existing
- ✓ Google Calendar sync for instructor appointments — existing
- ✓ Email notifications via SendGrid with template system — existing
- ✓ SMS notifications via Twilio with template system — existing
- ✓ Credit-based system for email/SMS usage per instructor — existing
- ✓ Notification engine with scheduled and immediate delivery — existing
- ✓ Gift card system with purchase and redemption — existing
- ✓ E-commerce store via Printify integration — existing
- ✓ Moodle LMS integration — existing
- ✓ File uploads via Uppy with cloud storage — existing
- ✓ PDF and Excel document generation — existing
- ✓ Content filtering system — existing
- ✓ Rich text editing for course descriptions — existing
- ✓ Data encryption for sensitive credentials (AES-256-GCM) — existing
- ✓ Cron-based reminder scheduling — existing
- ✓ Course notification signup system — existing

### Active

<!-- Current scope: Replit → Vercel migration -->

- [ ] Restructure Express backend for Vercel serverless functions
- [ ] Replace Replit-specific credential management with standard env vars
- [ ] Replace Replit object storage (GCS sidecar) with direct cloud storage
- [ ] Remove stripe-replit-sync dependency, use Stripe directly
- [ ] Configure Vite build for Vercel static frontend deployment
- [ ] Set up Vercel project configuration (vercel.json, API routes)
- [ ] Migrate all Replit env vars to Vercel environment variables
- [ ] Verify Stripe webhooks work with new Vercel URLs
- [ ] Verify session management works in serverless context (stateless sessions or alternative)
- [ ] Verify cron jobs work on Vercel (or replace with Vercel Cron)
- [ ] Verify WebSocket connections work (or replace ws usage)

### Out of Scope

- New features beyond migration — will scope after migration is complete
- Mobile app — web-first
- Database migration — staying on Neon PostgreSQL

## Context

- **Current state:** Fully functional on Replit with all integrations working
- **No active users:** Can take time with migration, no need for zero-downtime cutover
- **Replit dependencies to remove:** stripe-replit-sync, Replit connectors for credentials, GCS via Replit sidecar (127.0.0.1:1106), REPLIT_* env vars
- **Session challenge:** Express-session with PostgreSQL store may need rethinking for serverless (cold starts, no persistent process)
- **Cron challenge:** node-cron requires persistent process; Vercel Cron Jobs or external scheduler needed
- **WebSocket challenge:** ws library may not work in serverless; may need Vercel's Edge Runtime or external service
- **File storage:** Currently uses Google Cloud Storage via Replit sidecar proxy — needs direct GCS credentials or switch to Vercel Blob/S3
- **Codebase map:** Available at .planning/codebase/ with 7 detailed documents

## Constraints

- **Hosting:** Vercel — serverless functions for backend, static hosting for frontend
- **Database:** Neon PostgreSQL — already serverless, no changes needed
- **Tech stack:** Keep existing React/TypeScript/Drizzle stack — minimize rewrite surface
- **Domain:** Vercel default URL for now, custom domain later

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Deploy to Vercel | Modern serverless hosting, good DX, free tier | — Pending |
| Keep Neon PostgreSQL | Already serverless, works well with Vercel | — Pending |
| Replace all Replit deps with standard alternatives | Clean break from platform lock-in | — Pending |
| Migration first, features later | Get stable deployment before adding complexity | — Pending |

---
*Last updated: 2026-02-20 after initialization*
