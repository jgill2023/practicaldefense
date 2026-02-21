# Vercel Migration Stack Research

**Research Type:** Project Research — Stack dimension for Express-to-Vercel migration
**Research Date:** 2026-02-20
**Scope:** What is needed to deploy the existing Practical Defense Express/React/TypeScript monolith on Vercel

---

## Executive Summary

The standard 2025/2026 approach for deploying a full-stack Express app on Vercel is to wrap the entire Express application in a single Vercel Function (the "full adapter" pattern), expose it at `api/index.ts`, and use `vercel.json` rewrites to route all `/api/*` traffic there. The React frontend is deployed as static output from Vite. This preserves the existing Express codebase almost entirely.

The four biggest migration challenges — in order of severity — are:

1. **Session storage** — `connect-pg-simple` works on Vercel without changes (it uses Neon PostgreSQL which is already serverless-native). No session architecture change is required.
2. **Cron jobs** — `node-cron` does not work on Vercel (serverless, no persistent process). Must be replaced with Vercel Cron + a secured HTTP endpoint. One job currently exists (daily midnight calendar watch renewal).
3. **File storage** — The current GCS integration is wired through a Replit sidecar at `http://127.0.0.1:1106` and will break. Must be replaced with Vercel Blob or direct GCS with service account credentials.
4. **WebSocket** — `ws` (WebSocket) is incompatible with serverless functions. Must be evaluated for current usage and replaced if active.

---

## 1. Express on Vercel: The Full Adapter Pattern

### Approach

Vercel does not have a native "Express runtime." Instead, the standard pattern is to export the Express `app` as the default export of a Vercel Function at `api/index.ts`. Vercel routes all API traffic to that function. The React frontend static output is served separately.

There are two sub-patterns. The **full adapter** pattern is recommended for this migration because it preserves the existing Express codebase with minimal changes.

| Pattern | Description | Verdict |
|---|---|---|
| **Full adapter** | Export existing Express `app` from `api/index.ts`; Vercel wraps it per request | Recommended — minimal code change |
| **Rewrite to API Routes** | Rewrite each Express route to a separate `api/*.ts` Vercel Function | Not recommended — massive refactor, no benefit for this app |

**Confidence:** HIGH — this is the documented and widely-deployed approach.

### Required Files and Configuration

#### `api/index.ts` (new file)

```typescript
// api/index.ts — Vercel entry point for the Express app
// This file re-exports the Express app as a Vercel-compatible handler.
// No changes to server/ code are required.
import app from '../server/app'; // Express app extracted from server/index.ts

export default app;
```

This requires extracting the Express `app` initialization from `server/index.ts` into a separate `server/app.ts` module (without the `server.listen()` call). `server/index.ts` becomes the local-dev entry point that calls `app.listen()`. `api/index.ts` is the Vercel entry point that exports `app` directly.

#### `vercel.json` (new file)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/auth/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/internal/cron/daily-maintenance",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Notes on the rewrite rules:**
- `/api/(.*)` routes all API calls to the Express adapter.
- `/auth/(.*)` routes the Google OAuth callback (`/auth/callback`) to Express. Without this, Vercel serves the React SPA for `/auth/callback` and breaks Google OAuth.
- `/(.*) → /index.html` is the React SPA fallback for client-side routes.
- Rewrites are checked after the filesystem, so static assets in `dist/public` are still served directly.

#### Build changes in `package.json`

