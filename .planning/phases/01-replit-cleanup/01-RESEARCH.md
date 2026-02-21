# Phase 1: Replit Cleanup - Research

**Researched:** 2026-02-20
**Domain:** Replit dependency removal, Vercel Blob storage migration, Stripe simplification, package audit
**Confidence:** HIGH

---

## Summary

Phase 1 is mechanical cleanup with one non-trivial piece: the storage migration from GCS (via Replit sidecar) to Vercel Blob. The Replit-specific code is all identified and localized. The Stripe simplification is straightforward — remove `getCredentialsFromReplit()` and the database fallback, keep env-var-only initialization. The Vite plugin removal is a three-line change. The package audit reveals several unused packages that are safe to remove.

The Vercel Blob integration is the only place requiring real design decisions. `@vercel/blob` version 2.3.0 (current) provides `put()`, `del()`, `list()`, `get()`, and `head()`. For this codebase, the storage pattern is: (1) server-side uploads via `put()` for gift card theme images (already received via multer memoryStorage), (2) server-generated presigned URLs via `handleUpload()` + client token flow for the `ObjectUploader` component, and (3) server-proxied downloads via `get()` for private objects. The ACL metadata system in `objectAcl.ts` stores per-file access policies in GCS object metadata — this must be replaced with a simpler approach since Vercel Blob has no object-level metadata, only URL-based access (public or private store-wide).

The "Stripe Connect" code (`server/stripeConnect/routes.ts`) is misnamed — it is actually an admin UI for entering and encrypting Stripe API keys into the database. It is not Stripe Connect marketplace/payout infrastructure. Per the decision to remove Stripe Connect and simplify to env-var-only Stripe, this entire module and its database credential storage path should be removed. The env-var path in `getCredentials()` already works and is the only path that should remain.

**Primary recommendation:** Implement Vercel Blob with a private store. Replace the objectAcl metadata system with a simple database table that maps blob pathnames to ACL policies. Use server-side `put()` for gift card images, `handleUpload()` client token flow for the ObjectUploader presigned URL pattern, and `get()` for private blob streaming.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 2.3.0 | File storage replacing GCS sidecar | Vercel-native, token-based auth, private/public stores, no sidecar needed |

### Removed Packages (Confirmed Unused or Replit-Only)

| Package | Location | Usage | Safe to Remove |
|---------|----------|-------|----------------|
| `stripe-replit-sync` | `dependencies` | Not imported anywhere in server/ or client/ | YES — dead code |
| `@replit/vite-plugin-runtime-error-modal` | `devDependencies` | Only in vite.config.ts (to be removed) | YES |
| `@replit/vite-plugin-cartographer` | `devDependencies` | Only in vite.config.ts (to be removed) | YES |
| `passport` | `dependencies` | Zero imports in any .ts or .tsx file | YES — custom auth used instead |
| `passport-local` | `dependencies` | Zero imports in any .ts or .tsx file | YES — custom auth used instead |
| `@types/passport` | `devDependencies` | Peer type for passport | YES |
| `@types/passport-local` | `devDependencies` | Peer type for passport-local | YES |
| `memorystore` | `dependencies` | Zero imports — no code uses it | YES |
| `openid-client` | `dependencies` | Zero imports — replitAuth.ts.backup only | YES — backup file is dead |
| `@uppy/aws-s3` | `dependencies` | Zero runtime imports — only `type { UploadResult }` from @uppy/core in EditCourseForm.tsx | YES (see note) |
| `@uppy/core` | `dependencies` | Only a type import, no runtime usage | YES (see note) |
| `@uppy/dashboard` | `dependencies` | Zero imports | YES |
| `@uppy/react` | `dependencies` | Zero imports | YES |

**Uppy note (HIGH confidence):** `ObjectUploader.tsx` does NOT use Uppy at runtime. It is a custom plain-`fetch` + presigned-URL component. The only Uppy reference is `import type { UploadResult } from "@uppy/core"` in `EditCourseForm.tsx` — a type-only import. This type import should be replaced with an inline type (or the Vercel Blob return type) when Uppy packages are removed.

**moment note (MEDIUM confidence):** `moment` is imported in four client-side files: `instructor-calendar.tsx`, `schedule-calendar.tsx`, `course-management.tsx`, `landing.tsx`. It is actively used and is NOT safe to remove. `date-fns` is also present but these files have not been migrated to it.

