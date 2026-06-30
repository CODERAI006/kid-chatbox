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
const { migratePlanEndDate } = require('./migrate-plan-end-date');
const { migrateScheduledTests } = require('./migrate-scheduled-tests');
const { migrateStudyLibraryContent } = require('./migrate-study-library-content');
const { migrateStudyLibraryContentV2 } = require('./migrate-study-library-content-v2');
const { migrateStudySessionsV2 } = require('./migrate-study-sessions-v2');
const { migrateQuizLibrary } = require('./migrate-quiz-library');
const { migrateQuizScheduler } = require('./migrate-quiz-scheduler');
const { migrateQuizSchedulerV2 } = require('./migrate-quiz-scheduler-v2');
const { migrateQuizAiJobs } = require('./migrate-quiz-ai-jobs');
const { migrateQuizImagePrompt } = require('./migrate-quiz-image-prompt');
const { migrateQuizSubtopics } = require('./migrate-quiz-subtopics');
const { migrateOllamaCloudSettings } = require('./migrate-ollama-cloud-settings');
const { migrateStudyPlan } = require('./migrate-study-plan');
const { migrateCompetitiveTopics } = require('./migrate-competitive-topics');
const { migrateWordOfDaySettings } = require('./migrate-word-of-day-settings');
const { migrateWordOfDayConfig } = require('./migrate-word-of-day-config');
const { migrateEducationNews } = require('./migrate-education-news');
const { migrateNewsPipeline } = require('./migrate-news-pipeline');
const { migrateDailyFacts } = require('./migrate-daily-facts');
const { migrateDailyFactsSettings } = require('./migrate-daily-facts-settings');
const { migrateFactsCategories } = require('./migrate-facts-categories');
const { migrateAppFeedback } = require('./migrate-app-feedback');
const { migrateStudyBuddies } = require('./migrate-study-buddies');
const { migrateUserNotifications } = require('./migrate-user-notifications');
const { migrateAppAnalyticsSettings } = require('./migrate-app-analytics-settings');
const { migrateDailyContentBatch } = require('./migrate-daily-content-batch');
const { migratePuzzles } = require('./migrate-puzzles');
const { migratePuzzlesV2 } = require('./migrate-puzzles-v2');
const { migratePuzzlesV3 } = require('./migrate-puzzles-v3');
const { migratePuzzlesV4 } = require('./migrate-puzzles-v4');
const { migratePuzzlesV5 } = require('./migrate-puzzles-v5');
const { migrateSitePages } = require('./migrate-site-pages');
const { migratePaymentSettings } = require('./migrate-payment-settings');
const { migratePaymentRequests } = require('./migrate-payment-requests');

async function runAllDbMigrations() {
  await migrateSchema();
  await migrateAnalyticsSchema();
  await migratePlansSchema();
  await migrateDefaultPlans();
  await migratePlanEndDate();
  await migrateScheduledTests();
  await migrateStudyLibraryContent();
  await migrateStudyLibraryContentV2();
  await migrateStudySessionsV2();
  await migrateQuizLibrary();
  await migrateQuizScheduler();
  await migrateQuizSchedulerV2();
  await migrateQuizAiJobs();
  await migrateQuizImagePrompt();
  await migrateQuizSubtopics();
  await migrateOllamaCloudSettings();
  await migrateStudyPlan();
  await migrateCompetitiveTopics();
  await migrateWordOfDaySettings();
  await migrateWordOfDayConfig();
  await migrateEducationNews();
  await migrateNewsPipeline();
  await migrateDailyFacts();
  await migrateDailyFactsSettings();
  await migrateFactsCategories();
  await migrateAppFeedback();
  await migrateStudyBuddies();
  await migrateUserNotifications();
  await migrateAppAnalyticsSettings();
  await migrateDailyContentBatch();
  await migratePuzzles();
  await migratePuzzlesV2();
  await migratePuzzlesV3();
  await migratePuzzlesV4();
  await migratePuzzlesV5();
  await migrateSitePages();
  await migratePaymentSettings();
  await migratePaymentRequests();
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
