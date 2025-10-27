
import { db } from "./db";
import { courses, courseSchedules, enrollments } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

async function createTestEnrollment() {
  try {
    // Find the Online New Mexico Concealed Carry course
    const onlineCCWCourse = await db.query.courses.findFirst({
      where: and(
        like(courses.title, '%online%'),
        like(courses.title, '%concealed carry%')
      ),
      with: {
        schedules: {
          where: eq(courseSchedules.deletedAt, null),
          limit: 1
        }
      }
    });

    if (!onlineCCWCourse) {
      console.error("Could not find Online New Mexico Concealed Carry course");
      return;
    }

    if (!onlineCCWCourse.schedules || onlineCCWCourse.schedules.length === 0) {
      console.error("No active schedules found for the course");
      return;
    }

    const schedule = onlineCCWCourse.schedules[0];
    const studentId = "43575331"; // Your user ID

    // Check if enrollment already exists
    const existingEnrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, onlineCCWCourse.id),
        eq(enrollments.scheduleId, schedule.id)
      )
    });

    if (existingEnrollment) {
      console.log("Enrollment already exists:", existingEnrollment.id);
      return;
    }

    // Create the enrollment
    const [newEnrollment] = await db.insert(enrollments).values({
      studentId: studentId,
      courseId: onlineCCWCourse.id,
      scheduleId: schedule.id,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentOption: 'full',
      paymentIntentId: 'test-payment-intent',
      registrationDate: new Date(),
      confirmationDate: new Date(),
    }).returning();

    console.log("✅ Test enrollment created successfully!");
    console.log("Enrollment ID:", newEnrollment.id);
    console.log("Course:", onlineCCWCourse.title);
    console.log("Schedule:", schedule.startDate);
    console.log("\nYou can now view the Live-Fire Range Sessions section in your student dashboard!");

  } catch (error) {
    console.error("Error creating test enrollment:", error);
  } finally {
    process.exit(0);
  }
}

createTestEnrollment();
