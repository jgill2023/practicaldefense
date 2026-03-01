import { storage } from './storage';
import { NotificationEmailService } from './emailService';
import { NotificationSmsService } from './smsService';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  type NotificationTemplateWithDetails, 
  type NotificationScheduleWithDetails,
  type User,
  type CourseWithSchedules,
  type CourseSchedule,
  type EnrollmentWithDetails,
  type StudentFormResponse,
  type InsertNotificationLog,
  type InstructorAppointment,
  type AppointmentType
} from '@shared/schema';

// Instructor timezone for appointment time display
const INSTRUCTOR_TIMEZONE = 'America/Denver';

export interface NotificationVariables {
  student?: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    licenseNumber?: string;
    licenseExpiration?: string;
  };
  course?: {
    name: string;
    description: string;
    price: number;
    category: string;
  };
  schedule?: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    maxSpots: number;
    availableSpots: number;
    dayOfWeek?: string;
    arrivalTime?: string;
    rangeName?: string;
    classroomName?: string;
    googleMapsLink?: string;
  };
  appointment?: {
    startDate: string;
    startTime: string;
    endTime: string;
    date: string;
    time: string;
    duration: string;
    status: string;
    studentNotes?: string;
    partySize?: number;
  };
  appointmentType?: {
    title: string;
    description?: string;
    duration: string;
    price: string;
  };
  instructor?: {
    name: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  enrollment?: {
    paymentStatus: string;
    amountPaid: number;
    remainingBalance: number;
    registrationDate: string;
  };
  refund?: {
    amount: string;
    processedAt: string;
    reason?: string;
  };
  moodle?: {
    username: string;
    password?: string;
    url: string;
    loginDetails: string;
  };
  questionnaire?: Record<string, any>;
  system?: {
    companyName: string;
    companyPhone: string;
    companyEmail: string;
    website: string;
    currentDate: string;
  };
}

export class NotificationEngine {
  private static readonly SYSTEM_VARIABLES = {
    companyName: 'Practical Defense Training',
    companyPhone: '(555) 123-4567',
    companyEmail: 'Info@abqconcealedcarry.com',
    website: 'abqconcealedcarry.com',
    websiteUrl: process.env.APP_URL || 'https://abqconcealedcarry.com',
    currentDate: new Date().toLocaleDateString()
  };

  /**
   * Flat variable aliases for backward compatibility with existing templates
   * Maps flat variable names (e.g., firstName) to nested paths (e.g., student.firstName)
   */
  private static readonly FLAT_ALIAS_MAP: Record<string, string> = {
    // Student aliases
    firstName: 'student.firstName',
    lastName: 'student.lastName',
    name: 'student.name',
    email: 'student.email',
    phone: 'student.phone',
    address: 'student.address',
    city: 'student.city',
    state: 'student.state',
    zipCode: 'student.zipCode',
    licenseNumber: 'student.licenseNumber',
    licenseExpiration: 'student.licenseExpiration',
    
    // Course aliases
    courseName: 'course.name',
    courseDescription: 'course.description',
    coursePrice: 'course.price',
    courseCategory: 'course.category',
    
    // Schedule aliases
    startDate: 'schedule.startDate',
    endDate: 'schedule.endDate',
    startTime: 'schedule.startTime',
    endTime: 'schedule.endTime',
    location: 'schedule.location',
    maxSpots: 'schedule.maxSpots',
    availableSpots: 'schedule.availableSpots',
    dayOfWeek: 'schedule.dayOfWeek',
    arrivalTime: 'schedule.arrivalTime',
    rangeName: 'schedule.rangeName',
    classroomName: 'schedule.classroomName',
    googleMapsLink: 'schedule.googleMapsLink',
    
    // Appointment aliases
    appointmentDate: 'appointment.date',
    appointmentTime: 'appointment.time',
    appointmentStartTime: 'appointment.startTime',
    appointmentEndTime: 'appointment.endTime',
    appointmentDuration: 'appointment.duration',
    appointmentStatus: 'appointment.status',
    appointmentNotes: 'appointment.studentNotes',
    
    // Appointment Type aliases
    appointmentType: 'appointmentType.title',
    appointmentTypeName: 'appointmentType.title',
    appointmentTypeTitle: 'appointmentType.title',
    appointmentTypeDescription: 'appointmentType.description',
    appointmentTypePrice: 'appointmentType.price',
    appointmentTypeDuration: 'appointmentType.duration',
    price: 'appointmentType.price',
    
    // Instructor aliases
    studentName: 'student.name',
    studentFirstName: 'student.firstName',
    studentLastName: 'student.lastName',
    studentEmail: 'student.email',
    studentPhone: 'student.phone',
    instructorName: 'instructor.name',
    instructorFirstName: 'instructor.firstName',
    instructorLastName: 'instructor.lastName',
    instructorEmail: 'instructor.email',
    instructorPhone: 'instructor.phone',
    
    // Enrollment aliases
    paymentStatus: 'enrollment.paymentStatus',
    amountPaid: 'enrollment.amountPaid',
    remainingBalance: 'enrollment.remainingBalance',
    registrationDate: 'enrollment.registrationDate',
    
    // Refund aliases
    refundAmount: 'refund.amount',
    refundProcessedAt: 'refund.processedAt',
    refundReason: 'refund.reason',
    
    // System aliases
    companyName: 'system.companyName',
    companyPhone: 'system.companyPhone',
    companyEmail: 'system.companyEmail',
    website: 'system.website',
    websiteUrl: 'system.websiteUrl',
    currentDate: 'system.currentDate',

    // Moodle / online course aliases
    moodleUsername: 'moodle.username',
    moodlePassword: 'moodle.password',
    moodleUrl: 'moodle.url',
    moodleLoginDetails: 'moodle.loginDetails',

    // License reminder aliases
    nextCourseName: 'course.name',
    nextCourseDate: 'schedule.startDate',
    nextCourseTime: 'schedule.startTime',
    nextCourseLocation: 'schedule.location',
    nextCourseAvailableSpots: 'schedule.availableSpots',
  };

