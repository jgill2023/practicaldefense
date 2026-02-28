# Student Import & Magic Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Import ~1,650 previous students from CSV with enrollment history, and provide magic link welcome emails for first-time login.

**Architecture:** Add `magicLinkToken`/`magicLinkExpiry` fields to users table. Build a CSV import pipeline with preview/confirm flow as admin API endpoints. Add a magic link auth route that creates a session and redirects to student portal. Add "Import Students" dialog and "Send Welcome Email" actions to the User Management page.

**Tech Stack:** Drizzle ORM (PostgreSQL/Neon), Express, SendGrid, React (wouter routing), shadcn/ui, csv-parse (new dependency)

---

### Task 1: Add csv-parse dependency

**Files:**
- Modify: `package.json`

**Step 1: Install csv-parse**

Run: `npm install csv-parse`

csv-parse is the streaming CSV parser from the csv project. It handles quoted fields, escapes, and large files.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add csv-parse dependency for student import"
```

---

### Task 2: Add magic link fields to users schema

**Files:**
- Modify: `shared/schema.ts:46-47` (add fields after passwordResetExpiry)

**Step 1: Add magicLinkToken and magicLinkExpiry columns**

In `shared/schema.ts`, inside the `users` table definition, after line 47 (`passwordResetExpiry`), add:

```typescript
  // Magic link login fields (for imported students)
  magicLinkToken: varchar("magic_link_token", { length: 255 }),
  magicLinkExpiry: timestamp("magic_link_expiry"),
```

**Step 2: Push schema to database**

Run: `npx drizzle-kit push`

Verify the migration applies cleanly. Expected output: two new columns added to `users` table.

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add magic link token fields to users schema"
```

---

### Task 3: Add magic link email function to emailService

**Files:**
- Modify: `server/emailService.ts:430` (add new function after `sendWelcomeEmail`)

**Step 1: Add sendMagicLinkEmail function**

After the `sendWelcomeEmail` function (line 430), add:

```typescript
export async function sendMagicLinkEmail(
  email: string,
  firstName: string,
  token: string
): Promise<boolean> {
  const magicLinkUrl = `${APP_URL}/auth/magic-login?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Practical Defense Training</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Welcome to Practical Defense Training!</h1>

        <p style="font-size: 16px;">Hi ${firstName},</p>

        <p style="font-size: 16px;">
          You've been invited to access your Practical Defense Training student account. Click the button below to log in and set up your password.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLinkUrl}"
             style="display: inline-block; background-color: #004149; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Access My Account
          </a>
        </div>

        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${magicLinkUrl}" style="color: #004149; word-break: break-all;">${magicLinkUrl}</a>
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This link will expire in 7 days. After logging in, you'll be prompted to set a password for future access.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; text-align: center;">
          Practical Defense Training - Professional Firearms Training<br>
          This is an automated message, please do not reply.
        </p>
      </div>
    </body>
    </html>
  `;

  return await sendAuthEmail(email, "Welcome to Practical Defense Training - Access Your Account", html);
}
```

**Step 2: Commit**

```bash
git add server/emailService.ts
git commit -m "feat: add magic link email template for imported students"
```

---

### Task 4: Add magic link auth route

**Files:**
- Modify: `server/auth/routes.ts` (add new route after `/reset-password`)
- Modify: `client/src/App.tsx:144` (add client route)

**Step 1: Add magic-login GET route to auth router**

In `server/auth/routes.ts`, after the `/reset-password` POST handler (after line 269), add:

```typescript
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
```

Note: This imports `users` and `and`, `eq`, `gt` which are already imported at the top of the file.

Also add the `magicLinkToken` and `magicLinkExpiry` field references — they'll be available automatically since the schema was updated in Task 2.

**Step 2: Update the auth import in auth/routes.ts**

The file already imports `users` from `@shared/schema` on line 4. The new `magicLinkToken`/`magicLinkExpiry` columns will be available automatically.

**Step 3: Commit**

```bash
git add server/auth/routes.ts
git commit -m "feat: add magic link login route for imported students"
```

---

### Task 5: Build CSV import server endpoints

**Files:**
- Create: `server/importStudents.ts` (all import logic in one module)
- Modify: `server/routes.ts` (register the import routes)

