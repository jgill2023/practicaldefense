import {
  users,
  categories,
  courses,
  courseSchedules,
  enrollments,
  appSettings,
  courseInformationForms,
  courseInformationFormFields,
  studentFormResponses,
  coupons,
  couponUsage,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Course,
  type InsertCourse,
  type CourseSchedule,
  type InsertCourseSchedule,
  type Enrollment,
  type InsertEnrollment,
  type AppSettings,
  type InsertAppSettings,
  type CourseWithSchedules,
  type EnrollmentWithDetails,
  type CourseInformationForm,
  type InsertCourseInformationForm,
  type CourseInformationFormField,
  type InsertCourseInformationFormField,
  type StudentFormResponse,
  type InsertStudentFormResponse,
  type CourseInformationFormWithFields,
  type Coupon,
  type InsertCoupon,
  type CouponUsage,
  type InsertCouponUsage,
  type CouponWithUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull, isNotNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  reorderCategories(updates: {id: string; sortOrder: number}[]): Promise<void>;
  
  // Course operations
  createCourse(course: InsertCourse): Promise<Course>;
  duplicateCourse(courseId: string): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<Course>;
  restoreCourse(id: string): Promise<Course>;
  permanentlyDeleteCourse(id: string): Promise<void>;
  getCourse(id: string): Promise<CourseWithSchedules | undefined>;
  getCourses(): Promise<CourseWithSchedules[]>;
  getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]>;
  getDeletedCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]>;
  
  // Course schedule operations
  createCourseSchedule(schedule: InsertCourseSchedule): Promise<CourseSchedule>;
  duplicateCourseSchedule(scheduleId: string): Promise<CourseSchedule>;
  updateCourseSchedule(id: string, schedule: Partial<InsertCourseSchedule>): Promise<CourseSchedule>;
  deleteCourseSchedule(id: string): Promise<CourseSchedule>;
  permanentlyDeleteCourseSchedule(id: string): Promise<void>;
  getCourseSchedule(id: string): Promise<CourseSchedule | undefined>;
  getCourseSchedules(courseId: string): Promise<CourseSchedule[]>;
  getDeletedSchedulesByInstructor(instructorId: string): Promise<any[]>;
  
  // Enrollment operations
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, enrollment: Partial<InsertEnrollment>): Promise<Enrollment>;
  getEnrollment(id: string): Promise<EnrollmentWithDetails | undefined>;
  getEnrollmentsByStudent(studentId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByInstructor(instructorId: string): Promise<EnrollmentWithDetails[]>;
  getEnrollmentsByCourse(courseId: string): Promise<EnrollmentWithDetails[]>;
  
  // Course Information Forms operations
  createCourseInformationForm(form: InsertCourseInformationForm): Promise<CourseInformationForm>;
  updateCourseInformationForm(id: string, form: Partial<InsertCourseInformationForm>): Promise<CourseInformationForm>;
  deleteCourseInformationForm(id: string): Promise<void>;
  getCourseInformationForm(id: string): Promise<CourseInformationFormWithFields | undefined>;
  getCourseInformationForms(): Promise<CourseInformationFormWithFields[]>;
  getCourseInformationFormsByCourse(courseId: string): Promise<CourseInformationFormWithFields[]>;
  
  // Course Information Form Fields operations
  createCourseInformationFormField(field: InsertCourseInformationFormField): Promise<CourseInformationFormField>;
  updateCourseInformationFormField(id: string, field: Partial<InsertCourseInformationFormField>): Promise<CourseInformationFormField>;
  deleteCourseInformationFormField(id: string): Promise<void>;
  getCourseInformationFormFields(formId: string): Promise<CourseInformationFormField[]>;
  reorderCourseInformationFormFields(updates: {id: string; sortOrder: number}[]): Promise<void>;
  
  // Student Form Response operations
  createStudentFormResponse(response: InsertStudentFormResponse): Promise<StudentFormResponse>;
  updateStudentFormResponse(id: string, response: Partial<InsertStudentFormResponse>): Promise<StudentFormResponse>;
  getStudentFormResponsesByEnrollment(enrollmentId: string): Promise<StudentFormResponse[]>;
  getStudentFormResponsesByForm(formId: string): Promise<StudentFormResponse[]>;
  getStudentFormResponsesWithDetails(enrollmentId: string): Promise<any[]>;
  
  // Coupon operations
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: string): Promise<void>;
  getCoupon(id: string): Promise<CouponWithUsage | undefined>;
  getCouponByCode(code: string): Promise<CouponWithUsage | undefined>;
  getCoupons(): Promise<CouponWithUsage[]>;
  getCouponsByCreator(creatorId: string): Promise<CouponWithUsage[]>;
  validateCoupon(code: string, userId: string, courseId: string): Promise<{
    isValid: boolean;
    coupon?: Coupon;
    error?: string;
  }>;
  
  // Coupon usage operations
  createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage>;
  getCouponUsageByUser(userId: string): Promise<CouponUsage[]>;
  getCouponUsageByCoupon(couponId: string): Promise<CouponUsage[]>;

  // App settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(input: InsertAppSettings): Promise<AppSettings>;
  
  // Dashboard statistics
  getInstructorDashboardStats(instructorId: string): Promise<{
    upcomingCourses: number;
    pastCourses: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...categoryData, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(
        sql`COALESCE(${categories.sortOrder}, 9999)`,
        asc(categories.name)
      );
  }

  async reorderCategories(updates: {id: string; sortOrder: number}[]): Promise<void> {
    // Perform batch update in a transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(categories)
          .set({ sortOrder: update.sortOrder })
          .where(eq(categories.id, update.id));
      }
    });
  }

  // Course operations
  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async duplicateCourse(courseId: string): Promise<Course> {
    // Get the original course
    const originalCourse = await this.getCourse(courseId);
    if (!originalCourse) {
      throw new Error('Course not found');
    }

    // Create a duplicate with a new title
    const duplicateData: InsertCourse = {
      title: `${originalCourse.title} (Copy)`,
      description: originalCourse.description,
      category: originalCourse.category,
      price: originalCourse.price,
      duration: originalCourse.duration,
      imageUrl: originalCourse.imageUrl,
      instructorId: originalCourse.instructorId,
      isActive: false, // Start as inactive/draft
    };

    const [newCourse] = await db
      .insert(courses)
      .values(duplicateData)
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

  async deleteCourse(id: string): Promise<Course> {
    // Soft delete - set deletedAt timestamp
    const [deletedCourse] = await db
      .update(courses)
      .set({ deletedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return deletedCourse;
  }

  async permanentlyDeleteCourse(id: string): Promise<void> {
    // Hard delete - permanently remove from database with cascade
    // First delete related data in proper order to maintain referential integrity
    
    // Delete course information forms (will cascade to fields and responses)
    await db
      .delete(courseInformationForms)
      .where(eq(courseInformationForms.courseId, id));
    
    // Delete enrollments (references courseSchedules)
    await db
      .delete(enrollments)
      .where(eq(enrollments.courseId, id));
    
    // Delete course schedules (references courses)
    await db
      .delete(courseSchedules)
      .where(eq(courseSchedules.courseId, id));
    
    // Finally delete the course itself
    await db
      .delete(courses)
      .where(eq(courses.id, id));
  }

  async restoreCourse(id: string): Promise<Course> {
    // Restore course by clearing deletedAt timestamp
    const [restoredCourse] = await db
      .update(courses)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return restoredCourse;
  }

  async getDeletedCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: and(eq(courses.instructorId, instructorId), isNotNull(courses.deletedAt)),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
              },
            },
            waitlistEntries: true,
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
      },
      orderBy: desc(courses.deletedAt),
    });
    return courseList;
  }

  async getCourse(id: string): Promise<CourseWithSchedules | undefined> {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
              },
            },
            waitlistEntries: true,
          },
        },
        instructor: true,
        category: true,
      },
    });
    return course;
  }

  async getCourses(): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: eq(courses.isActive, true),
      with: {
        schedules: {
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
              },
            },
            waitlistEntries: true,
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
      },
      orderBy: desc(courses.createdAt),
    });
    return courseList;
  }

  async getCoursesByInstructor(instructorId: string): Promise<CourseWithSchedules[]> {
    const courseList = await db.query.courses.findMany({
      where: and(
        eq(courses.instructorId, instructorId), 
        isNull(courses.deletedAt),
        eq(courses.isActive, true)
      ),
      with: {
        schedules: {
          where: isNull(courseSchedules.deletedAt),
          with: {
            eventSessions: true,
            enrollments: {
              with: {
                student: true,
              },
            },
            waitlistEntries: true,
          },
          orderBy: asc(courseSchedules.startDate),
        },
        instructor: true,
        category: true,
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

  async duplicateCourseSchedule(scheduleId: string): Promise<CourseSchedule> {
    // Get the original schedule
    const originalSchedule = await this.getCourseSchedule(scheduleId);
    if (!originalSchedule) {
      throw new Error('Schedule not found');
    }

    // Create a duplicate schedule with similar data
    const duplicateData: InsertCourseSchedule = {
      courseId: originalSchedule.courseId,
      startDate: originalSchedule.startDate, // Keep the same date initially
      endDate: originalSchedule.endDate,
      startTime: originalSchedule.startTime,
      endTime: originalSchedule.endTime,
      location: originalSchedule.location,
      maxSpots: originalSchedule.maxSpots,
      availableSpots: originalSchedule.maxSpots, // Reset to max capacity
      registrationDeadline: originalSchedule.registrationDeadline,
    };

    const [newSchedule] = await db
      .insert(courseSchedules)
      .values(duplicateData)
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

  async deleteCourseSchedule(id: string): Promise<CourseSchedule> {
    // Soft delete - set deletedAt timestamp
    const [deletedSchedule] = await db
      .update(courseSchedules)
      .set({ deletedAt: new Date() })
      .where(eq(courseSchedules.id, id))
      .returning();
    return deletedSchedule;
  }

  async permanentlyDeleteCourseSchedule(id: string): Promise<void> {
    // Hard delete - permanently remove from database
    await db
      .delete(courseSchedules)
      .where(eq(courseSchedules.id, id));
  }

  async getDeletedSchedulesByInstructor(instructorId: string): Promise<any[]> {
    const scheduleList = await db.query.courseSchedules.findMany({
      where: and(
        isNotNull(courseSchedules.deletedAt),
        eq(courseSchedules.courseId, 
          db.select({ id: courses.id })
            .from(courses)
            .where(eq(courses.instructorId, instructorId))
        )
      ),
      with: {
        course: true,
        enrollments: {
          with: {
            student: true,
          },
        },
        waitlistEntries: true,
      },
      orderBy: desc(courseSchedules.deletedAt),
    });
    return scheduleList.filter(schedule => schedule.course !== null);
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

  async getEnrollmentsByScheduleId(scheduleId: string): Promise<EnrollmentWithDetails[]> {
    const enrollmentList = await db.query.enrollments.findMany({
      where: eq(enrollments.scheduleId, scheduleId),
      with: {
        course: true,
        schedule: true,
        student: true,
      },
      orderBy: desc(enrollments.createdAt),
    });
    return enrollmentList;
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

  // Dashboard statistics
  async getInstructorDashboardStats(instructorId: string): Promise<{
    upcomingCourses: number;
    pastCourses: number;
    allStudents: number;
    totalRevenue: number;
    outstandingRevenue: number;
  }> {
    const now = new Date();
    
    // Get all courses for this instructor
    const instructorCourses = await db.query.courses.findMany({
      where: eq(courses.instructorId, instructorId),
      with: {
        schedules: {
          where: isNull(courseSchedules.deletedAt),
        },
      },
    });

    // Get all enrollments for instructor's courses
    const allEnrollments = await db.query.enrollments.findMany({
      with: {
        course: true,
        schedule: true,
        student: true,
      },
    });

    // Filter enrollments for this instructor's courses
    const instructorEnrollments = allEnrollments.filter(e => 
      e.course && e.course.instructorId === instructorId
    );

    // Calculate upcoming courses
    const upcomingCourses = instructorCourses.reduce((count, course) => {
      const upcomingSchedules = course.schedules.filter(schedule => 
        schedule.startDate && new Date(schedule.startDate) > now
      );
      return count + upcomingSchedules.length;
    }, 0);

    // Calculate past courses
    const pastCourses = instructorCourses.reduce((count, course) => {
      const pastSchedules = course.schedules.filter(schedule => 
        schedule.endDate && new Date(schedule.endDate) < now
      );
      return count + pastSchedules.length;
    }, 0);

    // Calculate unique students (all students who have enrolled)
    const uniqueStudentIds = new Set(instructorEnrollments.map(e => e.studentId));
    const allStudents = uniqueStudentIds.size;

    // Calculate total revenue (all paid enrollments)
    const totalRevenue = instructorEnrollments
      .filter(e => e.paymentStatus === 'paid')
      .reduce((sum, e) => {
        const price = parseFloat(e.course?.price || '0');
        return sum + price;
      }, 0);

    // Calculate outstanding revenue (enrollments with deposit only)
    const outstandingRevenue = instructorEnrollments
      .filter(e => e.paymentStatus === 'deposit')
      .reduce((sum, e) => {
        const price = parseFloat(e.course?.price || '0');
        const depositAmount = 50; // Default deposit amount or get from course settings
        return sum + (price - depositAmount);
      }, 0);

    return {
      upcomingCourses,
      pastCourses,
      allStudents,
      totalRevenue,
      outstandingRevenue,
    };
  }

  // App settings operations
  async getAppSettings(): Promise<AppSettings> {
    const settings = await db.select().from(appSettings).limit(1);
    
    if (settings.length === 0) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(appSettings).values({
        homeCoursesLimit: 20,
      }).returning();
      return newSettings;
    }
    
    return settings[0];
  }

  async updateAppSettings(input: InsertAppSettings): Promise<AppSettings> {
    const existingSettings = await db.select().from(appSettings).limit(1);
    
    if (existingSettings.length === 0) {
      // Create new settings if none exist
      const [newSettings] = await db.insert(appSettings).values({
        ...input,
      }).returning();
      return newSettings;
    }
    
    // Update existing settings
    const [updatedSettings] = await db.update(appSettings)
      .set({
        ...input,
        updatedAt: sql`now()`,
      })
      .where(eq(appSettings.id, existingSettings[0].id))
      .returning();
    
    return updatedSettings;
  }

  // Course Information Forms operations
  async createCourseInformationForm(form: InsertCourseInformationForm): Promise<CourseInformationForm> {
    const [newForm] = await db.insert(courseInformationForms).values(form).returning();
    return newForm;
  }

  async updateCourseInformationForm(id: string, form: Partial<InsertCourseInformationForm>): Promise<CourseInformationForm> {
    const [updatedForm] = await db
      .update(courseInformationForms)
      .set({
        ...form,
        updatedAt: sql`now()`,
      })
      .where(eq(courseInformationForms.id, id))
      .returning();
    return updatedForm;
  }

  async deleteCourseInformationForm(id: string): Promise<void> {
    await db.delete(courseInformationForms).where(eq(courseInformationForms.id, id));
  }

  async getCourseInformationForm(id: string): Promise<CourseInformationFormWithFields | undefined> {
    const form = await db.query.courseInformationForms.findFirst({
      where: eq(courseInformationForms.id, id),
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
      },
    });
    return form as CourseInformationFormWithFields | undefined;
  }

  async getCourseInformationForms(): Promise<CourseInformationFormWithFields[]> {
    const forms = await db.query.courseInformationForms.findMany({
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
      },
      orderBy: asc(courseInformationForms.sortOrder),
    });
    return forms as CourseInformationFormWithFields[];
  }

  async getCourseInformationFormsByCourse(courseId: string): Promise<CourseInformationFormWithFields[]> {
    const forms = await db.query.courseInformationForms.findMany({
      where: eq(courseInformationForms.courseId, courseId),
      with: {
        fields: {
          orderBy: asc(courseInformationFormFields.sortOrder),
        },
        course: true,
      },
      orderBy: asc(courseInformationForms.sortOrder),
    });
    return forms as CourseInformationFormWithFields[];
  }

  // Course Information Form Fields operations
  async createCourseInformationFormField(field: InsertCourseInformationFormField): Promise<CourseInformationFormField> {
    const [newField] = await db.insert(courseInformationFormFields).values(field).returning();
    return newField;
  }

  async updateCourseInformationFormField(id: string, field: Partial<InsertCourseInformationFormField>): Promise<CourseInformationFormField> {
    const [updatedField] = await db
      .update(courseInformationFormFields)
      .set({
        ...field,
        updatedAt: sql`now()`,
      })
      .where(eq(courseInformationFormFields.id, id))
      .returning();
    return updatedField;
  }

  async deleteCourseInformationFormField(id: string): Promise<void> {
    await db.delete(courseInformationFormFields).where(eq(courseInformationFormFields.id, id));
  }

  async getCourseInformationFormFields(formId: string): Promise<CourseInformationFormField[]> {
    const fields = await db
      .select()
      .from(courseInformationFormFields)
      .where(eq(courseInformationFormFields.formId, formId))
      .orderBy(asc(courseInformationFormFields.sortOrder));
    return fields;
  }

  async reorderCourseInformationFormFields(updates: {id: string; sortOrder: number}[]): Promise<void> {
    for (const update of updates) {
      await db
        .update(courseInformationFormFields)
        .set({ 
          sortOrder: update.sortOrder,
          updatedAt: sql`now()`,
        })
        .where(eq(courseInformationFormFields.id, update.id));
    }
  }

  // Student Form Response operations
  async createStudentFormResponse(response: InsertStudentFormResponse): Promise<StudentFormResponse> {
    const [newResponse] = await db.insert(studentFormResponses).values(response).returning();
    return newResponse;
  }

  async updateStudentFormResponse(id: string, response: Partial<InsertStudentFormResponse>): Promise<StudentFormResponse> {
    const [updatedResponse] = await db
      .update(studentFormResponses)
      .set(response)
      .where(eq(studentFormResponses.id, id))
      .returning();
    return updatedResponse;
  }

  async getStudentFormResponsesByEnrollment(enrollmentId: string): Promise<StudentFormResponse[]> {
    const responses = await db
      .select()
      .from(studentFormResponses)
      .where(eq(studentFormResponses.enrollmentId, enrollmentId));
    return responses;
  }

  async getStudentFormResponsesByForm(formId: string): Promise<StudentFormResponse[]> {
    const responses = await db
      .select()
      .from(studentFormResponses)
      .where(eq(studentFormResponses.formId, formId));
    return responses;
  }

  async getStudentFormResponsesWithDetails(enrollmentId: string): Promise<any[]> {
    const responses = await db.query.studentFormResponses.findMany({
      where: eq(studentFormResponses.enrollmentId, enrollmentId),
      with: {
        field: true,
        form: {
          with: {
            course: true,
          },
        },
        enrollment: {
          with: {
            student: true,
            course: true,
            schedule: true,
          },
        },
      },
      orderBy: asc(studentFormResponses.submittedAt),
    });
    return responses;
  }

  // Coupon operations
  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons).values({
      ...coupon,
      discountValue: coupon.discountValue.toString(),
      minimumOrderAmount: coupon.minimumOrderAmount?.toString(),
    }).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon> {
    const updateData: any = { ...coupon };
    if (coupon.discountValue !== undefined) {
      updateData.discountValue = coupon.discountValue.toString();
    }
    if (coupon.minimumOrderAmount !== undefined) {
      updateData.minimumOrderAmount = coupon.minimumOrderAmount.toString();
    }
    
    const [updatedCoupon] = await db
      .update(coupons)
      .set({
        ...updateData,
        updatedAt: sql`now()`,
      })
      .where(eq(coupons.id, id))
      .returning();
    return updatedCoupon;
  }

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async getCoupon(id: string): Promise<CouponWithUsage | undefined> {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
      with: {
        creator: true,
        usage: {
          with: {
            user: true,
            enrollment: true,
          },
        },
      },
    });
    return coupon as CouponWithUsage | undefined;
  }

  async getCouponByCode(code: string): Promise<CouponWithUsage | undefined> {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
      with: {
        creator: true,
        usage: {
          with: {
            user: true,
            enrollment: true,
          },
        },
      },
    });
    return coupon as CouponWithUsage | undefined;
  }

  async getCoupons(): Promise<CouponWithUsage[]> {
    const allCoupons = await db.query.coupons.findMany({
      with: {
        creator: true,
        usage: {
          with: {
            user: true,
            enrollment: true,
          },
        },
      },
      orderBy: desc(coupons.createdAt),
    });
    return allCoupons as CouponWithUsage[];
  }

  async getCouponsByCreator(creatorId: string): Promise<CouponWithUsage[]> {
    const creatorCoupons = await db.query.coupons.findMany({
      where: eq(coupons.createdBy, creatorId),
      with: {
        creator: true,
        usage: {
          with: {
            user: true,
            enrollment: true,
          },
        },
      },
      orderBy: desc(coupons.createdAt),
    });
    return creatorCoupons as CouponWithUsage[];
  }

  async validateCoupon(code: string, userId: string, courseId: string): Promise<{
    isValid: boolean;
    coupon?: Coupon;
    error?: string;
  }> {
    const coupon = await this.getCouponByCode(code);
    
    if (!coupon) {
      return { isValid: false, error: "Coupon code not found" };
    }
    
    if (!coupon.isActive) {
      return { isValid: false, error: "Coupon is no longer active" };
    }
    
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return { isValid: false, error: "Coupon is not yet valid" };
    }
    
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return { isValid: false, error: "Coupon has expired" };
    }
    
    // Check total usage limit
    if (coupon.maxUsageTotal && coupon.currentUsageCount >= coupon.maxUsageTotal) {
      return { isValid: false, error: "Coupon usage limit reached" };
    }
    
    // Check per-user usage limit
    const userUsageCount = coupon.usage.filter(usage => usage.userId === userId).length;
    if (userUsageCount >= coupon.maxUsagePerUser) {
      return { isValid: false, error: "You have reached the usage limit for this coupon" };
    }
    
    // Check course restrictions
    if (coupon.applicableCourseIds && coupon.applicableCourseIds.length > 0) {
      if (!coupon.applicableCourseIds.includes(courseId)) {
        return { isValid: false, error: "Coupon is not valid for this course" };
      }
    }
    
    return { isValid: true, coupon };
  }

  // Coupon usage operations
  async createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage> {
    const [newUsage] = await db.insert(couponUsage).values(usage).returning();
    
    // Update coupon usage count
    await db
      .update(coupons)
      .set({
        currentUsageCount: sql`${coupons.currentUsageCount} + 1`,
      })
      .where(eq(coupons.id, usage.couponId));
    
    return newUsage;
  }

  async getCouponUsageByUser(userId: string): Promise<CouponUsage[]> {
    const usage = await db
      .select()
      .from(couponUsage)
      .where(eq(couponUsage.userId, userId))
      .orderBy(desc(couponUsage.usedAt));
    return usage;
  }

  async getCouponUsageByCoupon(couponId: string): Promise<CouponUsage[]> {
    const usage = await db
      .select()
      .from(couponUsage)
      .where(eq(couponUsage.couponId, couponId))
      .orderBy(desc(couponUsage.usedAt));
    return usage;
  }
}

export const storage = new DatabaseStorage();
