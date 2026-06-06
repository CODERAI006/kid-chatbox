/**
 * Plan management API routes
 * Handles CRUD operations for plans and plan assignments
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, checkRole } = require('../middleware/rbac');
const {
  assignPlanToUser,
  getUserPlan,
  getDailyUsage,
  getFreemiumPlan,
} = require('../utils/plans');

const router = express.Router();

// All plan routes require authentication
router.use(authenticateToken);

/**
 * Get all plans
 * GET /api/plans
 */
router.get('/', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.*,
        COUNT(up.user_id) as user_count
      FROM plans p
      LEFT JOIN user_plans up ON p.id = up.plan_id
      GROUP BY p.id
      ORDER BY p.created_at DESC`
    );

    res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get plan by ID
 * GET /api/plans/:id
 */
router.get('/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        COUNT(up.user_id) as user_count
      FROM plans p
      LEFT JOIN user_plans up ON p.id = up.plan_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    res.json({
      success: true,
      plan: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new plan
 * POST /api/plans
 */
router.post('/', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const {
      name,
      description,
      dailyQuizLimit,
      dailyTopicLimit,
      monthlyCost,
      status = 'active',
      hideAiStudy = false,
      hideAiQuiz = false,
    } = req.body;

    // Validate input
    if (!name || dailyQuizLimit === undefined || dailyTopicLimit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, dailyQuizLimit, and dailyTopicLimit are required',
      });
    }

    // Check if plan name already exists
    const existingPlan = await pool.query(
      'SELECT id FROM plans WHERE name = $1',
      [name]
    );

    if (existingPlan.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Plan with this name already exists',
      });
    }

    const result = await pool.query(
      `INSERT INTO plans (
        name, 
        description, 
        daily_quiz_limit, 
        daily_topic_limit, 
        monthly_cost, 
        status,
        hide_ai_study,
        hide_ai_quiz
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name,
        description || null,
        parseInt(dailyQuizLimit, 10),
        parseInt(dailyTopicLimit, 10),
        parseFloat(monthlyCost || 0),
        status,
        Boolean(hideAiStudy),
        Boolean(hideAiQuiz),
      ]
    );

    res.status(201).json({
      success: true,
      plan: result.rows[0],
      message: 'Plan created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a plan
 * PUT /api/plans/:id
 */
router.put('/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      dailyQuizLimit,
      dailyTopicLimit,
      monthlyCost,
      status,
      hideAiStudy,
      hideAiQuiz,
    } = req.body;

    // Check if plan exists
    const existingPlan = await pool.query(
      'SELECT id FROM plans WHERE id = $1',
      [id]
    );

    if (existingPlan.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (dailyQuizLimit !== undefined) {
      paramCount++;
      updates.push(`daily_quiz_limit = $${paramCount}`);
      values.push(parseInt(dailyQuizLimit, 10));
    }

    if (dailyTopicLimit !== undefined) {
      paramCount++;
      updates.push(`daily_topic_limit = $${paramCount}`);
      values.push(parseInt(dailyTopicLimit, 10));
    }

    if (monthlyCost !== undefined) {
      paramCount++;
      updates.push(`monthly_cost = $${paramCount}`);
      values.push(parseFloat(monthlyCost));
    }

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (hideAiStudy !== undefined) {
      paramCount++;
      updates.push(`hide_ai_study = $${paramCount}`);
      values.push(Boolean(hideAiStudy));
    }

    if (hideAiQuiz !== undefined) {
      paramCount++;
      updates.push(`hide_ai_quiz = $${paramCount}`);
      values.push(Boolean(hideAiQuiz));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      success: true,
      plan: result.rows[0],
      message: 'Plan updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a plan (soft delete by setting status to inactive)
 * DELETE /api/plans/:id
 */
router.delete('/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if plan exists
    const existingPlan = await pool.query(
      'SELECT id FROM plans WHERE id = $1',
      [id]
    );

    if (existingPlan.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Check if plan is assigned to any users
    const assignedUsers = await pool.query(
      'SELECT COUNT(*) as count FROM user_plans WHERE plan_id = $1',
      [id]
    );

    if (parseInt(assignedUsers.rows[0].count, 10) > 0) {
      // Soft delete by setting status to inactive
      await pool.query(
        "UPDATE plans SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      return res.json({
        success: true,
        message: 'Plan deactivated successfully (plan is assigned to users)',
      });
    }

    // Hard delete if no users assigned
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Assign plan to user
 * POST /api/plans/:planId/assign/:userId
 */
router.post(
  '/:planId/assign/:userId',
  checkPermission('manage_users'),
  async (req, res, next) => {
    try {
      const { planId, userId } = req.params;

      // Verify plan exists
      const planResult = await pool.query(
        'SELECT * FROM plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found',
        });
      }

      if (planResult.rows[0].status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign inactive plan',
        });
      }

      // Verify user exists
      const userResult = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Assign plan
      await assignPlanToUser(userId, planId, req.user.id);

      // Get updated user plan info
      const userPlan = await getUserPlan(userId);

      res.json({
        success: true,
        message: 'Plan assigned successfully',
        userPlan,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get user's current plan and usage
 * GET /api/plans/user/:userId
 */
router.get('/user/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Users can only view their own plan, unless they're admin
    if (req.user.id !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const plan = await getUserPlan(userId);
    const usage = await getDailyUsage(userId);

    // If no plan assigned, return Freemium plan
    const userPlan = plan || await getFreemiumPlan();

    res.json({
      success: true,
      plan: userPlan,
      usage: {
        quizCount: usage ? usage.quiz_count : 0,
        topicCount: usage ? usage.topic_count : 0,
        date: usage ? usage.usage_date : new Date().toISOString().split('T')[0],
      },
      limits: {
        dailyQuizLimit: userPlan.daily_quiz_limit,
        dailyTopicLimit: userPlan.daily_topic_limit,
        remainingQuizzes: Math.max(0, userPlan.daily_quiz_limit - (usage ? usage.quiz_count : 0)),
        remainingTopics: Math.max(0, userPlan.daily_topic_limit - (usage ? usage.topic_count : 0)),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