The current build script bundles both frontend and backend:
```json
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

On Vercel, the backend is not pre-bundled — Vercel bundles `api/index.ts` automatically. The build command should only run the frontend Vite build:
```json
"build": "vite build"
```

Vercel's Node.js runtime handles bundling of `api/index.ts` and its imports at deploy time.

**Confidence:** HIGH — sourced from Vercel's official Node.js runtime documentation.

### Key Constraints

- **Function bundle size limit:** 250 MB compressed. The current monolith with all its dependencies (googleapis, pdfkit, exceljs, Stripe, etc.) is likely close to this limit. Needs testing at deploy time.
- **Request body limit:** 4.5 MB. Affects file upload routes. Files should go directly to Vercel Blob (client-side upload) rather than proxied through Express.
- **Max function duration:** 300 seconds on Pro plan (default). Sufficient for all current use cases.
- **Node.js version:** Vercel defaults to Node.js 24.x. Current project uses Node.js 20.x. Must pin to 22.x or 20.x in `package.json` engines to avoid unexpected breakage from Node.js 24 changes.

```json
{
  "engines": {
    "node": "22.x"
  }
}
```

---

## 2. Packages Required

### New packages to install

| Package | Version | Purpose | Confidence |
|---|---|---|---|
| `@vercel/blob` | latest (`^0.27.x` as of Feb 2026) | File storage replacing Replit GCS sidecar | HIGH — official Vercel package |

No other new packages are strictly required. The existing Express, Drizzle, Neon, Stripe, SendGrid, Twilio, and googleapis packages all work in Vercel's Node.js runtime without modification.

### Packages to remove after migration

| Package | Reason |
|---|---|
| `stripe-replit-sync` | Replit-specific, not needed on Vercel |
| `@replit/vite-plugin-cartographer` | Replit dev tool, remove from `vite.config.ts` |
| `@replit/vite-plugin-runtime-error-modal` | Replit dev tool, remove from `vite.config.ts` |
| `node-cron` | Cannot run in serverless; replaced by Vercel Cron |
| `memorystore` | Only needed as a session store fallback; not relevant on Vercel |

### Packages with no changes needed

| Package | Notes |
|---|---|
| `express` 4.21.2 | Works as-is in Vercel Node.js runtime |
| `express-session` 1.18.1 | Works as-is; sessions are stored in PostgreSQL (Neon) |
| `connect-pg-simple` 10.0.0 | Works as-is with Neon DATABASE_URL |
| `@neondatabase/serverless` 0.10.4 | Already optimized for serverless environments |
| `drizzle-orm` 0.39.1 | Works as-is |
| `stripe` 20.0.0 | Works as-is |
| `@sendgrid/mail` 8.1.6 | Works as-is |
| `twilio` 5.9.0 | Works as-is |
| `googleapis` 159.0.0 | Works as-is with service account credentials |
| `bcrypt` 6.0.0 | Works as-is |
| `multer` 2.0.2 | Works for small uploads; large uploads should bypass Express |
| `ws` 8.18.0 | Needs usage audit — see WebSocket section below |

---

## 3. Session Management

### Current state

`express-session` + `connect-pg-simple` storing sessions in a `sessions` table in Neon PostgreSQL. Sessions have a 7-day TTL. Authentication reads `session.userId` per request and does a DB lookup.

### Assessment on Vercel

**No architecture change is required.** The session store is already PostgreSQL, which is network-accessible from all Vercel function invocations. Since Vercel's Node.js runtime with Fluid Compute can handle multiple concurrent requests on shared instances, and since each request reads the session from the database (not memory), the existing implementation is fully compatible.

**What changes:**
- Remove `memorystore` (the in-memory fallback is useless in serverless).
- Ensure `app.set("trust proxy", 1)` is present in the Express app (it is already in `server/customAuth.ts`).
- Ensure session cookies use `secure: true` in production. Already implemented via `process.env.NODE_ENV === "production"` check.
- `sameSite: 'lax'` is already set — this is correct for Vercel's setup.

**What does NOT need to change:**
- No JWT migration needed.
- No Redis/KV session store needed.
- No cookie-session migration needed.
- The `connect-pg-simple` library's `conString` will continue to use `DATABASE_URL`.

**Confidence:** HIGH — Neon PostgreSQL is accessed over the network; serverless ephemeral instances are not a problem for network-based session stores.

### One caveat: Session table must be pre-created

`connect-pg-simple` is configured with `createTableIfMissing: false`. The `sessions` table must already exist in the Neon database. This is presumably true from the current Replit deployment. Confirm before migrating.

---

## 4. Cron Jobs

### Current state

`node-cron` schedules a daily job at midnight (America/Denver timezone) to:
1. Check Google OAuth token health for all instructors
2. Renew Google Calendar webhook watches for all instructors

### Why node-cron fails on Vercel

Vercel Functions are serverless — there is no persistent process. `node-cron.schedule()` is called during module initialization, but the process terminates after each request. The cron scheduler never fires.

### Replacement: Vercel Cron Jobs

Vercel Cron works by calling an HTTP endpoint on your deployed app at a configured schedule. The job is defined in `vercel.json` and invokes a Vercel Function via HTTP GET.

**Plan limits:**
- Hobby: 1 cron job per day (minimum interval: once per day).
- Pro: Up to 100 cron jobs, minimum interval 1 per minute, per-minute scheduling precision.

This app needs a daily job — Hobby plan is sufficient for the cron requirement, but Pro is recommended for the per-minute scheduling precision and longer function duration limits.

**Implementation:**

Step 1 — Add a secured cron endpoint to Express:

```typescript
// In server/routes.ts or a new server/cron/routes.ts

