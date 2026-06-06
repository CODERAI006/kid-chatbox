/**
 * Nightly batch: 5 quiz sets → quiz_library with IST-aware batch tags.
 */

const { pool } = require('../config/database');
const { generateQuizQuestions, isLlmConfigured } = require('../utils/openai');
const { buildSchedulerTags } = require('../utils/quizTags');
const { getZonedParts, DEFAULT_TIMEZONE } = require('../utils/timezoneUtils');

const DIFFICULTY_MAP = {
  Easy: 'Basic',
  Medium: 'Advanced',
  Hard: 'Expert',
  Mixed: 'Mix',
};

const VARIANT_HINTS = [
  'Emphasize direct recall and key definitions.',
  'Include word problems and everyday scenarios.',
  'Focus on application and reasoning steps.',
  'Mix question styles: recall, apply, and analyze.',
  'Include comparison and cause-effect questions.',
];

/**
 * @param {Object} job
 * @returns {Promise<{ id: string, title: string, subtopic_id: string, topic_title: string, category: string|null, age_group: string|null, description: string|null, key_points: unknown }[]>}
 */
async function resolveSubtopics(job) {
  const subIds = Array.isArray(job.subtopic_ids) ? job.subtopic_ids.filter(Boolean) : [];
  const topicIds = Array.isArray(job.topic_ids) ? job.topic_ids.filter(Boolean) : [];

  if (subIds.length) {
    const { rows } = await pool.query(
      `SELECT s.id AS subtopic_id, s.title, s.description, s.key_points,
              t.title AS topic_title, t.category, t.age_group
       FROM subtopics s
       JOIN topics t ON t.id = s.topic_id
       WHERE s.id = ANY($1::uuid[]) AND s.is_active = true AND t.is_active = true
       ORDER BY s.order_index, s.title`,
      [subIds]
    );
    return rows;
  }

  if (topicIds.length) {
    const { rows } = await pool.query(
      `SELECT s.id AS subtopic_id, s.title, s.description, s.key_points,
              t.title AS topic_title, t.category, t.age_group
       FROM subtopics s
       JOIN topics t ON t.id = s.topic_id
       WHERE t.id = ANY($1::uuid[]) AND s.is_active = true AND t.is_active = true
       ORDER BY t.title, s.order_index, s.title`,
      [topicIds]
    );
    return rows;
  }

  return [];
}

/**
 * Build work list of { subtopic row, setIndex, setsTotal, variantIndex? }
 */
function buildSetPlan(subtopics, setsPerRun) {
  if (!subtopics.length) return [];

  const plan = [];
  if (subtopics.length === 1) {
    for (let i = 0; i < setsPerRun; i++) {
      plan.push({
        subtopic: subtopics[0],
        setIndex: i + 1,
        setsTotal: setsPerRun,
        variantIndex: i + 1,
      });
    }
    return plan;
  }

  for (let i = 0; i < setsPerRun; i++) {
    plan.push({
      subtopic: subtopics[i % subtopics.length],
      setIndex: i + 1,
      setsTotal: setsPerRun,
      variantIndex: null,
    });
  }
  return plan;
}

function buildBatchTag(job, date = new Date()) {
  const tz = job.timezone || DEFAULT_TIMEZONE;
  const { dateKey } = getZonedParts(date, tz);
  const short = String(job.id).slice(0, 8);
  return `${dateKey}-${short}`;
}

/**
 * @param {Object} job quiz_scheduler_jobs row
 * @param {{ manual?: boolean }} [opts]
 */
