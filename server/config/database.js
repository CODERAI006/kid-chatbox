/**
 * PostgreSQL database configuration and connection
 */

const { Pool } = require('pg');
const { resolveDatabaseConfig } = require('../utils/resolveDatabaseConfig');

const pool = new Pool({
  ...resolveDatabaseConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 120_000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error (server keeps running):', err.message || err);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Dynamically require to avoid circular dependency
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
    // Run comprehensive schema migration
    await migrateSchema();
    // Analytics columns/indexes on activity_logs (depends on migrateSchema)
    await migrateAnalyticsSchema();
    // Run plans schema migration
    await migratePlansSchema();
    // Run scheduled tests schema migration
    await migrateScheduledTests();
    // Run study library content migration
    await migrateStudyLibraryContent();
    await migrateStudyLibraryContentV2();
    // Run quiz library migration
    await migrateQuizLibrary();
    // Run quiz scheduler migration
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
    console.log('✅ Database tables initialized successfully');
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

