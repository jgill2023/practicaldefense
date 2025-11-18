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

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

authRouter.post("/signup", async (req, res) => {
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
        userStatus: "pending",
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

authRouter.post("/login", async (req, res) => {
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

authRouter.post("/request-reset", async (req, res) => {
  try {
    const { email } = requestResetSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return res.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    const resetToken = generateToken();
    const resetExpiry = getTokenExpiry(1);
    
    console.log(`Generated reset token for ${email}: ${resetToken.substring(0, 10)}... (expires: ${resetExpiry})`);

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

authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    console.log(`Password reset attempt with token: ${token.substring(0, 10)}...`);
    
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.passwordResetToken, token),
        gt(users.passwordResetExpiry, new Date())
      ),
    });

    if (!user) {
      console.log(`No user found with valid reset token`);
      // Check if token exists but is expired
      const expiredUser = await db.query.users.findFirst({
        where: eq(users.passwordResetToken, token),
      });
      if (expiredUser) {
        console.log(`Token found but expired. Expiry: ${expiredUser.passwordResetExpiry}`);
      }
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
    
    console.log(`Valid reset token found for user: ${user.email}`);

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
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