router.get('/api/internal/cron/daily-maintenance', async (req, res) => {
  // Validate that this request comes from Vercel Cron or an authorized source
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await cronService.runDailyMaintenance();
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[Cron] Daily maintenance failed:', error);
    res.status(500).json({ success: false });
  }
});
```

Step 2 — Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/internal/cron/daily-maintenance",
      "schedule": "0 7 * * *"
    }
  ]
}
```

The schedule `0 7 * * *` fires at 07:00 UTC daily, which is midnight Mountain Time (UTC-7 MDT) or 00:00 MST (UTC-7). Adjust to `0 6 * * *` (midnight MDT, UTC-6) during Daylight Saving Time, or use `0 7 * * *` for a fixed UTC time close to midnight Mountain.

Step 3 — Add environment variable:

```
CRON_SECRET=<random 32+ character secret>
```

Step 4 — Remove `node-cron` from `package.json` dependencies.

**Security note:** Vercel Cron sends an `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` is set as an environment variable in the Vercel project. Always validate this header before running privileged operations.

**Confidence:** HIGH — Vercel Cron is documented and stable. The HTTP endpoint pattern is standard.

---

## 5. File Storage

### Current state

`server/objectStorage.ts` uses `@google-cloud/storage` with credentials obtained from a Replit sidecar service running at `http://127.0.0.1:1106`. The sidecar issues tokens dynamically via a local HTTP endpoint. This is entirely Replit-specific and will not work on Vercel.

The upload flow uses Uppy with `@uppy/aws-s3` for direct browser-to-GCS uploads via signed URLs. Signed URLs are generated by the server via the sidecar.

### Replacement: Vercel Blob

**Vercel Blob** is the native file storage solution for Vercel projects. It uses Amazon S3 under the hood, provides 99.999999999% durability, CDN-backed delivery, and native SDK support.

**Package:** `@vercel/blob` (install as production dependency)

**Environment variable:** `BLOB_READ_WRITE_TOKEN` (auto-created when you create a Blob store in Vercel dashboard)

**SDK pattern (server-side upload):**

```typescript
import { put, del, list } from '@vercel/blob';

// Upload a file received via Express/multer
const blob = await put(`uploads/${filename}`, fileBuffer, {
  access: 'private', // or 'public' for publicly accessible files
  addRandomSuffix: true,
});
// blob.url is the durable URL to store in your database

// Delete a file
await del(blobUrl);
```

**Client-side direct upload (replaces Uppy + signed GCS URLs):**

The current pattern uses Uppy with `@uppy/aws-s3` for direct browser uploads via signed URLs. This pattern is preserved with Vercel Blob using `@vercel/blob/client` and `handleUpload()`:

```typescript
// Server-side token generation endpoint
import { handleUpload } from '@vercel/blob/client';

router.post('/api/upload/token', isAuthenticated, async (req, res) => {
  const body = req.body;
  const response = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      return {
        allowedContentTypes: ['image/*', 'video/*', 'application/pdf'],
        maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async ({ blob }) => {
      // Store blob.url in database
      console.log('Upload completed:', blob.url);
    },
  });
  res.json(response);
});
```

```typescript
// Client-side (replaces @uppy/aws-s3 signed URL flow)
import { upload } from '@vercel/blob/client';

const blob = await upload(filename, file, {
  access: 'private',
  handleUploadUrl: '/api/upload/token',
});
```

**Uppy compatibility:** The current Uppy integration can be replaced with either direct `@vercel/blob/client` uploads or by using Uppy with its generic fetch plugin. `@uppy/aws-s3` specifically targets S3's signed URL protocol; it will not work with Vercel Blob's token API without a custom wrapper. The simplest path is to swap Uppy for direct `@vercel/blob/client` calls on the upload pages.

**ACL / permissions:** The current `objectAcl.ts` implements a custom ACL layer on top of GCS metadata. Vercel Blob has two modes: `private` (authenticated token required for reads) and `public` (CDN URL accessible to anyone). The existing custom ACL logic needs to be replaced with Vercel Blob's access model. For user-uploaded files (waivers, profile images), use `private` access and deliver via Express proxy. For public assets (course images), use `public` access and serve the CDN URL directly.

**Confidence:** HIGH for the migration path. MEDIUM for preserving full ACL functionality — the current custom ACL is granular; Vercel Blob's binary access model may require some simplification of the permission system.

### Alternative: Direct GCS with Service Account

If preserving GCS (e.g., for cost reasons or existing stored files), replace the Replit sidecar credential flow with a standard GCS service account:

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});
```

This requires `GOOGLE_SERVICE_ACCOUNT_JSON` (the full service account JSON as a string) and `GOOGLE_CLOUD_PROJECT_ID` as Vercel environment variables. The GCS bucket itself does not need to change. Existing stored files do not need to be migrated.

**Confidence:** HIGH — standard GCS SDK usage, no Replit dependency.

**Recommendation:** Use direct GCS with service account if you want to preserve existing stored files and avoid a data migration. Use Vercel Blob for new projects or if you want to simplify the infrastructure.

---

## 6. WebSocket (ws)

### Current state

`ws` 8.18.0 is in `package.json`. A WebSocket server is likely instantiated alongside the HTTP server in `server/routes.ts` or `server/index.ts`.

### Assessment

Vercel Functions do not support persistent WebSocket connections. Each function invocation is an HTTP request/response cycle. A WebSocket upgrade handshake requires a persistent TCP connection, which is incompatible with the serverless model.

**Action required:** Audit actual WebSocket usage in the codebase before migration. Determine if WebSockets are:
- Used in production (live features) vs. scaffolded but unused.
- Used for real-time notifications, live updates, or something else.

**Options if WebSockets are actively used:**

| Option | Description | Complexity |
|---|---|---|
| **Polling** | Replace WebSocket push with client polling every N seconds via existing REST endpoints | Low — no infrastructure change |
| **Vercel KV + SSE** | Use Server-Sent Events (SSE) for server-to-client push; Vercel Functions support SSE | Medium |
| **Third-party WebSocket service** | Use Pusher, Ably, or Soketi as a WebSocket relay; server publishes events, clients subscribe | Medium — adds external dependency |

**Confidence:** HIGH that WebSocket connections are incompatible with Vercel serverless. MEDIUM on which replacement approach is best without knowing current WebSocket usage.

---

## 7. Fluid Compute

As of April 23, 2025, Vercel Fluid Compute is **enabled by default** for new projects. This is important context:

- Fluid Compute allows multiple concurrent requests to share a single function instance.
- Global module-level state (caches, connection pools) persists across requests within the same instance.
- Neon PostgreSQL connection pool in `server/db.ts` (max 10 connections) will be shared across concurrent requests on the same instance — this is actually beneficial.
- `express-session` reading from PostgreSQL is stateless across instances; Fluid Compute does not affect this.
- The `ws` WebSocket server, if instantiated at module level, will persist within an instance but still cannot handle upgrade connections from external clients.

Enable explicitly in `vercel.json`:
```json
{
  "fluid": true
}
```

**Confidence:** HIGH — official documentation.

---

## 8. Environment Variables

### Variables to remove (Replit-specific)

| Variable | Reason |
|---|---|
| `REPLIT_DEPLOYMENT` | Used to detect Stripe production mode; replace with `NODE_ENV=production` |
| `REPLIT_DEV_DOMAIN` | Used in `cronService.ts` for webhook URL construction; replace with `VERCEL_URL` or `APP_URL` |
| `REPLIT_CONNECTORS_HOSTNAME` | Replit credential management; remove |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Replit GCS sidecar; remove when switching to Vercel Blob or direct GCS |
| `PRIVATE_OBJECT_DIR` | Replit GCS sidecar; remove |

### Variables to add (Vercel-specific)

| Variable | Purpose |
|---|---|
| `APP_URL` | Base URL for the production deployment (e.g., `https://practicaldefense.vercel.app`). Used for webhook URLs, OAuth callbacks, and cron endpoint construction. |
| `CRON_SECRET` | Shared secret to authenticate Vercel Cron requests to `/api/internal/cron/*` |
| `BLOB_READ_WRITE_TOKEN` | Auto-created by Vercel when you create a Blob store. Required for `@vercel/blob` SDK. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full service account JSON string (if replacing Replit GCS sidecar with direct GCS) |
| `GOOGLE_CLOUD_PROJECT_ID` | GCS project ID (if using direct GCS) |

### Variables that carry over unchanged

`DATABASE_URL`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `INTERNAL_API_KEY`, `ENCRYPTION_MASTER_KEY`, `PRINTIFY_API_KEY`, `MOODLE_TOKEN`

