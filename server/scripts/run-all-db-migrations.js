/**
 * Runs all incremental DB migrations in the same order as server/config/database.js initializeDatabase().
 * Safe to run repeatedly (scripts use IF NOT EXISTS / idempotent patterns).
 * Usage: node server/scripts/run-all-db-migrations.js
 */

require('dotenv').config();

const { migrateSchema } = require('./migrate-schema');
const { migrateAnalyticsSchema } = require('./migrate-analytics-schema');
const { migratePlansSchema } = require('./migrate-plans-schema');
const { migrateDefaultPlans } = require('./migrate-default-plans');
const { migrateScheduledTests } = require('./migrate-scheduled-tests');
const { migrateStudyLibraryContent } = require('./migrate-study-library-content');
const { migrateStudyLibraryContentV2 } = require('./migrate-study-library-content-v2');
const { migrateQuizLibrary } = require('./migrate-quiz-library');
const { migrateQuizScheduler } = require('./migrate-quiz-scheduler');
const { migrateQuizSchedulerV2 } = require('./migrate-quiz-scheduler-v2');
const { migrateQuizAiJobs } = require('./migrate-quiz-ai-jobs');
const { migrateOllamaCloudSettings } = require('./migrate-ollama-cloud-settings');

async function runAllDbMigrations() {
  await migrateSchema();
  await migrateAnalyticsSchema();
  await migratePlansSchema();
  await migrateDefaultPlans();
  await migrateScheduledTests();
  await migrateStudyLibraryContent();
  await migrateStudyLibraryContentV2();
  await migrateQuizLibrary();
  await migrateQuizScheduler();
  await migrateQuizSchedulerV2();
  await migrateQuizAiJobs();
  await migrateOllamaCloudSettings();
}

if (require.main === module) {
  runAllDbMigrations()
    .then(() => {
      console.log('All DB migrations finished OK');
      process.exit(0);
    })
    .catch((err) => {
      console.error('DB migrations failed:', err);
      process.exit(1);
    });
}

module.exports = { runAllDbMigrations };
