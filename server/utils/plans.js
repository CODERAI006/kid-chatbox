/**
 * Plan management utility functions
 * Handles plan assignment, daily limit tracking, and validation
 */

const { pool } = require('../config/database');

const DEFAULT_FREEMIUM_DAYS = 30;

/**
 * Format a Date as YYYY-MM-DD (UTC date portion).
 * @param {Date} date
 * @returns {string}
 */
const toDateKey = (date) => date.toISOString().split('T')[0];

/**
 * Compute plan end date from duration in days.
 * @param {number | null | undefined} durationDays
 * @param {Date} [fromDate]
 * @returns {string | null}
 */
const computePlanEndDate = (durationDays, fromDate = new Date()) => {
  const days = Number(durationDays);
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }
  const end = new Date(fromDate);
  end.setUTCDate(end.getUTCDate() + days);
  return toDateKey(end);
};

/**
 * @param {string | Date | null | undefined} planEndDate
 * @returns {boolean}
 */
const isPlanActive = (planEndDate) => {
  if (!planEndDate) {
    return true;
  }
  const end = new Date(planEndDate);
  const today = new Date();
  end.setUTCHours(0, 0, 0, 0);
  today.setUTCHours(0, 0, 0, 0);
  return end >= today;
};

/**
 * @param {string | Date | null | undefined} planEndDate
 * @returns {number | null}
 */
const getDaysRemaining = (planEndDate) => {
  if (!planEndDate) {
    return null;
  }
  const end = new Date(planEndDate);
  const today = new Date();
  end.setUTCHours(0, 0, 0, 0);
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

/**
 * Get or create Freemium plan
 * @returns {Promise<Object>} Freemium plan object
 */
const getFreemiumPlan = async () => {
  const result = await pool.query(
    "SELECT * FROM plans WHERE name = 'Freemium' LIMIT 1"
  );
  
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  
  // Create Freemium plan if it doesn't exist
  const createResult = await pool.query(
    `INSERT INTO plans (name, description, daily_quiz_limit, daily_topic_limit, monthly_cost, status, hide_ai_study, hide_ai_quiz, default_duration_days)
     VALUES ('Freemium', 'Free plan with basic access', 1, 1, 0.00, 'active', false, false, $1)
     RETURNING *`,
    [DEFAULT_FREEMIUM_DAYS]
  );
  
  return createResult.rows[0];
};

/**
 * Assign plan to user
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @param {string} assignedBy - Admin user ID who assigned the plan
 * @param {import('pg').PoolClient | null} [externalClient]
 * @param {string | null} [planEndDate] - Optional explicit end date (YYYY-MM-DD)
 * @returns {Promise<Object>} Assignment record
 */
const assignPlanToUser = async (
  userId,
  planId,
  assignedBy = null,
  externalClient = null,
  planEndDate = null
) => {
  const client = externalClient || (await pool.connect());
  const ownsClient = !externalClient;

  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }

    const planResult = await client.query(
      'SELECT default_duration_days FROM plans WHERE id = $1',
      [planId]
    );
    const durationDays = planResult.rows[0]?.default_duration_days;
    const resolvedEndDate = planEndDate || computePlanEndDate(durationDays);

    await client.query('DELETE FROM user_plans WHERE user_id = $1', [userId]);

    const result = await client.query(
      `INSERT INTO user_plans (user_id, plan_id, assigned_by, plan_end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, planId, assignedBy, resolvedEndDate]
    );

    if (ownsClient) {
      await client.query('COMMIT');
    }

    return result.rows[0];
  } catch (error) {
    if (ownsClient) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
};

/**
 * Get user's current plan
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User's plan with details
 */
const getUserPlan = async (userId) => {
  const result = await pool.query(
    `SELECT 
      p.*,
      up.assigned_at,
      up.assigned_by,
      up.plan_end_date
    FROM user_plans up
    INNER JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = $1 AND p.status = 'active'
    ORDER BY up.assigned_at DESC
    LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    is_plan_active: isPlanActive(row.plan_end_date),
    days_remaining: getDaysRemaining(row.plan_end_date),
  };
};