**openai note (HIGH confidence):** `openai` package is not imported anywhere. Per the decision, keep it in package.json for future use — do not remove.

**@google-cloud/storage note:** Remove after Vercel Blob migration is complete. Both `objectStorage.ts` and `objectAcl.ts` import from it. `giftCards/routes.ts` also uses `objectStorageClient` directly.

### Packages to Keep

| Package | Reason |
|---------|--------|
| `moment` | Actively imported in 4 client files |
| `openai` | Kept per explicit decision (future use) |
| `node-cron` | Phase 3 concern — not removed in Phase 1 |
| `ws` | Required by @neondatabase/serverless |
| `@google-cloud/storage` | Removed at end of Phase 1 once Vercel Blob replaces it |
| `memoizee` | Check active imports before removing — not audited |

**Installation (new):**
```bash
npm install @vercel/blob
npm uninstall stripe-replit-sync @replit/vite-plugin-runtime-error-modal @replit/vite-plugin-cartographer passport passport-local memorystore openid-client @uppy/aws-s3 @uppy/core @uppy/dashboard @uppy/react @google-cloud/storage
npm uninstall --save-dev @types/passport @types/passport-local
```

---

## Architecture Patterns

### Pattern 1: Vercel Blob — Private Store with Server Proxy

**What:** All files stored in a private Blob store. Private files are served through an Express proxy route that checks auth before streaming. Public files (gift card images) can be stored with `access: 'public'` and accessed via direct URL.

**Why this codebase uses it:** The existing `GET /objects/:objectPath(*)` route already proxies file downloads through Express with ACL checks. Vercel Blob's private store replaces GCS credentials; the proxy pattern stays the same.

**Express streaming pattern (verified from official docs):**
```typescript
// Source: https://vercel.com/docs/vercel-blob/private-storage
import { get } from '@vercel/blob';
import { Readable } from 'node:stream';

// In your Express route handler:
app.get('/objects/:objectPath(*)', async (req: any, res) => {
  const userId = req.user?.id;
  const pathname = req.path.replace('/objects/', '');

  // Check ACL (database-based, see Pattern 2)
  const canAccess = await checkBlobAccess(pathname, userId);
  if (!canAccess) return res.sendStatus(401);

  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return res.sendStatus(404);

  res.setHeader('Content-Type', result.blob.contentType);
  res.setHeader('Cache-Control', 'private, no-cache');
  Readable.fromWeb(result.stream as any).pipe(res);
});
```

### Pattern 2: ACL Replacement — Database Table Instead of Object Metadata

**What:** GCS stored ACL policies in object metadata (key: `custom:aclPolicy`). Vercel Blob has no per-object metadata. The replacement is a database table that maps blob pathnames to ACL policies.

**Why needed:** `objectAcl.ts` stores `{ owner, visibility, aclRules }` in GCS metadata. This system is called from `objectStorage.ts` and from `routes.ts` at lines 4248–4412 (three `trySetObjectEntityAclPolicy` calls). The logic must survive but the storage backend changes.

**Recommended approach:** Add a `blob_acl_policies` table to the schema (or use the existing `attachments`/waivers table pattern if one exists). The `ObjectAclPolicy` interface stays the same — only `setObjectAclPolicy()` and `getObjectAclPolicy()` implementations change.

**Simpler alternative (if ACL rules are not actively used):** Inspect the `aclRules` usage. The `ObjectAccessGroupType` enum is currently empty (`enum ObjectAccessGroupType {}`), meaning no group-based ACL rules exist. The ACL system only uses `owner` and `visibility: 'public'|'private'`. If this is confirmed, the entire ACL can be replaced with a simple `Map<pathname, { owner: string, visibility: string }>` database column rather than a full table.

### Pattern 3: Vercel Blob — Server-Side Upload for Gift Cards

**What:** Gift card theme images are uploaded via multer memoryStorage (file buffer in RAM), then saved directly to storage. This pattern ports cleanly to Vercel Blob `put()`.

**Before (GCS):**
```typescript
const bucket = objectStorageClient.bucket(bucketName);
const file = bucket.file(objectName);
await file.save(req.file.buffer, { contentType: req.file.mimetype });
```

