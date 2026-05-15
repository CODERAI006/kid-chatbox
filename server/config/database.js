/**
 * PostgreSQL database configuration and connection
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || process.env.DB_NAME || 'kidchatbox',
  user: process.env.DATABASE_USERNAME || process.env.DB_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
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
    const { migrateQuizLibrary } = require('../scripts/migrate-quiz-library');
    const { migrateQuizScheduler } = require('../scripts/migrate-quiz-scheduler');
    const { migrateQuizAiJobs } = require('../scripts/migrate-quiz-ai-jobs');
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
    // Run quiz library migration
    await migrateQuizLibrary();
    // Run quiz scheduler migration
    await migrateQuizScheduler();
    await migrateQuizAiJobs();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initializeDatabase,
};

