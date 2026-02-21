---
phase: 01-replit-cleanup
plan: 01
subsystem: infra
tags: [vite, replit, npm, typescript, uppy, passport, cleanup]

# Dependency graph
requires: []
provides:
  - Clean vite.config.ts with only @vitejs/plugin-react (no Replit plugins)
  - package.json free of Replit, passport, memorystore, openid-client, and Uppy packages
  - EditCourseForm.tsx with inline UploadResult type (no @uppy/core dependency)
  - Deleted server/replitAuth.ts.backup (dead Replit auth backup)
  - Deleted .replit (Replit deployment config)
  - npm run build succeeds outside Replit context
affects:
  - 01-02 (Stripe cleanup — no passport/openid-client interference)
  - 01-03 (Storage migration — Uppy removed, ObjectUploader is plain fetch)
  - All future phases requiring clean builds

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "No Replit-specific Vite plugins — only @vitejs/plugin-react in plugins array"
    - "Inline type definitions instead of dead package imports"

key-files:
  created: []
  modified:
    - vite.config.ts
    - package.json
    - package-lock.json
    - client/src/components/EditCourseForm.tsx

key-decisions:
  - "Do not remove moment (actively used in 4 client files)"
  - "Do not remove openai (kept per explicit decision for future use)"
  - "Do not remove node-cron (Phase 3 concern)"
  - "Do not remove memoizee (not audited, leave for now)"
  - "Do not remove @google-cloud/storage (Plan 03 handles storage migration)"

patterns-established:
  - "Inline type: UploadResult = { successful: Array<{ uploadURL: string }> } pattern for component-local upload types"

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 1 Plan 1: Replit Cleanup - Remove Replit Build Dependencies Summary

**Removed 13 dead/Replit packages (stripe-replit-sync, @replit/* plugins, passport, passport-local, memorystore, openid-client, all @uppy/*) and cleaned vite.config.ts so the project builds outside Replit**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T06:25:45Z
- **Completed:** 2026-02-21T06:29:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- vite.config.ts stripped to only `react()` plugin — no Replit imports, no `REPL_ID` conditionals
- 13 packages removed from package.json (10 regular deps, 3 devDeps): stripe-replit-sync, @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, passport, passport-local, memorystore, openid-client, @uppy/aws-s3, @uppy/core, @uppy/dashboard, @uppy/react, @types/passport, @types/passport-local
- `npm run build` (Vite + esbuild) completes with zero errors
- TypeScript check produces zero errors from any removed package
- Dead files deleted: `server/replitAuth.ts.backup`, `.replit`

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove Replit Vite plugins and clean vite.config.ts** - `5b35a68` (chore)
2. **Task 2: Uninstall dead packages, fix type imports, delete dead files** - `73d16ce` (chore)

## Files Created/Modified
- `vite.config.ts` - Removed @replit/vite-plugin-runtime-error-modal import, runtimeErrorOverlay() call, and cartographer conditional block; only react() plugin remains
- `package.json` - Removed 13 dead/Replit packages from dependencies and devDependencies
- `package-lock.json` - Updated to reflect removed packages (64 packages removed from lockfile)
- `client/src/components/EditCourseForm.tsx` - Replaced `import type { UploadResult } from "@uppy/core"` with inline `type UploadResult = { successful: Array<{ uploadURL: string }> }`

## Decisions Made
- Kept `moment`, `openai`, `node-cron`, `memoizee`, `@google-cloud/storage` per plan specifications — these have active usage or are deferred to later plans
- `UploadResult` type defined inline as it exactly matches what `ObjectUploader.tsx` constructs — no functionality change, only the import source changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `node_modules` was not present at execution start — ran `npm install` first before verifying TypeScript (Rule 3 - blocking issue, resolved immediately)
- Pre-existing 644 TypeScript errors exist in the codebase; none are from removed packages. These are pre-existing issues unrelated to this plan.
- `npm run check` references `tsc` without a path; used `node_modules/.bin/tsc --noEmit` directly for verification since `tsc` is not globally installed. Build script `vite build && esbuild` ran successfully via `npm run build`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01-01 complete: Replit build-time dependencies eliminated
- Ready for Plan 01-02: Stripe simplification (remove three-tier credential fallback, remove stripeConnect module)
- Ready for Plan 01-03: Storage migration (replace GCS/sidecar with Vercel Blob)
- No blockers for subsequent plans

---
*Phase: 01-replit-cleanup*
*Completed: 2026-02-21*