**After (Vercel Blob):**
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk#put
import { put } from '@vercel/blob';

const blob = await put(
  `gift-card-themes/${randomUUID()}.${finalExt}`,
  req.file.buffer,
  {
    access: 'public',
    contentType: req.file.mimetype,
    addRandomSuffix: false, // UUID in pathname already ensures uniqueness
  }
);
// blob.url is the permanent public URL
```

### Pattern 4: Vercel Blob — Presigned URL for ObjectUploader

**What:** `ObjectUploader.tsx` calls `onGetUploadParameters()` to get a `{ method: 'PUT', url }` from the server, then does a `fetch(url, { method: 'PUT', body: file })`. Currently the server generates a GCS signed URL via the Replit sidecar. With Vercel Blob, server-side token generation replaces sidecar-based signing.

**The client token flow (verified from official docs):**
```typescript
// Server: generate a client upload token
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk#handleupload
import { handleUpload } from '@vercel/blob/client';

app.post('/api/objects/upload-token', isAuthenticated, async (req, res) => {
  const body = await req.body; // JSON body from client

  const jsonResponse = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      // Auth already enforced by isAuthenticated middleware
      return {
        allowedContentTypes: ['image/*', 'application/pdf'],
        maximumSizeInBytes: 15 * 1024 * 1024, // 15MB
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      // Called by Vercel Blob when upload completes
      // Set ACL policy in database here if needed
    },
  });
  res.json(jsonResponse);
});
```

**IMPORTANT:** The `onUploadCompleted` callback is called by Vercel Blob servers, not the browser. It will not work on localhost without a tunnel (ngrok etc.). During local development, the callback can be skipped or mocked.

**Alternative (simpler):** Since `ObjectUploader` does a plain `PUT fetch` and `ObjectStorageService.getObjectEntityUploadURL()` just calls the sidecar for a signed PUT URL, the simplest replacement is server-side `put()` called from the `/api/objects/upload` endpoint itself — the client POSTs the file to Express, Express PUTs it to Vercel Blob, returns the URL. This avoids the client token complexity entirely and eliminates the `onUploadCompleted` callback issue on localhost.

**Recommendation:** Use direct server-side upload (client → server → Blob) rather than the client token flow. The `ObjectUploader` component already sends files to the server in some cases (gift card images use multer). Standardize on this pattern.

### Pattern 5: Stripe — Env-Var Only Initialization with Graceful Startup

**Current three-tier chain (to be removed):**
1. `STRIPE_SECRET_KEY` env var
2. Database encrypted credentials
3. Replit connector fallback

**Target (per decision):** Env var only. If missing, log warning and start without payments.

**Implementation:**
```typescript
// server/stripeClient.ts — simplified
import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (stripeClient === null && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
```

**At server startup:** Log `[Stripe] No STRIPE_SECRET_KEY set — payment endpoints disabled` if missing.

**In payment routes:** Check `getStripeClient()` is non-null before processing. Return 503 with a clear message if Stripe is not configured.

**Remove entirely:**
- `getCredentialsFromReplit()` function
- `getCredentialsFromDatabase()` function
- `getUncachableStripeClient()` (uses getCredentials)
- `getStripePublishableKey()` → replace with direct env var read
- `resetStripeClientCache()` → no longer needed
- `validateStripeSecretKey()` → no longer needed (admin UI removed)
- `server/stripeConnect/routes.ts` — the entire file
- The import and mounting in `routes.ts` lines 19, 9230
- The `/api/stripe-connect/webhook` raw body middleware in `server/index.ts` line 12
- The `/stripe-connect` client page and its route in `App.tsx`
- The Layout.tsx nav links to `/stripe-connect`
- `storage.getStripeCredentials()`, `storage.saveStripeCredentials()`, `storage.deleteStripeCredentials()` calls

**Keep:** The `stripe` npm package, `Stripe` type imports, all payment processing routes.

**Database note (deferred per CONTEXT.md):** The `stripe_connect_account_id` and related columns in the `users` table are deferred. Leave them in place in Phase 1 — no schema migration needed.

### Pattern 6: APP_URL Env Var Replacement

**All 8 locations to update:**

| File | Line(s) | Old Code | New Code |
|------|---------|----------|----------|
| `server/emailService.ts` | 245-246 | `REPLIT_DEV_DOMAIN ? https://... : 'http://localhost:5000'` | `process.env.APP_URL` (fail-fast if missing) |
| `server/notificationEngine.ts` | 106 | `REPLIT_DOMAINS?.split(',')[0] \|\| 'https://abqconcealedcarry.com'` | `process.env.APP_URL` |
| `server/notificationEngine.ts` | 933 | `REPLIT_DOMAINS \|\| 'https://abqconcealedcarry.com'` | `process.env.APP_URL` |
| `server/notificationEngine.ts` | 1360 | `REPLIT_DOMAINS?.split(',')[0] \|\| 'https://example.com'` | `process.env.APP_URL` |
| `server/notificationEngine.ts` | 1400 | `REPLIT_DOMAINS?.split(',')[0] \|\| 'https://example.com'` | `process.env.APP_URL` |
| `server/notificationEngine.ts` | 1420 | `REPLIT_DOMAINS?.split(',')[0] \|\| 'tacticaladv.com'` | `process.env.APP_URL` |
| `server/routes.ts` | 6479 | `REPLIT_DOMAINS?.split(',')[0] \|\| 'https://example.com'` | `process.env.APP_URL` |
| `server/services/cronService.ts` | 8 | `REPLIT_DEV_DOMAIN ? https://... : 'http://localhost:5000'` (fallback) | `process.env.APP_URL` (fail-fast) |

**Fail-fast pattern for APP_URL:**
```typescript
// Add to server startup validation
const APP_URL = process.env.APP_URL;
if (!APP_URL) {
  throw new Error('APP_URL environment variable is required. Set it to your deployment URL (e.g., https://practicaldefense.vercel.app)');
}
```

**stripeClient.ts REPLIT vars to remove:** Lines 7-46 entirely — `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `REPLIT_DEPLOYMENT`, `WEB_REPL_RENEWAL` are all in `getCredentialsFromReplit()` which is being removed.

**vite.config.ts to remove:**
- Line 4: `import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"`
- Lines 8-9: `runtimeErrorOverlay()` plugin call
- Lines 10-17: The cartographer conditional block (references `process.env.REPL_ID`)

**server/replitAuth.ts.backup:** Delete this file entirely.

### Anti-Patterns to Avoid

- **Don't keep the `getCredentialsFromDatabase()` path**: The decision is env-var only. Database credential storage is a Stripe Connect feature being removed.
- **Don't implement client-side Vercel Blob uploads with `upload()` from `@vercel/blob/client`**: The current upload pattern is server-generated presigned PUT URL → client direct PUT. For simplicity, switch to server-side proxy upload (client POSTs to Express, Express PUTs to Blob). Avoids `onUploadCompleted` callback issues in local dev.
- **Don't store files with `access: 'private'` if they need a direct public URL**: Gift card theme images are served via a proxy route. They can use `access: 'public'` since they're non-sensitive and served directly from the CDN URL stored in the database. Private objects (waivers, course materials) should use `access: 'private'` and be served via the proxy route.
- **Don't try to preserve the GCS object metadata ACL system**: Vercel Blob has no per-object metadata. The existing `ObjectAccessGroupType` enum is empty, meaning no group ACL rules have ever been implemented. The ACL only uses `owner` and `visibility`. Replace with a database field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Presigned upload URLs for client | Custom signing logic | `handleUpload()` from `@vercel/blob/client` | Edge cases in token expiry, security, multipart |
| Streaming private blob to response | Custom fetch + pipe | `get()` from `@vercel/blob` + `Readable.fromWeb().pipe(res)` | Handles range requests, content-type headers, error cases |
| Server-side file upload | Manual multipart | `put()` from `@vercel/blob` | Handles retries, multipart for large files |
| Environment variable validation | Custom startup check | Inline throw at module init time | Fail-fast pattern; clear error message |

**Key insight:** Vercel Blob is a straightforward REST API wrapper. The patterns are direct substitutions for GCS equivalents. Don't add caching layers or abstraction beyond what already exists in `ObjectStorageService`.

---

## Common Pitfalls

### Pitfall 1: `onUploadCompleted` Callback Fails in Local Dev

**What goes wrong:** The client token upload flow (`handleUpload()` + `upload()`) requires Vercel Blob to call back to your server's `handleUploadUrl` endpoint when the upload completes. This callback comes from Vercel's servers, which cannot reach `localhost`. The `onUploadCompleted` handler never fires locally.

**Why it happens:** The Vercel Blob service is external; it needs a publicly reachable URL to call back.

**How to avoid:** Use server-side `put()` instead of client token uploads for Phase 1. Client POSTs the file to Express, Express buffers it and calls `put()`. Simpler, works locally, no callback needed. If client token flow is desired later, use ngrok for local testing.

**Warning signs:** `onUploadCompleted` never logs; files appear uploaded but ACL is never set in database.

### Pitfall 2: `Readable.fromWeb()` Requires Node 18+

**What goes wrong:** `Readable.fromWeb(result.stream)` is used to convert the Vercel Blob Web Streams API response to a Node.js stream for piping to Express response. This requires Node.js 18+.

**Why it happens:** `fromWeb` was added in Node.js 17. Older versions do not have it.

**How to avoid:** The project runs locally — confirm Node version with `node --version`. Per the project research, Node 22.x is the target. This is not a problem.

**Warning signs:** `TypeError: Readable.fromWeb is not a function`

### Pitfall 3: Vercel Blob URL Changes After Re-Upload

**What goes wrong:** Unlike GCS where you control the object path, Vercel Blob's `put()` with `addRandomSuffix: true` generates a URL with a random suffix. If existing database records store the blob URL and a file is re-uploaded, the URL changes.

**Why it happens:** Random suffix for collision prevention.

**How to avoid:** Store the Vercel Blob URL in the database after upload (return value of `put()`). The existing GCS-based code likely stores GCS URLs or pathnames. Update database records with new Vercel Blob URLs when files are re-uploaded.

**Warning signs:** Uploaded image appears to succeed but the stored URL is different from what was uploaded.

### Pitfall 4: `BLOB_READ_WRITE_TOKEN` Required in Local Dev

**What goes wrong:** `@vercel/blob` reads `BLOB_READ_WRITE_TOKEN` from the environment by default. In local dev this must be set manually. Without it, all Blob operations throw authentication errors.

**Why it happens:** The token is auto-set in Vercel deployments. Local dev requires manual setup.

**How to avoid:** Add `BLOB_READ_WRITE_TOKEN` to `.env` with a dev/test token from the Vercel dashboard. Document it in `.env.example`.

**Warning signs:** `Error: BlobError: No BLOB_READ_WRITE_TOKEN environment variable found`

### Pitfall 5: The Stripe Connect Module Is Not Actually Stripe Connect

**What goes wrong:** `server/stripeConnect/routes.ts` is named "Connect" but implements admin key management (enter API keys, encrypt to DB). Removing it deletes the admin UI for managing Stripe keys — which is intentional per the decision. However, callers of `storage.getStripeCredentials()` must be audited — they may not all be in `stripeConnect/routes.ts`.

**How to avoid:** Grep for `getStripeCredentials`, `saveStripeCredentials`, `deleteStripeCredentials` in storage.ts and routes.ts before removal. Remove all callers. The DB credential path in `getCredentialsFromDatabase()` in stripeClient.ts must also be removed.

**Warning signs:** TypeScript errors about missing storage methods after removal, or runtime errors if any remaining caller tries to call the deleted storage methods.

### Pitfall 6: `UploadResult` Type from `@uppy/core` in EditCourseForm

**What goes wrong:** `EditCourseForm.tsx` has `import type { UploadResult } from "@uppy/core"` — a type-only import. When `@uppy/core` is uninstalled, TypeScript will error on this import.

**How to avoid:** Before uninstalling Uppy packages, replace the `UploadResult` type import with an inline type definition. The shape is simple: `{ successful: Array<{ uploadURL: string }> }` based on how `ObjectUploader.tsx` constructs the result object.

**Warning signs:** `error TS2307: Cannot find module '@uppy/core'`

---

## Code Examples

Verified patterns from official sources:

### Server-Side Upload (Gift Card Theme Images)
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk#put
import { put } from '@vercel/blob';

// In server/giftCards/routes.ts — replace file.save() call:
const blob = await put(
  `gift-card-themes/${randomUUID()}.${finalExt}`,
  req.file.buffer,
  {
    access: 'public',
    contentType: req.file.mimetype,
    addRandomSuffix: false,
  }
);
const proxyUrl = `/api/gift-cards/theme-image/${blob.url.split('/').pop()!.split('?')[0]}`;
// Or simply store blob.url directly if served from CDN (no proxy needed for public)
```

### Presigned Upload URL (ObjectStorageService.getObjectEntityUploadURL replacement)
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk#put
// Simplest approach: server-side put, return the blob URL
import { put } from '@vercel/blob';

// POST /api/objects/upload (replaces the upload-url endpoint)
app.post('/api/objects/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const blob = await put(
    `objects/uploads/${randomUUID()}`,
    req.file.buffer,
    { access: 'private', contentType: req.file.mimetype }
  );
  res.json({ uploadURL: blob.url });
});
```

### Private Blob Streaming (objectStorage.downloadObject replacement)
```typescript
// Source: https://vercel.com/docs/vercel-blob/private-storage
import { get } from '@vercel/blob';
import { Readable } from 'node:stream';

// GET /objects/:objectPath(*) (replace objectStorageService.downloadObject)
app.get('/objects/:objectPath(*)', async (req: any, res) => {
  const userId = req.user?.id;
  const pathname = req.path.slice('/objects/'.length - 1); // keep leading slash for lookup

  const canAccess = await checkBlobAcl(pathname, userId); // database ACL check
  if (!canAccess) return res.sendStatus(401);

  const result = await get(`objects/${pathname}`, { access: 'private' });
  if (!result || result.statusCode !== 200) return res.sendStatus(404);

  res.setHeader('Content-Type', result.blob.contentType);
  res.setHeader('Cache-Control', 'private, no-cache');
  Readable.fromWeb(result.stream as any).pipe(res);
});
```

### Delete a Blob
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk#del
import { del } from '@vercel/blob';

await del(blobUrl); // accepts URL string or array of URL strings
```

### Stripe Client — Simplified
```typescript
// server/stripeClient.ts (simplified)
import Stripe from 'stripe';

let _client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!_client && process.env.STRIPE_SECRET_KEY) {
    _client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return _client;
}
```

### Startup Validation
```typescript
// Add near the top of server/index.ts, before app is started:
function validateRequiredEnvVars() {
  const required = ['APP_URL', 'DATABASE_URL', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — payment endpoints will be disabled');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[Blob] BLOB_READ_WRITE_TOKEN not set — file storage will be disabled');
  }
}
validateRequiredEnvVars();
```

### Vite Config Cleanup
```typescript
// vite.config.ts — after cleanup (remove all Replit references)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GCS sidecar at 127.0.0.1:1106 | `@vercel/blob` with `BLOB_READ_WRITE_TOKEN` | Phase 1 | Eliminates all sidecar calls; no GCS SDK needed |
| Stripe 3-tier fallback (env → DB → Replit) | Env var only, graceful startup | Phase 1 | Simpler; matches production expectations |
| Replit Vite plugins (always loaded) | No Replit plugins | Phase 1 | Build works outside Replit |
| `REPLIT_DOMAINS/REPLIT_DEV_DOMAIN` for URLs | Single `APP_URL` env var | Phase 1 | All email links, SMS, and calendar webhooks use correct domain |
| `stripe-replit-sync` (unused dep) | Removed | Phase 1 | Dead code eliminated |
| `passport`/`passport-local` (unused) | Removed | Phase 1 | Eliminates confusing dead deps |
| Uppy packages (unused) | Removed | Phase 1 | Reduces bundle size |
| GCS object metadata for ACL | Database table | Phase 1 | No per-object metadata in Vercel Blob |