/**
 * Update a user's plan end date.
 * @param {string} userId
 * @param {string | null} planEndDate - YYYY-MM-DD or null to clear
 * @returns {Promise<Object|null>}
 */
const updateUserPlanEndDate = async (userId, planEndDate) => {
  const result = await pool.query(
    `UPDATE user_plans
     SET plan_end_date = $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, planEndDate || null]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getUserPlan(userId);
};

/**
 * Get user's daily usage for today
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Daily usage object
 */
const getDailyUsage = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM daily_usage
     WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
    [userId]
  );
  
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  
  // Create new daily usage record if it doesn't exist
  const createResult = await pool.query(
    `INSERT INTO daily_usage (user_id, usage_date, quiz_count, topic_count)
     VALUES ($1, CURRENT_DATE, 0, 0)
     RETURNING *`,
    [userId]
  );
  
  return createResult.rows[0];
};

/**
 * Increment daily quiz count
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated daily usage
 */
const incrementQuizCount = async (userId) => {
  // Ensure daily usage record exists
  await getDailyUsage(userId);
  
  const result = await pool.query(
    `UPDATE daily_usage
     SET quiz_count = quiz_count + 1,
         reset_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND usage_date = CURRENT_DATE
     RETURNING *`,
    [userId]
  );
  
  return result.rows[0];
};

/**
 * Increment daily topic count
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated daily usage
 */
const incrementTopicCount = async (userId) => {
  // Ensure daily usage record exists
  await getDailyUsage(userId);
  
  const result = await pool.query(
    `UPDATE daily_usage
     SET topic_count = topic_count + 1,
         reset_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND usage_date = CURRENT_DATE
     RETURNING *`,
    [userId]
  );
  
  return result.rows[0];
};

/**
 * Check if user can take quiz based on daily limit
 * @param {string} userId - User ID
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number}>}
 */
const canTakeQuiz = async (userId) => {
  const plan = await getUserPlan(userId);
  const usage = await getDailyUsage(userId);

  if (plan && !plan.is_plan_active) {
    return { allowed: false, remaining: 0, limit: 0, used: usage ? usage.quiz_count : 0, expired: true };
  }

  // Default to Freemium limits if no plan assigned
  const limit = plan ? plan.daily_quiz_limit : 1;
  const used = usage ? usage.quiz_count : 0;
  const remaining = Math.max(0, limit - used);
  
  return {
    allowed: used < limit,
    remaining,
    limit,
    used,
  };
};

/**
 * Check if user can access topic based on daily limit
 * @param {string} userId - User ID
 * @returns {Promise<{allowed: boolean, remaining: number, limit: number}>}
 */
const canAccessTopic = async (userId) => {
  const plan = await getUserPlan(userId);
  const usage = await getDailyUsage(userId);

  if (plan && !plan.is_plan_active) {
    return { allowed: false, remaining: 0, limit: 0, used: usage ? usage.topic_count : 0, expired: true };
  }

  // Default to Freemium limits if no plan assigned
  const limit = plan ? plan.daily_topic_limit : 1;
  const used = usage ? usage.topic_count : 0;
  const remaining = Math.max(0, limit - used);
  
  return {
    allowed: used < limit,
    remaining,
    limit,
    used,
  };
};

/**
 * Reset daily usage counters (should be called at midnight via cron job)
 * This function ensures counters are reset for a new day
 */
const resetDailyCounters = async () => {
  // This is handled automatically by the usage_date column
  // When a new day starts, getDailyUsage will create a new record
  // But we can also manually reset old records if needed
  const result = await pool.query(
    `UPDATE daily_usage
     SET quiz_count = 0,
         topic_count = 0,
         reset_at = CURRENT_TIMESTAMP
     WHERE usage_date < CURRENT_DATE`
  );
  
  return result.rowCount;
};

module.exports = {
  DEFAULT_FREEMIUM_DAYS,
  getFreemiumPlan,
  assignPlanToUser,
  getUserPlan,
  updateUserPlanEndDate,
  getDailyUsage,
  incrementQuizCount,
  incrementTopicCount,
  canTakeQuiz,
  canAccessTopic,
  resetDailyCounters,
  computePlanEndDate,
  isPlanActive,
  getDaysRemaining,
};


