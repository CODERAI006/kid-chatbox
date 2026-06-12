/**
 * Authentication routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { trackEvent, EVENT_TYPES } = require('../utils/eventTracker');
const { sendWelcomeEmail, sendGoogleWelcomeEmail } = require('../utils/email');
const { generateUniqueBuddyId } = require('../utils/buddyId');
const { parseBirthDate, calculateAgeFromBirthDate, formatBirthDateValue } = require('../utils/birthDate');
const { ageFromNumber } = require('../utils/resolveQuizAgeGroup');
const { parseEmail } = require('../utils/normalizeEmail');
const {
  DUPLICATE_EMAIL_MESSAGE,
  emailExists,
  isDuplicateEmailError,
  setupNewUserAccount,
} = require('../utils/registerNewUser');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { email: rawEmail, password, name, birthDate, grade, preferredLanguage } = req.body;

    if (!password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    const emailResult = parseEmail(rawEmail);
    if (emailResult.error) {
      return res.status(400).json({
        success: false,
        message: emailResult.error,
      });
    }

    const email = emailResult.email;

    if (!birthDate) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required',
      });
    }

    const birthDateResult = parseBirthDate(birthDate);
    if (birthDateResult.error) {
      return res.status(400).json({
        success: false,
        message: birthDateResult.error,
      });
    }

    if (await emailExists(email)) {
      return res.status(409).json({
        success: false,
        message: DUPLICATE_EMAIL_MESSAGE,
      });
    }

    const normalizedBirthDate = birthDateResult.value;
    const derivedAge = calculateAgeFromBirthDate(normalizedBirthDate);
    const derivedAgeGroup = derivedAge != null ? ageFromNumber(derivedAge) : null;
    const passwordHash = await bcrypt.hash(password, 10);
    const buddyId = await generateUniqueBuddyId(pool, name);

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (
         email, password_hash, name, age, age_group, birth_date, grade,
         preferred_language, status, approved_at, buddy_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', CURRENT_TIMESTAMP, $9)
       RETURNING id, email, name, age, age_group, birth_date, grade, preferred_language, status, buddy_id, created_at`,
      [
        email,
        passwordHash,
        name.trim(),
        derivedAge,
        derivedAgeGroup,
        normalizedBirthDate,
        grade || null,
        preferredLanguage || null,
        buddyId,
      ]
    );

    const user = result.rows[0];
    await setupNewUserAccount(client, user.id);
    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await trackEvent({
      userId: user.id,
      eventType: EVENT_TYPES.USER_REGISTER,
      metadata: {
        email: user.email,
        birthDate: formatBirthDateValue(user.birth_date),
        age: user.age,
        grade: user.grade,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name,
        password,
      });
    } catch (emailError) {
      console.error(`Failed to send welcome email to ${user.email}:`, emailError.message);
    }

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        birthDate: formatBirthDateValue(user.birth_date),
        grade: user.grade,
        preferredLanguage: user.preferred_language,
        buddyId: user.buddy_id,
        status: user.status,
        createdAt: user.created_at,
      },
      token,
      message: 'Registration successful. Your account is enabled with the Freemium plan.',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        success: false,
        message: DUPLICATE_EMAIL_MESSAGE,
      });
    }

    next(error);
  } finally {
    client.release();
  }
});

/**
 * Login with email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body;

    if (!rawEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const emailResult = parseEmail(rawEmail);
    if (emailResult.error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [emailResult.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is approved
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin approval.',
      });
    }

    if (user.status === 'rejected' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact administrator.',
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Track login event
    await trackEvent({
      userId: user.id,
      eventType: EVENT_TYPES.USER_LOGIN,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        grade: user.grade,
        preferredLanguage: user.preferred_language,
        buddyId: user.buddy_id,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Google OAuth callback - Verify Google token and create/login user
 */
