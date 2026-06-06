/**
 * Shared helpers for user roles and access checks.
 */

type UserLike = Record<string, unknown> | null | undefined;

export function isAppAdmin(user: UserLike): boolean {
  if (!user) return false;
  const roles = user.roles;
  if (Array.isArray(roles) && roles.includes('admin')) return true;
  if (user.role === 'admin') return true;
  return user.is_admin === true;
}

export function getUserId(user: UserLike): string | null {
  const id = user?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