**Step 1: Create server/importStudents.ts**

This module handles CSV parsing, validation, preview, and confirmed import.

```typescript
import { Router } from "express";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { db } from "./db";
import { users, courses, courseSchedules, enrollments, onlineCourseEnrollments } from "@shared/schema";
import { eq, and, gte, lte, ilike } from "drizzle-orm";
import { isAuthenticated, requireAdminOrHigher, generateToken, getTokenExpiry } from "./customAuth";
import { sendMagicLinkEmail } from "./emailService";
import { storage } from "./storage";

export const importRouter = Router();

interface ParsedRow {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  className: string;
  classDate: string;
  dob: string;
  occl: boolean;
}

interface ValidatedRow extends ParsedRow {
  firstName: string;
  lastName: string;
  parsedDate: Date;
  parsedDob: Date | null;
  warnings: string[];
  errors: string[];
}

interface PreviewResult {
  totalRows: number;
  validRows: ValidatedRow[];
  errorRows: ValidatedRow[];
  uniqueStudents: number;
  uniqueCourses: string[];
  courseMatches: Record<string, string | null>; // className -> courseId or null
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.substring(0, lastSpace).trim(),
    lastName: trimmed.substring(lastSpace + 1).trim(),
  };
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const d = new Date(dateStr.trim());
  if (isNaN(d.getTime())) return null;
  return d;
}

// POST /api/admin/import-students/preview
// Accepts multipart CSV, returns validation preview
importRouter.post(
  "/preview",
  isAuthenticated,
  requireAdminOrHigher,
  async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const csvContent = req.file.buffer.toString("utf-8");

      let records: any[];
      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });
      } catch (parseError: any) {
        return res.status(400).json({ message: `CSV parse error: ${parseError.message}` });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      // Detect column names (case-insensitive, flexible naming)
      const firstRecord = records[0];
      const columns = Object.keys(firstRecord);

      const findColumn = (names: string[]): string | null => {
        for (const name of names) {
          const match = columns.find(c => c.toLowerCase().replace(/[_\s-]/g, "") === name.toLowerCase().replace(/[_\s-]/g, ""));
          if (match) return match;
        }
        return null;
      };

      const nameCol = findColumn(["name", "fullname", "full_name", "student_name", "studentname"]);
      const emailCol = findColumn(["email", "emailaddress", "email_address"]);
      const phoneCol = findColumn(["phone", "phonenumber", "phone_number", "tel", "telephone"]);
      const classCol = findColumn(["class", "course", "classname", "class_name", "coursename", "course_name", "classes", "classattended", "class_attended"]);
      const dateCol = findColumn(["date", "classdate", "class_date", "coursedate", "course_date"]);
      const dobCol = findColumn(["dob", "dateofbirth", "date_of_birth", "birthday", "birthdate"]);
      const occlCol = findColumn(["occl", "online", "onlinecourse", "online_course"]);

      if (!nameCol || !emailCol) {
        return res.status(400).json({
          message: `Required columns not found. Need at least 'name' and 'email'. Found columns: ${columns.join(", ")}`
        });
      }

      // Fetch all courses for matching
      const allCourses = await db.select().from(courses);
      const courseMap = new Map(allCourses.map(c => [c.title.toLowerCase(), c]));

      // Check existing emails
      const allEmails = records.map((r: any) => (r[emailCol!] || "").toLowerCase().trim()).filter(Boolean);
      const existingUsers = await db.select({ email: users.email, id: users.id })
        .from(users)
        .where(
          allEmails.length > 0
            ? eq(users.email, allEmails[0]) // We'll check all in the loop
            : eq(users.email, "")
        );
      const existingEmailMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u.id]));

      const validRows: ValidatedRow[] = [];
      const errorRows: ValidatedRow[] = [];
      const uniqueEmails = new Set<string>();
      const courseNames = new Set<string>();
      const courseMatchResults: Record<string, string | null> = {};

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const warnings: string[] = [];
        const errors: string[] = [];

        const rawName = record[nameCol!] || "";
        const rawEmail = (record[emailCol!] || "").toLowerCase().trim();
        const rawPhone = phoneCol ? (record[phoneCol] || "").trim() : "";
        const rawClass = classCol ? (record[classCol] || "").trim() : "";
        const rawDate = dateCol ? (record[dateCol] || "").trim() : "";
        const rawDob = dobCol ? (record[dobCol] || "").trim() : "";
        const rawOccl = occlCol ? (record[occlCol] || "").trim().toLowerCase() : "";

        const { firstName, lastName } = splitName(rawName);
        const parsedDate = parseDate(rawDate);
        const parsedDob = parseDate(rawDob);
        const isOccl = ["yes", "y", "true", "1", "x"].includes(rawOccl);

        // Validation
        if (!rawEmail) errors.push("Email is required");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) errors.push("Invalid email format");

        if (!rawName.trim()) errors.push("Name is required");

        if (rawClass && !parsedDate) warnings.push("Class date could not be parsed");

        if (rawClass) {
          courseNames.add(rawClass);
          const courseMatch = courseMap.get(rawClass.toLowerCase());
          courseMatchResults[rawClass] = courseMatch ? courseMatch.id : null;
          if (!courseMatch) warnings.push(`Course "${rawClass}" not found in system`);
        }

        if (uniqueEmails.has(rawEmail) && rawEmail) {
          warnings.push("Duplicate email in CSV (will create enrollment only)");
        }
        uniqueEmails.add(rawEmail);

        if (existingEmailMap.has(rawEmail)) {
          warnings.push("Email already exists in system (will add enrollment only)");
        }

        const row: ValidatedRow = {
          rowNumber: i + 1,
          name: rawName,
          email: rawEmail,
          phone: rawPhone,
          className: rawClass,
          classDate: rawDate,
          dob: rawDob,
          occl: isOccl,
          firstName,
          lastName,
          parsedDate: parsedDate || new Date(),
          parsedDob: parsedDob,
          warnings,
          errors,
        };

        if (errors.length > 0) {
          errorRows.push(row);
        } else {
          validRows.push(row);
        }
      }

      const result: PreviewResult = {
        totalRows: records.length,
        validRows,
        errorRows,
        uniqueStudents: uniqueEmails.size,
        uniqueCourses: Array.from(courseNames),
        courseMatches: courseMatchResults,
      };

      res.json(result);
    } catch (error: any) {
      console.error("Import preview error:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  }
);

// POST /api/admin/import-students/confirm
// Accepts the validated data and performs the import
importRouter.post(
  "/confirm",
  isAuthenticated,
  requireAdminOrHigher,
  async (req: any, res) => {
    try {
      const { rows } = req.body as { rows: ValidatedRow[] };

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows to import" });
      }

      // Fetch courses for matching
      const allCourses = await db.select().from(courses);
      const courseMap = new Map(allCourses.map(c => [c.title.toLowerCase(), c]));

      const results = {
        usersCreated: 0,
        usersExisting: 0,
        enrollmentsCreated: 0,
        onlineEnrollmentsCreated: 0,
        schedulesCreated: 0,
        errors: [] as { row: number; error: string }[],
      };

      // Group by email to handle deduplication
      const emailGroups = new Map<string, ValidatedRow[]>();
      for (const row of rows) {
        const email = row.email.toLowerCase();
        if (!emailGroups.has(email)) {
          emailGroups.set(email, []);
        }
        emailGroups.get(email)!.push(row);
      }

      for (const [email, studentRows] of emailGroups) {
        try {
          // 1. Create or find user
          const firstRow = studentRows[0];
          let existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          let userId: string;

          if (existingUser) {
            userId = existingUser.id;
            results.usersExisting++;
          } else {
            const newUser = await storage.createUser({
              email,
              firstName: firstRow.firstName,
              lastName: firstRow.lastName,
              phone: firstRow.phone || null,
              dateOfBirth: firstRow.parsedDob || null,
              role: "student",
              userStatus: "active",
              isEmailVerified: true,
              statusUpdatedAt: new Date(),
            });
            userId = newUser.id;
            results.usersCreated++;
          }

          // 2. Create enrollments for each class row
          for (const row of studentRows) {
            try {
              // Handle in-person class enrollment
              if (row.className) {
                const course = courseMap.get(row.className.toLowerCase());
                if (course) {
                  // Find or create schedule for this date
                  const classDate = new Date(row.parsedDate);
                  const startOfDay = new Date(classDate);
                  startOfDay.setHours(0, 0, 0, 0);
                  const endOfDay = new Date(classDate);
                  endOfDay.setHours(23, 59, 59, 999);

                  let schedule = await db.query.courseSchedules.findFirst({
                    where: and(
                      eq(courseSchedules.courseId, course.id),
                      gte(courseSchedules.startDate, startOfDay),
                      lte(courseSchedules.startDate, endOfDay)
                    ),
                  });

                  if (!schedule) {
                    // Create a historical schedule
                    const [newSchedule] = await db.insert(courseSchedules).values({
                      courseId: course.id,
                      startDate: classDate,
                      endDate: classDate,
                      startTime: "08:00:00",
                      endTime: "17:00:00",
                      maxSpots: 0,
                      availableSpots: 0,
                      location: "Historical Import",
                      notes: "Auto-created during student import",
                    }).returning();
                    schedule = newSchedule;
                    results.schedulesCreated++;
                  }

                  // Check if enrollment already exists
                  const existingEnrollment = await db.query.enrollments.findFirst({
                    where: and(
                      eq(enrollments.studentId, userId),
                      eq(enrollments.scheduleId, schedule.id)
                    ),
                  });

                  if (!existingEnrollment) {
                    await storage.createEnrollment({
                      studentId: userId,
                      courseId: course.id,
                      scheduleId: schedule.id,
                      status: "completed",
                      paymentStatus: "paid",
                      paymentOption: "full",
                      completionDate: classDate,
                      registrationDate: classDate,
                      notes: "Imported from historical records",
                    });
                    results.enrollmentsCreated++;
                  }
                }
              }

              // Handle OCCL online enrollment
              if (row.occl) {
                // Check for existing online enrollment
                const existingOnline = await db.query.onlineCourseEnrollments.findFirst({
                  where: and(
                    eq(onlineCourseEnrollments.email, email),
                    eq(onlineCourseEnrollments.courseName, "Online NM Concealed Carry Course")
                  ),
                });

                if (!existingOnline) {
                  await storage.createOnlineCourseEnrollment({
                    userId,
                    courseName: "Online NM Concealed Carry Course",
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email,
                    phone: row.phone || "",
                    dateOfBirth: row.parsedDob || undefined,
                    status: "completed",
                  });
                  results.onlineEnrollmentsCreated++;
                }
              }
            } catch (rowError: any) {
              results.errors.push({ row: row.rowNumber, error: rowError.message });
            }
          }
        } catch (userError: any) {
          results.errors.push({ row: studentRows[0].rowNumber, error: `User creation failed: ${userError.message}` });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Import confirm error:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  }
);

// POST /api/admin/users/:userId/send-welcome-email
// Generates magic link and sends welcome email
importRouter.post(
  "/welcome-email/:userId",
  isAuthenticated,
  requireAdminOrHigher,
  async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const token = generateToken();
      const expiry = getTokenExpiry(168); // 7 days

      await storage.updateUser(userId, {
        magicLinkToken: token,
        magicLinkExpiry: expiry,
      });

      const emailSent = await sendMagicLinkEmail(
        user.email,
        user.firstName || "Student",
        token
      );

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send welcome email" });
      }

      res.json({ message: "Welcome email sent successfully", email: user.email });
    } catch (error: any) {
      console.error("Send welcome email error:", error);
      res.status(500).json({ message: "Failed to send welcome email" });
    }
  }
);

// POST /api/admin/users/send-welcome-emails
// Bulk send welcome emails
importRouter.post(
  "/welcome-emails/bulk",
  isAuthenticated,
  requireAdminOrHigher,
  async (req: any, res) => {
    try {
      const { userIds } = req.body as { userIds: string[] };

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "No user IDs provided" });
      }

      const results = { sent: 0, failed: 0, errors: [] as { userId: string; error: string }[] };

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            results.errors.push({ userId, error: "User not found" });
            results.failed++;
            continue;
          }

          const token = generateToken();
          const expiry = getTokenExpiry(168); // 7 days

          await storage.updateUser(userId, {
            magicLinkToken: token,
            magicLinkExpiry: expiry,
          });

          const emailSent = await sendMagicLinkEmail(
            user.email,
            user.firstName || "Student",
            token
          );

          if (emailSent) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ userId, error: "Email send failed" });
          }

          // Small delay to avoid SendGrid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err: any) {
          results.failed++;
          results.errors.push({ userId, error: err.message });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Bulk welcome email error:", error);
      res.status(500).json({ message: "Failed to send welcome emails" });
    }
  }
);
```

