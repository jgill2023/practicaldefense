# Phase 1: Replit Cleanup - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all Replit-specific code, packages, and env var references so the codebase runs cleanly without any Replit context. Replace GCS sidecar with Vercel Blob. Remove Stripe Connect code. Audit and remove unused packages. Create .env.example for setup reference.

</domain>

<decisions>
## Implementation Decisions

### File storage replacement
- Switch from GCS (via Replit sidecar) to Vercel Blob — not keeping GCS
- No existing files to migrate — can start fresh with Vercel Blob
- Upload feature not heavily used yet — clean implementation opportunity
- Implement full Vercel Blob integration in Phase 1, not deferred

### Environment variable strategy
- Single APP_URL env var replaces all REPLIT_DEV_DOMAIN / REPLIT_DOMAINS references
- APP_URL is required — fail fast if missing (no localhost fallback)
- Use .env file for local development
- Create .env.example listing all required vars with descriptions (no real values)

### Stripe credential handling
- Simplify to env var only — remove both database fallback and Replit connector fallback
- If STRIPE_SECRET_KEY is missing: start without payments (log warning, disable payment endpoints) — don't crash
- Remove Stripe Connect code entirely — not using marketplace/instructor payouts
- Keep standard Stripe integration only

### Package cleanup
- Full audit — remove all unused packages, not just Replit-specific ones
- Keep openai package (planned future use)
- Keep Moodle integration (server/moodle.ts) — actively used
- Keep Printify integration (server/printify/) — actively used
- Safe to audit: passport/passport-local (custom auth used instead), moment (date-fns used), and other potentially dead deps

### Claude's Discretion
- Exact Vercel Blob API integration pattern (put, del, list operations)
- How to handle Uppy upload flow with Vercel Blob (client-side vs server-side upload)
- Which packages are actually unused (verify by import analysis before removing)
- Order of operations for cleanup (packages first, then code, or interleaved)

</decisions>

<specifics>
## Specific Ideas

- "We won't be using Stripe Connect, we will use the other Stripe integration" — clear preference for standard Stripe only
- Keep openai package even though currently unused — future feature planned

</specifics>

<deferred>
## Deferred Ideas

- Stripe Connect removal may involve schema changes (connect-related tables) — assess if tables can be left in place or need cleanup
- OpenAI integration — future phase

</deferred>

---

*Phase: 01-replit-cleanup*
*Context gathered: 2026-02-20*
