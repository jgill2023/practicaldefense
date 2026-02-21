# Phase 2: Vercel Adapter - Research

**Researched:** 2026-02-21
**Domain:** Vercel serverless deployment — Express adapter, vercel.json routing, sessions, Stripe webhooks, Blob uploads
**Confidence:** HIGH (core patterns verified against official Vercel docs; caveats flagged where gaps remain)

---

## Summary

Phase 2 wires the existing Express app into Vercel's serverless function pattern. The research confirms this is a well-established pattern: Vercel natively supports Node.js/TypeScript serverless functions in the `api/` directory, and the Express app is exported as the default export of `api/index.ts`. Vercel routes all `/api/*` traffic (and anything not matched by static files) to this function.

The primary complication in this codebase is that `server/index.ts` currently combines Express app setup with `server.listen()`, cron initialization, and startup env validation. These concerns must be extracted into separate files: `server/app.ts` (pure app setup, no listen), and `api/index.ts` (import and re-export the app). The `server/index.ts` keeps `listen()` and cron init for local dev, and the startup env validation block must NOT live in `server/app.ts` (it would run inside the serverless function on every cold start, calling `process.exit(1)` — invalid in serverless).

The key implementation risks are:
1. **Bundle size**: `googleapis` alone is 184MB uncompressed. Vercel's limit is 250MB unzipped. The current `esbuild --packages=external` build does NOT bundle node_modules — Vercel uses NFT (node file trace) to include only what's imported. Since `googleapis` is imported at module level in `calendarService.ts` and `cronService.ts`, it WILL be included. This is the #1 risk for first deploy.
2. **Raw body for Stripe**: The current setup applies `express.raw()` to `/api/webhooks/stripe`, but the actual webhook endpoint in `routes.ts` is `/api/online-course/webhook`. The raw body middleware path does not match the actual webhook route — this is a pre-existing bug that must be fixed.
3. **node-cron**: Does not work in serverless — each invocation is stateless and short-lived. The `cronService.initialize()` call in the current `server/index.ts` must NOT appear in `api/index.ts`. Phase 3 handles replacement; Phase 2 must simply exclude it from the serverless entry point.
4. **Sessions**: Already configured correctly with `trust proxy 1`. The cookie `sameSite: 'lax'` and `secure: process.env.NODE_ENV === 'production'` are correct for Vercel.

**Primary recommendation:** Extract `server/app.ts`, create `api/index.ts` as a pure re-export, configure `vercel.json` with explicit `/api/*` and `/auth/*` rewrites to the function and a SPA fallback, set `outputDirectory` to `dist/public`, and test bundle size before celebrating.

---

## Standard Stack

### Core (no new packages required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | ^4.21.2 (existing) | HTTP server framework | Already in use; Vercel supports Express as serverless default export |
| `@vercel/blob` | ^2.3.0 (existing) | File storage | Already integrated in Phase 1 |
| `express-session` + `connect-pg-simple` | existing | Session store | Already wired; survives serverless via DB-backed store |

### No New Packages Needed
The Vercel adapter pattern requires zero new npm packages. The `api/index.ts` file is a pure TypeScript file that imports and re-exports the Express app. Vercel's Node.js runtime handles it natively.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single Express function adapter | Per-route Vercel functions | Per-route requires refactoring every route into separate files — massive work, no benefit for this app. STATE.md explicitly locked: single function adapter. |
| `vercel.json` rewrites | `routes` (legacy) | `routes` is deprecated; `rewrites` is the current standard and simpler |
| Build from TypeScript source (`api/index.ts`) | Pre-built JS (`dist/api/index.js`) | Vercel builds TypeScript natively via `@vercel/node` — no pre-build step needed for `api/` |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure (After Phase 2)

```
project root/
├── api/
│   └── index.ts          # Vercel serverless entry — imports app from server/app.ts, exports default
├── server/
│   ├── app.ts            # NEW: Express app setup (no listen, no cron, no process.exit)
│   ├── index.ts          # LOCAL DEV: imports app, calls server.listen() + cronService.initialize()
│   ├── routes.ts         # (unchanged)
│   ├── customAuth.ts     # (unchanged — trust proxy already set)
│   └── ...
├── client/               # React frontend
├── dist/
│   └── public/           # Vite build output (served as CDN static files by Vercel)
└── vercel.json           # NEW: routing configuration
```

### Pattern 1: Express App Extraction (VRCL-02)

**What:** Separate the Express app creation from the HTTP server listen call.