**Step 2: Register the import router in server/routes.ts**

In `server/routes.ts`, after the existing imports (around line 31), add:

```typescript
import { importRouter } from "./importStudents";
```

Inside `registerRoutes()`, after the auth router registration (find `app.use("/auth", authRouter)`), add:

```typescript
  // Student import routes (uses same multer upload middleware)
  app.use("/api/admin/import-students", (req: any, _res, next) => {
    if (req.path === "/preview") {
      upload.single("file")(req, _res, next);
    } else {
      next();
    }
  }, importRouter);
```

**Step 3: Commit**

```bash
git add server/importStudents.ts server/routes.ts
git commit -m "feat: add CSV import and welcome email server endpoints"
```

---

### Task 6: Build Import Students dialog in User Management page

**Files:**
- Modify: `client/src/pages/user-management.tsx`

**Step 1: Add import state, mutations, and Send Welcome Email mutation**

After the existing state declarations (around line 95), add:

```typescript
const [importDialogOpen, setImportDialogOpen] = useState(false);
const [importFile, setImportFile] = useState<File | null>(null);
const [importPreview, setImportPreview] = useState<any>(null);
const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
const [importResults, setImportResults] = useState<any>(null);
```

After the existing mutations (after `passwordResetMutation`, around line 260), add:

