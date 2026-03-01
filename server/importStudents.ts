import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "./db";
import {
  users,
  courses,
  courseSchedules,
  enrollments,
  onlineCourseEnrollments,
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  isAuthenticated,
  requireAdminOrHigher,
  generateToken,
  getTokenExpiry,
} from "./customAuth";
import { sendMagicLinkEmail } from "./emailService";
import { storage } from "./storage";

// ---------- Types ----------

interface ValidatedRow {
  rowNumber: number;
  name: string;
  email: string;
  phone: string;
  className: string;
  classDate: string;
  dob: string;
  occl: boolean;
  firstName: string;
  lastName: string;
  parsedDate: string | null;
  parsedDob: string | null;
  warnings: string[];
  errors: string[];
}

interface PreviewResult {
  totalRows: number;
  validRows: ValidatedRow[];
  errorRows: ValidatedRow[];
  uniqueStudents: number;
  uniqueCourses: string[];
  courseMatches: Record<string, string | null>;
}

interface ConfirmResult {
  usersCreated: number;
  usersExisting: number;
  enrollmentsCreated: number;
  onlineEnrollmentsCreated: number;
  schedulesCreated: number;
  errors: { row: number; error: string }[];
}

interface HeaderScanResult {
  mode: "headerScan";
  csvHeaders: string[];
  suggestions: { csvHeader: string; suggestedField: string | null }[];
  systemFields: { key: string; label: string; required: boolean }[];
  sampleRows: Record<string, string>[];
}

const SYSTEM_FIELDS = [
  { key: "name", label: "Full Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "class", label: "Course/Class", required: false },
  { key: "date", label: "Class Date", required: false },
  { key: "dob", label: "Date of Birth", required: false },
  { key: "occl", label: "Online Course (OCCL)", required: false },
];

// ---------- Multer config for CSV ----------

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// ---------- Helpers ----------

/**
 * Normalize a header string for flexible column detection.
 * Lowercases and strips underscores, spaces, dashes.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\s-]/g, "");
}

/**
 * Map CSV header names to canonical field keys.
 */
function mapHeader(raw: string): string | null {
  const n = normalizeHeader(raw);
  // Required
  if (["name", "fullname", "studentname"].includes(n)) return "name";
  if (["email", "emailaddress"].includes(n)) return "email";
  // Optional
  if (n === "phone") return "phone";
  if (["class", "course", "classname", "classes", "classattended"].includes(n))
    return "class";
  if (["date", "classdate", "coursedate"].includes(n)) return "date";
  if (["dob", "dateofbirth", "birthday"].includes(n)) return "dob";
  if (["occl", "online", "onlinecourse"].includes(n)) return "occl";
  return null;
}

/**
 * Split a full name into firstName / lastName at the last space.
 */
function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, lastSpace).trim(),
    lastName: trimmed.slice(lastSpace + 1).trim(),
  };
}

