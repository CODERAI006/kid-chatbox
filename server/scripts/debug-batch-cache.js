require('dotenv').config();
const { pool } = require('../config/database');
const { todayYmdInTimezone, tomorrowYmdInTimezone, DEFAULT_TIMEZONE } = require('../utils/timezoneUtils');

(async () => {
  const todayIst = todayYmdInTimezone(DEFAULT_TIMEZONE);
  const tomorrowIst = tomorrowYmdInTimezone(DEFAULT_TIMEZONE);
  console.log('IST today:', todayIst, 'tomorrow:', tomorrowIst);
  console.log('Server local today:', new Date().toISOString().slice(0, 10));

  const runs = await pool.query(
    `SELECT id, target_date, trigger_type, status, stats_json, error_message, started_at, finished_at
     FROM daily_content_batch_runs ORDER BY id DESC LIMIT 5`,
  );
  console.log('\n=== Recent batch runs ===');
  console.log(JSON.stringify(runs.rows, null, 2));

  const cache = await pool.query(
    `SELECT cache_date::text, word_key,
            jsonb_array_length(COALESCE(payload->'words', '[]'::jsonb)) AS word_count,
            jsonb_array_length(COALESCE(payload->'phrases', '[]'::jsonb)) AS phrase_count
     FROM word_of_the_day_cache
     ORDER BY cache_date DESC, word_key LIMIT 20`,
  );
  console.log('\n=== WOTD cache ===');
  console.log(JSON.stringify(cache.rows, null, 2));

  const facts = await pool.query(
    `SELECT cache_date::text, grade_key,
            jsonb_array_length(COALESCE(payload->'facts', '[]'::jsonb)) AS fact_count
     FROM daily_facts_cache ORDER BY cache_date DESC LIMIT 15`,
  );
  console.log('\n=== Facts cache ===');
  console.log(JSON.stringify(facts.rows, null, 2));

  const users = await pool.query(
    `SELECT grade, status, COUNT(*)::int AS cnt FROM users
     WHERE grade IS NOT NULL AND TRIM(grade) <> ''
     GROUP BY grade, status ORDER BY cnt DESC`,
  );
  console.log('\n=== User grades by status ===');
  console.log(JSON.stringify(users.rows, null, 2));

  const targeted = await pool.query(
    `SELECT cache_date::text, word_key,
            jsonb_array_length(COALESCE(payload->'words', '[]'::jsonb)) AS word_count
     FROM word_of_the_day_cache
     WHERE word_key IN (
       'wotd_v9_class_12_grade_12', 'wotd_v9_class_3_grade_3', 'wotd_v9_class_4_grade_4'
     )
     ORDER BY cache_date DESC`,
  );
  console.log('\n=== WOTD for active user grades ===');
  console.log(JSON.stringify(targeted.rows, null, 2));

  const { getDailyPayload } = require('../services/wordOfDayService');
  for (const g of ['3', 'Class 12 / Grade 12', 'Class 4 / Grade 4']) {
    const payload = await getDailyPayload(todayIst, g);
    console.log(`\ngetDailyPayload(${todayIst}, ${JSON.stringify(g)}):`, {
      success: payload.success,
      cached: payload.cached,
      date: payload.date,
      grade: payload.grade,
      words: payload.words?.length,
      phrases: payload.phrases?.length,
    });
  }

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