```typescript
const importPreviewMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/import-students/preview", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to preview CSV");
    }
    return res.json();
  },
  onSuccess: (data) => {
    setImportPreview(data);
    setImportStep("preview");
  },
  onError: (error: any) => {
    toast({
      variant: "destructive",
      title: "Import Error",
      description: error.message || "Failed to process CSV file",
    });
  },
});

const importConfirmMutation = useMutation({
  mutationFn: async (rows: any[]) => {
    return await apiRequest("POST", "/api/admin/import-students/confirm", { rows });
  },
  onSuccess: (data: any) => {
    setImportResults(data);
    setImportStep("done");
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    toast({
      title: "Import Complete",
      description: `Created ${data.usersCreated} users, ${data.enrollmentsCreated} enrollments`,
    });
  },
  onError: (error: any) => {
    toast({
      variant: "destructive",
      title: "Import Failed",
      description: error.message || "Failed to import students",
    });
    setImportStep("preview");
  },
});

const sendWelcomeEmailMutation = useMutation({
  mutationFn: async (userId: string) => {
    return await apiRequest("POST", `/api/admin/import-students/welcome-email/${userId}`);
  },
  onSuccess: () => {
    toast({
      title: "Welcome email sent",
      description: "A magic link login email has been sent to the student",
    });
  },
  onError: (error: any) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Failed to send welcome email",
    });
  },
});

const bulkWelcomeEmailMutation = useMutation({
  mutationFn: async (userIds: string[]) => {
    return await apiRequest("POST", "/api/admin/import-students/welcome-emails/bulk", { userIds });
  },
  onSuccess: (data: any) => {
    toast({
      title: "Welcome emails sent",
      description: `Sent ${data.sent} emails (${data.failed} failed)`,
    });
  },
  onError: (error: any) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "Failed to send welcome emails",
    });
  },
});
```

