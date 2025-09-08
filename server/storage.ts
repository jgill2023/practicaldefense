import {
  users,
  courses,
  courseSchedules,
  enrollments,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type CourseSchedule,
  type InsertCourseSchedule,
  type Enrollment,
  type InsertEnrollment,
  type CourseWithSchedules,
  type EnrollmentWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Course operations
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getCourse(id: string): Promise<CourseWithSchedules | undefined>;
  getCourses(): Promise<CourseWithSchedules[]>;
  getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]>;
  
  // Course schedule operations
  createCourseSchedule(schedule: InsertCourseSchedule): Promise<CourseSchedule>;
  updateCourseSchedule(id: string, schedule: Partial<InsertCourseSchedule>): Promise<CourseSchedule>;
  getCourseSchedule(id: string): Promise<CourseSchedule | undefined>;
  getCourseSchedules(courseId: string): Promise<CourseSchedule[]>;
  
  // Enrollment operations
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment>;
  getEnrollment(id: string): Promise<EnrollmentWithDetails | undefined>;
  getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByInstructor(instructorId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Course operations
  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course> {
    const [updatedCourse] = await db
      .update(courses)
      .set({ ...course, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getCourse(id: string): Promise<CourseWithSchedules | undefined> {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
      with: {
        schedules: true,
        instructor: true,
      },
    });
    return course;
  }

  async getCourses(): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: eq(courses.isActive, true),
      with: {
        schedules: {
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
      },
      orderBy: desc(courses.createdAt),
    });
    return courseList;
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: eq(courses.instructorId, instructorId),
      with: {
        schedules: {
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
      },
      orderBy: desc(courses.createdAt),
    });
    return courseList;
  }

  // Course schedule operations
  async createCourseSchedule(schedule: InsertCourseSchedule): Promise<CourseSchedule> {
    const [newSchedule] = await db
      .insert(courseSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateCourseSchedule(id: string, schedule: Partial<InsertCourseSchedule>): Promise<CourseSchedule> {
    const [updatedSchedule] = await db
      .update(courseSchedules)
      .set(schedule)
      .where(eq(courseSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async getCourseSchedule(id: string): Promise<CourseSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.id, id));
    return schedule;
  }

  async getCourseSchedules(courseId: string): Promise<CourseSchedule[]> {
    const schedules = await db
      .select()
      .from(courseSchedules)
      .where(eq(courseSchedules.courseId, courseId))
      .orderBy(asc(courseSchedules.startDate));
    return schedules;
  }

  // Enrollment operations
  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment> {
    const [updatedEnrollment] = await db
      .update(enrollments)
      .set({ ...enrollment, updatedAt: new Date() })
      .where(eq(enrollments.id, id))
      .returning();
    return updatedEnrollment;
  }

  async getEnrollment(id: string): Promise<EnrollmentWithDetails | undefined> {
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, id),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
    });
    return enrollment;
  }

  async getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, studentId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
  }

  async getEnrollmentsByInstructor(instructorId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList.filter(e => e.course && e.course.instructorId === instructorId);
  }

  async getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.courseId, courseId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
  }
}

export const storage = new DatabaseStorage();
