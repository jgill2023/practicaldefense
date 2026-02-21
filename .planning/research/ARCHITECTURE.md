# Architecture Research: Express-to-Vercel Migration

**Research Date:** 2026-02-20
**Dimension:** Architecture
**Question:** How should this monolithic Express/React app be restructured for Vercel deployment?

---

## Current Architecture (Replit)

The app is a unified Express process:

```
server/index.ts
  ├── Creates Express app
  ├── Registers raw body middleware for Stripe webhooks
  ├── Registers JSON/urlencoded middleware
  ├── Calls registerRoutes(app) → server/routes.ts
  │     ├── setupAuth(app)         → mounts express-session with PG store
  │     ├── app.use('/api/auth', authRouter)
  │     ├── app.use('/api/appointments', appointmentRouter)
  │     ├── app.use('/api/store', storeRouter)
  │     ├── app.use('/api/gift-cards', giftCardRouter)
  │     ├── app.use('/api/calendar', calendarRouter)
  │     ├── app.use('/api/stripe-connect', stripeConnectRouter)
  │     └── ~9,900 lines of inline route handlers
  ├── Mounts SEO middleware
  ├── In dev: Vite dev server (hot reload)
  └── In prod: serveStatic (serves dist/public)
```

A single long-lived Node.js process handles everything: API requests, static file serving, session middleware, cron jobs, and WebSocket connections. This model is incompatible with Vercel's serverless architecture.

---

## Target Architecture (Vercel)

Vercel splits the monolith into two distinct deployment targets:

1. **Static frontend** — Vite builds `client/` into `dist/public/`; Vercel hosts it on its CDN. No server process needed.
2. **Serverless API functions** — Each request to `/api/*` spins up an isolated Node.js Lambda. No persistent process, no shared memory between calls.

### Target Directory Structure

```
practicaldefense/
├── api/                             # Vercel serverless functions
│   ├── _lib/                        # Shared code (NOT exposed as routes)
│   │   ├── db.ts                    # Database connection (copied/symlinked from server/db.ts)
│   │   ├── auth.ts                  # Auth middleware (isAuthenticated, requireRole, etc.)
│   │   ├── session.ts               # Session configuration (iron-session or connect-pg-simple)
│   │   └── stripe.ts                # Stripe client factory
│   ├── auth/
│   │   ├── login.ts                 # POST /api/auth/login
│   │   ├── logout.ts                # POST /api/auth/logout
│   │   ├── signup.ts                # POST /api/auth/signup
│   │   ├── user.ts                  # GET /api/auth/user
│   │   ├── verify-email.ts          # POST /api/auth/verify-email
│   │   ├── request-reset.ts         # POST /api/auth/request-reset
│   │   └── reset-password.ts        # POST /api/auth/reset-password
│   ├── appointments/
│   │   └── [...path].ts             # Catches all /api/appointments/* routes
│   ├── calendar/
│   │   └── [...path].ts
│   ├── store/
│   │   └── [...path].ts
│   ├── gift-cards/
│   │   └── [...path].ts
│   ├── stripe-connect/
│   │   └── [...path].ts
│   ├── webhooks/
│   │   └── stripe.ts                # POST /api/webhooks/stripe (raw body)
│   └── [...path].ts                 # Catch-all for remaining /api/* routes from routes.ts
├── client/                          # React frontend (unchanged)
├── server/                          # Legacy Express code (kept for reference/dev)
├── shared/                          # Shared types (unchanged)
├── vercel.json                      # Vercel project configuration
└── package.json
```

**Note on routing granularity:** Vercel supports two patterns. Files map 1:1 to routes (e.g., `api/auth/login.ts` → `POST /api/auth/login`), or catch-all handlers (`api/auth/[...path].ts`) that re-use your existing Express Router. The catch-all approach lets you migrate feature-by-feature rather than endpoint-by-endpoint — start with the big catch-all and extract individual files as needed.

### vercel.json Configuration

