/**
 * Facts & Fun category catalog — DB-backed with in-memory cache.
 */

const { pool } = require('../config/database');
const { FACT_COUNT } = require('./dailyFactsSubjects');

let cache = null;
let cacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

function toSlug(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function hashStr(input) {
  let h = 2166136261;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function loadCategories(force = false) {
  if (!force && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  try {
    const r = await pool.query(
      `SELECT slug, label, emoji, topics
       FROM facts_categories
       WHERE is_active = true
       ORDER BY sort_order, label`,
    );
    cache = r.rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      emoji: row.emoji || '💡',
      topics: Array.isArray(row.topics) ? row.topics : [],
    }));
  } catch (err) {
    console.warn('[factsCategories] DB load failed, using JSON fallback:', err.message);
    const fallback = require('../data/factsCategoriesData');
    cache = fallback.map((c) => ({
      slug: c.slug,
      label: c.label,
      emoji: c.emoji || '💡',
      topics: c.topics || [],
    }));
  }
  cacheAt = Date.now();
  return cache;
}

function categoryBySlug(categories, slug) {
  return categories.find((c) => c.slug === slug) || null;
}

/** Deterministic daily picks — one fact slot per category+topic pair. */
function pickDailySlots(categories, dateStr, gradeLabel, count = FACT_COUNT) {
  const seed = hashStr(`${dateStr}:${gradeLabel}`);
  const shuffled = [...categories].sort((a, b) => {
    const ha = hashStr(`${seed}:${a.slug}`);
    const hb = hashStr(`${seed}:${b.slug}`);
    return ha - hb;
  });
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  return picked.map((cat, i) => {
    const topics = cat.topics?.length ? cat.topics : [cat.label];
    const topicIdx = hashStr(`${seed}:${cat.slug}:${i}`) % topics.length;
    return {
      slug: cat.slug,
      label: cat.label,
      emoji: cat.emoji,
      topic: topics[topicIdx],
    };
  });
}

function normalizeFactCategory(fact, categories) {
  const slug = fact.category
    ? String(fact.category)
    : fact.subject
      ? toSlug(String(fact.subject).replace(/_/g, ' '))
      : categories[0]?.slug || 'fun_facts';
  const meta = categoryBySlug(categories, slug) || categories[0];
  return {
    ...fact,
    category: meta?.slug || slug,
    topic: fact.topic || meta?.topics?.[0] || meta?.label || 'General',
    subject: fact.subject || meta?.slug,
  };
}

module.exports = {
  toSlug,
  loadCategories,
  categoryBySlug,
  pickDailySlots,
  normalizeFactCategory,
};
