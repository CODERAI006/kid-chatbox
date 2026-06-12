/**
 * Admin API routes
 * Handles user management, topic management, quiz management, and analytics
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, checkRole } = require('../middleware/rbac');
const { getFreemiumPlan, assignPlanToUser } = require('../utils/plans');
const { sendWelcomeEmail } = require('../utils/email');
const { generateUniqueBuddyId } = require('../utils/buddyId');

const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);

/**
 * Generate a secure random password using cryptographically secure random number generator
 * @param {number} length - Password length (default: 12)
 * @returns {string} Generated password
 */
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Ensure password has at least one of each type
  let password = '';
  password += uppercase[randomBytes[0] % uppercase.length];
  password += lowercase[randomBytes[1] % lowercase.length];
  password += numbers[randomBytes[2] % numbers.length];
  password += symbols[randomBytes[3] % symbols.length];

  // Fill the rest with random characters using secure random
  for (let i = password.length; i < length; i++) {
    password += allChars[randomBytes[i] % allChars.length];
  }

  // Shuffle the password using Fisher-Yates algorithm with secure random
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = randomBytes[i] % (i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

/**
 * Get all users with filters
 * GET /api/admin/users?status=pending&role=student&page=1&limit=20
 */
router.get('/users', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { status, role, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.age,
        u.age_group,
        u.grade,
        u.status,
        u.avatar_url,
        u.parent_contact,
        u.created_at,
        u.approved_at,
        u.last_login,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('name', r.name)) 
          FILTER (WHERE r.name IS NOT NULL),
          '[]'::json
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND u.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT u.id) as total FROM users u WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (status) {
      countParamCount++;
      countQuery += ` AND u.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (u.name ILIKE $${countParamCount} OR u.email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Filter by role if specified
    let users = result.rows;
    if (role) {
      users = users.filter((user) => {
        const userRoles = user.roles || [];
        return userRoles.some((r) => r.name === role);
      });
    }

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user by ID with detailed analytics
 * GET /api/admin/users/:id
 */
router.get('/users/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user details
    const userResult = await pool.query(
      `SELECT 
        u.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('name', r.name)) 
          FILTER (WHERE r.name IS NOT NULL),
          '[]'::json
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Get user analytics
    const analyticsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT qa.id) as quiz_attempts,
        COUNT(DISTINCT sp.id) as study_sessions,
        COALESCE(SUM(qa.score), 0) as total_score,
        COALESCE(AVG(qa.score_percentage), 0) as avg_score,
        COALESCE(SUM(qa.time_taken), 0) as total_study_time,
        COALESCE(SUM(tu.tokens_earned), 0) as total_tokens
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
      LEFT JOIN study_progress sp ON u.id = sp.user_id
      LEFT JOIN tokens_usage tu ON u.id = tu.user_id
      WHERE u.id = $1
      GROUP BY u.id`,
      [id]
    );

    // Get most visited topics
    const topicsResult = await pool.query(
      `SELECT 
        s.title as subtopic_title,
        t.title as topic_title,
        COUNT(sp.id) as visit_count
      FROM study_progress sp
      INNER JOIN subtopics s ON sp.subtopic_id = s.id
      INNER JOIN topics t ON s.topic_id = t.id
      WHERE sp.user_id = $1
      GROUP BY s.title, t.title
      ORDER BY visit_count DESC
      LIMIT 5`,
      [id]
    );

    res.json({
      success: true,
      user,
      analytics: {
        ...analyticsResult.rows[0],
        mostVisitedTopics: topicsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve or reject user
 * PUT /api/admin/users/:id/approve
 */
router.put('/users/:id/approve', checkPermission('approve_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, moduleAccess } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "approved" or "rejected"',
      });
    }

    const updateData = {
      status,
      approved_at: status === 'approved' ? new Date() : null,
      approved_by: req.user.id,
    };

    await pool.query(
      `UPDATE users 
       SET status = $1, approved_at = $2, approved_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [updateData.status, updateData.approved_at, updateData.approved_by, id]
    );

    // Grant module access if approved
    if (status === 'approved') {
      // Default to granting both study and quiz access if not specified
      const modulesToGrant = moduleAccess && moduleAccess.length > 0 
        ? moduleAccess 
        : ['study', 'quiz'];
      
      for (const module of modulesToGrant) {
        await pool.query(
          `INSERT INTO user_module_access (user_id, module_name, granted_by, has_access)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (user_id, module_name) 
           DO UPDATE SET has_access = true, granted_by = $3`,
          [id, module, req.user.id]
        );
      }

      // Send approval email to user
      try {
        const userResult = await pool.query(
          'SELECT email, name FROM users WHERE id = $1',
          [id]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const { sendApprovalEmail } = require('../utils/email');
          await sendApprovalEmail({
            email: user.email,
            name: user.name,
          });
        }
      } catch (emailError) {
        // Log error but don't fail approval if email fails
        console.error(`Failed to send approval email to user ${id}:`, emailError.message);
      }
    } else if (status === 'rejected') {
      // Revoke module access if rejected
      await pool.query(
        `UPDATE user_module_access 
         SET has_access = false 
         WHERE user_id = $1`,
        [id]
      );
    }

    res.json({
      success: true,
      message: `User ${status} successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Assign roles to user
 * PUT /api/admin/users/:id/roles
 */
router.put('/users/:id/roles', checkPermission('assign_roles'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body; // Array of role UUIDs

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({
        success: false,
        message: 'roleIds must be an array',
      });
    }

    // Remove existing roles
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    // Add new roles
    for (const roleId of roleIds) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)`,
        [id, roleId, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Roles assigned successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile
 * PUT /api/admin/users/:id
 */
router.put('/users/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, age, ageGroup, grade, parentContact, avatarUrl } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      params.push(name);
    }
    if (age !== undefined) {
      updates.push(`age = $${++paramCount}`);
      params.push(age);
    }
    if (ageGroup !== undefined) {
      updates.push(`age_group = $${++paramCount}`);
      params.push(ageGroup);
    }
    if (grade !== undefined) {
      updates.push(`grade = $${++paramCount}`);
      params.push(grade);
    }
    if (parentContact !== undefined) {
      updates.push(`parent_contact = $${++paramCount}`);
      params.push(parentContact);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${++paramCount}`);
      params.push(avatarUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${++paramCount}`,
      params
    );

    res.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset user password
 * PUT /api/admin/users/:id/reset-password
 */
router.put('/users/:id/reset-password', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Suspend user
 * PUT /api/admin/users/:id/suspend
 */
router.put('/users/:id/suspend', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['suspended', id]
    );

    res.json({
      success: true,
      message: 'User suspended successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete user roles first (foreign key constraint)
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    // Delete user plan assignments
    await pool.query('DELETE FROM user_plans WHERE user_id = $1', [id]);

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all roles
 * GET /api/admin/roles
 */
router.get('/roles', checkPermission('assign_roles'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', p.id, 'name', p.name)) 
          FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.name`
    );

    res.json({
      success: true,
      roles: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all permissions
 * GET /api/admin/permissions
 */
router.get('/permissions', checkPermission('assign_roles'), async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM permissions ORDER BY resource, action');

    res.json({
      success: true,
      permissions: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new user (admin only)
 * POST /api/admin/users/create
 */
router.post('/users/create', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      age,
      ageGroup,
      grade,
      parentContact,
      roles, // Array of role IDs
      moduleAccess, // Array of module names
      status, // 'approved' or 'pending'
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Generate password if not provided
    const userPassword = password || generatePassword(12);
    const passwordHash = await bcrypt.hash(userPassword, 10);

    // Create user
    const userStatus = status || 'pending';
    const buddyId = await generateUniqueBuddyId(pool, name);
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, name, age, age_group, grade,
        parent_contact, status, buddy_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, name, age, age_group, grade, status, buddy_id, created_at`,
      [
        email,
        passwordHash,
        name,
        age || null,
        ageGroup || null,
        grade || null,
        parentContact || null,
        userStatus,
        buddyId,
      ]
    );

    const user = result.rows[0];

    // Assign roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const roleId of roles) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [user.id, roleId, req.user.id]
        );
      }
    } else {
      // Default: assign student role
      const studentRoleResult = await pool.query(
        "SELECT id FROM roles WHERE name = 'student'"
      );
      if (studentRoleResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id, assigned_by)
           VALUES ($1, $2, $3)`,
          [user.id, studentRoleResult.rows[0].id, req.user.id]
        );
      }
    }

    // Grant module access if provided
    if (moduleAccess && Array.isArray(moduleAccess)) {
      for (const module of moduleAccess) {
        await pool.query(
          `INSERT INTO user_module_access (user_id, module_name, granted_by, has_access)
           VALUES ($1, $2, $3, true)`,
          [user.id, module, req.user.id]
        );
      }
    }

    // Assign Freemium plan to new user (if not already assigned)
    // Check if user has admin roles - admins don't need plans
    const userRolesResult = await pool.query(
      `SELECT r.name 
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.name IN ('admin', 'super_admin')`,
      [user.id]
    );

    // Only assign plan if user is not an admin
    if (userRolesResult.rows.length === 0) {
      try {
        const freemiumPlan = await getFreemiumPlan();
        await assignPlanToUser(user.id, freemiumPlan.id, req.user.id);
      } catch (error) {
        console.error(`Error assigning Freemium plan to user ${user.id} (${user.email}) created by admin ${req.user.id}:`, error.message || error);
        // Don't fail user creation if plan assignment fails
      }
    }

    // If status is approved, set approved_at
    if (userStatus === 'approved') {
      await pool.query(
        `UPDATE users 
         SET approved_at = CURRENT_TIMESTAMP, approved_by = $1
         WHERE id = $2`,
        [req.user.id, user.id]
      );
    }

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name,
        password: userPassword, // Send plain password in email
      });
    } catch (emailError) {
      // Log error but don't fail user creation if email fails
      console.error(`Failed to send welcome email to ${user.email}:`, emailError.message);
      // User creation still succeeds even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email sent.',
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get unique subjects and users from quiz history (admin only)
 * GET /api/admin/quiz-history/filters
 */
router.get('/quiz-history/filters', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    // Get unique subjects
    const subjectsResult = await pool.query(
      `SELECT DISTINCT subject 
       FROM quiz_results 
       WHERE subject IS NOT NULL AND subject != ''
       ORDER BY subject`
    );

    // Get unique user IDs with user info
    const usersResult = await pool.query(
      `SELECT DISTINCT 
         qr.user_id,
         u.name,
         u.email
       FROM quiz_results qr
       LEFT JOIN users u ON qr.user_id = u.id
       WHERE qr.user_id IS NOT NULL
       ORDER BY u.name, u.email`
    );

    res.json({
      success: true,
      subjects: subjectsResult.rows.map((row) => row.subject),
      users: usersResult.rows.map((row) => ({
        id: row.user_id,
        name: row.name || 'Unknown',
        email: row.email || '',
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all quiz history (admin only)
 * GET /api/admin/quiz-history?userId=&subject=&page=1&limit=20
 */
router.get('/quiz-history', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { userId, subject, subtopic, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        qr.id,
        qr.user_id,
        qr.timestamp,
        qr.subject,
        qr.subtopic,
        qr.age,
        qr.language,
        qr.correct_count,
        qr.wrong_count,
        qr.time_taken,
        qr.score_percentage,
        qr.explanation_of_mistakes,
        u.name as user_name,
        u.email as user_email,
        COUNT(qa.id) as answer_count
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      LEFT JOIN quiz_answers qa ON qr.id = qa.quiz_result_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND qr.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (subject) {
      paramCount++;
      query += ` AND qr.subject ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
    }

    if (subtopic) {
      paramCount++;
      query += ` AND qr.subtopic ILIKE $${paramCount}`;
      params.push(`%${subtopic}%`);
    }

    query += ` 
      GROUP BY qr.id, u.name, u.email
      ORDER BY qr.timestamp DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT qr.id) as total
      FROM quiz_results qr
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (userId) {
      countParamCount++;
      countQuery += ` AND qr.user_id = $${countParamCount}`;
      countParams.push(userId);
    }

    if (subject) {
      countParamCount++;
      countQuery += ` AND qr.subject ILIKE $${countParamCount}`;
      countParams.push(`%${subject}%`);
    }

    if (subtopic) {
      countParamCount++;
      countQuery += ` AND qr.subtopic ILIKE $${countParamCount}`;
      countParams.push(`%${subtopic}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      results: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz history details by ID (admin only)
 * GET /api/admin/quiz-history/:id
 */
router.get('/quiz-history/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        qr.id,
        qr.user_id,
        qr.timestamp,
        qr.subject,
        qr.subtopic,
        qr.age,
        qr.language,
        qr.correct_count,
        qr.wrong_count,
        qr.time_taken,
        qr.score_percentage,
        qr.explanation_of_mistakes,
        u.name as user_name,
        u.email as user_email,
        json_agg(
          json_build_object(
            'questionNumber', qa.question_number,
            'question', qa.question,
            'childAnswer', qa.child_answer,
            'correctAnswer', qa.correct_answer,
            'explanation', qa.explanation,
            'isCorrect', qa.is_correct,
            'options', qa.options
          )
        ) as answers
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      LEFT JOIN quiz_answers qa ON qr.id = qa.quiz_result_id
      WHERE qr.id = $1
      GROUP BY qr.id, u.name, u.email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz history not found',
      });
    }

    res.json({
      success: true,
      result: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete quiz history entry (admin only)
 * DELETE /api/admin/quiz-history/:id
 */
router.delete('/quiz-history/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if quiz result exists
    const checkResult = await pool.query('SELECT id FROM quiz_results WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz history not found',
      });
    }

    // Delete quiz answers first (foreign key constraint)
    await pool.query('DELETE FROM quiz_answers WHERE quiz_result_id = $1', [id]);

    // Delete quiz result
    await pool.query('DELETE FROM quiz_results WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Quiz history deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Ollama Cloud settings (masked API key)
 * GET /api/admin/ollama-cloud
 */
router.get('/ollama-cloud', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const {
      getOllamaCloudSettingsForAdmin,
      loadOllamaCloudSettings,
    } = require('../utils/ollamaCloudSettings');
    await loadOllamaCloudSettings();
    const settings = await getOllamaCloudSettingsForAdmin();
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

/**
 * Update Ollama Cloud settings
 * PUT /api/admin/ollama-cloud
 * Body: { enabled?, apiKey?, cloudModel?, cloudVisionModel?, models? }
 */
router.put('/ollama-cloud', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { enabled, apiKey, cloudModel, cloudVisionModel, models } = req.body || {};
    const { saveOllamaCloudSettings } = require('../utils/ollamaCloudSettings');

    if (enabled === true && typeof apiKey === 'string' && !apiKey.trim()) {
      const current = await require('../utils/ollamaCloudSettings').getOllamaCloudSettingsForAdmin();
      if (!current.hasApiKey) {
        return res.status(400).json({
          success: false,
          message: 'API key is required when enabling Ollama Cloud.',
        });
      }
    }

    const settings = await saveOllamaCloudSettings({
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      apiKey: typeof apiKey === 'string' ? apiKey : undefined,
      cloudModel: typeof cloudModel === 'string' ? cloudModel : undefined,
      cloudVisionModel: typeof cloudVisionModel === 'string' ? cloudVisionModel : undefined,
      models: models && typeof models === 'object' ? models : undefined,
      updatedBy: req.user?.id,
    });

    res.json({ success: true, settings, message: 'Ollama Cloud settings saved.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Test Ollama Cloud / local connection with current settings
 * POST /api/admin/ollama-cloud/test
 */
router.post('/ollama-cloud/test', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { ollamaChat, getOllamaRuntimeConfig, isLlmConfigured } = require('../utils/ollamaClient');
    const { loadOllamaCloudSettings } = require('../utils/ollamaCloudSettings');
    await loadOllamaCloudSettings();

    if (!isLlmConfigured()) {
      const runtime = getOllamaRuntimeConfig();
      return res.status(400).json({
        success: false,
        message:
          runtime.mode === 'cloud'
            ? 'Ollama Cloud is enabled but no API key is configured.'
            : 'AI is disabled (OLLAMA_DISABLED).',
      });
    }

    const runtime = getOllamaRuntimeConfig();
    const { content, model } = await ollamaChat({
      messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
      temperature: 0,
      num_predict: 16,
      logContext: 'admin.ollama-cloud.test',
      requestTimeoutMs: 120_000,
    });

    res.json({
      success: true,
      mode: runtime.mode,
      model: model || runtime.model,
      preview: content.slice(0, 120),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Word of the Day complexity settings per grade
 * GET /api/admin/word-of-day/settings
 */
router.get('/word-of-day/settings', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { getAllSettings, VALID_COMPLEXITIES } = require('../utils/wordOfDaySettings');
    const settings = await getAllSettings();
    res.json({ success: true, settings, complexities: VALID_COMPLEXITIES });
  } catch (error) {
    next(error);
  }
});

/**
 * Update Word of the Day settings per grade
 * PUT /api/admin/word-of-day/settings
 * Body: { settings: [{ grade, complexity, enabled? }] }
 */
router.put('/word-of-day/settings', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { updateSettings } = require('../utils/wordOfDaySettings');
    const updates = Array.isArray(req.body?.settings) ? req.body.settings : [];
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'settings array is required' });
    }
    const settings = await updateSettings(updates, req.user?.id);
    res.json({ success: true, settings, message: 'Word of the Day settings saved.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