```json
{
  "version": 2,
  "buildCommand": "vite build",
  "outputDirectory": "dist/public",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    },
    "api/webhooks/stripe.ts": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

The catch-all rewrite for non-API routes sends everything to `index.html`, enabling client-side routing via Wouter.

---

## Shared Code Strategy

This is the central challenge of moving from a monolith. The current code has deep shared dependencies: every route file imports from `server/db.ts`, `server/storage.ts`, `server/customAuth.ts`, and `@shared/schema`.

### What to Move Where

| Current file | Target location | Notes |
|---|---|---|
| `server/db.ts` | `api/_lib/db.ts` | Already uses `@neondatabase/serverless` — serverless-compatible |
| `server/customAuth.ts` | `api/_lib/auth.ts` | Strip `express-session` setup; keep middleware functions |
| `server/storage.ts` | `api/_lib/storage.ts` | No changes needed — pure DB calls |
| `server/stripeClient.ts` | `api/_lib/stripe.ts` | Remove Replit fallback; env var only |
| `server/emailService.ts` | `api/_lib/emailService.ts` | No changes needed |
| `server/smsService.ts` | `api/_lib/smsService.ts` | No changes needed |
| `shared/schema.ts` | `shared/schema.ts` | No changes — already shared |
| `shared/money.ts` | `shared/money.ts` | No changes |

### Shared Code Import Pattern

Each serverless function imports directly from `api/_lib/`:

```typescript
// api/auth/login.ts
import { db } from '../_lib/db';
import { getSession } from '../_lib/session';
import { hashPassword, verifyPassword } from '../_lib/auth';
```

Do NOT use TypeScript path aliases (`@shared`, `@`) in `api/` functions unless you configure `tsconfig.json` paths and Vercel's build to resolve them. The safest approach is relative imports within `api/` and keeping `@shared` only for code under `client/` and `shared/`.

---

## Session Management in Serverless

This is the most significant architectural change required.

### Current Setup (Incompatible)

`express-session` with `connect-pg-simple` stores session state in a PostgreSQL `sessions` table. The middleware reads/writes the session cookie on every request. This works fine on a persistent server, but has one critical serverless problem: **each function invocation is stateless, and cold starts recreate the entire middleware chain**. However, the session *data itself* is in PostgreSQL, so the actual state is already externalized — the middleware pattern just needs adaptation.

### Recommended Solution: iron-session

`iron-session` is a stateless, cryptographically-sealed session stored entirely in a cookie (similar to JWT but with a simpler API). It has zero server-side storage, is framework-agnostic, and works identically across all serverless function invocations.

**Install:**
```bash
npm install iron-session
```

**Session helper (`api/_lib/session.ts`):**
```typescript
import { getIronSession, IronSession } from 'iron-session';
import type { IncomingMessage, ServerResponse } from 'http';

export interface SessionData {
  userId: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,  // must be 32+ chars
  cookieName: 'pd_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,  // 7 days, in seconds (iron-session uses seconds)
  },
};

export async function getSession(
  req: IncomingMessage,
  res: ServerResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}
```

**Usage in a serverless function:**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_lib/session';
import { db } from '../_lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.user = user;
  // continue...
}
```

**Tradeoff:** Cookie payload is limited (~4KB). The current session only stores `userId` (a UUID string), so this is not a concern. If you ever need to store larger data in the session, you'll hit this limit.

**Alternative: express-session with connect-pg-simple (keep existing approach)**

Since `connect-pg-simple` stores session data in PostgreSQL (which is already external), you can keep the existing session mechanism by wrapping it in a helper that creates the session middleware on every request. This avoids any session migration:

```typescript
// api/_lib/session.ts
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PgSession = connectPg(session);

export function createSessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET!,
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: 'sessions',
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  });
}
```

You'd then run this middleware manually in each handler using a promisify wrapper. This works but is more boilerplate. **iron-session is the cleaner choice** for a greenfield migration.

---

## Stripe Webhooks (Raw Body in Serverless)

Stripe webhook signature validation requires the raw, unparsed request body. Express solved this with `express.raw()` middleware applied before `express.json()`. In Vercel serverless functions, you disable body parsing at the function level.

### Configuration in vercel.json

```json
{
  "functions": {
    "api/webhooks/stripe.ts": {
      "maxDuration": 10
    }
  }
}
```

### Disabling Body Parsing in the Function

```typescript
// api/webhooks/stripe.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

// Disable Vercel's automatic body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Handle event types...
  switch (event.type) {
    case 'payment_intent.succeeded':
      // ...
      break;
  }

  res.json({ received: true });
}
```

The same pattern applies to `api/stripe-connect/webhook.ts`.

---

## Cron Jobs (node-cron Replacement)

`node-cron` requires a persistent process running continuously. Vercel has no persistent processes — functions only run during HTTP requests.