router.post('/google', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { token: googleToken, email: rawEmail, name, picture } = req.body;

    if (!googleToken || !rawEmail || !name) {
      return res.status(400).json({
        success: false,
        message: 'Google token, email, and name are required',
      });
    }

    const emailResult = parseEmail(rawEmail);
    if (emailResult.error) {
      return res.status(400).json({
        success: false,
        message: emailResult.error,
      });
    }

    const email = emailResult.email;

    let result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      const buddyId = await generateUniqueBuddyId(pool, name);

      await client.query('BEGIN');

      result = await client.query(
        `INSERT INTO users (email, name, password_hash, status, approved_at, avatar_url, buddy_id)
         VALUES ($1, $2, $3, 'approved', CURRENT_TIMESTAMP, $4, $5)
         RETURNING id, email, name, age, grade, preferred_language, status, buddy_id, created_at`,
        [email, name.trim(), null, picture || null, buddyId]
      );
      user = result.rows[0];

      await setupNewUserAccount(client, user.id);
      await client.query('COMMIT');

      try {
        await trackEvent({
          userId: user.id,
          eventType: EVENT_TYPES.USER_REGISTER,
          metadata: {
            email: user.email,
            method: 'google',
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      } catch (error) {
        console.error('Error tracking Google registration event:', error.message || error);
      }

      try {
        await sendGoogleWelcomeEmail({
          email: user.email,
          name: user.name,
        });
      } catch (emailError) {
        console.error(`Failed to send welcome email to ${user.email}:`, emailError.message || emailError);
      }
    } else {
      user = result.rows[0];

      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    }

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        grade: user.grade,
        preferredLanguage: user.preferred_language,
        buddyId: user.buddy_id,
        createdAt: user.created_at,
      },
      token: jwtToken,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});

    if (isDuplicateEmailError(error)) {
      return res.status(409).json({
        success: false,
        message: DUPLICATE_EMAIL_MESSAGE,
      });
    }

    next(error);
  } finally {
    client.release();
  }
});

/**
 * Social login (Google/Apple) - Legacy endpoint
 */
router.post('/social', async (req, res, next) => {
  try {
    const { provider, token, email: rawEmail, name } = req.body;

    if (!provider || !rawEmail || !name) {
      return res.status(400).json({
        success: false,
        message: 'Provider, email, and name are required',
      });
    }

    if (provider === 'google') {
      return router.handle({ ...req, url: '/google', method: 'POST' }, res, next);
    }

    const client = await pool.connect();

    try {
      const emailResult = parseEmail(rawEmail);
      if (emailResult.error) {
        return res.status(400).json({
          success: false,
          message: emailResult.error,
        });
      }

      const email = emailResult.email;

      let result = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1',
        [email]
      );

      let user;

      if (result.rows.length === 0) {
        const buddyId = await generateUniqueBuddyId(pool, name);

        await client.query('BEGIN');

        result = await client.query(
          `INSERT INTO users (email, name, password_hash, status, approved_at, buddy_id)
           VALUES ($1, $2, $3, 'approved', CURRENT_TIMESTAMP, $4)
           RETURNING id, email, name, age, grade, preferred_language, status, buddy_id, created_at`,
          [email, name.trim(), null, buddyId]
        );
        user = result.rows[0];

        await setupNewUserAccount(client, user.id);
        await client.query('COMMIT');
      } else {
        user = result.rows[0];
      }

      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          age: user.age,
          grade: user.grade,
          preferredLanguage: user.preferred_language,
          buddyId: user.buddy_id,
          createdAt: user.created_at,
        },
        token: jwtToken,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});

      if (isDuplicateEmailError(error)) {
        return res.status(409).json({
          success: false,
          message: DUPLICATE_EMAIL_MESSAGE,
        });
      }

      next(error);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // Get user with roles and permissions
    const userResult = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.age, 
        u.age_group,
        u.grade, 
        u.preferred_language,
        u.buddy_id,
        u.status,
        u.avatar_url,
        u.parent_contact,
        u.created_at,
        u.approved_at,
        u.last_login
      FROM users u 
      WHERE u.id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.name, r.id
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    // Get user permissions
    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.name 
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    // Get module access
    const moduleAccessResult = await pool.query(
      `SELECT module_name, has_access 
       FROM user_module_access 
       WHERE user_id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      user: {
        ...user,
        roles: rolesResult.rows.map((r) => r.name),
        roleIds: rolesResult.rows.map((r) => r.id),
        permissions: permissionsResult.rows.map((p) => p.name),
        moduleAccess: moduleAccessResult.rows.reduce((acc, row) => {
          acc[row.module_name] = row.has_access;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
