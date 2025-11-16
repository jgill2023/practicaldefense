import { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

export function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required for authentication");
  }
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for session storage");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getTokenExpiry(hours: number = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  console.log("Custom email/password authentication setup completed");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session || !session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      session.userId = null;
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in isAuthenticated middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const requireActiveAccount: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.userStatus !== 'active') {
    return res.status(403).json({ 
      message: "Account not active", 
      status: user.userStatus,
      reason: user.statusReason 
    });
  }
  
  next();
};

export const requireInstructorOrHigher: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const allowedRoles = ['instructor', 'admin', 'superadmin'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: "Forbidden: Instructor access required" });
  }
  
  next();
};

export const requireAdminOrHigher: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const allowedRoles = ['admin', 'superadmin'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

export const requireSuperadmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.role !== 'superadmin') {
    return res.status(403).json({ message: "Forbidden: Superadmin access required" });
  }
  
  next();
};

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
