import { storage } from '../storage';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { 
  InstructorWeeklyTemplate, 
  InstructorAvailabilityOverride, 
  InstructorAppointment,
  CourseSchedule
} from '@db/schema';

// Hardcoded timezone for instructor - in a real app this would come from user settings
const INSTRUCTOR_TIMEZONE = 'America/Denver';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

export interface AvailabilityBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiresApproval: boolean;
}

export class AppointmentService {
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private setTimeOnDate(date: Date, timeStr: string): Date {
    // Get the date in YYYY-MM-DD format
    const dateStr = this.getDateKey(date);
    
    // Create a datetime string in the instructor's timezone
    const localDateTimeStr = `${dateStr}T${timeStr}:00`;
    
    // Parse as a date in the instructor's timezone, then convert to UTC
    // fromZonedTime treats the input as if it's in the specified timezone
    const utcDate = fromZonedTime(localDateTimeStr, INSTRUCTOR_TIMEZONE);
    return utcDate;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  private timeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private subtractTimeBlock(
    block: AvailabilityBlock,
    subtractStart: string,
    subtractEnd: string
  ): AvailabilityBlock[] {
    const blockStartMinutes = this.timeToMinutes(block.startTime);
    const blockEndMinutes = this.timeToMinutes(block.endTime);
    const subtractStartMinutes = this.timeToMinutes(subtractStart);
    const subtractEndMinutes = this.timeToMinutes(subtractEnd);

    if (subtractEndMinutes <= blockStartMinutes || subtractStartMinutes >= blockEndMinutes) {
      return [block];
    }

    const result: AvailabilityBlock[] = [];
    
    if (subtractStartMinutes > blockStartMinutes) {
      result.push({
        ...block,
        endTime: this.minutesToTime(subtractStartMinutes),
      });
    }

    if (subtractEndMinutes < blockEndMinutes) {
      result.push({
        ...block,
        startTime: this.minutesToTime(subtractEndMinutes),
      });
    }

    return result;
  }

  private timeToMinutes(timeStr: string): number {
    const { hours, minutes } = this.parseTime(timeStr);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  async getInstructorAvailabilityBlocks(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, AvailabilityBlock[]>> {
    const [weeklyTemplates, overrides] = await Promise.all([
      storage.getWeeklyTemplates(instructorId),
      storage.getAvailabilityOverridesInRange(instructorId, startDate, endDate),
    ]);

    const dateToBlocks = new Map<string, AvailabilityBlock[]>();
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = this.getDateKey(currentDate);
      const dayOfWeek = currentDate.getDay();
      
      const dateOverrides = overrides.filter(o => {
        const overrideDate = new Date(o.startDate);
        return this.getDateKey(overrideDate) === dateKey;
      });

      const allDayUnavailable = dateOverrides.some(o => !o.isAvailable && (!o.startTime || !o.endTime));
      
      if (allDayUnavailable) {
        dateToBlocks.set(dateKey, []);
      } else {
        let blocks: AvailabilityBlock[] = weeklyTemplates
          .filter(t => t.dayOfWeek === dayOfWeek && t.isActive)
          .map(t => ({
            dayOfWeek,
            startTime: t.startTime,
            endTime: t.endTime,
            requiresApproval: t.requiresApproval || false,
          }));

        for (const override of dateOverrides) {
          if (!override.isAvailable && override.startTime && override.endTime) {
            const newBlocks: AvailabilityBlock[] = [];
            for (const block of blocks) {
              const subtracted = this.subtractTimeBlock(block, override.startTime, override.endTime);
              newBlocks.push(...subtracted);
            }
            blocks = newBlocks;
          }
        }

        for (const override of dateOverrides) {
          if (override.isAvailable && override.startTime && override.endTime) {
            blocks.push({
              dayOfWeek,
              startTime: override.startTime,
              endTime: override.endTime,
              requiresApproval: override.requiresApproval || false,
            });
          }
        }

        dateToBlocks.set(dateKey, blocks);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateToBlocks;
  }

  async getInstructorConflicts(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ startTime: Date; endTime: Date }[]> {
    const [appointments, courseSchedules] = await Promise.all([
      storage.getAppointments({
        instructorId,
        startDate,
        endDate,
      }),
      storage.getInstructorCourseSchedules(instructorId, startDate, endDate),
    ]);

    const conflicts: { startTime: Date; endTime: Date }[] = [];

    appointments.forEach(apt => {
      if (apt.status === 'confirmed' || apt.status === 'pending') {
        conflicts.push({
          startTime: new Date(apt.startTime),
          endTime: new Date(apt.endTime),
        });
      }
    });

    courseSchedules.forEach(schedule => {
      conflicts.push({
        startTime: new Date(schedule.startDate),
        endTime: new Date(schedule.endDate),
      });
    });

    return conflicts;
  }

  async generateAvailableSlots(
    instructorId: string,
    appointmentTypeId: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number
  ): Promise<TimeSlot[]> {
    const appointmentType = await storage.getAppointmentType(appointmentTypeId);
    if (!appointmentType || !appointmentType.isActive) {
      return [];
    }

    const [availabilityBlocks, conflicts] = await Promise.all([
      this.getInstructorAvailabilityBlocks(instructorId, startDate, endDate),
      this.getInstructorConflicts(instructorId, startDate, endDate),
    ]);

    const slots: TimeSlot[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = this.getDateKey(currentDate);
      const blocks = availabilityBlocks.get(dateKey) || [];

      for (const block of blocks) {
        const blockStart = this.setTimeOnDate(currentDate, block.startTime);
        const blockEnd = this.setTimeOnDate(currentDate, block.endTime);
        
        let slotStart = new Date(blockStart);
        
        while (slotStart < blockEnd) {
          const slotEnd = this.addMinutes(slotStart, slotDurationMinutes);
          
          if (slotEnd > blockEnd) {
            break;
          }

          const hasConflict = conflicts.some(conflict =>
            this.timeRangesOverlap(
              slotStart,
              slotEnd,
              conflict.startTime,
              conflict.endTime
            )
          );

          slots.push({
            startTime: new Date(slotStart),
            endTime: new Date(slotEnd),
            isAvailable: !hasConflict,
            requiresApproval: block.requiresApproval,
            reason: hasConflict ? 'Slot already booked or conflicts with course' : undefined,
          });

          slotStart = this.addMinutes(slotStart, slotDurationMinutes);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  async validateAppointmentBooking(
    instructorId: string,
    appointmentTypeId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const appointmentType = await storage.getAppointmentType(appointmentTypeId);
    if (!appointmentType || !appointmentType.isActive) {
      return { valid: false, reason: 'Appointment type not found or inactive' };
    }

    if (appointmentType.instructorId !== instructorId) {
      return { valid: false, reason: 'Appointment type does not belong to this instructor' };
    }

    const actualDurationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
    
    // Check duration validation based on appointment type
    if ((appointmentType as any).isVariableDuration) {
      // Variable duration validation
      const minimumDurationHours = (appointmentType as any).minimumDurationHours || 2;
      const minimumDurationMinutes = minimumDurationHours * 60;
      const incrementMinutes = (appointmentType as any).durationIncrementMinutes || 60;
      
      // Check minimum duration
      if (actualDurationMinutes < minimumDurationMinutes) {
        return {
          valid: false,
          reason: `Appointment must be at least ${minimumDurationHours} hours`
        };
      }
      
      // Check that duration follows the increment pattern
      const durationAboveMinimum = actualDurationMinutes - minimumDurationMinutes;
      if (durationAboveMinimum % incrementMinutes !== 0) {
        return {
          valid: false,
          reason: `Appointment duration must be in ${incrementMinutes}-minute increments`
        };
      }
    } else {
      // Fixed duration validation
      if (actualDurationMinutes !== appointmentType.durationMinutes) {
        return { 
          valid: false, 
          reason: `Appointment duration must be exactly ${appointmentType.durationMinutes} minutes` 
        };
      }
    }

    const hasConflict = await storage.checkAppointmentConflict(
      instructorId,
      startTime,
      endTime,
      excludeAppointmentId
    );

    if (hasConflict) {
      return { valid: false, reason: 'Time slot conflicts with existing appointment' };
    }

    const dateKey = this.getDateKey(startTime);
    const dayOfWeek = startTime.getDay();

    const [weeklyTemplates, overrides] = await Promise.all([
      storage.getWeeklyTemplatesByDay(instructorId, dayOfWeek),
      storage.getAvailabilityOverridesInRange(instructorId, startTime, endTime),
    ]);

    const dateOverrides = overrides.filter(o => {
      const overrideDate = new Date(o.startDate);
      return this.getDateKey(overrideDate) === dateKey;
    });

    const allDayUnavailable = dateOverrides.some(o => !o.isAvailable && (!o.startTime || !o.endTime));
    if (allDayUnavailable) {
      return { valid: false, reason: 'Instructor is not available on this date' };
    }

    let availableBlocks: AvailabilityBlock[] = weeklyTemplates.map(t => ({
      dayOfWeek,
      startTime: t.startTime,
      endTime: t.endTime,
      requiresApproval: t.requiresApproval || false,
    }));

    for (const override of dateOverrides) {
      if (!override.isAvailable && override.startTime && override.endTime) {
        const newBlocks: AvailabilityBlock[] = [];
        for (const block of availableBlocks) {
          const subtracted = this.subtractTimeBlock(block, override.startTime, override.endTime);
          newBlocks.push(...subtracted);
        }
        availableBlocks = newBlocks;
      }
    }

    for (const override of dateOverrides) {
      if (override.isAvailable && override.startTime && override.endTime) {
        availableBlocks.push({
          dayOfWeek,
          startTime: override.startTime,
          endTime: override.endTime,
          requiresApproval: override.requiresApproval || false,
        });
      }
    }

    // Convert UTC times to instructor's timezone before extracting hours/minutes
    const localStartTime = toZonedTime(startTime, INSTRUCTOR_TIMEZONE);
    const localEndTime = toZonedTime(endTime, INSTRUCTOR_TIMEZONE);
    
    const startTimeStr = `${String(localStartTime.getHours()).padStart(2, '0')}:${String(localStartTime.getMinutes()).padStart(2, '0')}`;
    const endTimeStr = `${String(localEndTime.getHours()).padStart(2, '0')}:${String(localEndTime.getMinutes()).padStart(2, '0')}`;
    
    const fitsInBlock = availableBlocks.some(block => {
      const blockStart = this.timeToMinutes(block.startTime);
      const blockEnd = this.timeToMinutes(block.endTime);
      const appointmentStart = this.timeToMinutes(startTimeStr);
      const appointmentEnd = this.timeToMinutes(endTimeStr);
      return appointmentStart >= blockStart && appointmentEnd <= blockEnd;
    });

    if (!fitsInBlock) {
      return { valid: false, reason: 'Time is outside instructor availability' };
    }

    const courseSchedules = await storage.getInstructorCourseSchedules(
      instructorId,
      startTime,
      endTime
    );

    const courseConflict = courseSchedules.some(schedule =>
      this.timeRangesOverlap(
        startTime,
        endTime,
        new Date(schedule.startDate),
        new Date(schedule.endDate)
      )
    );

    if (courseConflict) {
      return { valid: false, reason: 'Time conflicts with instructor course schedule' };
    }

    return { valid: true };
  }

  async bookAppointment(data: {
    instructorId: string;
    studentId: string;
    appointmentTypeId: string;
    startTime: Date;
    endTime: Date;
    studentNotes?: string;
    partySize?: number;
    actualDurationMinutes?: number;
    totalPrice?: number;
  }): Promise<{ success: boolean; appointment?: InstructorAppointment; error?: string }> {
    const validation = await this.validateAppointmentBooking(
      data.instructorId,
      data.appointmentTypeId,
      data.startTime,
      data.endTime
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const appointmentType = await storage.getAppointmentType(data.appointmentTypeId);
    
    if (!appointmentType) {
      return { success: false, error: 'Appointment type not found' };
    }

    const status = appointmentType.requiresApproval ? 'pending' : 'confirmed';

    try {
      const appointment = await storage.createAppointment({
        instructorId: data.instructorId,
        studentId: data.studentId,
        appointmentTypeId: data.appointmentTypeId,
        startTime: data.startTime,
        endTime: data.endTime,
        studentNotes: data.studentNotes || null,
        partySize: data.partySize || 1,
        status,
        paymentStatus: 'pending',
        actualDurationMinutes: data.actualDurationMinutes || null,
        totalPrice: data.totalPrice || null,
      });

      return { success: true, appointment };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { success: false, error: 'Failed to create appointment' };
    }
  }
}

export const appointmentService = new AppointmentService();