**When to use:** Required — Vercel's serverless runtime cannot call `server.listen()`. It calls the exported handler directly.

**Current state of `server/index.ts`:**
- Lines 13-27: Startup env var validation with `process.exit(1)` — MUST stay in `server/index.ts` (local dev), NOT in `server/app.ts`
- Lines 29-64: Express app creation, middleware registration — goes into `server/app.ts`
- Lines 66-153: Async IIFE with `registerRoutes`, error handler, SEO middleware, Google OAuth callback, Vite setup, `server.listen()` — the listen/cron stay in `server/index.ts`

```typescript
// server/app.ts (NEW)
import express from "express";
import { registerRoutes } from "./routes";
import { createSeoMiddleware } from "./seoMiddleware";
import { db } from "./db";
// ... other imports

export async function createApp() {
  const app = express();

  // Raw body for Stripe webhooks BEFORE json middleware
  app.use('/api/online-course/webhook', express.raw({ type: 'application/json' }));
  // (fix: path must match actual webhook route)

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(/* logging middleware */);

  await registerRoutes(app);

  app.use(/* error handler */);
  app.use(createSeoMiddleware());
  app.get("/auth/callback", /* Google OAuth callback */);

  return app;
}
```

```typescript
// api/index.ts (NEW — VRCL-01)
import { createApp } from '../server/app';

// Vercel calls this as the serverless handler
let appPromise: Promise<ReturnType<typeof createApp>> | null = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  app(req, res);
}
```

