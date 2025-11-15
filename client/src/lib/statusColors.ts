/**
 * Status color utility functions
 * Provides consistent color schemes for enrollment and appointment statuses
 * with proper contrast ratios for accessibility
 */

export type EnrollmentStatus = 'initiated' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'hold';
export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

interface StatusColorScheme {
  bg: string;
  text: string;
  border?: string;
}

/**
 * Get color scheme for enrollment status
 */
export function getEnrollmentStatusColors(status: string): StatusColorScheme {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case 'initiated':
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-100',
        border: '!border-gray-300 dark:!border-gray-600'
      };
    case 'confirmed':
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: '!border-blue-700'
      };
    case 'pending':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-900 dark:text-amber-100',
        border: '!border-amber-300 dark:!border-amber-700'
      };
    case 'completed':
      return {
        bg: 'bg-green-600',
        text: 'text-white',
        border: '!border-green-700'
      };
    case 'cancelled':
      return {
        bg: 'bg-red-600',
        text: 'text-white',
        border: '!border-red-700'
      };
    case 'hold':
      return {
        bg: 'bg-orange-600',
        text: 'text-white',
        border: '!border-orange-700'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-100',
        border: '!border-gray-300 dark:!border-gray-600'
      };
  }
}

/**
 * Get color scheme for appointment status
 */
export function getAppointmentStatusColors(status: string): StatusColorScheme {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case 'pending':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-900 dark:text-amber-100',
        border: '!border-amber-300 dark:!border-amber-700'
      };
    case 'confirmed':
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: '!border-blue-700'
      };
    case 'rejected':
      return {
        bg: 'bg-red-600',
        text: 'text-white',
        border: '!border-red-700'
      };
    case 'cancelled':
      return {
        bg: 'bg-gray-500',
        text: 'text-white',
        border: '!border-gray-600'
      };
    case 'completed':
      return {
        bg: 'bg-green-600',
        text: 'text-white',
        border: '!border-green-700'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-100',
        border: '!border-gray-300 dark:!border-gray-600'
      };
  }
}

/**
 * Get combined className string for enrollment status Badge
 */
export function getEnrollmentStatusClassName(status: string): string {
  const colors = getEnrollmentStatusColors(status);
  return `${colors.bg} ${colors.text} ${colors.border || ''}`;
}

/**
 * Get combined className string for appointment status Badge
 */
export function getAppointmentStatusClassName(status: string): string {
  const colors = getAppointmentStatusColors(status);
  return `${colors.bg} ${colors.text} ${colors.border || ''}`;
}
