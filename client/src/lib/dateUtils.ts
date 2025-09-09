// Utility functions for safe date formatting without timezone issues

export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // Extract just the date part from ISO string to avoid timezone conversion
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-');
  
  // Format as MM/DD/YYYY without using Date objects
  return `${month}/${day}/${year}`;
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // Extract just the date part from ISO string to avoid timezone conversion
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-');
  
  // Format as "Sep 27, 2025" without using Date objects
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthName = monthNames[parseInt(month) - 1];
  return `${monthName} ${parseInt(day)}, ${year}`;
}

export function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate || !endDate) return formatDateSafe(startDate || endDate);
  
  // If same date, return single date
  if (startDate === endDate) {
    return formatDateSafe(startDate);
  }
  
  return `${formatDateSafe(startDate)} - ${formatDateSafe(endDate)}`;
}