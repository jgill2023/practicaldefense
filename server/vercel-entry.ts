import { createApp } from './app';
import type { Request, Response } from 'express';

// Reuse the same app instance across warm invocations (avoids re-registering routes)
let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
