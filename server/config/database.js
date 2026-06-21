/**
 * PostgreSQL database configuration and connection
 */

const { Pool } = require('pg');
const { resolveDatabaseConfig } = require('../utils/resolveDatabaseConfig');
const { initializeSchemaRegistry } = require('../modules/database-schema/schemaDiscovery');

const pool = new Pool({
  ...resolveDatabaseConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120_000,
});

pool.on('error', (err) => {
  console.error('❌ Database pool error (server keeps running):', err.message || err);
});

const shouldRunStartupMigrations = () => {
  if (process.env.RUN_STARTUP_MIGRATIONS === '1') return true;
  if (process.env.SKIP_STARTUP_MIGRATIONS === '1') return false;
  return process.env.NODE_ENV !== 'production';
};

async function verifyDatabaseConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

async function runStartupMigrations() {
  process.env.KIDCHATBOX_MIGRATION_QUIET = '1';
  const { runMigrationsQuietly } = require('../utils/migrateQuietly');

  const { migrateSchema } = require('../scripts/migrate-schema');
  const { migrateAnalyticsSchema } = require('../scripts/migrate-analytics-schema');
  const { migratePlansSchema } = require('../scripts/migrate-plans-schema');
  const { migrateScheduledTests } = require('../scripts/migrate-scheduled-tests');
  const { migrateStudyLibraryContent } = require('../scripts/migrate-study-library-content');
  const { migrateStudyLibraryContentV2 } = require('../scripts/migrate-study-library-content-v2');
  const { migrateQuizLibrary } = require('../scripts/migrate-quiz-library');
  const { migrateQuizScheduler } = require('../scripts/migrate-quiz-scheduler');
  const { migrateQuizSchedulerV2 } = require('../scripts/migrate-quiz-scheduler-v2');
  const { migrateQuizAiJobs } = require('../scripts/migrate-quiz-ai-jobs');
  const { migrateQuizSubtopics } = require('../scripts/migrate-quiz-subtopics');
  const { migrateOllamaCloudSettings } = require('../scripts/migrate-ollama-cloud-settings');
  const { migrateStudyPlan } = require('../scripts/migrate-study-plan');
  const { migrateCompetitiveTopics } = require('../scripts/migrate-competitive-topics');
  const { migrateWordOfDaySettings } = require('../scripts/migrate-word-of-day-settings');
  const { migrateAppFeedback } = require('../scripts/migrate-app-feedback');
  const { migrateStudyBuddies } = require('../scripts/migrate-study-buddies');
  const { migrateUserNotifications } = require('../scripts/migrate-user-notifications');
  const { migrateAppAnalyticsSettings } = require('../scripts/migrate-app-analytics-settings');
  const { migrateDailyContentBatch } = require('../scripts/migrate-daily-content-batch');
  const { migratePuzzles } = require('../scripts/migrate-puzzles');
  const { migratePuzzlesV2 } = require('../scripts/migrate-puzzles-v2');
  const { migratePuzzlesV3 } = require('../scripts/migrate-puzzles-v3');
  const { migratePuzzlesV4 } = require('../scripts/migrate-puzzles-v4');

  await runMigrationsQuietly(async () => {
    await migrateSchema();
    await migrateAnalyticsSchema();
    await migratePlansSchema();
    await migrateScheduledTests();
    await migrateStudyLibraryContent();
    await migrateStudyLibraryContentV2();
    await migrateQuizLibrary();
    await migrateQuizScheduler();
    await migrateQuizSchedulerV2();
    await migrateQuizAiJobs();
    await migrateQuizSubtopics();
    await migrateOllamaCloudSettings();
    await migrateWordOfDaySettings();
    await migrateStudyPlan();
    await migrateCompetitiveTopics();
    await migrateAppFeedback();
    await migrateStudyBuddies();
    await migrateUserNotifications();
    await migrateAppAnalyticsSettings();
    await migrateDailyContentBatch();
    await migratePuzzles();
    await migratePuzzlesV2();
    await migratePuzzlesV3();
    await migratePuzzlesV4();
  });
}

// Initialize database tables
const initializeDatabase = async () => {
  try {
    await verifyDatabaseConnection();

    if (shouldRunStartupMigrations()) {
      await runStartupMigrations();
      console.log('✅ Database ready (migrations applied on startup)');
    } else {
      console.log('✅ Database connected (startup migrations skipped — use npm run db:migrate-all on deploy)');
    }

    await initializeSchemaRegistry(pool);
  } catch (error) {
    console.error('❌ Error initializing database (server will start without DB):', error.message || error);
    return false;
  }
  return true;
};

module.exports = {
  pool,
  initializeDatabase,
};

