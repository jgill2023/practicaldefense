import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with proper settings for Neon serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of connections in the pool
  maxUses: 7500, // Rotate connections after this many uses
  maxLifetimeSeconds: 900, // Close connections after 15 minutes
  idleTimeoutMillis: 60000, // Close idle connections after 1 minute
  allowExitOnIdle: false // Don't exit process when idle
});

// Add error handling for connection drops
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't crash the process, let the pool handle reconnection
});

export const db = drizzle({ client: pool, schema });