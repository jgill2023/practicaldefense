import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./log";
import { createSeoMiddleware } from "./seoMiddleware";
import { db } from "./db";
import { instructorGoogleCredentials } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function createApp() {
  const app = express();

  // Stripe webhook must receive raw body — MUST be registered before express.json()
  // Note: correct path is /api/online-course/webhook (not /api/webhooks/stripe)
  app.use('/api/online-course/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // SEO middleware for server-side meta tag injection on public routes
  // This runs before Vite's catch-all to inject route-specific SEO metadata
  app.use(createSeoMiddleware());

  // Google Calendar OAuth callback from Central Auth - MUST be before Vite catch-all
  app.get("/auth/callback", async (req, res) => {
    console.log("[Google OAuth Callback] Received callback with query params:", req.query);

    const { instructorId } = req.query;

    if (!instructorId || typeof instructorId !== 'string') {
      console.error("[Google OAuth Callback] Missing or invalid instructorId:", instructorId);
      return res.redirect("/settings?google_error=missing_instructor_id");
    }

    console.log(`[Google OAuth Callback] Processing for instructor: ${instructorId}`);

    try {
      // Check if record exists
      const existing = await db.query.instructorGoogleCredentials.findFirst({
        where: eq(instructorGoogleCredentials.instructorId, instructorId),
      });

      if (existing) {
        // Update existing record - tokens are managed by Central Auth
        console.log(`[Google OAuth Callback] Updating existing record for instructor: ${instructorId}`);
        await db.update(instructorGoogleCredentials)
          .set({
            syncStatus: 'active',
            updatedAt: new Date(),
          })
          .where(eq(instructorGoogleCredentials.instructorId, instructorId));
      } else {
        // Insert placeholder - tokens are managed by Central Auth App
        console.log(`[Google OAuth Callback] Creating new record for instructor: ${instructorId}`);
        await db.insert(instructorGoogleCredentials).values({
          instructorId,
          accessToken: 'managed-by-central-auth',
          refreshToken: 'managed-by-central-auth',
          tokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year placeholder
          syncStatus: 'active',
        });
      }
      console.log(`[Google OAuth Callback] Successfully saved credentials for instructor: ${instructorId}`);
    } catch (error) {
      console.error('[Google OAuth Callback] Error saving credentials:', error);
      return res.redirect("/settings?google_error=save_failed");
    }

    res.redirect("/settings?google_connected=true");
  });

  return app;
}