  /**
   * Process template variables and replace them in content
   * Supports both flat ({{firstName}}) and nested ({{student.firstName}}) variable names
   * Also supports single braces {firstName} for backward compatibility
   */
  static processTemplate(content: string, variables: NotificationVariables): string {
    let processedContent = content;

    const replaceVariable = (placeholder: string): string => {
      const trimmedPath = placeholder.trim();
      
      // If it's a flat alias (no dots), try the alias map first
      if (!trimmedPath.includes('.')) {
        const nestedPath = this.FLAT_ALIAS_MAP[trimmedPath];
        if (nestedPath) {
          const value = this.getNestedValue(variables, nestedPath);
          if (value !== undefined) {
            return String(value);
          }
        }
      }
      
      // Otherwise try the path directly
      const value = this.getNestedValue(variables, trimmedPath);
      return value !== undefined && typeof value !== 'object' ? String(value) : '';
    };

    // Replace double braces first {{var}}
    processedContent = processedContent.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
      const result = replaceVariable(placeholder);
      return result || match;
    });

    // Then replace single braces {var} (only if not already part of double braces)
    processedContent = processedContent.replace(/\{([^{}]+)\}/g, (match, placeholder) => {
      const result = replaceVariable(placeholder);
      return result || match;
    });

    return processedContent;
  }

  /**
   * Get nested value from object using dot notation (e.g., "student.firstName")
   * Safely handles missing nested objects and properties
   */
  private static getNestedValue(obj: any, path: string): any {
    try {
      return path.split('.').reduce((current, key) => {
        // Safely check if current exists and has the key
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        return current[key];
      }, obj);
    } catch (error) {
      // If any error occurs during traversal, return undefined
      console.warn(`Error accessing path '${path}' in template variables:`, error);
      return undefined;
    }
  }

  /**
   * Build notification variables from enrollment data
   */
  static async buildNotificationVariables(
    student: User,
    course?: CourseWithSchedules,
    schedule?: CourseSchedule,
    enrollment?: EnrollmentWithDetails,
    questionnaireResponses?: StudentFormResponse[]
  ): Promise<NotificationVariables> {
    const variables: NotificationVariables = {
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        address: student.streetAddress || '',
        city: student.city || '',
        state: student.state || '',
        zipCode: student.zipCode || '',
        licenseNumber: '', // No license number field in schema
        licenseExpiration: this.safeFormatDate(student.concealedCarryLicenseExpiration) || '',
      },
      system: this.SYSTEM_VARIABLES
    };

    if (course) {
      variables.course = {
        name: course.title,
        description: course.description || '',
        price: parseFloat(course.price),
        category: course.category || '',
      };
    }

    if (schedule) {
      variables.schedule = {
        startDate: this.safeFormatDate(schedule.startDate) || '',
        endDate: this.safeFormatDate(schedule.endDate) || '',
        startTime: this.formatTime(schedule.startTime),
        endTime: this.formatTime(schedule.endTime),
        location: schedule.location || '',
        maxSpots: schedule.maxSpots,
        availableSpots: schedule.availableSpots,
        dayOfWeek: schedule.dayOfWeek || '',
        arrivalTime: schedule.arrivalTime ? this.formatTime(schedule.arrivalTime) : '',
        rangeName: schedule.rangeName || '',
        classroomName: schedule.classroomName || '',
        googleMapsLink: schedule.googleMapsLink || '',
      };
    }

    if (enrollment) {
      const paymentBalance = await storage.getPaymentBalance(enrollment.id);
      variables.enrollment = {
        paymentStatus: enrollment.paymentStatus,
        amountPaid: 0, // Amount paid not stored directly
        remainingBalance: paymentBalance.remainingBalance,
        registrationDate: this.safeFormatDate(enrollment.createdAt, 'locale') || '',
      };
      
      // Add refund information if the enrollment has been refunded
      if (enrollment.refundProcessed && enrollment.refundProcessedAt) {
        variables.refund = {
          amount: enrollment.refundAmount || 'N/A',
          processedAt: this.safeFormatDate(enrollment.refundProcessedAt, 'locale') || '',
          reason: enrollment.refundReason || '',
        };
      }
    }

    // Process questionnaire responses into key-value pairs
    if (questionnaireResponses && questionnaireResponses.length > 0) {
      variables.questionnaire = {};
      questionnaireResponses.forEach(response => {
        if (response.response) {
          // Create a safe key from the field id
          const key = `field_${response.fieldId}`;
          variables.questionnaire![key] = response.response;
        }
      });
    }

    return variables;
  }

  /**
   * Build notification variables from appointment data
   */
  static async buildAppointmentNotificationVariables(
    appointment: InstructorAppointment,
    appointmentType: AppointmentType,
    student: User,
    instructor?: User
  ): Promise<NotificationVariables> {
    // Parse appointment times (stored in UTC)
    const startTimeUTC = new Date(appointment.startTime);
    const endTimeUTC = new Date(appointment.endTime);

    // Extract time in HH:MM format directly in instructor's timezone
    const startTimeHHMM = formatInTimeZone(startTimeUTC, INSTRUCTOR_TIMEZONE, 'HH:mm');
    const endTimeHHMM = formatInTimeZone(endTimeUTC, INSTRUCTOR_TIMEZONE, 'HH:mm');

    // Format using existing helper methods
    const startTimeFormatted = this.formatTime(startTimeHHMM);
    const endTimeFormatted = this.formatTime(endTimeHHMM);
    const appointmentTime = `${startTimeFormatted} - ${endTimeFormatted}`;

    // Format date directly in instructor's timezone for readability
    const appointmentDate = formatInTimeZone(startTimeUTC, INSTRUCTOR_TIMEZONE, 'EEEE, MMMM d, yyyy');

    const variables: NotificationVariables = {
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        address: student.streetAddress || '',
        city: student.city || '',
        state: student.state || '',
        zipCode: student.zipCode || '',
        licenseNumber: '',
        licenseExpiration: this.safeFormatDate(student.concealedCarryLicenseExpiration) || '',
      },
      appointment: {
        startDate: formatInTimeZone(startTimeUTC, INSTRUCTOR_TIMEZONE, 'MM/dd/yyyy'),
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        date: appointmentDate,
        time: appointmentTime,
        duration: `${appointmentType.durationMinutes} minutes`,
        status: appointment.status,
        studentNotes: appointment.studentNotes || undefined,
        partySize: appointment.partySize || 1,
      },
      appointmentType: {
        title: appointmentType.title,
        description: appointmentType.description || undefined,
        duration: `${appointmentType.durationMinutes} minutes`,
        price: `$${Number(appointmentType.price).toFixed(2)}`,
      },
      schedule: {
        startDate: appointmentDate,
        endDate: appointmentDate,
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        location: appointmentType.location || '',
        maxSpots: 1,
        availableSpots: 1,
        dayOfWeek: '',
        arrivalTime: '',
        rangeName: '',
        classroomName: '',
        googleMapsLink: '',
      },
      system: this.SYSTEM_VARIABLES
    };

    if (instructor) {
      variables.instructor = {
        name: `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim(),
        firstName: instructor.firstName || '',
        lastName: instructor.lastName || '',
        email: instructor.email || '',
        phone: instructor.phone || '',
      };
    }

    return variables;
  }

  /**
   * Build notification variables from context (used for manual notifications)
   * Fetches data based on provided context IDs and merges variables from all sources
   * Throws an error if required data cannot be found
   */
  static async buildVariablesFromContext(context: {
    studentId?: string;
    enrollmentId?: string;
    courseId?: string;
    scheduleId?: string;
    appointmentId?: string;
    instructorId?: string;
  }): Promise<NotificationVariables> {
    let variables: NotificationVariables = {
      system: this.SYSTEM_VARIABLES
    };

    try {
      // Fetch data in parallel where possible
      const [student, enrollment, course, schedule, appointment] = await Promise.all([
        context.studentId ? storage.getUser(context.studentId) : null,
        context.enrollmentId ? storage.getEnrollment(context.enrollmentId) : null,
        context.courseId ? storage.getCourse(context.courseId) : null,
        context.scheduleId ? storage.getCourseSchedule(context.scheduleId) : null,
        context.appointmentId ? storage.getAppointment(context.appointmentId) : null,
      ]);

      // Validate that explicitly requested data was found
      if (context.studentId && !student) {
        throw new Error(`Student not found for ID: ${context.studentId}`);
      }
      if (context.enrollmentId && !enrollment) {
        throw new Error(`Enrollment not found for ID: ${context.enrollmentId}`);
      }
      if (context.courseId && !course) {
        throw new Error(`Course not found for ID: ${context.courseId}`);
      }
      if (context.scheduleId && !schedule) {
        throw new Error(`Schedule not found for ID: ${context.scheduleId}`);
      }
      if (context.appointmentId && !appointment) {
        throw new Error(`Appointment not found for ID: ${context.appointmentId}`);
      }

      // If we have an appointment, build appointment-specific variables
      if (appointment) {
        const [appointmentType, appointmentStudent, instructor] = await Promise.all([
          storage.getAppointmentType(appointment.appointmentTypeId),
          appointment.studentId ? storage.getUser(appointment.studentId) : null,
          context.instructorId ? storage.getUser(context.instructorId) : null,
        ]);

        // Validate required appointment data
        if (!appointmentType) {
          throw new Error(`Appointment type not found for appointment ID: ${context.appointmentId}`);
        }
        if (!appointmentStudent) {
          throw new Error(`Student not found for appointment ID: ${context.appointmentId}`);
        }

        const appointmentVars = await this.buildAppointmentNotificationVariables(
          appointment,
          appointmentType,
          appointmentStudent,
          instructor || undefined
        );
        // Merge appointment variables
        variables = { ...variables, ...appointmentVars };
      }

      // If we have student/enrollment/course/schedule data, build course-related variables
      // Get student from direct ID or enrollment
      let courseStudent = student;
      if (!courseStudent && enrollment) {
        courseStudent = await storage.getUser((enrollment as any).userId);
      }
      
      // Build course variables if we have a student (even without course/enrollment data)
      // This ensures student template variables are always populated when studentId is provided
      if (courseStudent) {
        const courseVars = await this.buildNotificationVariables(
          courseStudent,
          course || undefined,
          schedule || undefined,
          enrollment || undefined,
          []
        );
        // Merge course variables (but don't overwrite appointment variables if they exist)
        variables = { 
          student: variables.student || courseVars.student,
          course: courseVars.course,
          schedule: variables.schedule || courseVars.schedule, // Keep appointment schedule if exists
          enrollment: courseVars.enrollment,
          refund: courseVars.refund,
          questionnaire: courseVars.questionnaire,
          appointment: variables.appointment, // Keep appointment if exists
          appointmentType: variables.appointmentType, // Keep appointmentType if exists
          instructor: variables.instructor || courseVars.instructor,
          system: variables.system
        };
      }

    } catch (error) {
      console.error('Error building variables from context:', error);
      // Re-throw validation errors so routes can handle them
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Student') || error.message.includes('Appointment'))) {
        throw error;
      }
      // For other errors, return partial variables - processTemplate will leave unresolved placeholders
      console.warn('Returning partial variables due to error:', error);
    }

    return variables;
  }

  /**
   * Send notification based on template
   */
  static async sendNotification(params: {
    templateId: string;
    recipientId: string;
    courseId?: string;
    courseScheduleId?: string; // Course schedule ID for template variables
    notificationScheduleId?: string; // Notification schedule ID for log reference
    enrollmentId?: string;
    variables?: NotificationVariables;
    triggerEvent?: string;
    manualSend?: boolean;
  }): Promise<{ success: boolean; error?: string; logId?: string }> {
    try {
      // Get the template
      const template = await storage.getNotificationTemplate(params.templateId);
      if (!template) {
        throw new Error('Notification template not found');
      }

      if (!template.isActive) {
        throw new Error('Notification template is not active');
      }

      // Get recipient
      const recipient = await storage.getUser(params.recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Validate contact preferences before sending
      const canSend = this.validateContactPreferences(recipient, template.type);
      if (!canSend) {
        throw new Error(`User ${recipient.id} has not opted in to receive ${template.type} notifications`);
      }

      // Check SMS opt-out for SMS notifications (placeholder - SMS preferences not in schema yet)
      if (template.type === 'sms') {
        // TODO: Add SMS preferences to user schema
        console.log(`SMS notification will be sent to user ${recipient.id}`);
      }

      // Build variables if not provided
      let variables = params.variables;
      if (!variables) {
        let course, schedule, enrollment;
        
        if (params.courseId) {
          course = await storage.getCourse(params.courseId);
        }
        if (params.courseScheduleId) {
          schedule = await storage.getCourseSchedule(params.courseScheduleId);
        }
        if (params.enrollmentId) {
          enrollment = await storage.getEnrollment(params.enrollmentId);
        }

        // Get questionnaire responses if enrollment exists
        let questionnaireResponses: any[] = [];
        if (enrollment) {
          try {
            questionnaireResponses = await storage.getStudentFormResponsesByEnrollment(enrollment.id);
          } catch (error) {
            console.log('Could not fetch form responses:', error);
          }
        }

        variables = await this.buildNotificationVariables(
          recipient,
          course,
          schedule,
          enrollment,
          questionnaireResponses
        );
      }

      // Process template content
      const processedSubject = this.processTemplate(template.subject || '', variables);
      let processedContent = this.processTemplate(template.content || '', variables);

      // Debug logging for SMS notifications
      if (template.type === 'sms') {
        console.log('SMS Template - Original content:', template.content);
        console.log('SMS Template - Variables available:', JSON.stringify(variables, null, 2));
        console.log('SMS Template - Processed content (before strip):', processedContent);
        processedContent = this.stripHtml(processedContent);
        console.log('SMS Template - Final content (after strip):', processedContent);
      }

      // Create notification log entry
      const logData: InsertNotificationLog = {
        templateId: params.templateId,
        recipientId: params.recipientId,
        courseId: params.courseId,
        scheduleId: params.notificationScheduleId, // Use notification schedule ID for foreign key
        enrollmentId: params.enrollmentId,
        type: template.type,
        subject: processedSubject,
        content: processedContent,
        status: 'pending',
        // isManualSend: params.manualSend || false, // Not in schema yet
        // metadata: { // Not in schema yet
        //   templateName: template.name || '',
        //   variables: variables
        // }
      };

      const log = await storage.createNotificationLog(logData);

      // Send notification based on type
      let sendResult;
      if (template.type === 'email') {
        sendResult = await NotificationEmailService.sendNotificationEmail({
          to: [recipient.email || ''],
          subject: processedSubject,
          htmlContent: processedContent,
          textContent: processedContent,
          // fromEmail: template.fromEmail, // Not in schema yet
          // fromName: template.fromName, // Not in schema yet
        });
      } else if (template.type === 'sms') {
        // Send SMS with educational purpose flag for enrollment confirmations
        if (!recipient.phone) {
          sendResult = { success: false, error: 'Recipient phone number not available' };
        } else {
          sendResult = await NotificationSmsService.sendNotificationSms({
            to: [recipient.phone],
            message: processedContent,
            instructorId: params.recipientId, // Use recipientId as fallback for instructorId
            purpose: 'educational' // Mark as educational to allow course-related content
          });
        }
      } else {
        sendResult = { success: false, error: 'Unknown notification type' };
      }

      // Update log with result
      await storage.updateNotificationLog(log.id, {
        status: sendResult.success ? 'sent' : 'failed',
        // sentAt: sendResult.success ? new Date() : undefined, // Not in schema yet
        // errorMessage: sendResult.error, // Not in schema yet
        // externalId: sendResult.messageId, // Not in schema yet
      });

      return {
        success: sendResult.success,
        error: sendResult.error,
        logId: log.id
      };

    } catch (error: any) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Send notification to multiple recipients
   */
  static async sendBulkNotification(params: {
    templateId: string;
    recipientIds: string[];
    courseId?: string;
    courseScheduleId?: string; // Course schedule ID for template variables
    notificationScheduleId?: string; // Notification schedule ID for log reference
    triggerEvent?: string;
    manualSend?: boolean;
  }): Promise<{
    totalSent: number;
    totalFailed: number;
    results: Array<{ recipientId: string; success: boolean; error?: string; logId?: string }>
  }> {
    const results = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipientId of params.recipientIds) {
      const result = await this.sendNotification({
        templateId: params.templateId,
        recipientId,
        courseId: params.courseId,
        courseScheduleId: params.courseScheduleId,
        notificationScheduleId: params.notificationScheduleId,
        triggerEvent: params.triggerEvent,
        manualSend: params.manualSend,
      });

      results.push({
        recipientId,
        ...result
      });

      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    return {
      totalSent,
      totalFailed,
      results
    };
  }

  /**
   * Process automatic notification triggers
   */
  static async processEventTriggers(event: string, context: {
    userId?: string;
    courseId?: string;
    scheduleId?: string;
    enrollmentId?: string;
  }): Promise<void> {
    try {
      // Get active notification schedules for this event
      const schedules = await storage.getActiveNotificationSchedulesByEvent(event);

      for (const schedule of schedules) {
        // Check if this schedule applies to the context
        if (schedule.courseId && schedule.courseId !== context.courseId) continue;
        if (schedule.scheduleId && schedule.scheduleId !== context.scheduleId) continue;

        // Send notification
        if (context.userId) {
          await this.sendNotification({
            templateId: schedule.templateId,
            recipientId: context.userId,
            courseId: context.courseId,
            courseScheduleId: context.scheduleId, // Course schedule ID for template variables
            notificationScheduleId: schedule.id, // Notification schedule ID for log reference
            enrollmentId: context.enrollmentId,
            triggerEvent: event,
            manualSend: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to process event triggers:', error);
    }
  }

  /**
   * Send appointment notification based on event type
   */
  static async sendAppointmentNotification(params: {
    eventType: 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled' | 'reminder';
    appointmentId: string;
    instructorId: string;
  }): Promise<void> {
    try {
      const appointment = await storage.getAppointment(params.appointmentId);
      if (!appointment) {
        console.error(`Appointment ${params.appointmentId} not found`);
        return;
      }

      // Get active notification templates for this event type and instructor
      const allTemplates = await storage.getAppointmentNotificationTemplates(params.instructorId);
      const templates = allTemplates.filter(t => 
        t.eventType === params.eventType && t.isActive
      );

      if (templates.length === 0) {
        console.log(`No active notification templates found for event: ${params.eventType}`);
        return;
      }

      // Get appointment details
      const [appointmentType, student, instructor] = await Promise.all([
        storage.getAppointmentType(appointment.appointmentTypeId),
        storage.getUser(appointment.studentId),
        storage.getUser(appointment.instructorId),
      ]);

      if (!appointmentType || !student || !instructor) {
        console.error('Failed to load appointment details');
        return;
      }

      // Build variables for template
      const variables = this.buildAppointmentVariables(
        appointment,
        appointmentType,
        student,
        instructor
      );

      // Send each active template
      for (const template of templates) {
        if (!template.isActive) continue;

        // Determine recipient based on recipientType
        const recipient = template.recipientType === 'instructor' ? instructor : student;

        // Replace template variables
        const subject = template.subject 
          ? NotificationEngine.processTemplate(template.subject, variables)
          : `Appointment ${params.eventType.replace('booking_', '').replace('_', ' ')}`;
        const body = NotificationEngine.processTemplate(template.body, variables);

        // Send via appropriate channel
        if (template.channelType === 'email') {
          await NotificationEmailService.sendNotificationEmail({
            to: [recipient.email],
            subject,
            htmlContent: body,
            textContent: body,
          });
        } else if (template.channelType === 'sms' && recipient.phone) {
          await NotificationSmsService.sendNotificationSms({
            to: [recipient.phone],
            message: body,
            instructorId: params.instructorId,
            purpose: 'administrative',
          });
        }
      }

      console.log(`Sent appointment notifications for event: ${params.eventType}`);
    } catch (error) {
      console.error('Failed to send appointment notification:', error);
    }
  }

  /**
   * Build variables for appointment notification templates
   */
  private static buildAppointmentVariables(
    appointment: InstructorAppointment,
    appointmentType: AppointmentType,
    student: User,
    instructor: User
  ): NotificationVariables {
    // Parse appointment times (stored in UTC)
    const startDateUTC = new Date(appointment.startTime);
    const endDateUTC = new Date(appointment.endTime);
    const durationMinutes = (endDateUTC.getTime() - startDateUTC.getTime()) / 60000;

    // Extract time in HH:MM format directly in instructor's timezone
    const startTimeHHMM = formatInTimeZone(startDateUTC, INSTRUCTOR_TIMEZONE, 'HH:mm');
    const endTimeHHMM = formatInTimeZone(endDateUTC, INSTRUCTOR_TIMEZONE, 'HH:mm');

    return {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email,
        phone: student.phone || '',
      },
      instructor: {
        name: `${instructor.firstName} ${instructor.lastName}`,
        firstName: instructor.firstName || '',
        lastName: instructor.lastName || '',
        email: instructor.email,
        phone: instructor.phone || '',
      },
      appointment: {
        startDate: formatInTimeZone(startDateUTC, INSTRUCTOR_TIMEZONE, 'MM/dd/yyyy'),
        startTime: this.formatTime(startTimeHHMM),
        endTime: this.formatTime(endTimeHHMM),
        date: formatInTimeZone(startDateUTC, INSTRUCTOR_TIMEZONE, 'EEEE, MMMM d, yyyy'),
        time: `${this.formatTime(startTimeHHMM)} - ${this.formatTime(endTimeHHMM)}`,
        duration: `${durationMinutes} minutes`,
        status: appointment.status,
        studentNotes: appointment.studentNotes || '',
        partySize: appointment.partySize || 1,
      },
      appointmentType: {
        title: appointmentType.title,
        description: appointmentType.description || '',
        duration: `${appointmentType.durationMinutes} minutes`,
        price: `$${Number(appointmentType.price).toFixed(2)}`,
      },
      system: {
        companyName: 'Practical Defense Training',
        companyPhone: instructor.phone || '',
        companyEmail: instructor.email,
        website: 'Practical Defense Training',
        websiteUrl: process.env.APP_URL || 'https://abqconcealedcarry.com',
        currentDate: new Date().toLocaleDateString('en-US'),
      },
    };
  }

  /**
   * Validate user's contact preferences for the given notification type
   */
  private static validateContactPreferences(user: User, notificationType: string): boolean {
    // If no preferred contact methods are set, assume all are allowed (backward compatibility)
    if (!user.preferredContactMethods || user.preferredContactMethods.length === 0) {
      return true;
    }

    // Map notification types to contact method preferences
    const typeMapping: Record<string, string> = {
      'email': 'email',
      'sms': 'text', // SMS notifications map to 'text' preference
      'push': 'push',
    };

    const requiredPreference = typeMapping[notificationType];
    if (!requiredPreference) {
      // Unknown notification type, allow by default
      console.warn(`Unknown notification type: ${notificationType}`);
      return true;
    }

    return user.preferredContactMethods.includes(requiredPreference);
  }

  /**
   * Safely format date objects, handling both Date objects and string dates
   * Returns MM/DD/YYYY format by default
   */
  private static safeFormatDate(date: Date | string | null | undefined, format: 'iso' | 'locale' = 'iso'): string | null {
    if (!date) {
      return null;
    }

    try {
      let dateObj: Date;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return null;
      }

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to safeFormatDate:', date);
        return null;
      }

      if (format === 'locale') {
        return dateObj.toLocaleDateString('en-US');
      } else {
        // Format as MM/DD/YYYY
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${month}/${day}/${year}`;
      }
    } catch (error) {
      console.warn('Error formatting date:', date, error);
      return null;
    }
  }

  /**
   * Format time from HH:MM or HH:MM:SS to 12-hour format with AM/PM
   */
  private static formatTime(time: string): string {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  /**
   * Strip HTML tags and convert to plain text
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n\n') // Convert </p> to double newlines
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&')  // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
      .trim();
  }

  /**
   * Get available template variables for documentation
   */
  static getAvailableVariables(): Record<string, string[]> {
    return {
      student: [
        'name', 'firstName', 'lastName', 'email', 'phone',
        'address', 'city', 'state', 'zipCode', 'licenseNumber', 'licenseExpiration'
      ],
      course: ['name', 'description', 'price', 'category'],
      schedule: [
        'startDate', 'endDate', 'startTime', 'endTime', 
        'location', 'maxSpots', 'availableSpots'
      ],
      enrollment: ['paymentStatus', 'amountPaid', 'remainingBalance', 'registrationDate'],
      system: ['companyName', 'companyPhone', 'companyEmail', 'website', 'websiteUrl', 'currentDate']
    };
  }
}

