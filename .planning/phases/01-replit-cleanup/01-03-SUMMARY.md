---
phase: 01-replit-cleanup
plan: 03
subsystem: infra
tags: [vercel-blob, storage, acl, database, env-vars, cleanup, replit]

# Dependency graph
requires:
  - phase: 01-01
    provides: Dead package removal (set expectation to remove @google-cloud/storage)
  - phase: 01-02
    provides: APP_URL env var established; Stripe simplification
provides:
  - Vercel Blob storage service replacing GCS sidecar (server/objectStorage.ts)
  - Database-backed ACL with owner and visibility fields (server/objectAcl.ts, shared/schema.ts)
  - blobAclPolicies table in Drizzle schema for ACL storage
  - Server-side file upload flow (client POSTs FormData, server puts to Vercel Blob)
  - Gift card theme image upload via @vercel/blob put() with public access
  - Private file download via Express proxy with DB ACL check
  - Startup env var validation (DATABASE_URL, SESSION_SECRET, APP_URL, BLOB_READ_WRITE_TOKEN)
  - .env.example with all required and optional env vars documented
affects: [phase-2-vercel-deploy, phase-3-google-calendar]

# Tech tracking
tech-stack:
  added:
    - "@vercel/blob: ^2.3.0 — Vercel Blob SDK for server-side file storage"
  patterns:
    - "Server-side upload: client POSTs FormData to /api/objects/upload, server uses put() to Vercel Blob"
    - "DB-backed ACL: blobAclPolicies table stores pathname, ownerId, visibility, blobUrl with upsert"
    - "Private file proxy: GET /objects/:pathname checks ACL table, fetches blob URL, streams response"
    - "Public blob URL: gift card theme images use access:'public' — direct URL returned to client"
    - "Startup fail-fast: process.exit(1) if required env vars missing"

key-files:
  created:
    - server/objectAcl.ts (rewritten)
    - server/objectStorage.ts (rewritten)
    - .env.example
  modified:
    - shared/schema.ts (blobAclPolicies table added)
    - server/giftCards/routes.ts (replace GCS bucket ops with @vercel/blob put())
    - server/routes.ts (upload/download/ACL endpoints updated, multer added)
    - server/index.ts (startup env var validation)
    - client/src/components/ObjectUploader.tsx (FormData POST, no presigned URL)
    - client/src/components/CommunicationsDashboard.tsx (remove onGetUploadParameters)
    - client/src/components/CourseCreationForm.tsx (remove onGetUploadParameters)
    - client/src/components/EditCourseForm.tsx (remove onGetUploadParameters)
    - client/src/components/EventCreationForm.tsx (remove unused ObjectUploader import)
    - client/src/pages/product-management.tsx (remove onGetUploadParameters)
    - package.json (add @vercel/blob, remove @google-cloud/storage)

key-decisions:
  - "ObjectStorageService no longer exports objectStorageClient — gift cards and routes use ObjectStorageService methods or @vercel/blob directly"
  - "getObjectEntityUploadURL() removed — presigned PUT URL approach replaced by server-side upload with multer"
  - "normalizeObjectEntityPath() removed — Vercel Blob URLs stored directly (no path normalization needed)"
  - "ObjectAclPolicy now requires blobUrl field — enables DB lookup without re-parsing URL from pathname"
  - "onGetUploadParameters prop removed from ObjectUploader — component POSTs FormData internally"
  - "Gift card theme-image proxy route returns 404 — new uploads return public Vercel Blob URLs directly"
  - "Startup validation uses process.exit(1) — fail-fast prevents silent misconfiguration in production"

patterns-established:
  - "Vercel Blob upload: const blob = await put(pathname, buffer, { access, contentType, addRandomSuffix: false })"
  - "ACL upsert: db.insert(blobAclPolicies).values({...}).onConflictDoUpdate({ target: blobAclPolicies.pathname, set: {...} })"
  - "Startup validation: const missing = REQUIRED.filter(v => !process.env[v]); if (missing.length) { process.exit(1) }"

# Metrics
duration: 7min
completed: 2026-02-21
---

# Phase 1 Plan 03: GCS Sidecar to Vercel Blob Storage Migration Summary

**Vercel Blob storage replacing GCS sidecar with DB-backed ACL (blobAclPolicies table), server-side FormData uploads, public gift card theme images, startup env var validation, and .env.example**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-21T06:40:02Z
- **Completed:** 2026-02-21T06:47:24Z
- **Tasks:** 2 of 2
- **Files modified:** 14 files modified, 1 file created

## Accomplishments
- Rewrote `server/objectStorage.ts` and `server/objectAcl.ts` — GCS sidecar eliminated, Vercel Blob SDK used directly, ACL backed by `blobAclPolicies` DB table
- Updated all callers: server/routes.ts (3 ACL endpoints, 2 upload endpoints, 1 download endpoint), giftCards/routes.ts, and 5 client components
- Added startup env var validation to server/index.ts (process.exit(1) on missing required vars) and created .env.example reference file

## Task Commits

Each task was committed atomically:

1. **Task 1: Add blobAclPolicies schema, rewrite objectAcl.ts and objectStorage.ts for Vercel Blob** - `32cf894` (feat)
2. **Task 2: Update all callers, add startup validation and .env.example** - `770cd93` (feat)

**Plan metadata:** *(created next)*

## Files Created/Modified
- `server/objectStorage.ts` - Rewritten: uses @vercel/blob put/del; server-side uploadEntityObject(); URL-based downloadObject(); extractPathname() for ACL key extraction
- `server/objectAcl.ts` - Rewritten: DB-backed ACL using blobAclPolicies table; upsert/delete/query via drizzle; removed ObjectAccessGroupType and aclRules entirely
- `shared/schema.ts` - Added blobAclPolicies table (pathname PK, ownerId, visibility, blobUrl, timestamps); added BlobAclPolicy and InsertBlobAclPolicy types
- `server/giftCards/routes.ts` - Replaced objectStorageClient.bucket() with @vercel/blob put() (public access); removed GCS path parsing; theme-image proxy route returns 404 (images now served directly from Vercel Blob URLs)
- `server/routes.ts` - Added multer middleware; rewrote /objects/:objectPath download to use DB ACL + downloadObject(); rewrote /api/objects/upload to server-side FormData upload; rewrote /api/object-storage/upload-url to server-side upload; added blobUrl field to all trySetObjectEntityAclPolicy calls
- `server/index.ts` - Added startup validation for DATABASE_URL, SESSION_SECRET, APP_URL, BLOB_READ_WRITE_TOKEN
- `client/src/components/ObjectUploader.tsx` - Removed onGetUploadParameters prop; component now POSTs FormData to /api/objects/upload and reads uploadURL from response
- `client/src/components/CommunicationsDashboard.tsx` - Removed onGetUploadParameters callbacks from both ObjectUploader usages
- `client/src/components/CourseCreationForm.tsx` - Removed handleGetUploadParameters function and onGetUploadParameters prop
- `client/src/components/EditCourseForm.tsx` - Removed handleGetUploadParameters function and onGetUploadParameters prop
- `client/src/components/EventCreationForm.tsx` - Removed unused ObjectUploader import
- `client/src/pages/product-management.tsx` - Removed onGetUploadParameters inline callback
- `package.json` - Added @vercel/blob ^2.3.0, removed @google-cloud/storage ^7.17.0
- `.env.example` - Created with all required (DATABASE_URL, SESSION_SECRET, APP_URL, BLOB_READ_WRITE_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) and optional vars documented

## Decisions Made
- `onGetUploadParameters` prop removed entirely from ObjectUploader — the old presigned PUT URL flow is replaced by a server-side FormData upload. The prop is kept as optional in the interface for backward compatibility (callers that still pass it compile without error) but is never called.
- `objectStorageClient` export removed — was a GCS Storage instance used only in giftCards/routes.ts. Both callers now use @vercel/blob directly or ObjectStorageService.
- Gift card theme-image proxy route (`/api/gift-cards/theme-image/:filename`) returns 404 — new uploads return public Vercel Blob URLs directly, so the proxy is no longer needed for any newly uploaded images.
- `blobUrl` added as required field in ObjectAclPolicy — enables DB lookup of the actual blob URL by pathname without re-constructing it. Callers pass the upload result URL directly.
- Startup validation exits on missing required vars — this is intentional for production correctness; local dev will need a .env file with all required vars.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ACL endpoint responses returned `objectPath` as normalized path, but Vercel Blob URLs are already the final storage URL**
- **Found during:** Task 2 (updating /api/course-images and /api/product-images endpoints)
- **Issue:** The old flow normalized GCS paths to `/objects/...` relative paths which clients stored as imageUrl. With Vercel Blob, the URL returned from `put()` is the permanent blob URL — callers should store this URL directly, not a normalized path.
- **Fix:** Changed ACL endpoints to return `objectPath: req.body.courseImageURL` (the original blob URL) instead of the extracted pathname. This means imageUrl in the database stores a full Vercel Blob URL for new uploads.
- **Files modified:** server/routes.ts (course-images and product-images endpoints)
- **Verification:** Response shape matches what clients expect; existing clients that consume `data.objectPath` receive the full blob URL
- **Committed in:** 770cd93 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required for correct URL storage. No scope creep.

## Issues Encountered
- `npm run db:push` failed locally (no DATABASE_URL in local shell) — expected behavior. Table will be created on first deploy. The schema is correct and ready.
- Pre-existing TypeScript error count decreased from 649 to 646 — removing @google-cloud/storage eliminated 3 type errors.

## User Setup Required
**New environment variable required:** `BLOB_READ_WRITE_TOKEN` must be set before server startup.

Setup steps:
1. Go to Vercel Dashboard
2. Navigate to Storage -> Blob
3. Create a new Blob Store (or use existing)
4. Go to the Tokens tab
5. Copy the read-write token
6. Add `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` to your deployment environment

Also required (if not already set):
- `APP_URL` — full deployment URL (e.g., `https://practicaldefense.vercel.app`)
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — random string for session signing

The server now validates all four at startup and exits with a clear error message if any are missing.

## Next Phase Readiness
- Phase 1 (Replit Cleanup) is now complete — all 3 plans executed. No GCS, no sidecar, no Replit runtime dependencies remain in the codebase.
- Phase 2 (Vercel Deploy) can proceed — requires: `BLOB_READ_WRITE_TOKEN` and `blobAclPolicies` table migration via `npm run db:push` on the production database.
- The `blobAclPolicies` table must be created via `npm run db:push` (or the Drizzle migration) before the first file upload succeeds.

---
*Phase: 01-replit-cleanup*
*Completed: 2026-02-21*
