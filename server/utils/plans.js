/**
 * Plan management utility functions
 * Handles plan assignment, daily limit tracking, and validation
 */

const { pool } = require('../config/database');

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
    `INSERT INTO plans (name, description, daily_quiz_limit, daily_topic_limit, monthly_cost, status)
     VALUES ('Freemium', 'Free plan with basic access', 1, 1, 0.00, 'active')
     RETURNING *`
  );
  
  return createResult.rows[0];
};

/**
 * Assign plan to user
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @param {string} assignedBy - Admin user ID who assigned the plan
 * @returns {Promise<Object>} Assignment record
 */
const assignPlanToUser = async (userId, planId, assignedBy = null, externalClient = null) => {
  const client = externalClient || (await pool.connect());
  const ownsClient = !externalClient;

  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }

    await client.query('DELETE FROM user_plans WHERE user_id = $1', [userId]);

    const result = await client.query(
      `INSERT INTO user_plans (user_id, plan_id, assigned_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, planId, assignedBy]
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
      up.assigned_by
    FROM user_plans up
    INNER JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = $1 AND p.status = 'active'
    ORDER BY up.assigned_at DESC
    LIMIT 1`,
    [userId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
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
  getFreemiumPlan,
  assignPlanToUser,
  getUserPlan,
  getDailyUsage,
  incrementQuizCount,
  incrementTopicCount,
  canTakeQuiz,
  canAccessTopic,
  resetDailyCounters,
};