**Step 2: Add Import Students button next to Create User button**

In the header area (around line 343), add an "Import Students" button next to the existing "Create User" button. Before `<Dialog open={createDialogOpen}...`:

```tsx
<Button variant="outline" onClick={() => { setImportDialogOpen(true); setImportStep("upload"); setImportFile(null); setImportPreview(null); setImportResults(null); }}>
  <Upload className="w-4 h-4 mr-2" />
  Import Students
</Button>
```

Add `Upload` to the lucide-react imports (line 56):
```typescript
import { UserPlus, Check, X, Filter, Shield, MoreVertical, Edit, Trash2, KeyRound, Upload, Mail } from "lucide-react";
```

**Step 3: Add Send Welcome Email to row actions dropdown**

In the DropdownMenuContent (around line 606, after the "Send Password Reset" item), add:

```tsx
<DropdownMenuItem
  onClick={() => sendWelcomeEmailMutation.mutate(user.id)}
  data-testid={`action-welcome-${user.id}`}
>
  <Mail className="w-4 h-4 mr-2" />
  Send Welcome Email
</DropdownMenuItem>
```

**Step 4: Add the Import Dialog component**

Before the closing `</div>` of the page (after the existing delete dialog, around line 740), add the import dialog:

```tsx
{/* Import Students Dialog */}
<Dialog open={importDialogOpen} onOpenChange={(open) => { if (!open) { setImportDialogOpen(false); setImportStep("upload"); } }}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Import Students from CSV</DialogTitle>
      <DialogDescription>
        Upload a CSV file with columns: name, email, phone, class, date, dob, occl
      </DialogDescription>
    </DialogHeader>

    {importStep === "upload" && (
      <div className="space-y-4 py-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          {importFile && (
            <p className="mt-2 text-sm text-muted-foreground">
              Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!importFile || importPreviewMutation.isPending}
            onClick={() => importFile && importPreviewMutation.mutate(importFile)}
          >
            {importPreviewMutation.isPending ? "Processing..." : "Preview Import"}
          </Button>
        </DialogFooter>
      </div>
    )}

    {importStep === "preview" && importPreview && (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{importPreview.totalRows}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{importPreview.uniqueStudents}</div>
              <div className="text-sm text-muted-foreground">Unique Students</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importPreview.validRows.length}</div>
              <div className="text-sm text-muted-foreground">Valid Rows</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{importPreview.errorRows.length}</div>
              <div className="text-sm text-muted-foreground">Error Rows</div>
            </CardContent>
          </Card>
        </div>

        {/* Course matching info */}
        <div>
          <h4 className="font-semibold mb-2">Course Matching</h4>
          {Object.entries(importPreview.courseMatches).map(([name, id]) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              {id ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
              <span>{name}</span>
              {!id && <span className="text-red-600">(not found — enrollments will be skipped)</span>}
            </div>
          ))}
        </div>

        {/* Error rows */}
        {importPreview.errorRows.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2">Rows with Errors (will be skipped)</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
              {importPreview.errorRows.map((row: any) => (
                <div key={row.rowNumber} className="py-1">
                  Row {row.rowNumber}: {row.name} ({row.email}) — {row.errors.join(", ")}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning rows */}
        {importPreview.validRows.filter((r: any) => r.warnings.length > 0).length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-600 mb-2">Rows with Warnings (will still import)</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
              {importPreview.validRows.filter((r: any) => r.warnings.length > 0).map((row: any) => (
                <div key={row.rowNumber} className="py-1">
                  Row {row.rowNumber}: {row.name} ({row.email}) — {row.warnings.join(", ")}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setImportStep("upload"); setImportPreview(null); }}>
            Back
          </Button>
          <Button
            disabled={importPreview.validRows.length === 0 || importConfirmMutation.isPending}
            onClick={() => importConfirmMutation.mutate(importPreview.validRows)}
          >
            {importConfirmMutation.isPending ? "Importing..." : `Import ${importPreview.validRows.length} Rows`}
          </Button>
        </DialogFooter>
      </div>
    )}

    {importStep === "importing" && (
      <div className="py-8 text-center">
        <p className="text-lg">Importing students...</p>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment for large files.</p>
      </div>
    )}

    {importStep === "done" && importResults && (
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importResults.usersCreated}</div>
              <div className="text-sm text-muted-foreground">Users Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{importResults.usersExisting}</div>
              <div className="text-sm text-muted-foreground">Existing Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importResults.enrollmentsCreated}</div>
              <div className="text-sm text-muted-foreground">Enrollments Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{importResults.onlineEnrollmentsCreated}</div>
              <div className="text-sm text-muted-foreground">Online Enrollments</div>
            </CardContent>
          </Card>
        </div>

        {importResults.errors.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2">Errors During Import</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
              {importResults.errors.map((err: any, i: number) => (
                <div key={i} className="py-1">Row {err.row}: {err.error}</div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => { setImportDialogOpen(false); setImportStep("upload"); }}>
            Done
          </Button>
        </DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
```