// Course notification signup engine
import { sendSms } from './smsService';
import type { CourseNotificationSignup, Course } from '@shared/schema';

interface CourseNotificationResult {
  success: boolean;
  emailSent: number;
  emailFailed: number;
  smsSent: number;
  smsFailed: number;
  errors: string[];
}

export class CourseNotificationEngine {
  /**
   * Send notifications to all signups for a specific course schedule
   */
  static async notifySignupsForSchedule(
    scheduleId: string,
    schedule: CourseSchedule,
    course: Course
  ): Promise<CourseNotificationResult> {
    const result: CourseNotificationResult = {
      success: true,
      emailSent: 0,
      emailFailed: 0,
      smsSent: 0,
      smsFailed: 0,
      errors: [],
    };

    try {
      // Get all signups for this course that haven't been notified about this schedule yet
      const signups = await storage.getCourseNotificationSignupsBySchedule(scheduleId);

      if (signups.length === 0) {
        console.log(`No signups to notify for schedule ${scheduleId}`);
        return result;
      }

      console.log(`Sending notifications to ${signups.length} signups for schedule ${scheduleId}`);

      // Group signups by preferred channel
      const emailSignups = signups.filter(s => 
        s.preferredChannel === 'email' || s.preferredChannel === 'both'
      );
      const smsSignups = signups.filter(s => 
        s.preferredChannel === 'sms' || s.preferredChannel === 'both'
      );

      // Send email notifications
      if (emailSignups.length > 0) {
        const emailResults = await this.sendEmailNotifications(
          emailSignups,
          schedule,
          course,
          scheduleId
        );
        result.emailSent = emailResults.sent;
        result.emailFailed = emailResults.failed;
        result.errors.push(...emailResults.errors);
      }

      // Send SMS notifications
      if (smsSignups.length > 0) {
        const smsResults = await this.sendSmsNotifications(
          smsSignups,
          schedule,
          course,
          scheduleId
        );
        result.smsSent = smsResults.sent;
        result.smsFailed = smsResults.failed;
        result.errors.push(...smsResults.errors);
      }

      result.success = result.emailFailed === 0 && result.smsFailed === 0;
      return result;
    } catch (error: any) {
      console.error('Error in course notification engine:', error);
      result.success = false;
      result.errors.push(error.message || 'Unknown error in notification engine');
      return result;
    }
  }