/**
 * Simple email validation.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Try to parse a date string into YYYY-MM-DD. Returns null on failure.
 */
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    let year = slashMatch[3];
    if (year.length === 2) {
      const num = parseInt(year, 10);
      year = num >= 50 ? `19${year}` : `20${year}`;
    }
    const d = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!isNaN(d.getTime())) return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}T00:00:00`);
    if (!isNaN(d.getTime()))
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // Fallback: native Date parse
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) {
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, "0");
    const d = String(fallback.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Check if a string represents a truthy value for the occl flag.
 */
function parseOccl(raw: string): boolean {
  if (!raw) return false;
  const lower = raw.trim().toLowerCase();
  return ["true", "yes", "1", "y", "x"].includes(lower);
}

// ---------- Router ----------

export const importRouter = Router();

// ============================================
// POST /preview — CSV upload & validation
// ============================================
importRouter.post(
  "/preview",
  isAuthenticated,
  requireAdminOrHigher,
  csvUpload.single("file"),
  async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const csvContent = req.file.buffer.toString("utf-8");

      // Parse CSV
      let records: Record<string, string>[];
      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
          relax_column_count: true,
        });
      } catch (err: any) {
        return res
          .status(400)
          .json({ message: `CSV parse error: ${err.message}` });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      // Build column mapping from the first record's keys
      const rawHeaders = Object.keys(records[0]);

      // Check for user-provided column map (sent as JSON string in FormData)
      const userColumnMapRaw = req.body?.columnMap;
      let userColumnMap: Record<string, string> | null = null;

      if (userColumnMapRaw) {
        try {
          userColumnMap = JSON.parse(userColumnMapRaw);
        } catch {
          return res.status(400).json({ message: "Invalid columnMap JSON" });
        }
      }

      if (!userColumnMap) {
        // Header scan mode: return headers + auto-suggestions for mapping UI
        const suggestions = rawHeaders.map((h) => ({
          csvHeader: h,
          suggestedField: mapHeader(h),
        }));

        const result: HeaderScanResult = {
          mode: "headerScan",
          csvHeaders: rawHeaders,
          suggestions,
          systemFields: SYSTEM_FIELDS,
          sampleRows: records.slice(0, 3),
        };

        return res.json(result);
      }

      // Full preview mode: use user-confirmed column mappings
      const columnMap: Record<string, string> = userColumnMap;

      // Verify required columns are mapped
      if (!columnMap["name"]) {
        return res.status(400).json({
          message: 'Required field "Full Name" is not mapped to any CSV column',
        });
      }
      if (!columnMap["email"]) {
        return res.status(400).json({
          message: 'Required field "Email" is not mapped to any CSV column',
        });
      }

      // Fetch all courses for matching
      const allCourses = await db.select().from(courses);
      const courseLookup = new Map<string, { id: string; title: string }>();
      for (const c of allCourses) {
        courseLookup.set(c.title.toLowerCase(), { id: c.id, title: c.title });
      }

      // Fetch all existing user emails for duplicate checking
      const existingUsers = await db
        .select({ email: users.email })
        .from(users);
      const existingEmails = new Set(
        existingUsers.map((u) => u.email.toLowerCase())
      );

      // Track emails within the CSV for intra-CSV duplicate detection
      const csvEmails = new Map<string, number[]>(); // email -> row numbers

      const validRows: ValidatedRow[] = [];
      const errorRows: ValidatedRow[] = [];
      const courseNames = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const rowNum = i + 2; // 1-indexed, +1 for header row

        const rawName = rec[columnMap["name"]] || "";
        const rawEmail = rec[columnMap["email"]] || "";
        const rawPhone = columnMap["phone"] ? rec[columnMap["phone"]] || "" : "";
        const rawClass = columnMap["class"] ? rec[columnMap["class"]] || "" : "";
        const rawDate = columnMap["date"] ? rec[columnMap["date"]] || "" : "";
        const rawDob = columnMap["dob"] ? rec[columnMap["dob"]] || "" : "";
        const rawOccl = columnMap["occl"] ? rec[columnMap["occl"]] || "" : "";

        const warnings: string[] = [];
        const errors: string[] = [];

        // Name
        const name = rawName.trim();
        if (!name) {
          errors.push("Name is required");
        }
        const { firstName, lastName } = splitName(name);
        if (name && !lastName) {
          warnings.push("Could not split name into first/last — no space found");
        }

        // Email
        const email = rawEmail.trim().toLowerCase();
        if (!email) {
          errors.push("Email is required");
        } else if (!isValidEmail(email)) {
          errors.push(`Invalid email format: ${email}`);
        }

        // Track CSV duplicates
        if (email) {
          const existing = csvEmails.get(email);
          if (existing) {
            existing.push(rowNum);
            // Only add warning, not error — duplicates are grouped on confirm
            warnings.push(
              `Duplicate email in CSV (also in row${existing.length > 2 ? "s" : ""} ${existing.slice(0, -1).join(", ")})`
            );
          } else {
            csvEmails.set(email, [rowNum]);
          }
        }

        // Check existing in DB
        if (email && existingEmails.has(email)) {
          warnings.push("Email already exists in database — will update existing user");
        }

        // Phone
        const phone = rawPhone.trim();

        // Class
        const className = rawClass.trim();
        if (className) {
          courseNames.add(className);
        }

        // Date
        const classDate = rawDate.trim();
        const parsedDate = parseDate(classDate);
        if (classDate && !parsedDate) {
          errors.push(`Could not parse class date: "${classDate}"`);
        }

        // DOB
        const dob = rawDob.trim();
        const parsedDob = parseDate(dob);
        if (dob && !parsedDob) {
          warnings.push(`Could not parse date of birth: "${dob}"`);
        }

        // OCCL
        const occl = parseOccl(rawOccl);

        const row: ValidatedRow = {
          rowNumber: rowNum,
          name,
          email,
          phone,
          className,
          classDate,
          dob,
          occl,
          firstName,
          lastName,
          parsedDate,
          parsedDob,
          warnings,
          errors,
        };

        if (errors.length > 0) {
          errorRows.push(row);
        } else {
          validRows.push(row);
        }
      }

      // Build course matches
      const courseMatches: Record<string, string | null> = {};
      for (const cn of Array.from(courseNames)) {
        const match = courseLookup.get(cn.toLowerCase());
        courseMatches[cn] = match ? match.id : null;
      }

      // Unique students = unique emails across valid rows
      const uniqueStudentEmails = new Set(
        validRows.filter((r) => r.email).map((r) => r.email)
      );

      const result: PreviewResult = {
        totalRows: records.length,
        validRows,
        errorRows,
        uniqueStudents: uniqueStudentEmails.size,
        uniqueCourses: Array.from(courseNames),
        courseMatches,
      };

      return res.json(result);
    } catch (err: any) {
      console.error("[ImportStudents] Preview error:", err);
      return res
        .status(500)
        .json({ message: `Import preview failed: ${err.message}` });
    }
  }
);

// ============================================
// POST /confirm — Execute the import
// ============================================
importRouter.post(
  "/confirm",
  isAuthenticated,
  requireAdminOrHigher,
  async (req: any, res) => {
    try {
      const { rows } = req.body as { rows: ValidatedRow[] };

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }

      // Group rows by email
      const grouped = new Map<string, ValidatedRow[]>();
      for (const row of rows) {
        const email = row.email.toLowerCase();
        const existing = grouped.get(email);
        if (existing) {
          existing.push(row);
        } else {
          grouped.set(email, [row]);
        }
      }

      // Fetch all courses for matching
      const allCourses = await db.select().from(courses);
      const courseLookup = new Map<string, { id: string; title: string }>();
      for (const c of allCourses) {
        courseLookup.set(c.title.toLowerCase(), { id: c.id, title: c.title });
      }

      let usersCreated = 0;
      let usersExisting = 0;
      let enrollmentsCreated = 0;
      let onlineEnrollmentsCreated = 0;
      let schedulesCreated = 0;
      const importErrors: { row: number; error: string }[] = [];

      for (const [email, studentRows] of Array.from(grouped.entries())) {
        try {
          // 1. Find or create user
          let user = await storage.getUserByEmail(email);

          if (user) {
            usersExisting++;
            // Update user fields if they are currently empty
            const firstRow = studentRows[0];
            const updates: Record<string, any> = {};
            if (!user.firstName && firstRow.firstName)
              updates.firstName = firstRow.firstName;
            if (!user.lastName && firstRow.lastName)
              updates.lastName = firstRow.lastName;
            if (!user.phone && firstRow.phone) updates.phone = firstRow.phone;
            if (!user.dateOfBirth && firstRow.parsedDob) {
              updates.dateOfBirth = new Date(firstRow.parsedDob + "T00:00:00");
            }
            if (Object.keys(updates).length > 0) {
              await storage.updateUser(user.id, updates);
            }
          } else {
            const firstRow = studentRows[0];
            user = await storage.createUser({
              email,
              firstName: firstRow.firstName || undefined,
              lastName: firstRow.lastName || undefined,
              phone: firstRow.phone || undefined,
              dateOfBirth: firstRow.parsedDob
                ? new Date(firstRow.parsedDob + "T00:00:00")
                : undefined,
              role: "student",
              userStatus: "active",
              isEmailVerified: true,
            });
            usersCreated++;
          }

          // 2. Process each class row for this student
          for (const row of studentRows) {
            try {
              // Enrollment for a specific class
              if (row.className) {
                const courseMatch = courseLookup.get(
                  row.className.toLowerCase()
                );
                if (!courseMatch) {
                  importErrors.push({
                    row: row.rowNumber,
                    error: `Course not found: "${row.className}"`,
                  });
                  continue;
                }

                const courseId = courseMatch.id;
                let classDate: Date | null = null;

                if (row.parsedDate) {
                  classDate = new Date(row.parsedDate + "T00:00:00");
                }

                let scheduleId: string | null = null;

                if (classDate) {
                  // Find schedule on that date
                  const dayStart = new Date(classDate);
                  dayStart.setHours(0, 0, 0, 0);
                  const dayEnd = new Date(classDate);
                  dayEnd.setHours(23, 59, 59, 999);

                  const existingSchedules = await db
                    .select()
                    .from(courseSchedules)
                    .where(
                      and(
                        eq(courseSchedules.courseId, courseId),
                        gte(courseSchedules.startDate, dayStart),
                        lte(courseSchedules.startDate, dayEnd)
                      )
                    );

                  if (existingSchedules.length > 0) {
                    scheduleId = existingSchedules[0].id;
                  } else {
                    // Create historical schedule
                    const newSchedule = await storage.createCourseSchedule({
                      courseId,
                      startDate: classDate,
                      endDate: classDate,
                      startTime: "09:00:00",
                      endTime: "17:00:00",
                      maxSpots: 20,
                      availableSpots: 20,
                      location: "Historical Import",
                      notes: "Auto-created during student import",
                    });
                    scheduleId = newSchedule.id;
                    schedulesCreated++;
                  }
                } else {
                  // No date — try to find any schedule for this course, or create one
                  const anySchedules = await db
                    .select()
                    .from(courseSchedules)
                    .where(eq(courseSchedules.courseId, courseId))
                    .limit(1);

                  if (anySchedules.length > 0) {
                    scheduleId = anySchedules[0].id;
                  } else {
                    const importDate = new Date();
                    const newSchedule = await storage.createCourseSchedule({
                      courseId,
                      startDate: importDate,
                      endDate: importDate,
                      startTime: "09:00:00",
                      endTime: "17:00:00",
                      maxSpots: 20,
                      availableSpots: 20,
                      location: "Historical Import",
                      notes: "Auto-created during student import (no date provided)",
                    });
                    scheduleId = newSchedule.id;
                    schedulesCreated++;
                  }
                }

                // Check for existing enrollment before creating
                const existingEnrollments = await db
                  .select()
                  .from(enrollments)
                  .where(
                    and(
                      eq(enrollments.studentId, user.id),
                      eq(enrollments.courseId, courseId),
                      eq(enrollments.scheduleId, scheduleId)
                    )
                  );

                if (existingEnrollments.length === 0) {
                  await storage.createEnrollment({
                    studentId: user.id,
                    courseId,
                    scheduleId,
                    status: "completed",
                    paymentStatus: "paid",
                    paymentOption: "full",
                    completionDate: classDate || new Date(),
                  });
                  enrollmentsCreated++;
                }
              }

              // 3. OCCL — Online course enrollment
              if (row.occl) {
                const onlineCourseName = "Online NM Concealed Carry Course";

                // Check for existing online enrollment
                const existingOnline = await db
                  .select()
                  .from(onlineCourseEnrollments)
                  .where(
                    and(
                      eq(onlineCourseEnrollments.userId, user.id),
                      eq(onlineCourseEnrollments.courseName, onlineCourseName)
                    )
                  );

                if (existingOnline.length === 0) {
                  await storage.createOnlineCourseEnrollment({
                    userId: user.id,
                    courseName: onlineCourseName,
                    firstName: row.firstName || user.firstName || "",
                    lastName: row.lastName || user.lastName || "",
                    email: user.email,
                    phone: row.phone || user.phone || "",
                    dateOfBirth: row.parsedDob
                      ? new Date(row.parsedDob + "T00:00:00")
                      : user.dateOfBirth || undefined,
                    status: "completed",
                  });
                  onlineEnrollmentsCreated++;
                }
              }
            } catch (rowErr: any) {
              importErrors.push({
                row: row.rowNumber,
                error: rowErr.message,
              });
            }
          }
        } catch (userErr: any) {
          // Error at the user level — attach to all rows for that email
          for (const row of studentRows) {
            importErrors.push({
              row: row.rowNumber,
              error: `User processing error: ${userErr.message}`,
            });
          }
        }
      }

      const result: ConfirmResult = {
        usersCreated,
        usersExisting,
        enrollmentsCreated,
        onlineEnrollmentsCreated,
        schedulesCreated,
        errors: importErrors,
      };

      return res.json(result);
    } catch (err: any) {
      console.error("[ImportStudents] Confirm error:", err);
      return res
        .status(500)
        .json({ message: `Import confirm failed: ${err.message}` });
    }
  }
);

// ============================================
// POST /welcome-email/:userId — Send individual welcome email
// ============================================
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

      // Generate magic link token with 7-day expiry
      const token = generateToken();
      const expiry = getTokenExpiry(168); // 168 hours = 7 days

      // Store token on user record
      await storage.updateUser(user.id, {
        magicLinkToken: token,
        magicLinkExpiry: expiry,
      });

      // Send the email
      const sent = await sendMagicLinkEmail(
        user.email,
        user.firstName || "Student",
        token
      );

      if (sent) {
        return res.json({ success: true, message: "Welcome email sent" });
      } else {
        return res
          .status(500)
          .json({ success: false, message: "Failed to send welcome email" });
      }
    } catch (err: any) {
      console.error("[ImportStudents] Welcome email error:", err);
      return res
        .status(500)
        .json({ success: false, message: `Error: ${err.message}` });
    }
  }
);

// ============================================
// POST /welcome-emails/bulk — Bulk send welcome emails
// ============================================
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

      let sent = 0;
      let failed = 0;
      const emailErrors: { userId: string; error: string }[] = [];

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            failed++;
            emailErrors.push({ userId, error: "User not found" });
            continue;
          }

          // Generate magic link token with 7-day expiry
          const token = generateToken();
          const expiry = getTokenExpiry(168);

          // Store token on user record
          await storage.updateUser(user.id, {
            magicLinkToken: token,
            magicLinkExpiry: expiry,
          });

          // Send the email
          const success = await sendMagicLinkEmail(
            user.email,
            user.firstName || "Student",
            token
          );

          if (success) {
            sent++;
          } else {
            failed++;
            emailErrors.push({ userId, error: "Email send failed" });
          }

          // 100ms delay between sends to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err: any) {
          failed++;
          emailErrors.push({ userId, error: err.message });
        }
      }

      return res.json({ sent, failed, errors: emailErrors });
    } catch (err: any) {
      console.error("[ImportStudents] Bulk welcome email error:", err);
      return res
        .status(500)
        .json({ message: `Bulk email failed: ${err.message}` });
    }
  }
);
