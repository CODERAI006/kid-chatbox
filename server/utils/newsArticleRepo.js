/**
 * PostgreSQL persistence for news pipeline (sources, articles, runs).
 */

const { pool } = require('../config/database');
const { seedNewsSources, countSources } = require('./newsSourcesSeed');

async function ensureSourcesSeeded() {
  return seedNewsSources();
}

async function listActiveSources(categoryId) {
  const params = [];
  let sql = `SELECT id, name, url, category, source_type, is_active
     FROM news_sources WHERE is_active = TRUE`;
  if (categoryId) {
    params.push(categoryId);
    sql += ` AND category = $1`;
  }
  sql += ' ORDER BY category, name';
  const r = await pool.query(sql, params);
  return r.rows;
}

async function createPipelineRun(triggerType = 'cron') {
  const r = await pool.query(
    `INSERT INTO news_pipeline_runs (status, trigger_type) VALUES ('running', $1) RETURNING id, started_at`,
    [triggerType]
  );
  return r.rows[0];
}

async function finishPipelineRun(id, { status = 'completed', stats, errorMessage } = {}) {
  await pool.query(
    `UPDATE news_pipeline_runs
     SET finished_at = CURRENT_TIMESTAMP, status = $2, stats_json = $3::jsonb, error_message = $4
     WHERE id = $1`,
    [id, status, JSON.stringify(stats || {}), errorMessage || null]
  );
}

async function getLatestPipelineRun() {
  const r = await pool.query(
    `SELECT id, started_at, finished_at, status, trigger_type, stats_json, error_message
     FROM news_pipeline_runs ORDER BY started_at DESC LIMIT 1`
  );
  return r.rows[0] || null;
}

async function getRunningPipelineRun() {
  const r = await pool.query(
    `SELECT id FROM news_pipeline_runs
     WHERE status = 'running' AND started_at > NOW() - INTERVAL '2 hours'
     LIMIT 1`
  );
  return r.rows[0] || null;
}

async function upsertArticle(article, sourceId) {
  const r = await pool.query(
    `INSERT INTO news_articles (
       external_id, source_id, category, title, content, url, url_to_image, author, published_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
     ON CONFLICT (url) DO UPDATE SET
       title = EXCLUDED.title,
       content = EXCLUDED.content,
       scraped_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      article.id,
      sourceId,
      article.category,
      article.title,
      article.description || article.summary || '',
      article.url,
      article.urlToImage,
      article.author || article.source?.name,
      article.publishedAt,
    ]
  );
  return r.rows[0]?.id;
}

async function upsertLearningContent(articleDbId, enriched) {
  await pool.query(
    `INSERT INTO news_learning_content (
       article_id, summary, funfacts_json, quiz_json, difficulty_level, age_group,
       learning_objectives, formatted_json
     ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb)
     ON CONFLICT (article_id) DO UPDATE SET
       summary = EXCLUDED.summary,
       funfacts_json = EXCLUDED.funfacts_json,
       quiz_json = EXCLUDED.quiz_json,
       difficulty_level = EXCLUDED.difficulty_level,
       age_group = EXCLUDED.age_group,
       learning_objectives = EXCLUDED.learning_objectives,
       formatted_json = EXCLUDED.formatted_json,
       processed_at = CURRENT_TIMESTAMP`,
    [
      articleDbId,
      enriched.kidSummary || enriched.summary,
      JSON.stringify(enriched.funFacts || (enriched.funFact ? [enriched.funFact] : [])),
      JSON.stringify(enriched.quizQuestions || []),
      enriched.difficultyLevel || 'medium',
      enriched.ageGroup || '10-12',
      JSON.stringify(enriched.learningObjectives || []),
      JSON.stringify({
        formattedParagraphs: enriched.formattedParagraphs,
        keyPoints: enriched.keyPoints,
        relatedTopics: enriched.relatedTopics,
      }),
    ]
  );
}

module.exports = {
  ensureSourcesSeeded,
  countSources,
  listActiveSources,
  createPipelineRun,
  finishPipelineRun,
  getLatestPipelineRun,
  getRunningPipelineRun,
  upsertArticle,
  upsertLearningContent,
};
