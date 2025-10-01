import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await client.discovery(
          new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
          process.env.REPL_ID!
        );
      } catch (error: any) {
        console.warn(`OIDC discovery attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.error("OIDC discovery failed after all retries. Authentication will be unavailable.");
          throw error;
        }
        
        // Exponential backoff: wait longer between retries
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying OIDC discovery in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log("upsertUser called with claims:", claims);
  
  // Validate role against allowlist - only allow student or instructor
  const validRoles = ['student', 'instructor'] as const;
  const claimRole = claims["role"];
  const role = validRoles.includes(claimRole) ? claimRole : 'student';
  
  console.log("upsertUser - claimRole:", claimRole, "validated role:", role);

  // Check if user already exists
  const existingUser = await storage.getUser(claims["sub"]);
  console.log("upsertUser - existingUser:", existingUser);
  
  if (existingUser) {
    // For existing users, update profile info
    // Only update role if explicitly provided in claims, otherwise preserve existing role
    console.log("upsertUser - updating existing user");
    const updateData: any = {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    };
    
    // Only update role if it's explicitly provided in the claims
    if (claimRole && validRoles.includes(claimRole)) {
      updateData.role = role;
    }
    
    await storage.updateUser(claims["sub"], updateData);
  } else {
    // For new users, set the validated role
    console.log("upsertUser - creating new user with data:", {
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: role,
    });
    try {
      const result = await storage.upsertUser({
        id: claims["sub"],
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
        role: role,
      });
      console.log("upsertUser - created user result:", result);
    } catch (error) {
      console.error("upsertUser - error creating user:", error);
      throw error;
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config: client.Configuration | undefined;
  let authEnabled = false;

  try {
    config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user: any = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    // Get all domains and add localhost for development
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const allDomains = [...domains, "localhost"];
    
    for (const domain of allDomains) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config: config!,
          scope: "openid email profile offline_access",
          callbackURL: domain === "localhost" 
            ? `http://localhost:5000/api/callback`
            : `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    authEnabled = true;
    console.log("Authentication setup completed successfully");
  } catch (error: any) {
    console.error("Authentication setup failed:", error.message);
    console.warn("The app will continue running but authentication features will be unavailable");
  }

  // Always setup passport serialization to prevent crashes
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (!authEnabled) {
      return res.status(503).json({ message: "Authentication service unavailable" });
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!authEnabled) {
      return res.status(503).json({ message: "Authentication service unavailable" });
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    if (!authEnabled || !config) {
      return res.status(503).json({ message: "Authentication service unavailable" });
    }
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config!, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config!, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