async function runQuizBatch(job, opts = {}) {
  const setsPerRun = Math.min(10, Math.max(1, Number(job.sets_per_run) || 5));
  const subtopics = await resolveSubtopics(job);

  if (!subtopics.length) {
    throw new Error('No active subtopics found for this job. Select topics or subtopics.');
  }

  const batchTag = buildBatchTag(job);
  const batchRes = await pool.query(
    `INSERT INTO quiz_generation_batches
       (scheduler_job_id, batch_tag, sets_requested, status)
     VALUES ($1,$2,$3,'running')
     RETURNING *`,
    [job.id, batchTag, setsPerRun]
  );
  const batch = batchRes.rows[0];

  const plan = buildSetPlan(subtopics, setsPerRun);
  const aiDifficulty = DIFFICULTY_MAP[job.difficulty] || 'Mix';
  const errors = [];
  let completed = 0;

  if (!isLlmConfigured()) {
    await pool.query(
      `UPDATE quiz_generation_batches
       SET status='failed', completed_at=NOW(), error_summary=$1
       WHERE id=$2`,
      ['Ollama LLM not configured', batch.id]
    );
    throw new Error('Ollama LLM not configured');
  }

  for (const item of plan) {
    const st = item.subtopic;
    try {
      const descParts = [st.description, st.key_points ? JSON.stringify(st.key_points) : null].filter(Boolean);
      if (item.variantIndex) {
        descParts.push(VARIANT_HINTS[(item.variantIndex - 1) % VARIANT_HINTS.length]);
      }

      const questions = await generateQuizQuestions({
        numberOfQuestions: job.question_count,
        difficulty: aiDifficulty,
        topics: [st.title],
        ageGroup: st.age_group ? String(st.age_group) : '9-14',
        language: 'English',
        subtopicId: st.subtopic_id,
        description: descParts.join('\n\n') || undefined,
        gradeLevel: st.age_group ? String(st.age_group) : undefined,
      });

      const title =
        item.variantIndex != null
          ? `${st.topic_title} – ${st.title} (Nightly Set ${item.setIndex} of ${item.setsTotal})`
          : `${st.topic_title} – ${st.title} (Set ${item.setIndex}/${item.setsTotal})`;

      const tags = buildSchedulerTags({
        subject: st.category || st.topic_title,
        schedulerDifficulty: job.difficulty,
        subtopics: [st.title],
        gradeLevel: st.age_group ? String(st.age_group) : undefined,
        ageGroup: st.age_group,
        batchTag,
        setIndex: item.setIndex,
        setsTotal: item.setsTotal,
        variantIndex: item.variantIndex,
        jobId: job.id,
      });

      await pool.query(
        `INSERT INTO quiz_library (
          title, description, subject, subtopics, difficulty, age_group, language,
          question_count, tags, questions, created_by,
          generation_batch_id, scheduler_job_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          title,
          `Auto-generated nightly quiz batch ${batchTag}`,
          st.category || st.topic_title,
          [st.title],
          job.difficulty,
          st.age_group,
          'English',
          questions.length,
          tags,
          JSON.stringify(questions),
          job.created_by,
          batch.id,
          job.id,
        ]
      );
      completed += 1;
    } catch (err) {
      errors.push(`${st.title}: ${err.message}`);
      console.error(`[QuizBatch] Set ${item.setIndex} failed:`, err.message);
    }
  }

  const status =
    completed === 0 ? 'failed' : completed < setsPerRun ? 'partial' : 'completed';

  await pool.query(
    `UPDATE quiz_generation_batches
     SET sets_completed=$1, sets_failed=$2, status=$3, completed_at=NOW(), error_summary=$4
     WHERE id=$5`,
    [completed, setsPerRun - completed, status, errors.length ? errors.join('; ') : null, batch.id]
  );

  await pool.query(
    `UPDATE quiz_scheduler_jobs SET last_run_at=NOW(), last_batch_id=$1, updated_at=NOW() WHERE id=$2`,
    [batch.id, job.id]
  );

  return {
    batchId: batch.id,
    batchTag,
    setsCompleted: completed,
    setsFailed: setsPerRun - completed,
    status,
    errors,
  };
}

/**
 * Uses new batch flow when subtopic_ids/topic_ids configured; else legacy single quiz.
 */
async function runSchedulerJobUnified(job, manual = false) {
  const hasIds =
    (Array.isArray(job.subtopic_ids) && job.subtopic_ids.length > 0) ||
    (Array.isArray(job.topic_ids) && job.topic_ids.length > 0);

  if (hasIds) {
    return runQuizBatch(job, { manual });
  }

  const { generateAndSaveQuiz } = require('./quizGeneratorService');
  return generateAndSaveQuiz(job, manual);
}

module.exports = {
  runQuizBatch,
  runSchedulerJobUnified,
  resolveSubtopics,
  buildBatchTag,
};