  /**
   * Send email notifications to signups
   */
  private static async sendEmailNotifications(
    signups: CourseNotificationSignup[],
    schedule: CourseSchedule,
    course: Course,
    scheduleId: string
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] as string[] };

    try {
      const emailAddresses = signups.map(s => s.email);
      const subject = `New ${course.title} Course Scheduled!`;
      
      const htmlContent = this.generateEmailContent(schedule, course);
      const textContent = this.generateTextContent(schedule, course);

      const emailResult = await NotificationEmailService.sendNotificationEmail({
        to: emailAddresses,
        subject,
        htmlContent,
        textContent,
      });

      if (emailResult.success) {
        result.sent = signups.length;
        
        // Log successful delivery for each signup
        for (const signup of signups) {
          try {
            await storage.logNotificationDelivery({
              signupId: signup.id,
              scheduleId: scheduleId,
              channel: 'email',
              status: 'sent',
              errorMessage: undefined,
            });
          } catch (logError: any) {
            console.error('Failed to log email delivery:', logError);
          }
        }
      } else {
        result.failed = signups.length;
        result.errors.push(`Email sending failed: ${emailResult.error}`);
        
        // Log failed delivery for each signup
        for (const signup of signups) {
          try {
            await storage.logNotificationDelivery({
              signupId: signup.id,
              scheduleId: scheduleId,
              channel: 'email',
              status: 'failed',
              errorMessage: emailResult.error || 'Unknown error',
            });
          } catch (logError: any) {
            console.error('Failed to log email delivery failure:', logError);
          }
        }
      }
    } catch (error: any) {
      result.failed = signups.length;
      result.errors.push(`Email notification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Send SMS notifications to signups
   */
  private static async sendSmsNotifications(
    signups: CourseNotificationSignup[],
    schedule: CourseSchedule,
    course: Course,
    scheduleId: string
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const result = { sent: 0, failed: 0, errors: [] as string[] };

    // Filter signups with valid phone numbers
    const signupsWithPhone = signups.filter(s => s.phone && s.phone.trim().length > 0);
    
    if (signupsWithPhone.length === 0) {
      return result;
    }

    try {
      const smsMessage = this.generateSmsContent(schedule, course);

      // Send SMS to each recipient individually to track delivery per signup
      for (const signup of signupsWithPhone) {
        try {
          const smsResult = await sendSms({
            to: signup.phone!,
            body: smsMessage,
            purpose: 'educational',
          });

          if (smsResult.success) {
            result.sent++;
            
            // Log successful delivery
            await storage.logNotificationDelivery({
              signupId: signup.id,
              scheduleId: scheduleId,
              channel: 'sms',
              status: 'sent',
              errorMessage: undefined,
            });
          } else {
            result.failed++;
            result.errors.push(`SMS failed for ${signup.phone}: ${smsResult.error}`);
            
            // Log failed delivery
            await storage.logNotificationDelivery({
              signupId: signup.id,
              scheduleId: scheduleId,
              channel: 'sms',
              status: 'failed',
              errorMessage: smsResult.error || 'Unknown error',
            });
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`SMS error for ${signup.phone}: ${error.message}`);
          
          // Log failed delivery
          try {
            await storage.logNotificationDelivery({
              signupId: signup.id,
              scheduleId: scheduleId,
              channel: 'sms',
              status: 'failed',
              errorMessage: error.message || 'Unknown error',
            });
          } catch (logError: any) {
            console.error('Failed to log SMS delivery failure:', logError);
          }
        }
      }
    } catch (error: any) {
      result.failed = signupsWithPhone.length;
      result.errors.push(`SMS notification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate HTML email content for course schedule notification
   */
  private static generateEmailContent(schedule: CourseSchedule, course: Course): string {
    const startDate = new Date(schedule.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTime = this.formatTime(schedule.startTime);
    const endTime = this.formatTime(schedule.endTime);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 5px; }
          .course-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #555; }
          .cta-button { 
            display: inline-block; 
            background-color: #e74c3c; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
            font-weight: bold;
          }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Course Available!</h1>
          </div>
          <div class="content">
            <div class="course-title">${course.title}</div>
            <p>Great news! A new session of the course you're interested in has been scheduled.</p>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${startDate}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${startTime} - ${endTime}
            </div>
            ${schedule.location ? `
            <div class="detail-row">
              <span class="detail-label">Location:</span> ${schedule.location}
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Available Spots:</span> ${schedule.availableSpots} / ${schedule.maxSpots}
            </div>
            
            <p style="margin-top: 20px;">
              <strong>Don't miss this opportunity!</strong> Spots fill up quickly, so register today to secure your place.
            </p>
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'https://example.com'}" class="cta-button">
                Register Now
              </a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this email because you signed up to be notified about ${course.title}.</p>
            <p>Practical Defense Training | Info@abqconcealedcarry.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email content for course schedule notification
   */
  private static generateTextContent(schedule: CourseSchedule, course: Course): string {
    const startDate = new Date(schedule.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTime = this.formatTime(schedule.startTime);
    const endTime = this.formatTime(schedule.endTime);

    return `
New Course Available: ${course.title}

Great news! A new session of the course you're interested in has been scheduled.

Date: ${startDate}
Time: ${startTime} - ${endTime}
${schedule.location ? `Location: ${schedule.location}\n` : ''}Available Spots: ${schedule.availableSpots} / ${schedule.maxSpots}

Don't miss this opportunity! Spots fill up quickly, so register today to secure your place.

Register at: ${process.env.APP_URL || 'https://example.com'}

---
You're receiving this email because you signed up to be notified about ${course.title}.
Practical Defense Training | Info@abqconcealedcarry.com
    `.trim();
  }

  /**
   * Generate SMS content for course schedule notification
   */
  private static generateSmsContent(schedule: CourseSchedule, course: Course): string {
    const startDate = new Date(schedule.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const startTime = this.formatTime(schedule.startTime);

    // Keep SMS concise due to character limits
    return `New ${course.title} scheduled for ${startDate} at ${startTime}. ${schedule.availableSpots} spots available. Register at ${process.env.APP_URL || 'https://practicaldefense.com'}`;
  }

  /**
   * Format time from HH:MM:SS to more readable format
   */
  private static formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }
}