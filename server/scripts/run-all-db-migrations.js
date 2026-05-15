/**
 * Runs all incremental DB migrations in the same order as server/config/database.js initializeDatabase().
 * Safe to run repeatedly (scripts use IF NOT EXISTS / idempotent patterns).
 * Usage: node server/scripts/run-all-db-migrations.js
 */

require('dotenv').config();

const { migrateSchema } = require('./migrate-schema');
const { migrateAnalyticsSchema } = require('./migrate-analytics-schema');
const { migratePlansSchema } = require('./migrate-plans-schema');
const { migrateScheduledTests } = require('./migrate-scheduled-tests');
const { migrateStudyLibraryContent } = require('./migrate-study-library-content');
const { migrateQuizLibrary } = require('./migrate-quiz-library');
const { migrateQuizScheduler } = require('./migrate-quiz-scheduler');
const { migrateQuizAiJobs } = require('./migrate-quiz-ai-jobs');

async function runAllDbMigrations() {
  await migrateSchema();
  await migrateAnalyticsSchema();
  await migratePlansSchema();
  await migrateScheduledTests();
  await migrateStudyLibraryContent();
  await migrateQuizLibrary();
  await migrateQuizScheduler();
  await migrateQuizAiJobs();
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
