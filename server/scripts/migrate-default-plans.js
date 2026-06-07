/**
 * Seed default pricing plans: Freemium, Basic, Advance, Expert
 * Safe to run repeatedly — only inserts missing plan names.
 */

const { pool } = require('../config/database');

const DEFAULT_PLANS = [
  {
    name: 'Freemium',
    description: 'Free plan with limited daily access',
    daily_quiz_limit: 1,
    daily_topic_limit: 1,
    monthly_cost: 0,
    hide_ai_study: true,
    hide_ai_quiz: true,
  },
  {
    name: 'Basic',
    description: 'Essential learning with higher daily limits',
    daily_quiz_limit: 5,
    daily_topic_limit: 5,
    monthly_cost: 500,
    hide_ai_study: false,
    hide_ai_quiz: true,
  },
  {
    name: 'Advance',
    description: 'Expanded access for regular learners',
    daily_quiz_limit: 15,
    daily_topic_limit: 15,
    monthly_cost: 1000,
    hide_ai_study: false,
    hide_ai_quiz: false,
  },
  {
    name: 'Expert',
    description: 'Maximum limits and full AI features',
    daily_quiz_limit: 50,
    daily_topic_limit: 50,
    monthly_cost: 2000,
    hide_ai_study: false,
    hide_ai_quiz: false,
  },
];

const migrateDefaultPlans = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const plan of DEFAULT_PLANS) {
      await client.query(
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
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
        ON CONFLICT (name) DO NOTHING`,
        [
          plan.name,
          plan.description,
          plan.daily_quiz_limit,
          plan.daily_topic_limit,
          plan.monthly_cost,
          plan.hide_ai_study,
          plan.hide_ai_quiz,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Default pricing plans migrated');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error migrating default plans:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateDefaultPlans()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateDefaultPlans };
