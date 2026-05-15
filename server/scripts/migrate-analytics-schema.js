/**
 * Migration script to enhance activity_logs table for comprehensive analytics
 */

const { pool } = require('../config/database');

const migrateAnalyticsSchema = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Add event_type column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'activity_logs' AND column_name = 'event_type'
        ) THEN
          ALTER TABLE activity_logs ADD COLUMN event_type VARCHAR(100);
        END IF;
      END $$;
    `);

    // Add duration column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'activity_logs' AND column_name = 'duration'
        ) THEN
          ALTER TABLE activity_logs ADD COLUMN duration INTEGER;
        END IF;
      END $$;
    `);

    // Create index on event_type for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type 
      ON activity_logs(event_type);
    `);

    // Create index on duration for analytics queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_duration 
      ON activity_logs(duration) WHERE duration IS NOT NULL;
    `);

    // Create composite index for common analytics queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_event 
      ON activity_logs(user_id, event_type, created_at);
    `);

    // Create index for time-based analytics (PostgreSQL expression index)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_date 
      ON activity_logs ((created_at::date));
    `);

    await client.query('COMMIT');
    console.log('✅ Analytics schema migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Analytics schema migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateAnalyticsSchema()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAnalyticsSchema };

