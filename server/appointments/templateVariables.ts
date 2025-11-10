
import type { InstructorAppointment, AppointmentType, User } from '@shared/schema';

export interface TemplateVariables {
  studentName: string;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentDuration: string;
  instructorName: string;
  price: string;
}

export function buildTemplateVariables(
  appointment: InstructorAppointment,
  appointmentType: AppointmentType,
  student: User,
  instructor: User
): TemplateVariables {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);

  // Format date: "Monday, January 15, 2024"
  const appointmentDate = startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format time: "2:00 PM - 3:00 PM"
  const startTimeStr = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTimeStr = endTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const appointmentTime = `${startTimeStr} - ${endTimeStr}`;

  return {
    studentName: `${student.firstName} ${student.lastName}`,
    studentFirstName: student.firstName || '',
    studentLastName: student.lastName || '',
    studentEmail: student.email || '',
    appointmentType: appointmentType.title,
    appointmentDate,
    appointmentTime,
    appointmentDuration: `${appointmentType.durationMinutes} minutes`,
    instructorName: `${instructor.firstName} ${instructor.lastName}`,
    price: `$${Number(appointmentType.price).toFixed(2)}`,
  };
}

export function substituteVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  // Replace all variable placeholders with actual values
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.split(placeholder).join(value);
  });

  return result;
}