### Replacement: Vercel Cron Jobs

Vercel supports cron jobs natively (available on Hobby plan and above). Define them in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-maintenance",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Note: Vercel cron schedules are in UTC. The current cron runs at midnight America/Denver (UTC-7 in winter, UTC-6 in summer). Use `0 7 * * *` for UTC-7 offset (7 AM UTC = midnight Mountain Standard Time), and adjust seasonally or use `0 6 * * *` for MDT.

The cron endpoint is a standard serverless function:

```typescript
// api/cron/daily-maintenance.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cronService } from '../../server/services/cronService';  // or refactored version

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify the request comes from Vercel's cron infrastructure
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  await cronService.runDailyMaintenance();
  res.json({ success: true });
}
```

Add `CRON_SECRET` to Vercel environment variables. The `CronService` class itself doesn't need changes — only the scheduler wrapper changes.

**Limitation:** Vercel Hobby plan has a 60-second function timeout. The daily maintenance job (renewing all Google Calendar watches) iterates over all instructors with 500ms delays. If this exceeds 60 seconds, upgrade to Pro (300-second timeout) or paginate the work across multiple invocations.

---

## WebSocket Connections (ws Library)

The `ws` package is used in two places:

1. **`server/db.ts`** — `neonConfig.webSocketConstructor = ws` enables Neon's serverless WebSocket transport. This is already serverless-safe and requires no change.
2. **Real-time features** — The `ws` dependency is listed but actual WebSocket server setup is not visible in the reviewed files. If the app creates a `WebSocket.Server` instance, that is incompatible with Vercel serverless.

### WebSocket Assessment

Vercel serverless functions do not support long-lived WebSocket connections (functions terminate after the response is sent). If WebSocket push features exist, the options are:

- **Vercel Edge Runtime** — Supports streaming responses and some WebSocket use cases, but limited Node.js API surface.
- **Pusher or Ably** — External managed WebSocket service. Client subscribes to a channel; server pushes via REST API.
- **Server-Sent Events (SSE)** — One-way server push via HTTP. Works in standard serverless functions. Suitable for notification delivery.
- **Polling** — If real-time latency requirements are low, polling is the simplest migration path.

The Neon WebSocket usage in `db.ts` is unaffected and requires no change.

---

## Build Pipeline Changes

### Current Build (Replit)

```
npm run build
  → vite build            (client/ → dist/public/)
  → esbuild server/index.ts (server → dist/index.js)
npm start
  → node dist/index.js   (runs both API + static serving)
```

### Target Build (Vercel)

Vercel handles the build automatically. The key insight is that **you no longer build the server**. Vercel compiles `api/*.ts` functions on-demand during deployment.

```
vercel build (or push to git)
  → vite build            (client/ → dist/public/) — static CDN deployment
  → Vercel compiles api/*.ts functions individually at deployment time
```

