export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function hasInstructorPrivileges(user: any): boolean {
  return user?.role === 'instructor' || user?.role === 'superadmin';
}