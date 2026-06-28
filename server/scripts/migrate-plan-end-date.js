/**
 * Add plan end date support: default_duration_days on plans, plan_end_date on user_plans.
 * Freemium defaults to 30 days; existing assignments are backfilled.
 */

const { pool } = require('../config/database');

const migratePlanEndDate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE plans
      ADD COLUMN IF NOT EXISTS default_duration_days INTEGER;
    `);

    await client.query(`
      ALTER TABLE user_plans
      ADD COLUMN IF NOT EXISTS plan_end_date DATE;
    `);

    await client.query(`
      UPDATE plans
      SET default_duration_days = 30
      WHERE name = 'Freemium' AND default_duration_days IS NULL;
    `);

    await client.query(`
      UPDATE user_plans up
      SET plan_end_date = (up.assigned_at::date + COALESCE(p.default_duration_days, 30))
      FROM plans p
      WHERE up.plan_id = p.id
        AND up.plan_end_date IS NULL
        AND p.default_duration_days IS NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Plan end date migration completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Plan end date migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migratePlanEndDate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migratePlanEndDate };
