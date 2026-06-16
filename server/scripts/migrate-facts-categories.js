/**
 * Facts & Fun category catalog — topics per category (seeded from JSON).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const JSON_PATH = path.join(__dirname, '..', 'data', 'factsCategories.json');

function loadCategorySeed() {
  if (fs.existsSync(JSON_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    if (Array.isArray(parsed.categories) && parsed.categories.length) {
      return parsed.categories;
    }
  }
  return require('../data/factsCategoriesData');
}

async function migrateFactsCategories() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS facts_categories (
      slug VARCHAR(64) PRIMARY KEY,
      label VARCHAR(128) NOT NULL,
      emoji VARCHAR(8) NOT NULL DEFAULT '💡',
      topics JSONB NOT NULL DEFAULT '[]',
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_facts_categories_active
      ON facts_categories (is_active, sort_order);
  `);

  const categories = loadCategorySeed();
  for (const cat of categories) {
    const slug = String(cat.slug || '').trim();
    if (!slug) continue;
    await pool.query(
      `INSERT INTO facts_categories (slug, label, emoji, topics, sort_order, is_active, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, true, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE
       SET label = EXCLUDED.label,
           emoji = EXCLUDED.emoji,
           topics = EXCLUDED.topics,
           sort_order = EXCLUDED.sort_order,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP`,
      [
        slug,
        cat.label,
        cat.emoji || '💡',
        JSON.stringify(cat.topics || []),
        cat.sortOrder ?? cat.sort_order ?? 0,
      ],
    );
  }

  console.log(`✅ facts_categories table ready (${categories.length} categories)`);
}

module.exports = { migrateFactsCategories };

if (require.main === module) {
  migrateFactsCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
