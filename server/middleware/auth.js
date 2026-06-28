/**
 * Authentication middleware
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { getJwtSecret } = require('../utils/jwtConfig');
const { COOKIE_NAME } = require('../utils/authCookies');

const ALLOWED_STATUSES = new Set(['enabled', 'approved']);

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token = req.cookies?.[COOKIE_NAME] || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.age, 
        u.grade, 
        u.preferred_language,
        u.status,
        u.avatar_url,
        u.age_group,
        u.last_login
      FROM users u 
      WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    if (!ALLOWED_STATUSES.has(user.status)) {
      return res.status(403).json({
        success: false,
        message: 'Your account access is restricted. Please contact an administrator.',
      });
    }

    const rolesResult = await pool.query(
      `SELECT r.name 
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.name 
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    req.user = {
      ...user,
      roles: rolesResult.rows.map((r) => r.name),
      permissions: permissionsResult.rows.map((p) => p.name),
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    if (/JWT_SECRET/i.test(error.message || '')) {
      console.error('[auth] JWT configuration error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Authentication service misconfigured',
      });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === '53300') {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable',
      });
    }
    next(error);
  }
};

module.exports = { authenticateToken };
