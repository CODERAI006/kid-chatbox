/**
 * Role-based data access policy for the AI chatbot.
 * All queries must pass through this layer — LLM never gets unrestricted SQL.
 */

/** @typedef {'self' | 'aggregated' | 'school_wide'} AccessLevel */

/**
 * @param {{ id: string, roles?: string[], permissions?: string[], status?: string }} user
 * @returns {{ level: AccessLevel, userId: string, roles: string[], canQueryUsers: boolean, deniedReason?: string }}
 */
function resolveAccessScope(user) {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  if (user.status && user.status !== 'approved' && user.status !== 'enabled') {
    return {
      level: 'self',
      userId: user.id,
      roles,
      canQueryUsers: false,
      deniedReason: 'Account pending approval.',
    };
  }

  if (roles.includes('admin')) {
    return { level: 'school_wide', userId: user.id, roles, canQueryUsers: true };
  }

  if (
    roles.includes('content_manager') ||
    permissions.includes('view_analytics')
  ) {
    return { level: 'aggregated', userId: user.id, roles, canQueryUsers: true };
  }

  // student, parent, and any other role — own data only
  return { level: 'self', userId: user.id, roles, canQueryUsers: false };
}

/**
 * Build parameterized user filter for a table that has user_id column.
 * @param {AccessLevel} level
 * @param {string} userId
 * @param {string} [paramAlias='uid']
 */
function buildUserFilter(level, userId, paramAlias = 'uid') {
  if (level === 'school_wide') {
    return { clause: '', params: [], nextIndex: 1 };
  }
  return {
    clause: `user_id = $${paramAlias}`,
    params: [userId],
    paramIndex: 1,
  };
}

/**
 * Validates that a query plan respects the user's access scope.
 * @param {{ scope: string, includesUserBreakdown?: boolean }} plan
 * @param {{ level: AccessLevel, canQueryUsers: boolean }} scope
 */
function validatePlanAccess(plan, scope) {
  if (plan.includesUserBreakdown && !scope.canQueryUsers) {
    return {
      allowed: false,
      reason: 'You can only view your own performance data.',
    };
  }
  if (plan.scope === 'school_wide' && scope.level !== 'school_wide') {
    if (scope.level === 'aggregated' && plan.aggregatedOnly) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'School-wide analytics require admin access.',
    };
  }
  return { allowed: true };
}

function isAdminOrAnalyst(scope) {
  return scope.level === 'school_wide' || scope.level === 'aggregated';
}

module.exports = {
  resolveAccessScope,
  buildUserFilter,
  validatePlanAccess,
  isAdminOrAnalyst,
};
