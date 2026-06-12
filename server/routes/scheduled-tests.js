/**
 * Scheduled Tests API routes
 * Handles quiz scheduling with users based on plans
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Create scheduled test
 * POST /api/scheduled-tests
 */
router.post('/', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const {
      quizId,
      scheduledFor,
      visibleFrom,
      visibleUntil,
      durationMinutes,
      planIds,
      userIds,
      instructions,
    } = req.body;

    if (!quizId || !scheduledFor || !visibleFrom) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID, scheduled date, and visible from date are required',
      });
    }

    // Validate quiz exists
    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    // If planIds provided, validate plans exist
    if (planIds && planIds.length > 0) {
      const planResult = await pool.query(
        `SELECT id FROM plans WHERE id = ANY($1::uuid[]) AND status = 'active'`,
        [planIds]
      );
      if (planResult.rows.length !== planIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more plans not found or inactive',
        });
      }
    }

    // If userIds provided, validate users exist
    if (userIds && userIds.length > 0) {
      const userResult = await pool.query(
        `SELECT id FROM users WHERE id = ANY($1::uuid[]) AND status IN ('approved', 'enabled')`,
        [userIds]
      );
      if (userResult.rows.length !== userIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more users not found or not approved',
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO scheduled_tests (
        quiz_id, scheduled_by, scheduled_for, visible_from, visible_until,
        duration_minutes, plan_ids, user_ids, instructions, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
      RETURNING *`,
      [
        quizId,
        req.user.id,
        scheduledFor,
        visibleFrom,
        visibleUntil || null,
        durationMinutes || null,
        planIds || [],
        userIds || [],
        instructions || null,
      ]
    );

    res.status(201).json({
      success: true,
      scheduledTest: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk schedule multiple quizzes with shared settings
 * POST /api/scheduled-tests/batch
 */
router.post('/batch', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const {
      quizIds,
      scheduledFor,
      visibleFrom,
      visibleUntil,
      durationMinutes,
      planIds,
      userIds,
      instructions,
    } = req.body;

    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({ success: false, message: 'quizIds array is required' });
    }
    if (quizIds.length > 50) {
      return res.status(400).json({ success: false, message: 'Maximum 50 quizzes per batch' });
    }
    if (!scheduledFor || !visibleFrom) {
      return res.status(400).json({
        success: false,
        message: 'scheduledFor and visibleFrom are required',
      });
    }
    if ((!planIds || planIds.length === 0) && (!userIds || userIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one plan or user',
      });
    }

    if (planIds && planIds.length > 0) {
      const planResult = await pool.query(
        `SELECT id FROM plans WHERE id = ANY($1::uuid[]) AND status = 'active'`,
        [planIds]
      );
      if (planResult.rows.length !== planIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more plans not found or inactive',
        });
      }
    }

    const results = [];
    const errors = [];

    for (const quizId of quizIds) {
      try {
        const quizResult = await pool.query('SELECT id, name FROM quizzes WHERE id = $1', [quizId]);
        if (quizResult.rows.length === 0) {
          errors.push({ name: quizId, reason: 'Quiz not found' });
          continue;
        }

        const insert = await pool.query(
          `INSERT INTO scheduled_tests (
            quiz_id, scheduled_by, scheduled_for, visible_from, visible_until,
            duration_minutes, plan_ids, user_ids, instructions, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
          RETURNING id, quiz_id`,
          [
            quizId,
            req.user.id,
            scheduledFor,
            visibleFrom,
            visibleUntil || null,
            durationMinutes || null,
            planIds || [],
            userIds || [],
            instructions || null,
          ]
        );

        results.push({
          id: insert.rows[0].id,
          quizId,
          name: quizResult.rows[0].name,
        });
      } catch (err) {
        errors.push({ name: quizId, reason: err.message });
      }
    }

    res.status(201).json({
      success: true,
      created: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all scheduled tests
 * GET /api/scheduled-tests
 */
router.get('/', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { status, quizId } = req.query;

    let query = `
      SELECT 
        st.*,
        q.name as quiz_name,
        q.description as quiz_description,
        u.name as scheduled_by_name,
        u.email as scheduled_by_email
      FROM scheduled_tests st
      INNER JOIN quizzes q ON st.quiz_id = q.id
      INNER JOIN users u ON st.scheduled_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      query += ` AND st.status = $${++paramCount}`;
      params.push(status);
    }
    if (quizId) {
      query += ` AND st.quiz_id = $${++paramCount}`;
      params.push(quizId);
    }

    query += ' ORDER BY st.scheduled_for DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      scheduledTests: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get scheduled tests for current student user
 * GET /api/scheduled-tests/my-tests
 * Must be defined BEFORE /:id route to avoid route conflict
 */
router.get('/my-tests', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get user's plan IDs
    const userPlansResult = await pool.query(
      'SELECT plan_id FROM user_plans WHERE user_id = $1',
      [userId]
    );
    const userPlanIds = userPlansResult.rows.map((row) => row.plan_id);

    // Build query to find scheduled tests where:
    // 1. User is directly assigned (user_ids contains user ID)
    // 2. User's plan is in plan_ids
    // 3. Test is visible (visible_from <= now)
    // 4. Test is not expired (visible_until is null or visible_until >= now)
    // 5. Status is 'scheduled' or 'active'
    let query = `
      SELECT 
        st.*,
        q.id as quiz_id,
        q.name as quiz_name,
        q.description as quiz_description,
        q.age_group as quiz_age_group,
        q.difficulty as quiz_difficulty,
        q.number_of_questions,
        q.passing_percentage,
        q.time_limit,
        u.name as scheduled_by_name
      FROM scheduled_tests st
      INNER JOIN quizzes q ON st.quiz_id = q.id
      INNER JOIN users u ON st.scheduled_by = u.id
      WHERE (
        ($1 = ANY(st.user_ids) OR (st.plan_ids IS NOT NULL AND st.plan_ids && $2::uuid[]))
      )
      AND st.visible_from <= $3
      AND (st.visible_until IS NULL OR st.visible_until >= $3)
      AND st.status IN ('scheduled', 'active')
      ORDER BY 
        CASE 
          WHEN st.status = 'active' THEN 1
          WHEN st.scheduled_for <= $3 THEN 2
          ELSE 3
        END,
        st.scheduled_for ASC
    `;

    const result = await pool.query(query, [
      userId,
      userPlanIds.length > 0 ? userPlanIds : [],
      now,
    ]);

    // Check for active and completed attempts for each scheduled test
    const scheduledTestsWithAttempts = await Promise.all(
      result.rows.map(async (test) => {
        // Check if user has an active attempt for this quiz
        const activeAttemptResult = await pool.query(
          `SELECT id, started_at, time_taken
           FROM quiz_attempts
           WHERE user_id = $1 
           AND quiz_id = $2 
           AND status = 'in_progress'
           ORDER BY started_at DESC
           LIMIT 1`,
          [userId, test.quiz_id]
        );

        // Check if user has a completed attempt for this quiz
        const completedAttemptResult = await pool.query(
          `SELECT id, started_at, completed_at, time_taken, score, score_percentage, 
                  correct_answers, wrong_answers, status
           FROM quiz_attempts
           WHERE user_id = $1 
           AND quiz_id = $2 
           AND status = 'completed'
           ORDER BY completed_at DESC
           LIMIT 1`,
          [userId, test.quiz_id]
        );

        const hasActiveAttempt = activeAttemptResult.rows.length > 0;
        const hasCompletedAttempt = completedAttemptResult.rows.length > 0;
        const completedAttempt = hasCompletedAttempt ? completedAttemptResult.rows[0] : null;

        return {
          ...test,
          hasActiveAttempt,
          activeAttemptId: hasActiveAttempt ? activeAttemptResult.rows[0].id : null,
          attemptStartedAt: hasActiveAttempt ? activeAttemptResult.rows[0].started_at : null,
          hasCompletedAttempt,
          completedAttemptId: hasCompletedAttempt ? completedAttempt.id : null,
          completedAt: hasCompletedAttempt ? completedAttempt.completed_at : null,
          score: hasCompletedAttempt ? completedAttempt.score : null,
          scorePercentage: hasCompletedAttempt
            ? parseFloat(completedAttempt.score_percentage) || 0
            : null,
          correctAnswers: hasCompletedAttempt ? completedAttempt.correct_answers : null,
          wrongAnswers: hasCompletedAttempt ? completedAttempt.wrong_answers : null,
          timeTaken: hasCompletedAttempt ? completedAttempt.time_taken : null,
        };
      })
    );

    res.json({
      success: true,
      scheduledTests: scheduledTestsWithAttempts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get scheduled test by ID
 * GET /api/scheduled-tests/:id
 * Accessible by admins OR students eligible for the test
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userPermissions = req.user.permissions || [];

    // Check if user has admin permission
    const isAdmin = userPermissions.includes('manage_quizzes');

    // Get scheduled test
    const result = await pool.query(
      `SELECT 
        st.*,
        q.id as quiz_id,
        q.name as quiz_name,
        q.description as quiz_description,
        q.age_group as quiz_age_group,
        q.difficulty as quiz_difficulty,
        q.number_of_questions,
        q.passing_percentage,
        q.time_limit,
        u.name as scheduled_by_name,
        u.email as scheduled_by_email
      FROM scheduled_tests st
      INNER JOIN quizzes q ON st.quiz_id = q.id
      INNER JOIN users u ON st.scheduled_by = u.id
      WHERE st.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled test not found',
      });
    }

    const scheduledTest = result.rows[0];

    // If not admin, check if user is eligible for this test
    if (!isAdmin) {
      const now = new Date();
      
      // Check if test is visible
      const visibleFrom = new Date(scheduledTest.visible_from);
      if (visibleFrom > now) {
        return res.status(403).json({
          success: false,
          message: 'This test is not available yet. Please check back later.',
        });
      }

      // Check if test has expired
      if (scheduledTest.visible_until) {
        const visibleUntil = new Date(scheduledTest.visible_until);
        if (visibleUntil < now) {
          return res.status(403).json({
            success: false,
            message: 'This test has expired.',
          });
        }
      }

      // Check if test status allows access
      if (!['scheduled', 'active'].includes(scheduledTest.status)) {
        return res.status(403).json({
          success: false,
          message: `This test is not available. Status: ${scheduledTest.status}`,
        });
      }

      // Check if user is directly assigned or has access through plan
      let isEligible = false;
      let eligibilityReason = '';

      // Check direct user assignment using PostgreSQL array operator
      if (scheduledTest.user_ids && Array.isArray(scheduledTest.user_ids) && scheduledTest.user_ids.length > 0) {
        try {
          const userCheckResult = await pool.query(
            'SELECT $1::uuid = ANY($2::uuid[]) as is_assigned',
            [userId, scheduledTest.user_ids]
          );
          isEligible = userCheckResult.rows[0]?.is_assigned || false;
          if (isEligible) {
            eligibilityReason = 'directly assigned';
          }
        } catch (err) {
          console.error('Error checking user assignment:', err);
        }
      }

      // Check plan-based access using PostgreSQL array operator
      if (!isEligible && scheduledTest.plan_ids && Array.isArray(scheduledTest.plan_ids) && scheduledTest.plan_ids.length > 0) {
        try {
          const planCheckResult = await pool.query(
            `SELECT EXISTS(
              SELECT 1 FROM user_plans 
              WHERE user_id = $1::uuid
              AND plan_id = ANY($2::uuid[])
            ) as has_plan_access`,
            [userId, scheduledTest.plan_ids]
          );
          isEligible = planCheckResult.rows[0]?.has_plan_access || false;
          if (isEligible) {
            eligibilityReason = 'plan-based access';
          }
        } catch (err) {
          console.error('Error checking plan access:', err);
        }
      }

      // If no user_ids or plan_ids specified, deny access (test must be assigned)
      if (!isEligible && (!scheduledTest.user_ids || scheduledTest.user_ids.length === 0) && 
          (!scheduledTest.plan_ids || scheduledTest.plan_ids.length === 0)) {
        return res.status(403).json({
          success: false,
          message: 'This scheduled test has no assigned users or plans.',
        });
      }

      if (!isEligible) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this scheduled test. Please contact your administrator.',
        });
      }
    }

    // Get plan details if planIds exist (only for admins)
    if (isAdmin && scheduledTest.plan_ids && scheduledTest.plan_ids.length > 0) {
      const plansResult = await pool.query(
        `SELECT id, name, description FROM plans WHERE id = ANY($1::uuid[])`,
        [scheduledTest.plan_ids]
      );
      scheduledTest.plans = plansResult.rows;
    }

    // Get user details if userIds exist (only for admins)
    if (isAdmin && scheduledTest.user_ids && scheduledTest.user_ids.length > 0) {
      const usersResult = await pool.query(
        `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
        [scheduledTest.user_ids]
      );
      scheduledTest.users = usersResult.rows;
    }

    res.json({
      success: true,
      scheduledTest,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update scheduled test
 * PUT /api/scheduled-tests/:id
 */
router.put('/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      scheduledFor,
      visibleFrom,
      visibleUntil,
      durationMinutes,
      planIds,
      userIds,
      instructions,
      status,
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (scheduledFor !== undefined) {
      updates.push(`scheduled_for = $${++paramCount}`);
      params.push(scheduledFor);
    }
    if (visibleFrom !== undefined) {
      updates.push(`visible_from = $${++paramCount}`);
      params.push(visibleFrom);
    }
    if (visibleUntil !== undefined) {
      updates.push(`visible_until = $${++paramCount}`);
      params.push(visibleUntil);
    }
    if (durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${++paramCount}`);
      params.push(durationMinutes);
    }
    if (planIds !== undefined) {
      updates.push(`plan_ids = $${++paramCount}`);
      params.push(planIds);
    }
    if (userIds !== undefined) {
      updates.push(`user_ids = $${++paramCount}`);
      params.push(userIds);
    }
    if (instructions !== undefined) {
      updates.push(`instructions = $${++paramCount}`);
      params.push(instructions);
    }
    if (status !== undefined) {
      updates.push(`status = $${++paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE scheduled_tests SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      params
    );

    res.json({
      success: true,
      scheduledTest: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete scheduled test
 * DELETE /api/scheduled-tests/:id
 */
router.delete('/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM scheduled_tests WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Scheduled test deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get users eligible for scheduled test (based on plans)
 * GET /api/scheduled-tests/:id/eligible-users
 */
router.get('/:id/eligible-users', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const scheduledTestResult = await pool.query(
      'SELECT plan_ids, user_ids FROM scheduled_tests WHERE id = $1',
      [id]
    );

    if (scheduledTestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled test not found',
      });
    }

    const { plan_ids, user_ids } = scheduledTestResult.rows[0];
    const eligibleUsers = [];

    // Get users from plans
    if (plan_ids && plan_ids.length > 0) {
      const planUsersResult = await pool.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.age_group, p.name as plan_name
         FROM users u
         INNER JOIN user_plans up ON u.id = up.user_id
         INNER JOIN plans p ON up.plan_id = p.id
         WHERE up.plan_id = ANY($1::uuid[]) AND u.status IN ('approved', 'enabled')
         ORDER BY u.name`,
        [plan_ids]
      );
      eligibleUsers.push(...planUsersResult.rows);
    }

    // Get specific users
    if (user_ids && user_ids.length > 0) {
      const specificUsersResult = await pool.query(
        `SELECT u.id, u.name, u.email, u.age_group, 'Direct Assignment' as plan_name
         FROM users u
         WHERE u.id = ANY($1::uuid[]) AND u.status IN ('approved', 'enabled')
         ORDER BY u.name`,
        [user_ids]
      );
      eligibleUsers.push(...specificUsersResult.rows);
    }

    // Remove duplicates
    const uniqueUsers = Array.from(
      new Map(eligibleUsers.map((user) => [user.id, user])).values()
    );

    res.json({
      success: true,
      users: uniqueUsers,
      total: uniqueUsers.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get scheduled tests for current student user
 * GET /api/scheduled-tests/my-tests
 */
router.get('/my-tests', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get user's plan IDs
    const userPlansResult = await pool.query(
      'SELECT plan_id FROM user_plans WHERE user_id = $1',
      [userId]
    );
    const userPlanIds = userPlansResult.rows.map((row) => row.plan_id);

    // Build query to find scheduled tests where:
    // 1. User is directly assigned (user_ids contains user ID)
    // 2. User's plan is in plan_ids
    // 3. Test is visible (visible_from <= now)
    // 4. Test is not expired (visible_until is null or visible_until >= now)
    // 5. Status is 'scheduled' or 'active'
    let query = `
      SELECT 
        st.*,
        q.id as quiz_id,
        q.name as quiz_name,
        q.description as quiz_description,
        q.age_group as quiz_age_group,
        q.difficulty as quiz_difficulty,
        q.number_of_questions,
        q.passing_percentage,
        q.time_limit,
        u.name as scheduled_by_name
      FROM scheduled_tests st
      INNER JOIN quizzes q ON st.quiz_id = q.id
      INNER JOIN users u ON st.scheduled_by = u.id
      WHERE (
        ($1 = ANY(st.user_ids) OR (st.plan_ids IS NOT NULL AND st.plan_ids && $2::uuid[]))
      )
      AND st.visible_from <= $3
      AND (st.visible_until IS NULL OR st.visible_until >= $3)
      AND st.status IN ('scheduled', 'active')
      ORDER BY 
        CASE 
          WHEN st.status = 'active' THEN 1
          WHEN st.scheduled_for <= $3 THEN 2
          ELSE 3
        END,
        st.scheduled_for ASC
    `;

    const result = await pool.query(query, [
      userId,
      userPlanIds.length > 0 ? userPlanIds : [],
      now,
    ]);

    res.json({
      success: true,
      scheduledTests: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get participants and results for a scheduled test
 * GET /api/scheduled-tests/:id/participants
 */
router.get('/:id/participants', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get scheduled test details
    const testResult = await pool.query(
      `SELECT 
        st.*,
        q.name as quiz_name,
        q.time_limit as quiz_time_limit,
        q.number_of_questions,
        q.passing_percentage
      FROM scheduled_tests st
      INNER JOIN quizzes q ON st.quiz_id = q.id
      WHERE st.id = $1`,
      [id]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled test not found',
      });
    }

    const scheduledTest = testResult.rows[0];
    const quizId = scheduledTest.quiz_id;
    const scheduledFor = new Date(scheduledTest.scheduled_for);
    
    // Calculate deadline: scheduled_for + duration_minutes (or quiz time_limit if duration_minutes not set)
    const durationMinutes = scheduledTest.duration_minutes || scheduledTest.quiz_time_limit || null;
    const deadline = durationMinutes 
      ? new Date(scheduledFor.getTime() + durationMinutes * 60 * 1000)
      : null;

    // Get all quiz attempts for this quiz
    const attemptsResult = await pool.query(
      `SELECT 
        qa.id,
        qa.user_id,
        qa.started_at,
        qa.completed_at,
        qa.time_taken,
        qa.score,
        qa.score_percentage,
        qa.correct_answers,
        qa.wrong_answers,
        qa.status,
        u.name as user_name,
        u.email as user_email
      FROM quiz_attempts qa
      INNER JOIN users u ON qa.user_id = u.id
      WHERE qa.quiz_id = $1
      AND qa.status = 'completed'
      ORDER BY qa.completed_at DESC`,
      [quizId]
    );

    // Filter participants based on scheduled test assignment (plan_ids or user_ids)
    let eligibleUserIds = [];
    
    if (scheduledTest.user_ids && scheduledTest.user_ids.length > 0) {
      eligibleUserIds = scheduledTest.user_ids;
    } else if (scheduledTest.plan_ids && scheduledTest.plan_ids.length > 0) {
      // Get users with these plans
      const usersResult = await pool.query(
        `SELECT DISTINCT user_id FROM user_plans WHERE plan_id = ANY($1::uuid[])`,
        [scheduledTest.plan_ids]
      );
      eligibleUserIds = usersResult.rows.map(row => row.user_id);
    }

    // Filter attempts to only include eligible participants and on-time submissions
    const participants = attemptsResult.rows
      .filter(attempt => {
        // Check if user is eligible
        if (eligibleUserIds.length > 0 && !eligibleUserIds.includes(attempt.user_id)) {
          return false;
        }
        
        // Check if submission is on time (only if deadline exists)
        if (deadline && attempt.completed_at) {
          const completedAt = new Date(attempt.completed_at);
          return completedAt <= deadline;
        }
        
        return true;
      })
      .map(attempt => ({
        attemptId: attempt.id,
        userId: attempt.user_id,
        userName: attempt.user_name,
        userEmail: attempt.user_email,
        startedAt: attempt.started_at,
        completedAt: attempt.completed_at,
        timeTaken: attempt.time_taken,
        score: attempt.score,
        scorePercentage: parseFloat(attempt.score_percentage) || 0,
        correctAnswers: attempt.correct_answers,
        wrongAnswers: attempt.wrong_answers,
        isOnTime: deadline ? new Date(attempt.completed_at) <= deadline : true,
      }));

    // Calculate statistics
    const totalParticipants = participants.length;
    const totalMarks = participants.reduce((sum, p) => sum + (p.score || 0), 0);
    const averageScore = totalParticipants > 0 ? totalMarks / totalParticipants : 0;
    const averagePercentage = totalParticipants > 0 
      ? participants.reduce((sum, p) => sum + p.scorePercentage, 0) / totalParticipants 
      : 0;
    const passedCount = participants.filter(p => p.scorePercentage >= (scheduledTest.passing_percentage || 60)).length;
    const failedCount = totalParticipants - passedCount;

    res.json({
      success: true,
      scheduledTest: {
        id: scheduledTest.id,
        quizName: scheduledTest.quiz_name,
        scheduledFor: scheduledTest.scheduled_for,
        durationMinutes: scheduledTest.duration_minutes,
        deadline: deadline ? deadline.toISOString() : null,
        numberOfQuestions: scheduledTest.number_of_questions,
        passingPercentage: scheduledTest.passing_percentage || 60,
      },
      participants,
      statistics: {
        totalParticipants,
        totalMarks,
        averageScore: Math.round(averageScore * 100) / 100,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        passedCount,
        failedCount,
        passRate: totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 10000) / 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