**Source:** [Vercel Express guide](https://vercel.com/kb/guide/using-express-with-vercel), verified against Vercel docs

**Alternative simpler pattern (if createApp is synchronous):**
```typescript
// api/index.ts — simpler version
import app from '../server/app';
export default app;
```

**Note on startup validation:** The `process.exit(1)` env var check in `server/index.ts` MUST NOT appear in `server/app.ts` or `api/index.ts`. In serverless, `process.exit(1)` would crash the function permanently. Instead, throw an Error that Express catches and returns 500. Vercel will show it in function logs.

### Pattern 2: vercel.json Routing (VRCL-03)

**What:** Route `/api/*` and `/auth/*` to the Express serverless function; serve static files from CDN; SPA fallback for everything else.

**Verified behavior (from official Vercel docs):** Rewrites are applied AFTER the filesystem check. If a file exists at the requested path, it's served directly (no rewrite). The SPA fallback rewrite `"/(.*)"` → `/index.html` only fires for paths that don't match a real file.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.ts" },
    { "source": "/auth/:path*", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Key points:**
- `outputDirectory: "dist/public"` — tells Vercel where Vite puts static assets (matches current `vite.config.ts` `build.outDir`)
- `buildCommand: "vite build"` — runs only the frontend build; the `api/` folder is compiled by Vercel's own TypeScript runtime, NOT by esbuild
- The `functions` section is used to set `maxDuration` (default is 10s; 30s is safer for DB-heavy operations; max is 300s for Hobby/Pro with fluid compute enabled)
- Routes without `/api/` or `/auth/` prefix that don't match a static file fall through to `/index.html` (React Router handles client-side routing)

**Source:** [Vercel project-configuration/vercel-json](https://vercel.com/docs/project-configuration/vercel-json), [Vercel rewrites](https://vercel.com/docs/rewrites)

### Pattern 3: Static Asset Output for CDN (VRCL-04)

**Current vite.config.ts already sets:**
```typescript
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
}
```

This is correct. Vercel's `outputDirectory: "dist/public"` in `vercel.json` tells Vercel to serve files from this directory as CDN-hosted static assets. No Vite config changes needed for the CDN serving.

**Note on `buildCommand`:** The current `package.json` `build` script is:
```
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```
On Vercel, this esbuild step is unnecessary and potentially harmful (the `server/index.ts` listener shouldn't run in serverless). Set `buildCommand: "vite build"` in vercel.json to use ONLY the Vite build for Vercel. The `api/index.ts` is compiled by Vercel's TypeScript runtime automatically.

### Pattern 4: Session Cookie Configuration for Vercel Proxy (VRCL-07)

**Current `customAuth.ts` already has `app.set("trust proxy", 1)` — this is correct.**

```typescript
// Existing — correct for Vercel
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);  // CORRECT: tells Express to trust X-Forwarded-Proto from Vercel proxy
  app.use(getSession());
}

// Existing cookie config — correct
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",  // true in prod = HTTPS cookie
  maxAge: sessionTtl,
  sameSite: 'lax',  // 'lax' is correct for same-site auth flows
}
```

**No changes required** to session configuration. `trust proxy 1` makes Express trust the `X-Forwarded-Proto: https` header from Vercel's load balancer, which causes `secure: process.env.NODE_ENV === 'production'` to correctly mark cookies as Secure on HTTPS.

**Source:** [express-session GitHub issue #251](https://github.com/expressjs/session/issues/251), [Vercel trust proxy discussion](https://github.com/vercel/vercel/discussions/3993)

### Pattern 5: Stripe Webhook Raw Body (VRCL-06)

**Current bug (must fix):**
- `server/index.ts` line 31: `app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));`
- Actual webhook route in `routes.ts` line ~9834: `app.post('/api/online-course/webhook', ...)`
- These paths do NOT match — the raw body middleware is registered on a path with no route handler

**Fix:** In `server/app.ts`, register `express.raw()` on the correct path:
```typescript
// Must be registered BEFORE express.json()
app.use('/api/online-course/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
```

The `stripe.webhooks.constructEvent(req.body, sig, webhookSecret)` call in `routes.ts` line 9849 requires `req.body` to be the raw Buffer (not parsed JSON). With `express.raw()` on the correct path, `req.body` will be a Buffer. With `express.json()` applied first, it would be a parsed object — causing signature verification failure.

**Vercel does NOT automatically parse body** for Express functions — Express's own middleware controls this. The existing Express-level middleware ordering is the correct approach.

**Source:** [Stripe signature verification docs](https://docs.stripe.com/webhooks/signature), [Vercel raw body guide](https://vercel.com/guides/how-do-i-get-the-raw-body-of-a-serverless-function)

### Anti-Patterns to Avoid

- **`server.listen()` in `api/index.ts`**: Vercel calls the exported handler directly; `listen()` causes undefined behavior and port conflicts.
- **`process.exit(1)` in `server/app.ts`**: In serverless, this crashes the function permanently. Throw an Error instead.
- **`cronService.initialize()` in `api/index.ts`**: `node-cron` schedules in-process timers. Serverless functions are ephemeral — the timer never fires. Include cron init ONLY in `server/index.ts` for local dev. Phase 3 handles proper Vercel cron replacement.
- **`esbuild` pre-building `api/index.ts`**: Vercel compiles TypeScript in `api/` itself. Don't esbuild it.
- **Using `dist/index.js` as the Vercel entry point**: This is the esbuild output for local prod mode. Vercel should use `api/index.ts` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript compilation in `api/` | Custom esbuild pipeline | Vercel's built-in `@vercel/node` runtime | Vercel auto-compiles TS in the `api/` directory |
| Session persistence across serverless invocations | In-memory store | `connect-pg-simple` (already in use) | In-memory sessions reset on every cold start |
| Stripe webhook signature verification | Manual HMAC | `stripe.webhooks.constructEvent()` (already in use) | Handles timing attacks, encoding edge cases |
| SPA routing fallback | Custom 404 handler | `vercel.json` rewrites | Vercel handles this at CDN level |

**Key insight:** Vercel handles the TypeScript compilation, CDN distribution, and function routing transparently. The adapter is thin — it's mostly a file creation and configuration exercise, not new logic.

---

## Common Pitfalls

### Pitfall 1: Bundle Size Exceeding 250MB Limit

**What goes wrong:** First deploy fails with "Serverless Function has exceeded the unzipped maximum size of 250 MB."

**Why it happens:** Vercel uses Node File Trace (NFT) to statically analyze imports and include the transitive closure of required modules. `googleapis` alone is 184MB uncompressed; `exceljs` is 22MB; `twilio` is 13MB; `pdfkit` is 6MB. Combined with Express and other dependencies, this likely exceeds 250MB.

**How to avoid:**
1. Check build logs immediately after first deploy — Vercel shows per-function sizes
2. **Fallback plan (lazy imports):** `googleapis` is imported at module-level in `calendarService.ts` and `cronService.ts`. Convert to dynamic imports if size is exceeded:
   ```typescript
   // Instead of: import { google } from 'googleapis';
   // Use inside the function:
   const { google } = await import('googleapis');
   ```
3. Use `excludeFiles` in `vercel.json` functions config to exclude specific node_modules paths
4. Note: `exceljs` and `googleapis` in `routes.ts` are ALREADY dynamic imports (`await import('exceljs')`) — these are fine
5. `pdfkit` is a static import in `giftCards/delivery.ts` — if bundle exceeds limit, convert to dynamic

**Warning signs:** Build log shows function size > 200MB; deploy fails with size error.

**Source:** [Vercel 250MB limit guide](https://vercel.com/guides/troubleshooting-function-250mb-limit), [Vercel function limits](https://vercel.com/docs/functions/limitations)

### Pitfall 2: Stripe Raw Body Path Mismatch

**What goes wrong:** Stripe webhook events fail signature verification with "No signatures found matching the expected signature for payload."

**Why it happens:** `express.raw()` middleware is currently registered on `/api/webhooks/stripe` but the actual webhook route is at `/api/online-course/webhook`. By the time the webhook route runs, `express.json()` has already parsed the body into an object — destroying the raw bytes Stripe needs for signature verification.

**How to avoid:** In `server/app.ts`, register `express.raw()` on `/api/online-course/webhook` BEFORE `express.json()`.

**Warning signs:** Webhook endpoint returns 400 with "Webhook Error: No signatures found..."

### Pitfall 3: `process.exit(1)` in Serverless Context

**What goes wrong:** The serverless function crashes permanently (502 Bad Gateway) on every request if an env var is missing, because `process.exit(1)` terminates the Node.js process — which in serverless terminates the function instance.

**Why it happens:** The startup validation block currently in `server/index.ts` calls `process.exit(1)`. If this code is accidentally included in `server/app.ts` (which IS called from `api/index.ts`), every cold start will crash.

**How to avoid:** Keep the `process.exit(1)` validation ONLY in `server/index.ts`. In `server/app.ts`, throw an Error if env vars are missing — Express's error handler will catch it and return 500.

**Warning signs:** All function invocations return 502; no logs from application code visible.

### Pitfall 4: Vite `server/vite.ts` Import in Serverless Context

**What goes wrong:** `serveStatic()` from `server/vite.ts` tries to read the `dist/public` directory from the filesystem. In serverless, the filesystem is read-only and the `dist/` directory does not exist — Vercel serves static files from CDN, not through the Express process.

**Why it happens:** `server/index.ts` currently calls `serveStatic(app)` in production mode. `api/index.ts` must NOT call this.

**How to avoid:** `server/app.ts` should NOT call `setupVite` or `serveStatic`. Static files are served by Vercel's CDN; Express only handles API routes. Only register routes and middleware — not static file serving.

**Warning signs:** Function startup errors about missing `dist/public` directory.

### Pitfall 5: Database Connection on Hobby Plan

**What goes wrong:** Too many open PostgreSQL connections causing "too many connections" errors under load.

**Why it happens:** Serverless functions can have many concurrent instances. Each instance creates its own connection to Neon. Without PgBouncer, this exhausts Neon's connection limit.

**How to avoid:**
- Use the **pooled** Neon connection string (contains `-pooler` in the endpoint hostname) for the serverless function's `DATABASE_URL`
- Use the **direct** (non-pooled) connection string for `drizzle-kit push` migrations — pooled connections don't support SET statements that Drizzle migrations rely on
- Set both as separate env vars: `DATABASE_URL` (pooled, for runtime), `DATABASE_URL_DIRECT` (direct, for migrations only)

**Neon pooled URL format:**
```
postgresql://user:pass@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/dbname
```
Note the `-pooler` suffix on the hostname.

**Source:** [Neon connection pooling docs](https://neon.com/docs/connect/connection-pooling)

### Pitfall 6: node-cron in Serverless

**What goes wrong:** Calendar watch renewal never fires; no error is thrown, but the cron job silently does nothing.

**Why it happens:** `node-cron` uses `setInterval` under the hood. Serverless functions are invoked for a single HTTP request and then suspended/terminated. The timer never gets a chance to fire.

**How to avoid:** Do NOT call `cronService.initialize()` from `api/index.ts`. This is acceptable for Phase 2 — the calendar watch renewal was running on Replit anyway (which is being replaced). Phase 3 implements Vercel cron jobs as the replacement.

**Vercel cron limits to know for planning Phase 3:**
- Hobby: max once per day, ±59 min precision
- Pro: up to once per minute, per-minute precision
- Both: 100 cron jobs max per project

### Pitfall 7: VITE_* Env Vars Available at Build Time Only

**What goes wrong:** `VITE_STRIPE_PUBLIC_KEY` is undefined in the deployed React app.

**Why it happens:** Vite env vars prefixed with `VITE_` are inlined at build time. If `VITE_STRIPE_PUBLIC_KEY` is not set as a Vercel environment variable during the build step, it becomes `undefined` in the compiled frontend bundle.

**How to avoid:** Add `VITE_STRIPE_PUBLIC_KEY` to Vercel project env vars with scope "Production" (and "Preview" if desired). Vercel exposes it during the `vite build` step.

**Source:** [Vite env vars docs](https://vite.dev/guide/env-and-mode)

---

## Code Examples

### api/index.ts — Vercel Serverless Entry Point

```typescript
// api/index.ts
// Source: Vercel Express adapter pattern (vercel.com/kb/guide/using-express-with-vercel)
import { createApp } from '../server/app';
import type { IncomingMessage, ServerResponse } from 'http';

// Reuse the same app instance across warm invocations (connection pooling)
let appPromise: Promise<Express.Application> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
```

### server/app.ts — Express App Factory

```typescript
// server/app.ts (extracted from server/index.ts)
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createSeoMiddleware } from "./seoMiddleware";
// ... other imports (no cronService, no process.exit, no setupVite/serveStatic)

export async function createApp() {
  const app = express();

  // Raw body MUST come before express.json()
  // Path must match the actual webhook route in routes.ts
  app.use('/api/online-course/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ... logging middleware ...

  await registerRoutes(app);  // includes setupAuth() which sets trust proxy

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  app.use(createSeoMiddleware());

  // Google OAuth callback
  app.get("/auth/callback", async (req, res) => { /* ... */ });

  return app;
}
```

### vercel.json — Complete Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "functions": {
    "api/index.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.ts" },
    { "source": "/auth/:path*", "destination": "/api/index.ts" },
    { "source": "/sitemap.xml", "destination": "/api/index.ts" },
    { "source": "/robots.txt", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Note on `sitemap.xml` and `robots.txt`:** These are generated dynamically by the Express server (`routes.ts` lines 42-56). They must route to the Express function, not be served as static files. Include them as explicit rewrites before the catch-all.

**Note on `maxDuration`:** Default is 10s. With DB queries and external API calls, 30s is safer. Pro plan allows up to 800s. Hobby allows up to 300s (with fluid compute). The concern in STATE.md about "cron job may exceed 60s" referred to an outdated limit — current Hobby limit is 300s for functions and once-per-day for cron frequency.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `builds` + `@vercel/node` builder in vercel.json | `functions` config + auto-detected TypeScript | ~2022 | `builds` is legacy/deprecated; use `functions` |
| `routes` array in vercel.json | `rewrites`, `redirects`, `headers` | ~2022 | `routes` is deprecated; use `rewrites` |
| `version: 2` field in vercel.json | Field deprecated, ignored | 2023 | Don't include `version` in vercel.json |
| Hobby plan: 60s function limit | 300s with fluid compute (default for new projects) | 2024-2025 | Old STATE.md concern about 60s is outdated |
| Hobby plan: 2 cron jobs/day | 100 cron jobs/project, but Hobby still limited to once-per-day frequency | 2025 | Frequency limit matters more than count for this app |

**Deprecated/outdated:**
- `"version": 2` in vercel.json: deprecated, no longer needed
- `"builds"` array: deprecated, use `"functions"` instead
- `"routes"` array: deprecated, use `"rewrites"` / `"redirects"` / `"headers"`

---

## Open Questions

### 1. Bundle Size — Will first deploy succeed?

**What we know:** `googleapis` is 184MB uncompressed, imported at the top of `calendarService.ts` and `cronService.ts`. Vercel uses NFT to trace all static imports and bundles them into the function. The 250MB limit applies to the unzipped function bundle.

**What's unclear:** Whether NFT will include the full googleapis package or only the specific modules used. googleapis has many sub-packages; NFT may only include what's actually imported.

**Recommendation:** Run first deploy and check build logs. If > 250MB: convert `calendarService.ts` and `cronService.ts` to lazy-import googleapis (`const { google } = await import('googleapis')`). NFT typically handles dynamic imports differently — it may not statically trace them into the bundle.

### 2. Which Stripe webhook paths need raw body?

**What we know:** `server/index.ts` line 31 registers `express.raw()` on `/api/webhooks/stripe`. `routes.ts` line 9834 has the webhook endpoint at `/api/online-course/webhook`. These do NOT match.

**What's unclear:** Are there additional webhook endpoints we missed? Is `/api/webhooks/stripe` an unreachable dead path?

**Recommendation:** Grep for all `constructEvent` calls and `stripe-signature` header reads in the entire server directory, then register `express.raw()` on each matching path in `server/app.ts`.

### 3. `store/routes.ts` calls `await getStripeClient()`

**What we know:** Phase 1 made `getStripeClient()` synchronous (no `async`). But `server/store/routes.ts` line 31 still calls `await getStripeClient()` inside an async helper. The `await` on a non-Promise value is legal TypeScript (returns the value directly) — but it was written expecting an async function.

**What's unclear:** Whether this causes any runtime issues.

**Recommendation:** During `server/app.ts` extraction, do not change this. It's functionally harmless (`await nonPromise` == `nonPromise`). Flag it for cleanup in a future pass.

### 4. `server/vite.ts` import of `nanoid`

**What we know:** `server/vite.ts` imports `nanoid` (`from 'nanoid'`). This package is not listed in `package.json` as a dependency.

**What's unclear:** Whether this causes a build error on Vercel (which runs `npm install` from `package.json`).

**Recommendation:** `nanoid` might be a transitive dependency of Vite. Since `server/vite.ts` is NOT imported by `api/index.ts` or `server/app.ts` (it's only used in `server/index.ts` for local dev), it should not be included in the serverless bundle. No action needed for this phase.

### 5. File upload size limit

**What we know:** Multer is configured with `fileSize: 15 * 1024 * 1024` (15MB). Vercel has a 4.5MB request body size limit for serverless functions.

**What's unclear:** Does this mean all file uploads > 4.5MB will fail? The success criterion for STOR-03 says "file upload completes and signed URL is accessible."

**Recommendation:** During STOR-03 testing, test with small files (< 4.5MB). For larger uploads, the Vercel Blob client upload pattern (upload directly to Blob from browser, bypassing the serverless function) is the correct solution. This may require a follow-up phase or a note to lower the 15MB multer limit to 4MB for the serverless deployment. The `@vercel/blob` client upload flow exists and would solve this, but it's out of scope for Phase 2.

---

## Sources

### Primary (HIGH confidence)
- [vercel.com/docs/project-configuration/vercel-json](https://vercel.com/docs/project-configuration/vercel-json) — complete vercel.json schema reference
- [vercel.com/docs/rewrites](https://vercel.com/docs/rewrites) — rewrite rules behavior and ordering
- [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) — size limits (250MB), duration limits (300s Hobby/Pro), body size (4.5MB)
- [vercel.com/docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby: once per day, 100 cron jobs max
- [vercel.com/docs/builds/configure-a-build](https://vercel.com/docs/builds/configure-a-build) — buildCommand, outputDirectory behavior
- [vercel.com/docs/vercel-blob/server-upload](https://vercel.com/docs/vercel-blob/server-upload) — 4.5MB limit for server-side uploads
- [neon.com/docs/connect/connection-pooling](https://neon.com/docs/connect/connection-pooling) — pooled vs direct connection strings

### Secondary (MEDIUM confidence)
- [vercel.com/kb/guide/using-express-with-vercel](https://vercel.com/kb/guide/using-express-with-vercel) — Express adapter pattern confirmed by official KB
- [vercel.com/guides/how-do-i-get-the-raw-body-of-a-serverless-function](https://vercel.com/guides/how-do-i-get-the-raw-body-of-a-serverless-function) — raw body for webhooks
- [vercel.com/guides/troubleshooting-function-250mb-limit](https://vercel.com/guides/troubleshooting-function-250mb-limit) — bundle size debugging
- [docs.stripe.com/webhooks/signature](https://docs.stripe.com/webhooks/signature) — Stripe webhook signature requirements
- [github.com/vercel/vercel/discussions/3993](https://github.com/vercel/vercel/discussions/3993) — trust proxy + secure cookies on Vercel

### Tertiary (LOW confidence — verify before acting)
- WebSearch results on express-session + Vercel: confirmed `trust proxy 1` + `sameSite: 'lax'` is correct; already implemented in codebase
- WebSearch results on node-cron not working in serverless: consistent with known serverless behavior (no persistent process); treat as confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Vercel docs; no new packages required
- Architecture patterns: HIGH — official Vercel KB confirms the Express adapter pattern; `vercel.json` schema verified from official docs
- Pitfalls: HIGH for bundle size limit (official docs), raw body mismatch (code inspection), process.exit behavior (serverless fundamentals); MEDIUM for session details (code inspection + community verification)
- Cron behavior: HIGH — official Vercel cron docs; Hobby daily-only limit is documented fact

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Vercel docs are stable; check limits page if deploying after this date)