---

## 9. Build Architecture Summary

### Current (Replit)

```
npm run build
  → vite build          (frontend → dist/public/)
  → esbuild server/...  (backend → dist/index.js)

npm start → node dist/index.js  (serves API + static files on port 5000)
```

### Target (Vercel)

```
Vercel build process:
  → npm run build (= vite build → dist/public/)
  → Vercel bundles api/index.ts automatically

Vercel serves:
  → dist/public/**  as static files (CDN)
  → /api/**         via api/index.ts Vercel Function (Express)
  → /auth/**        via api/index.ts Vercel Function (Express, for OAuth callback)
  → /**             → dist/public/index.html (SPA fallback)
```

---

## 10. Migration Checklist

The following items must be completed for a functional Vercel deployment:

**Required for basic deployment:**
- [ ] Extract Express app from `server/index.ts` into `server/app.ts` (no `listen()` call)
- [ ] Create `api/index.ts` exporting Express app
- [ ] Create `vercel.json` with rewrites, functions config, and crons
- [ ] Update `package.json` build script to `"vite build"` only
- [ ] Pin Node.js version to `22.x` in `package.json` engines
- [ ] Remove Replit vite plugins from `vite.config.ts`
- [ ] Replace `REPLIT_DEPLOYMENT` check (Stripe env detection) with `NODE_ENV`
- [ ] Set all environment variables in Vercel dashboard

**Required for cron jobs:**
- [ ] Add secured cron HTTP endpoint to Express routes
- [ ] Add `CRON_SECRET` env var
- [ ] Update webhook URL construction in `cronService.ts` to use `APP_URL` instead of `REPLIT_DEV_DOMAIN`
- [ ] Remove `node-cron` from dependencies

**Required for file storage:**
- [ ] Decide: Vercel Blob vs. direct GCS with service account
- [ ] If Vercel Blob: Install `@vercel/blob`, create Blob store in dashboard, rewrite `server/objectStorage.ts`, update Uppy integration
- [ ] If direct GCS: Set `GOOGLE_SERVICE_ACCOUNT_JSON` env var, update `objectStorage.ts` to use standard credentials
- [ ] Remove Replit sidecar credential code from `server/objectStorage.ts`

**Required for WebSocket (if actively used):**
- [ ] Audit WebSocket usage in codebase
- [ ] Choose and implement replacement (polling, SSE, or third-party service)

---

## 11. Confidence Summary

| Decision | Confidence | Basis |
|---|---|---|
| Full adapter pattern (Express in `api/index.ts`) | HIGH | Official Vercel Node.js runtime docs |
| `vercel.json` rewrites configuration | HIGH | Official Vercel project configuration docs |
| Session storage (no change needed) | HIGH | Neon PostgreSQL is network-accessible; serverless-compatible |
| Cron replacement (Vercel Cron + HTTP endpoint) | HIGH | Official Vercel Cron docs; standard pattern |
| File storage migration path (Vercel Blob or direct GCS) | HIGH (path); MEDIUM (ACL complexity) | Official Vercel Blob SDK docs |
| WebSocket incompatibility | HIGH | Fundamental serverless constraint |
| Node.js version pinning to 22.x | HIGH | Vercel Node.js version docs |
| Fluid Compute enabled by default | HIGH | Official Vercel Fluid Compute docs |
| Bundle size will fit within 250 MB | MEDIUM | Needs validation at deploy time; no current bundle analysis |
| `@uppy/aws-s3` incompatible with Vercel Blob tokens | HIGH | Protocol mismatch between S3 signed URL and Vercel Blob token API |

---

## Sources

- Vercel Node.js runtime: https://vercel.com/docs/functions/runtimes/node-js
- Vercel Node.js versions: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Vercel advanced Node.js config: https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration
- Vercel function limits: https://vercel.com/docs/functions/limitations
- Vercel project configuration (vercel.json): https://vercel.com/docs/project-configuration/vercel-json
- Vercel Cron Jobs quickstart: https://vercel.com/docs/cron-jobs/quickstart
- Vercel Cron usage and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Blob overview: https://vercel.com/docs/vercel-blob
- Vercel Blob SDK (`@vercel/blob`): https://vercel.com/docs/vercel-blob/using-blob-sdk
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute
- Vercel project configuration overview: https://vercel.com/docs/project-configuration

---

*Research date: 2026-02-20 — Versions verified against live Vercel documentation*