**Deprecated/outdated:**
- `server/replitAuth.ts.backup`: Dead file, delete it
- `server/stripeConnect/` directory: Entire directory removed (misnamed — was admin key UI, not Stripe Connect marketplace)
- `PUBLIC_OBJECT_SEARCH_PATHS` / `PRIVATE_OBJECT_DIR` env vars: GCS-specific; replaced by `BLOB_READ_WRITE_TOKEN`

---

## Open Questions

1. **ACL database table design**
   - What we know: `ObjectAclPolicy` has `{ owner: string, visibility: 'public'|'private', aclRules: [] }`. The `aclRules` array is always empty (enum has no cases). The ACL is only `owner` + `visibility`.
   - What's unclear: Do any rows in the actual database have non-empty `aclRules`? This can only be confirmed by querying the live Neon database. If all rows have empty aclRules, the replacement is trivial.
   - Recommendation: Implement ACL as a simple map stored in the existing `blob_acl_policies` table with columns `(pathname TEXT PRIMARY KEY, owner_id TEXT, visibility TEXT)`. If waivers and course materials are always private-to-owner, you may not even need a visibility field — default private, check ownership.

2. **Gift card theme image serving after migration**
   - What we know: Current flow saves to GCS, returns `/api/gift-cards/theme-image/:filename` proxy URL, proxy fetches from GCS. If images are uploaded with `access: 'public'`, they can be served directly from the Vercel CDN URL.
   - What's unclear: Whether the gift card theme image URL format in the database needs to change (e.g., from `/api/gift-cards/theme-image/uuid.png` to `https://...public.blob.vercel-storage.com/gift-card-themes/uuid.png`).
   - Recommendation: Store the Vercel Blob `blob.url` directly in the database for gift card themes. Update the gift card theme serving endpoint to read the stored URL and redirect/serve directly. No proxy needed for public files.