**Changes to `package.json`:**

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  }
}
```

Remove the esbuild step from `build`. Remove the `start` script (Vercel doesn't use it).

**Changes to `vite.config.ts`:**

Remove Replit-specific plugins:

```typescript
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
});
```

Remove: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, and the `REPL_ID` conditional.

**Remove from dependencies:**
- `stripe-replit-sync` — replaced by `STRIPE_SECRET_KEY` env var
- `@replit/vite-plugin-runtime-error-modal` — dev tooling, Replit-specific
- `@replit/vite-plugin-cartographer` — dev tooling, Replit-specific

---

## Replit Dependencies to Remove

| Dependency | Where Used | Replacement |
|---|---|---|
| `stripe-replit-sync` | `server/stripeClient.ts` (fallback) | `STRIPE_SECRET_KEY` env var (already first priority) |
| `REPLIT_CONNECTORS_HOSTNAME` env var | `server/stripeClient.ts` | Remove the `getCredentialsFromReplit()` function entirely |
| `REPL_IDENTITY` / `WEB_REPL_RENEWAL` env vars | `server/stripeClient.ts` | Remove |
| `REPLIT_DEPLOYMENT` env var | `server/stripeClient.ts` | Use `NODE_ENV=production` |
| Google Cloud Storage sidecar (`127.0.0.1:1106`) | `server/objectStorage.ts` | Direct GCS credentials via `GOOGLE_APPLICATION_CREDENTIALS` or JSON key env var |
| `@replit/vite-plugin-*` | `vite.config.ts` | Remove entirely |
| `REPL_ID` env var | `vite.config.ts` (plugin guard) | Remove |

---

## Migration Order

Migrate in this sequence to keep the app working at each step.

### Phase 1: Clean Up Replit Dependencies (No Architecture Change)

Prerequisite: All subsequent phases depend on clean environment config.

1. Add `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLIC_KEY` as direct env vars
2. Remove `getCredentialsFromReplit()` from `server/stripeClient.ts` — simplify to env var only
3. Remove `stripe-replit-sync` from `package.json`
4. Remove Replit plugins from `vite.config.ts`
5. Replace GCS sidecar access in `server/objectStorage.ts` with direct GCS credentials
6. Verify app runs locally without any `REPLIT_*` env vars

### Phase 2: Restructure for Vercel (Architecture Change)

7. Create `vercel.json` with routing rules and build config
8. Create `api/_lib/db.ts` (copy/refactor from `server/db.ts`)
9. Create `api/_lib/session.ts` (iron-session or promisified express-session)
10. Create `api/_lib/auth.ts` (auth middleware functions, adapted to work without `app.use`)
11. Create `api/_lib/stripe.ts` (simplified stripe client, env var only)
12. Migrate `server/auth/routes.ts` → `api/auth/[...path].ts` using catch-all Express Router pattern
13. Migrate `server/appointments/routes.ts` → `api/appointments/[...path].ts`
14. Migrate `server/store/routes.ts` → `api/store/[...path].ts`
15. Migrate `server/giftCards/routes.ts` → `api/gift-cards/[...path].ts`
16. Migrate `server/calendar/routes.ts` → `api/calendar/[...path].ts`
17. Migrate `server/stripeConnect/routes.ts` → `api/stripe-connect/[...path].ts`
18. Migrate Stripe webhooks → `api/webhooks/stripe.ts` and `api/stripe-connect/webhook.ts` (raw body, no session needed)
19. Create catch-all `api/[...path].ts` for remaining inline routes from `server/routes.ts`

### Phase 3: Cron and Long-Running Work

20. Create `api/cron/daily-maintenance.ts` with `CRON_SECRET` guard
21. Add cron schedule to `vercel.json`
22. Remove `node-cron` import from server code
23. Test cron execution via manual HTTP call to `api/cron/daily-maintenance`

### Phase 4: Deploy and Verify

24. Push to Vercel; verify static frontend deploys
25. Test auth login/logout and session persistence
26. Test payment flow end-to-end
27. Verify Stripe webhooks arrive and are processed (update webhook URL in Stripe dashboard)
28. Verify Google Calendar OAuth callback URL is updated
29. Migrate remaining env vars from Replit Secrets to Vercel Environment Variables

---

## Quality Gate Checklist

- [x] Target architecture clearly defined — `api/` folder with serverless functions, static frontend on CDN
- [x] Migration path from current to target is clear — 4-phase sequence above
- [x] Shared code strategy explicit — `api/_lib/` for all shared server-side code
- [x] Build order implications noted — remove esbuild server step, Vite build only, Vercel compiles API functions

---

## Key Risks

**Session migration risk** — Switching from express-session to iron-session will log out all existing users. Since the project has no active users during migration (confirmed in PROJECT.md), this is acceptable. If rollout timing matters, keep connect-pg-simple and adapt it to work without the persistent middleware stack.

**Function timeout on cron** — The `renewAllCalendarWatches` function sleeps 500ms between each instructor. With many instructors, this can exceed Vercel Hobby's 60-second limit. Mitigate by removing the sleep delay (it was added to avoid rate limits, but Google Calendar API is generous) or paginating the job.

**catch-all route size** — `server/routes.ts` is 9,943 lines. Bundling it as a single catch-all serverless function will create a large cold start. Vercel functions have a 250MB unzipped bundle limit and no hard line limit on cold start time, but a 10MB+ bundle will have noticeable cold starts. Consider extracting the highest-traffic routes (auth, enrollment, appointments) into dedicated functions first.

**WebSocket real-time features** — If any real-time push features use `ws` as a server, they will break. Audit `server/routes.ts` for `new WebSocket.Server()` or `wss.on('connection')` before proceeding with Phase 2.

---

*Research produced for the Architecture dimension of the Express-to-Vercel migration. Informs phase structure in the project roadmap.*