**Step 5: Add a "Send Welcome Emails to All Students" button**

In the header area (next to the Import Students button), add:

```tsx
<Button
  variant="outline"
  onClick={() => {
    const studentIds = users
      .filter(u => u.role === "student" && !u.passwordHash)
      .map(u => u.id);
    if (studentIds.length === 0) {
      toast({ title: "No eligible students", description: "All students already have passwords set." });
      return;
    }
    if (confirm(`Send welcome emails to ${studentIds.length} students without passwords?`)) {
      bulkWelcomeEmailMutation.mutate(studentIds);
    }
  }}
  disabled={bulkWelcomeEmailMutation.isPending}
>
  <Mail className="w-4 h-4 mr-2" />
  {bulkWelcomeEmailMutation.isPending ? "Sending..." : "Send Welcome Emails"}
</Button>
```

Note: The `users` query response needs to include `passwordHash` presence info. Since the admin users endpoint already returns user data, we need to check if `passwordHash` is included. If not (for security reasons it's often stripped), we'll need a flag. Check the admin endpoint — if `passwordHash` is stripped (see `server/routes.ts:421`), we should instead add a `hasPassword` computed field.

Looking at `server/routes.ts:421`, `passwordHash` IS stripped from responses. So instead of checking `passwordHash`, use a different indicator. The best approach: filter for students who have never logged in — students with no `passwordHash` are those imported without a password. Add a `hasPassword` field to the admin users endpoint response.

In `server/routes.ts`, find the `GET /api/admin/users` endpoint and ensure it returns a `hasPassword` boolean. Find where users are returned and add:

```typescript
const usersWithFlags = allUsers.map(u => ({
  ...u,
  passwordHash: undefined, // strip
  hasPassword: !!u.passwordHash,
}));
```

On the client, reference `user.hasPassword` instead of `user.passwordHash` when filtering for the bulk send.

**Step 6: Commit**

```bash
git add client/src/pages/user-management.tsx server/routes.ts
git commit -m "feat: add import students dialog and welcome email actions to admin UI"
```

---

### Task 7: Handle magic link error/expired states on the client

**Files:**
- Modify: `client/src/pages/login.tsx` (show error messages from query params)

**Step 1: Show magic link error messages on login page**

In the login page component, read the query parameter `error` and display appropriate messages. At the top of the component:

```typescript
const searchParams = new URLSearchParams(window.location.search);
const magicLinkError = searchParams.get("error");
```

Then in the JSX, before the login form, add:

```tsx
{magicLinkError === "expired-link" && (
  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
    Your login link has expired. Please use the "Forgot Password" link below to get a new one.
  </div>
)}
{magicLinkError === "invalid-link" && (
  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
    This login link is invalid. Please request a new one or log in with your password.
  </div>
)}
```

**Step 2: Commit**

```bash
git add client/src/pages/login.tsx
git commit -m "feat: show magic link error messages on login page"
```

---

### Task 8: Add set-password prompt on student portal for passwordless users

**Files:**
- Modify: `client/src/pages/student-portal.tsx` (add password setup banner)

**Step 1: Add a password setup prompt**

The student portal should detect when a user has no password set (via the `hasPassword` field or a new endpoint) and show a banner prompting them to set one. Since the magic link route redirects with `?welcome=true`, use that as the trigger:

At the top of the student portal component:

```typescript
const searchParams = new URLSearchParams(window.location.search);
const isWelcome = searchParams.get("welcome") === "true";
const [showPasswordSetup, setShowPasswordSetup] = useState(isWelcome);
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
```

Add a mutation for setting password:

```typescript
const setPasswordMutation = useMutation({
  mutationFn: async (password: string) => {
    return await apiRequest("POST", "/api/user/set-password", { password });
  },
  onSuccess: () => {
    setShowPasswordSetup(false);
    toast({ title: "Password set", description: "You can now log in with your email and password." });
  },
  onError: (error: any) => {
    toast({ variant: "destructive", title: "Error", description: error.message });
  },
});
```

Add a banner in the JSX (at the top of the page content):

```tsx
{showPasswordSetup && (
  <Card className="mb-6 border-blue-200 bg-blue-50">
    <CardContent className="p-4">
      <h3 className="font-semibold mb-2">Welcome! Set your password</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create a password so you can log in directly next time.
      </p>
      <div className="flex gap-2 max-w-md">
        <Input
          type="password"
          placeholder="New password (min 12 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          disabled={newPassword.length < 12 || setPasswordMutation.isPending}
          onClick={() => setPasswordMutation.mutate(newPassword)}
        >
          {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
        </Button>
      </div>
      <Button variant="link" className="mt-2 p-0 h-auto text-sm" onClick={() => setShowPasswordSetup(false)}>
        Skip for now
      </Button>
    </CardContent>
  </Card>
)}
```

**Step 2: Add the set-password server endpoint**

In `server/routes.ts` or `server/auth/routes.ts`, add:

```typescript
authRouter.post("/set-password", isAuthenticated, async (req: any, res) => {
  try {
    const schema = z.object({
      password: z.string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[0-9]/, "Password must contain a number"),
    });

    const { password } = schema.parse(req.body);
    const userId = req.user.id;

    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ message: "Password set successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Set password error:", error);
    res.status(500).json({ message: "Failed to set password" });
  }
});
```

Add `hashPassword` to the imports in `server/auth/routes.ts` — it's already imported from `../customAuth` on line 8.

**Step 3: Update the client API call path**

The `setPasswordMutation` should call `/auth/set-password` (not `/api/user/set-password`):

```typescript
return await apiRequest("POST", "/auth/set-password", { password });
```

**Step 4: Commit**

```bash
git add client/src/pages/student-portal.tsx server/auth/routes.ts
git commit -m "feat: add set-password flow for magic link users"
```

---

### Task 9: Add hasPassword flag to admin users endpoint

**Files:**
- Modify: `server/routes.ts` (admin users GET endpoint)

**Step 1: Find the admin users endpoint and add hasPassword**

Find the `GET /api/admin/users` endpoint in `server/routes.ts`. It returns users from `storage.getAllUsers()`. The response likely already strips `passwordHash`. Add a `hasPassword` boolean to the response.

Find where users are returned in the endpoint and modify to add the flag:

```typescript
const usersWithFlags = allUsers.map(({ passwordHash, passwordResetToken, passwordResetExpiry, emailVerificationToken, emailVerificationExpiry, magicLinkToken, magicLinkExpiry, ...user }) => ({
  ...user,
  hasPassword: !!passwordHash,
}));
res.json(usersWithFlags);
```

**Step 2: Update the User type on the client**

Since the admin endpoint now returns `hasPassword`, the client needs to know about it. The simplest approach: the `User` type from shared/schema won't have it, so cast or extend. In `user-management.tsx`, add a local type:

```typescript
type UserWithFlags = User & { hasPassword?: boolean };
```

And update the query type:

```typescript
const { data: users = [], isLoading } = useQuery<UserWithFlags[]>({
  queryKey: ["/api/admin/users"],
});
```

**Step 3: Commit**

```bash
git add server/routes.ts client/src/pages/user-management.tsx
git commit -m "feat: add hasPassword flag to admin users API response"
```

---

### Task 10: End-to-end testing

**Step 1: Verify the full flow manually**

1. Start the dev server: `npm run dev`
2. Log in as admin
3. Navigate to `/admin/users`
4. Click "Import Students" — upload a test CSV:
   ```
   name,email,phone,class,date,dob,occl
   "Test Student",test@example.com,505-555-0001,"New Mexico Concealed Carry Course",2024-06-15,1990-01-01,yes
   ```
5. Verify preview shows correct parsing
6. Confirm import
7. Verify user appears in the users list
8. Click "Send Welcome Email" on the test user's row
9. Check email (or server logs) for the magic link
10. Open the magic link URL in an incognito window
11. Verify it logs in and shows the password setup banner
12. Set a password and verify it works for subsequent logins

**Step 2: Test edge cases**

- Upload CSV with duplicate emails (should create user once, multiple enrollments)
- Upload CSV with existing email (should skip user creation, add enrollments)
- Upload CSV with missing required fields (should show in error rows)
- Upload CSV with unrecognized course names (should show warning)
- Click magic link twice (second time should redirect to login with error)
- Try expired magic link (after 7 days)

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: student CSV import with magic link welcome emails"
```
