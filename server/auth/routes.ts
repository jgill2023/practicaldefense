import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  getTokenExpiry,
} from "../customAuth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../emailService";
import { authRateLimit } from '../rateLimiting';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

authRouter.post("/signup", authRateLimit, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = signupSchema.parse(req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        isEmailVerified: true,
        role: "student",
        userStatus: "active",
        statusUpdatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: "Account created successfully. You can now log in.",
      userId: newUser.id,
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to create account" });
  }
});

authRouter.post("/verify-email", async (req, res) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.emailVerificationToken, token),
        gt(users.emailVerificationExpiry, new Date())
      ),
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified. Please log in." });
    }

    await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendWelcomeEmail(user.email, user.firstName || "User");

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (error: any) {
    console.error("Email verification error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to verify email" });
  }
});

authRouter.post("/login", authRateLimit, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const session = req.session as any;
    session.userId = user.id;

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        userStatus: user.userStatus,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to log in" });
  }
});

authRouter.post("/request-reset", authRateLimit, async (req, res) => {
  const startTime = Date.now();
  try {
    const { email } = requestResetSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      // Ensure consistent response time to prevent timing attacks
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
      }
      return res.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    const resetToken = generateToken();
    const resetExpiry = getTokenExpiry(1);

    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const emailSent = await sendPasswordResetEmail(email, user.firstName || "User", resetToken);

    if (!emailSent) {
      console.error(`Failed to send password reset email to ${email}`);
      // Still return success message for security (don't reveal if email exists)
    }

    // Ensure consistent response time to prevent timing attacks
    const elapsed = Date.now() - startTime;
    if (elapsed < 500) {
      await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
    }
    res.json({
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  } catch (error: any) {
    console.error("Password reset request error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});

authRouter.post("/reset-password", authRateLimit, async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpiry, new Date())
      ),
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
    
    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  } catch (error: any) {
    console.error("Password reset error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Magic link login (for imported students)
authRouter.get("/magic-login", async (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.redirect("/login?error=invalid-link");
    }

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.magicLinkToken, token),
        gt(users.magicLinkExpiry, new Date())
      ),
    });

    if (!user) {
      return res.redirect("/login?error=expired-link");
    }

    // Clear the magic link token (single-use)
    await db
      .update(users)
      .set({
        magicLinkToken: null,
        magicLinkExpiry: null,
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create session
    const session = req.session as any;
    session.userId = user.id;

    // Redirect to student portal — frontend will detect no password is set
    res.redirect("/student-portal?welcome=true");
  } catch (error: any) {
    console.error("Magic link login error:", error);
    res.redirect("/login?error=server-error");
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// Set password (for magic link users who don't have one yet)
authRouter.post("/set-password", async (req, res) => {
  const session = req.session as any;

  if (!session || !session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const schema = z.object({
      password: z.string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[0-9]/, "Password must contain a number"),
    });

    const { password } = schema.parse(req.body);

    const passwordHashValue = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash: passwordHashValue, updatedAt: new Date() })
      .where(eq(users.id, session.userId));

    res.json({ message: "Password set successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Set password error:", error);
    res.status(500).json({ message: "Failed to set password" });
  }
});

authRouter.get("/user", async (req, res) => {
  const session = req.session as any;
  
  if (!session || !session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      session.userId = null;
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredName: user.preferredName,
      role: user.role,
      userStatus: user.userStatus,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      isEmailVerified: user.isEmailVerified,
      streetAddress: user.streetAddress,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      dateOfBirth: user.dateOfBirth,
      concealedCarryLicenseIssued: user.concealedCarryLicenseIssued,
      concealedCarryLicenseExpiration: user.concealedCarryLicenseExpiration,
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
      preferredContactMethods: user.preferredContactMethods,
      enableLicenseExpirationReminder: user.enableLicenseExpirationReminder,
      enableRefresherReminder: user.enableRefresherReminder,
      smsConsent: user.smsConsent,
      enableSmsNotifications: user.enableSmsNotifications,
      enableSmsReminders: user.enableSmsReminders,
      enableSmsPaymentNotices: user.enableSmsPaymentNotices,
      enableSmsAnnouncements: user.enableSmsAnnouncements,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
