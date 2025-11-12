export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function hasInstructorPrivileges(user: any): boolean {
  return user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'superadmin';
}

export function isSuperAdmin(user: any): boolean {
  return user?.role === 'superadmin';
}

export function isAdminOrHigher(user: any): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin';
}

export function isInstructorOrHigher(user: any): boolean {
  return user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'superadmin';
}

export function canCreateAccounts(user: any): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin';
}

export function isPending(user: any): boolean {
  return user?.userStatus === 'pending';
}

export function isActiveAccount(user: any): boolean {
  return user?.userStatus === 'active';
}