/**
 * Puzzle module — puzzle bank, daily cache, and admin settings.
 */

const { pool } = require('../config/database');
const { DEFAULT_GRADES } = require('../data/puzzleMeta');

async function migratePuzzles() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS puzzles (
      id VARCHAR(32) PRIMARY KEY,
      category VARCHAR(64) NOT NULL,
      puzzle_type VARCHAR(64) NOT NULL,
      class_from SMALLINT NOT NULL DEFAULT 1,
      class_to SMALLINT NOT NULL DEFAULT 12,
      difficulty VARCHAR(16) NOT NULL DEFAULT 'Easy',
      question TEXT NOT NULL,
      options JSONB,
      answer JSONB NOT NULL,
      explanation TEXT NOT NULL,
      time_limit SMALLINT NOT NULL DEFAULT 30,
      points SMALLINT NOT NULL DEFAULT 5,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_puzzles_category ON puzzles(category);
    CREATE INDEX IF NOT EXISTS idx_puzzles_type ON puzzles(puzzle_type);
    CREATE INDEX IF NOT EXISTS idx_puzzles_class ON puzzles(class_from, class_to);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS puzzle_daily_cache (
      grade_key VARCHAR(64) NOT NULL,
      cache_date DATE NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (grade_key, cache_date)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS puzzle_settings (
      grade VARCHAR(64) PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT true,
      daily_count SMALLINT NOT NULL DEFAULT 5,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS puzzle_global_config (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT true,
      show_on_homepage BOOLEAN NOT NULL DEFAULT true,
      default_grade VARCHAR(64) NOT NULL DEFAULT 'Class 5 / Grade 5',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO puzzle_global_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);

  for (const grade of DEFAULT_GRADES) {
    await pool.query(
      `INSERT INTO puzzle_settings (grade, enabled, daily_count)
       VALUES ($1, true, 20) ON CONFLICT (grade) DO NOTHING`,
      [grade],
    );
  }

  console.log('✅ puzzle tables ready');
}

module.exports = { migratePuzzles };

if (require.main === module) {
  migratePuzzles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
