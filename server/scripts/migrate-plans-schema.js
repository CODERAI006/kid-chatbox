/**
 * Database migration for User Plans and Daily Limits system
 * Creates plans, user_plans, and daily_usage tables
 */

const { pool } = require('../config/database');

const migratePlansSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        daily_quiz_limit INTEGER NOT NULL DEFAULT 1,
        daily_topic_limit INTEGER NOT NULL DEFAULT 1,
        monthly_cost DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. User plans junction table (tracks plan assignments)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id),
        UNIQUE(user_id, plan_id)
      )
    `);

    // 3. Daily usage tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
        quiz_count INTEGER DEFAULT 0,
        topic_count INTEGER DEFAULT 0,
        reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, usage_date)
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
      CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON user_plans(plan_id);
      CREATE INDEX IF NOT EXISTS idx_daily_usage_user_id ON daily_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage(usage_date);
      CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
    `);

    // Insert default Freemium plan
    await client.query(`
      INSERT INTO plans (name, description, daily_quiz_limit, daily_topic_limit, monthly_cost, status)
      VALUES (
        'Freemium',
        'Free plan with basic access',
        1,
        1,
        0.00,
        'active'
      )
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS hide_ai_study BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS hide_ai_quiz BOOLEAN NOT NULL DEFAULT false;
    `);

    await client.query('COMMIT');
    console.log('✅ Plans schema migrated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error migrating plans schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  migratePlansSchema()
    .then(() => {
      console.log('Plans migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Plans migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePlansSchema };


