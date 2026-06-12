/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks user permissions before allowing access to protected routes
 */

const { pool } = require('../config/database');

/**
 * Check if user has a specific permission
 * @param {string} permissionName - Name of the permission to check
 * @returns {Function} Express middleware function
 */
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get user roles and permissions
      const result = await pool.query(
        `SELECT p.name 
         FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         INNER JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1 AND p.name = $2`,
        [req.user.id, permissionName]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permissionName} required`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has any of the specified roles
 * @param {string[]} roleNames - Array of role names
 * @returns {Function} Express middleware function
 */
const checkRole = (roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const result = await pool.query(
        `SELECT r.name 
         FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.name = ANY($2::varchar[])`,
        [req.user.id, roleNames]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: `Access denied: One of these roles required: ${roleNames.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has access to a specific module
 * @param {string} moduleName - Name of the module (e.g., 'study', 'quiz')
 * @returns {Function} Express middleware function
 */
const checkModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check if user is approved
      const userResult = await pool.query(
        'SELECT status FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      if (user.status !== 'approved' && user.status !== 'enabled') {
        return res.status(403).json({
          success: false,
          message: 'Account pending approval. Please wait for admin approval.',
        });
      }

      // Check module access
      const moduleResult = await pool.query(
        `SELECT has_access 
         FROM user_module_access 
         WHERE user_id = $1 AND module_name = $2`,
        [req.user.id, moduleName]
      );

      // If no specific access record exists, check if user has admin role
      if (moduleResult.rows.length === 0) {
        const adminCheck = await pool.query(
          `SELECT r.name 
           FROM roles r
           INNER JOIN user_roles ur ON r.id = ur.role_id
           WHERE ur.user_id = $1 AND r.name = 'admin'`,
          [req.user.id]
        );

        if (adminCheck.rows.length > 0) {
          return next(); // Admin has access to everything
        }

        // Default: DENY access if no explicit permission granted
        return res.status(403).json({
          success: false,
          message: `Access denied to ${moduleName} module. Please contact administrator for access.`,
        });
      }

      if (!moduleResult.rows[0].has_access) {
        return res.status(403).json({
          success: false,
          message: `Access denied to ${moduleName} module`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Get user permissions (utility function)
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of permission names
 */
const getUserPermissions = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT p.name 
     FROM permissions p
     INNER JOIN role_permissions rp ON p.id = rp.permission_id
     INNER JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.name);
};

/**
 * Get user roles (utility function)
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of role names
 */
const getUserRoles = async (userId) => {
  const result = await pool.query(
    `SELECT r.name 
     FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );

  return result.rows.map((row) => row.name);
};

module.exports = {
  checkPermission,
  checkRole,
  checkModuleAccess,
  getUserPermissions,
  getUserRoles,
};