3. **`getObjectEntityUploadURL()` callers — confirm Uppy is truly unused**
   - What we know: `POST /api/objects/upload` calls `getObjectEntityUploadURL()` which calls `signObjectURL()` (sidecar). Client-side code in `CommunicationsDashboard.tsx` calls `/api/object-storage/upload-url` (a separate endpoint at line 8917 that also calls the sidecar). Both must be replaced.
   - What's unclear: Whether any active user flow still uses `POST /api/objects/upload` vs `/api/object-storage/upload-url`. Both are sidecar-backed and must be replaced.
   - Recommendation: Replace both endpoints with a unified server-side `put()` approach.

4. **`storage.getStripeCredentials()` callers outside stripeConnect**
   - What we know: `stripeClient.ts:getCredentialsFromDatabase()` calls it. `stripeConnect/routes.ts` calls it in several places.
   - Recommendation: After removing `stripeConnect/routes.ts` and `getCredentialsFromDatabase()`, run TypeScript compilation to find any remaining callers. The `storage.ts` interface should have the method signature removed as well.

---

## Sources

### Primary (HIGH confidence)
- Official Vercel Blob SDK docs: https://vercel.com/docs/vercel-blob/using-blob-sdk — put, del, list, get, head, handleUpload, upload APIs
- Official Vercel Blob private storage docs: https://vercel.com/docs/vercel-blob/private-storage — streaming pattern with `Readable.fromWeb()`
- Direct codebase inspection: `server/objectStorage.ts`, `server/objectAcl.ts`, `server/stripeClient.ts`, `server/stripeConnect/routes.ts`, `vite.config.ts`, `package.json`, `server/routes.ts` (lines 3444-3478, 6478-6479, 8917-8962, 9230), `server/emailService.ts` (lines 245-246), `server/notificationEngine.ts` (lines 106, 933, 1360, 1400, 1420), `server/services/cronService.ts` (line 8), `client/src/components/ObjectUploader.tsx`, `client/src/components/EditCourseForm.tsx`
- `npm info @vercel/blob version` → 2.3.0 (current stable)

### Secondary (MEDIUM confidence)
- Package import analysis: passport, passport-local, memorystore, openid-client, @uppy/* confirmed unused by grep across all .ts and .tsx files — zero imports found
- moment confirmed used in 4 client .tsx files
- openai confirmed unused (zero imports) but kept per explicit decision

### Tertiary (LOW confidence)
- ACL database table design is a recommendation; actual table definition must be confirmed during planning
- Gift card theme URL migration strategy — depends on whether existing stored URLs need backward compatibility

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @vercel/blob 2.3.0 confirmed, all packages verified by import analysis
- Architecture: HIGH — Vercel Blob official docs verify all patterns; GCS sidecar replacement is a direct substitution
- Pitfalls: HIGH — All pitfalls tied to specific file locations in this codebase; Vercel Blob pitfalls verified against official docs
- Package audit: HIGH — grep analysis of all .ts and .tsx files; zero false negatives for unused package detection

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days — Vercel Blob API is stable; package versions may update but not breaking)
