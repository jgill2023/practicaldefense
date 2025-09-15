import { storage } from './storage';
import { NotificationEmailService } from './emailService';
import { NotificationSmsService } from './smsService';
import { 
  type NotificationTemplateWithDetails, 
  type NotificationScheduleWithDetails,
  type User,
  type CourseWithSchedules,
  type CourseSchedule,
  type EnrollmentWithDetails,
  type StudentFormResponse,
  type InsertNotificationLog
} from '@shared/schema';

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
  };
  enrollment?: {
    paymentStatus: string;
    amountPaid: number;
    remainingBalance: number;
    registrationDate: string;
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
    companyName: 'ProTrain Academy',
    companyPhone: '(555) 123-4567',
    companyEmail: 'info@protrainacademy.com',
    website: 'protrainacademy.com',
    currentDate: new Date().toLocaleDateString()
  };

  /**
   * Process template variables and replace them in content
   */
  static processTemplate(content: string, variables: NotificationVariables): string {
    let processedContent = content;

    // Replace all variable placeholders with actual values
    processedContent = processedContent.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path.trim());
      return value !== undefined ? String(value) : match;
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
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        location: schedule.location || '',
        maxSpots: schedule.maxSpots,
        availableSpots: schedule.availableSpots,
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
   * Send notification based on template
   */
  static async sendNotification(params: {
    templateId: string;
    recipientId: string;
    courseId?: string;
    scheduleId?: string;
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
        if (params.scheduleId) {
          schedule = await storage.getCourseSchedule(params.scheduleId);
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
      const processedContent = this.processTemplate(template.content || '', variables);

      // Create notification log entry
      const logData: InsertNotificationLog = {
        templateId: params.templateId,
        recipientId: params.recipientId,
        courseId: params.courseId,
        scheduleId: params.scheduleId,
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
        // Send SMS via Twilio with ultra-strict content filtering
        if (!recipient.phone) {
          sendResult = { success: false, error: 'Recipient phone number not available' };
        } else {
          sendResult = await NotificationSmsService.sendNotificationSms({
            to: [recipient.phone],
            message: processedContent,
            instructorId: params.recipientId // Use recipientId as fallback for instructorId
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
    scheduleId?: string;
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
        ...params,
        recipientId,
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
            scheduleId: context.scheduleId,
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
        return dateObj.toLocaleDateString();
      } else {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Error formatting date:', date, error);
      return null;
    }
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
      system: ['companyName', 'companyPhone', 'companyEmail', 'website', 'currentDate']
    };
  }
}