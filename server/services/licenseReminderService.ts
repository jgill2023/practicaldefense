import { storage } from '../storage';
import { NotificationEngine, NotificationVariables } from '../notificationEngine';
import type { User } from '@shared/schema';

const APP_URL = process.env.APP_URL || 'https://abqconcealedcarry.com';

// Renewal milestones relative to license expiration
// daysFromExpiration: negative = before expiration, positive = after expiration
const RENEWAL_MILESTONES = [
  { type: 'renewal_45d_before', daysFromExpiration: -45, channel: 'email' as const },
  { type: 'renewal_30d_before', daysFromExpiration: -30, channel: 'sms' as const },
  { type: 'renewal_14d_before', daysFromExpiration: -14, channel: 'email' as const },
  { type: 'renewal_day_of', daysFromExpiration: 0, channel: 'both' as const },
  { type: 'renewal_30d_after', daysFromExpiration: 30, channel: 'email' as const },
  { type: 'renewal_45d_after', daysFromExpiration: 45, channel: 'sms' as const },
];

// Refresher milestones relative to 2-year mark from license issued date
// daysFromRefresher: negative = before 2-year mark
const REFRESHER_MILESTONES = [
  { type: 'refresher_60d_before', daysFromRefresher: -60, channel: 'email' as const },
  { type: 'refresher_30d_before', daysFromRefresher: -30, channel: 'sms' as const },
];

// Template name mapping for each milestone type
const TEMPLATE_NAME_MAP: Record<string, string> = {
  'renewal_45d_before': 'License Renewal - 45 Day Warning',
  'renewal_30d_before': 'License Renewal - 30 Day Warning',
  'renewal_14d_before': 'License Renewal - 14 Day Warning',
  'renewal_day_of': 'License Renewal - Expiration Day',
  'renewal_30d_after': 'License Renewal - 30 Days Past Expiration',
  'renewal_45d_after': 'License Renewal - 45 Days Past Expiration',
  'refresher_60d_before': 'License Refresher - 60 Day Reminder',
  'refresher_30d_before': 'License Refresher - 30 Day Reminder',
  'post_course_nudge': 'License Reminder - Update CCL Expiration',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export class LicenseReminderService {
  /**
   * Process all license-related reminders: renewal, refresher, and post-course nudges
   */
  async processAllReminders(): Promise<void> {
    console.log('[LicenseReminder] Starting license reminder processing...');

    try {
      await this.processRenewalReminders();
    } catch (error) {
      console.error('[LicenseReminder] Error processing renewal reminders:', error);
    }

    try {
      await this.processRefresherReminders();
    } catch (error) {
      console.error('[LicenseReminder] Error processing refresher reminders:', error);
    }

    try {
      await this.processPostCourseNudges();
    } catch (error) {
      console.error('[LicenseReminder] Error processing post-course nudges:', error);
    }

    console.log('[LicenseReminder] Finished license reminder processing.');
  }

  /**
   * Process renewal reminders for students whose license is expiring or has expired.
   * Checks each renewal milestone, suppresses if student is enrolled in a renewal course,
   * deduplicates via reminder logs, and sends the appropriate notification.
   */
  private async processRenewalReminders(): Promise<void> {
    const students = await storage.getStudentsWithLicenseData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const student of students) {
      if (!student.concealedCarryLicenseExpiration) continue;

      const expirationDate = new Date(student.concealedCarryLicenseExpiration);
      expirationDate.setHours(0, 0, 0, 0);

      // daysUntilExpiration: positive = days remaining before expiration, negative = days past expiration
      const daysUntilExpiration = Math.round((expirationDate.getTime() - today.getTime()) / DAY_MS);

      for (const milestone of RENEWAL_MILESTONES) {
        // Match: daysUntilExpiration === -milestone.daysFromExpiration
        // e.g., milestone -45 matches when daysUntilExpiration === 45 (45 days before expiration)
        // e.g., milestone +30 matches when daysUntilExpiration === -30 (30 days after expiration)
        if (daysUntilExpiration !== -milestone.daysFromExpiration) continue;

        // Check for duplicate - use expiration date as snapshot
        const existingLog = await storage.getLicenseReminderLog(
          student.id,
          milestone.type,
          expirationDate
        );
        if (existingLog) continue;

        // Suppress if student is already enrolled in a renewal course
        const activeEnrollments = await storage.getActiveEnrollmentsByStudentAndCourseType(
          student.id,
          'renewal'
        );
        if (activeEnrollments.length > 0) {
          console.log(`[LicenseReminder] Suppressing ${milestone.type} for student ${student.id} - already enrolled in renewal course`);
          continue;
        }

        try {
          await this.sendRenewalReminder(student, milestone, daysUntilExpiration);
        } catch (error) {
          console.error(`[LicenseReminder] Error sending ${milestone.type} to student ${student.id}:`, error);
        }
      }
    }
  }

  /**
   * Process refresher reminders for students approaching their 2-year refresher mark.
   * The 2-year mark is calculated from concealedCarryLicenseIssued + 2 years.
   */
  private async processRefresherReminders(): Promise<void> {
    const students = await storage.getStudentsWithLicenseData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const student of students) {
      if (!student.concealedCarryLicenseIssued) continue;

      const issuedDate = new Date(student.concealedCarryLicenseIssued);
      const twoYearMark = new Date(issuedDate);
      twoYearMark.setFullYear(twoYearMark.getFullYear() + 2);
      twoYearMark.setHours(0, 0, 0, 0);

      // daysUntilRefresher: positive = days before 2-year mark, negative = days past
      const daysUntilRefresher = Math.round((twoYearMark.getTime() - today.getTime()) / DAY_MS);

      for (const milestone of REFRESHER_MILESTONES) {
        // Match: daysUntilRefresher === -milestone.daysFromRefresher
        // e.g., milestone -60 matches when daysUntilRefresher === 60 (60 days before 2-year mark)
        if (daysUntilRefresher !== -milestone.daysFromRefresher) continue;

        // Check for duplicate - use issued date as snapshot
        const existingLog = await storage.getLicenseReminderLog(
          student.id,
          milestone.type,
          issuedDate
        );
        if (existingLog) continue;

        // Suppress if student is already enrolled in a refresher course
        const activeEnrollments = await storage.getActiveEnrollmentsByStudentAndCourseType(
          student.id,
          'refresher'
        );
        if (activeEnrollments.length > 0) {
          console.log(`[LicenseReminder] Suppressing ${milestone.type} for student ${student.id} - already enrolled in refresher course`);
          continue;
        }

        try {
          await this.sendRefresherReminder(student, milestone, daysUntilRefresher);
        } catch (error) {
          console.error(`[LicenseReminder] Error sending ${milestone.type} to student ${student.id}:`, error);
        }
      }
    }
  }

  /**
   * Process post-course nudges for students who completed a renewal course ~45 days ago
   * but have not updated their CCL expiration date. Uses a window of 44-46 days to avoid
   * missing due to timing variations.
   */
  private async processPostCourseNudges(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look for enrollments completed around 45 days ago (window: 44-46 days)
    const windowStart = new Date(today.getTime() - 46 * DAY_MS);
    const windowEnd = new Date(today.getTime() - 44 * DAY_MS);

    const completedEnrollments = await storage.getCompletedEnrollmentsByCourseType('renewal', windowStart);

    for (const result of completedEnrollments) {
      const { student, schedule } = result;
      if (!student || !schedule) continue;

      const endDate = new Date(schedule.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Only process enrollments where the course ended within the 44-46 day window
      if (endDate < windowStart || endDate > windowEnd) continue;

      // Check for duplicate
      const existingLog = await storage.getLicenseReminderLog(
        student.id,
        'post_course_nudge',
        endDate
      );
      if (existingLog) continue;

      try {
        await this.sendPostCourseNudge(student, endDate);
      } catch (error) {
        console.error(`[LicenseReminder] Error sending post-course nudge to student ${student.id}:`, error);
      }
    }
  }

  /**
   * Send a renewal reminder notification to a student.
   * Looks up the next available renewal course, builds template variables,
   * finds the matching notification template, and sends via NotificationEngine.
   */
  private async sendRenewalReminder(
    student: User,
    milestone: typeof RENEWAL_MILESTONES[number],
    daysUntilExpiration: number
  ): Promise<void> {
    const nextCourse = await storage.getNextAvailableCourseByType('renewal');
    const variables = this.buildReminderVariables(student, nextCourse, daysUntilExpiration, 'renewal');
    const templateName = this.getTemplateName(milestone.type);

    if (milestone.channel === 'email' || milestone.channel === 'both') {
      const template = await this.findTemplateByNameAndType(templateName, 'email');
      if (template) {
        await NotificationEngine.sendNotification({
          templateId: template.id,
          recipientId: student.id,
          variables,
          triggerEvent: 'license_renewal_reminder',
        });
        console.log(`[LicenseReminder] Sent email ${milestone.type} to student ${student.id}`);
      } else {
        console.warn(`[LicenseReminder] No active email template found: "${templateName}"`);
      }
    }

    if (milestone.channel === 'sms' || milestone.channel === 'both') {
      // Check SMS consent and preferences before sending
      if (!student.enableSmsReminders || !student.smsConsent) {
        console.log(`[LicenseReminder] Skipping SMS ${milestone.type} for student ${student.id} - SMS not enabled or no consent`);
      } else {
        const template = await this.findTemplateByNameAndType(templateName, 'sms');
        if (template) {
          await NotificationEngine.sendNotification({
            templateId: template.id,
            recipientId: student.id,
            variables,
            triggerEvent: 'license_renewal_reminder',
          });
          console.log(`[LicenseReminder] Sent SMS ${milestone.type} to student ${student.id}`);
        } else {
          console.warn(`[LicenseReminder] No active SMS template found: "${templateName}"`);
        }
      }
    }

    // Log the reminder to prevent duplicates
    const expirationDate = student.concealedCarryLicenseExpiration
      ? new Date(student.concealedCarryLicenseExpiration)
      : undefined;

    await storage.createLicenseReminderLog({
      userId: student.id,
      reminderType: milestone.type,
      channel: milestone.channel,
      licenseExpirationDate: expirationDate,
    });
  }

  /**
   * Send a refresher reminder notification to a student.
   * Same pattern as renewal but for the 2-year refresher course mark.
   */
  private async sendRefresherReminder(
    student: User,
    milestone: typeof REFRESHER_MILESTONES[number],
    daysUntilRefresher: number
  ): Promise<void> {
    const nextCourse = await storage.getNextAvailableCourseByType('refresher');
    const variables = this.buildReminderVariables(student, nextCourse, daysUntilRefresher, 'refresher');
    const templateName = this.getTemplateName(milestone.type);

    if (milestone.channel === 'email') {
      const template = await this.findTemplateByNameAndType(templateName, 'email');
      if (template) {
        await NotificationEngine.sendNotification({
          templateId: template.id,
          recipientId: student.id,
          variables,
          triggerEvent: 'license_refresher_reminder',
        });
        console.log(`[LicenseReminder] Sent email ${milestone.type} to student ${student.id}`);
      } else {
        console.warn(`[LicenseReminder] No active email template found: "${templateName}"`);
      }
    }

    if (milestone.channel === 'sms') {
      if (!student.enableSmsReminders || !student.smsConsent) {
        console.log(`[LicenseReminder] Skipping SMS ${milestone.type} for student ${student.id} - SMS not enabled or no consent`);
      } else {
        const template = await this.findTemplateByNameAndType(templateName, 'sms');
        if (template) {
          await NotificationEngine.sendNotification({
            templateId: template.id,
            recipientId: student.id,
            variables,
            triggerEvent: 'license_refresher_reminder',
          });
          console.log(`[LicenseReminder] Sent SMS ${milestone.type} to student ${student.id}`);
        } else {
          console.warn(`[LicenseReminder] No active SMS template found: "${templateName}"`);
        }
      }
    }

    // Log the reminder to prevent duplicates
    const issuedDate = student.concealedCarryLicenseIssued
      ? new Date(student.concealedCarryLicenseIssued)
      : undefined;

    await storage.createLicenseReminderLog({
      userId: student.id,
      reminderType: milestone.type,
      channel: milestone.channel,
      licenseIssuedDate: issuedDate,
    });
  }

  /**
   * Send a post-course nudge to remind the student to update their CCL expiration
   * date in their profile after completing a renewal course.
   */
  private async sendPostCourseNudge(student: User, courseEndDate: Date): Promise<void> {
    const templateName = this.getTemplateName('post_course_nudge');
    const variables: NotificationVariables = {
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        licenseExpiration: student.concealedCarryLicenseExpiration
          ? new Date(student.concealedCarryLicenseExpiration).toLocaleDateString('en-US')
          : '',
      },
      system: {
        companyName: 'Practical Defense Training',
        companyPhone: '(555) 123-4567',
        companyEmail: 'Info@abqconcealedcarry.com',
        website: 'abqconcealedcarry.com',
        currentDate: new Date().toLocaleDateString('en-US'),
      },
    };

    const template = await this.findTemplateByNameAndType(templateName, 'email');
    if (template) {
      await NotificationEngine.sendNotification({
        templateId: template.id,
        recipientId: student.id,
        variables,
        triggerEvent: 'post_course_nudge',
      });
      console.log(`[LicenseReminder] Sent post-course nudge to student ${student.id}`);
    } else {
      console.warn(`[LicenseReminder] No active email template found: "${templateName}"`);
    }

    // Log to prevent duplicates
    await storage.createLicenseReminderLog({
      userId: student.id,
      reminderType: 'post_course_nudge',
      channel: 'email',
      courseScheduleDate: courseEndDate,
    });
  }

  /**
   * Build notification variables for renewal/refresher reminders.
   * Includes student info, license data, and next available course details if found.
   */
  private buildReminderVariables(
    student: User,
    nextCourse: { course: any; schedule: any } | null,
    daysRemaining: number,
    category: string
  ): NotificationVariables {
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
        licenseExpiration: student.concealedCarryLicenseExpiration
          ? new Date(student.concealedCarryLicenseExpiration).toLocaleDateString('en-US')
          : '',
      },
      system: {
        companyName: 'Practical Defense Training',
        companyPhone: '(555) 123-4567',
        companyEmail: 'Info@abqconcealedcarry.com',
        website: 'abqconcealedcarry.com',
        currentDate: new Date().toLocaleDateString('en-US'),
      },
    };

    if (nextCourse) {
      variables.course = {
        name: nextCourse.course.title || '',
        description: nextCourse.course.description || '',
        price: parseFloat(nextCourse.course.price) || 0,
        category: category,
      };

      variables.schedule = {
        startDate: nextCourse.schedule.startDate
          ? new Date(nextCourse.schedule.startDate).toLocaleDateString('en-US')
          : '',
        endDate: nextCourse.schedule.endDate
          ? new Date(nextCourse.schedule.endDate).toLocaleDateString('en-US')
          : '',
        startTime: this.formatTime(nextCourse.schedule.startTime || ''),
        endTime: this.formatTime(nextCourse.schedule.endTime || ''),
        location: nextCourse.schedule.location || '',
        maxSpots: nextCourse.schedule.maxSpots || 0,
        availableSpots: nextCourse.schedule.availableSpots || 0,
        dayOfWeek: nextCourse.schedule.dayOfWeek || '',
        arrivalTime: nextCourse.schedule.arrivalTime
          ? this.formatTime(nextCourse.schedule.arrivalTime)
          : '',
        rangeName: nextCourse.schedule.rangeName || '',
        classroomName: nextCourse.schedule.classroomName || '',
        googleMapsLink: nextCourse.schedule.googleMapsLink || '',
      };
    }

    return variables;
  }

  /**
   * Find an active notification template by name and type (email/sms).
   * Returns the first matching active template, or null if none found.
   */
  private async findTemplateByNameAndType(
    name: string,
    type: string
  ): Promise<{ id: string; name: string; type: string } | null> {
    const templates = await storage.getNotificationTemplates();
    const match = templates.find(
      (t) => t.name === name && t.type === type && t.isActive
    );
    return match || null;
  }

  /**
   * Get the template name for a given milestone type
   */
  private getTemplateName(milestoneType: string): string {
    return TEMPLATE_NAME_MAP[milestoneType] || milestoneType;
  }

  /**
   * Format time from HH:MM:SS or HH:MM to 12-hour format with AM/PM
   */
  private formatTime(time: string): string {
    if (!time) return '';

    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    if (isNaN(hour)) return '';

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }
}

export const licenseReminderService = new LicenseReminderService();
