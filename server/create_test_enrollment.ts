
import { db } from "./db";
import { courses, courseSchedules, enrollments, users } from "@shared/schema";
import { eq, and, like, isNull } from "drizzle-orm";
import { NotificationEngine } from "./notificationEngine";

async function createTestEnrollment() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const courseTitle = args[0] || 'online'; // Default search term
    const studentEmail = args[1]; // Optional: specific student email
    
    console.log(`\n🔍 Searching for courses matching: "${courseTitle}"`);
    
    // Find courses matching the search term
    const matchingCourses = await db.query.courses.findMany({
      where: and(
        like(courses.title, `%${courseTitle}%`),
        isNull(courses.deletedAt)
      ),
      with: {
        schedules: {
          where: and(
            isNull(courseSchedules.deletedAt),
            eq(courseSchedules.isRecurring, false) // Avoid recurring schedules
          ),
          limit: 1
        }
      }
    });

    if (matchingCourses.length === 0) {
      console.error(`❌ No courses found matching "${courseTitle}"`);
      console.log("\nTip: Try searching with a different term, e.g.:");
      console.log("  npm run test-enrollment concealed");
      console.log("  npm run test-enrollment defensive");
      return;
    }

    console.log(`\n📚 Found ${matchingCourses.length} course(s):`);
    matchingCourses.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.title} (${c.schedules.length} schedule(s))`);
    });

    // Use the first matching course
    const selectedCourse = matchingCourses[0];
    
    if (!selectedCourse.schedules || selectedCourse.schedules.length === 0) {
      console.error(`❌ No active schedules found for "${selectedCourse.title}"`);
      console.log("\nTip: Create a schedule for this course first");
      return;
    }

    const schedule = selectedCourse.schedules[0];
    
    // Determine student ID
    let studentId: string;
    let student;
    
    if (studentEmail) {
      student = await db.query.users.findFirst({
        where: eq(users.email, studentEmail)
      });
      
      if (!student) {
        console.error(`❌ No user found with email: ${studentEmail}`);
        return;
      }
      studentId = student.id;
    } else {
      // Use the instructor's ID (you) as default
      studentId = "43575331";
      student = await db.query.users.findFirst({
        where: eq(users.id, studentId)
      });
    }

    console.log(`\n👤 Creating enrollment for: ${student?.firstName} ${student?.lastName} (${student?.email})`);

    // Check if enrollment already exists
    const existingEnrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, selectedCourse.id),
        eq(enrollments.scheduleId, schedule.id)
      )
    });

    if (existingEnrollment) {
      console.log(`\n⚠️  Enrollment already exists (ID: ${existingEnrollment.id})`);
      console.log("\nTesting notifications with existing enrollment...");
      
      // Test notifications even if enrollment exists
      if (student) {
        console.log("\n📧 Triggering enrollment confirmation notification...");
        await NotificationEngine.processEventTriggers('enrollment_confirmed', {
          userId: studentId,
          courseId: selectedCourse.id,
          scheduleId: schedule.id,
          enrollmentId: existingEnrollment.id
        });
      }
      
      return;
    }

    // Create the enrollment
    const [newEnrollment] = await db.insert(enrollments).values({
      studentId: studentId,
      courseId: selectedCourse.id,
      scheduleId: schedule.id,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentOption: 'full',
      paymentIntentId: `test-${Date.now()}`,
      registrationDate: new Date(),
      confirmationDate: new Date(),
    }).returning();

    console.log("\n✅ Test enrollment created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 Enrollment ID: ${newEnrollment.id}`);
    console.log(`📚 Course: ${selectedCourse.title}`);
    console.log(`📅 Schedule: ${new Date(schedule.startDate).toLocaleDateString()}`);
    console.log(`🎯 Status: ${newEnrollment.status}`);
    console.log(`💳 Payment: ${newEnrollment.paymentStatus}`);
    
    // Trigger notification events
    if (student) {
      console.log("\n📧 Triggering notifications...");
      
      // Trigger enrollment creation event
      await NotificationEngine.processEventTriggers('enrollment_created', {
        userId: studentId,
        courseId: selectedCourse.id,
        scheduleId: schedule.id,
        enrollmentId: newEnrollment.id
      });
      
      // Trigger enrollment confirmation event
      await NotificationEngine.processEventTriggers('enrollment_confirmed', {
        userId: studentId,
        courseId: selectedCourse.id,
        scheduleId: schedule.id,
        enrollmentId: newEnrollment.id
      });
      
      // Trigger payment received event
      await NotificationEngine.processEventTriggers('payment_received', {
        userId: studentId,
        courseId: selectedCourse.id,
        scheduleId: schedule.id,
        enrollmentId: newEnrollment.id
      });
      
      console.log("✅ Notification events triggered!");
    }

    console.log("\n💡 Next steps:");
    console.log("  1. Check the notification_logs table in the database");
    console.log("  2. Check your email inbox for test notifications");
    console.log("  3. Check SMS if phone number is configured");
    console.log("  4. View enrollment in student dashboard");

  } catch (error) {
    console.error("\n❌ Error creating test enrollment:", error);
  } finally {
    process.exit(0);
  }
}

createTestEnrollment();
