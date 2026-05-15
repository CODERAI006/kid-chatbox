/**
 * Quiz Generator Service
 * Wraps the existing Ollama-based generator for scheduled quiz generation.
 */

const { pool } = require('../config/database');
const { generateQuizQuestions, isLlmConfigured } = require('../utils/openai');

/**
 * Map scheduler difficulty labels → openai.js labels
 */
const DIFFICULTY_MAP = {
  Easy: 'Basic',
  Medium: 'Basic',   // re-use Basic with medium label override below
  Hard: 'Expert',
  Mixed: 'Mix',
};

/**
 * Build a human-readable quiz title from job metadata.
 * @param {Object} job  - quiz_scheduler_jobs row
 * @returns {string}
 */
function buildTitle(job) {
  const topicNames = Array.isArray(job.topics) ? job.topics.join(', ') : job.topics;
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const freq = job.frequency_type === 'weekly' ? 'Weekly' : 'Daily';
  return `${freq} Quiz – ${topicNames} (${today})`;
}

/**
 * Generate quiz questions and persist a generated_quizzes row.
 * Returns the inserted row.
 *
 * @param {Object} job  - quiz_scheduler_jobs row
 * @param {boolean} [force=false] - skip LLM check (for fallback stub)
 */
async function generateAndSaveQuiz(job, force = false) {
  const topics = Array.isArray(job.topics) ? job.topics : JSON.parse(job.topics || '[]');
  const difficulty = DIFFICULTY_MAP[job.difficulty] || 'Mix';
  const title = buildTitle(job);

  // Compute visibility window (all timestamps in UTC)
  const now = new Date();
  const visStart = new Date(now.getTime() + (job.visibility_start_offset_mins || 0) * 60_000);
  const visEnd = job.visibility_duration_mins
    ? new Date(visStart.getTime() + job.visibility_duration_mins * 60_000)
    : null;

  let questions = [];
  let generationError = null;

  if (isLlmConfigured()) {
    try {
      questions = await generateQuizQuestions({
        numberOfQuestions: job.question_count,
        difficulty,
        topics,
        ageGroup: '9-14',
        language: 'English',
      });
    } catch (err) {
      generationError = err.message;
      console.error(`[QuizGenerator] Failed for job ${job.id}:`, err.message);
    }
  } else if (!force) {
    generationError = 'Ollama LLM not configured – quiz saved with empty questions';
    console.warn('[QuizGenerator] LLM not configured, saving empty quiz');
  }

  const initialStatus = visStart <= now ? 'live' : 'scheduled';

  const { rows } = await pool.query(
    `INSERT INTO generated_quizzes
       (scheduler_job_id, quiz_title, topics, questions, difficulty, question_count,
        visibility_start_time, visibility_end_time, status, generation_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      job.id,
      title,
      JSON.stringify(topics),
      JSON.stringify(questions),
      job.difficulty,
      job.question_count,
      visStart.toISOString(),
      visEnd ? visEnd.toISOString() : null,
      initialStatus,
      generationError,
    ]
  );

  // Update job's last_run_at
  await pool.query(
    `UPDATE quiz_scheduler_jobs SET last_run_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [job.id]
  );

  console.log(`[QuizGenerator] ✅ Quiz "${title}" saved (status: ${initialStatus})`);
  return rows[0];
}

module.exports = { generateAndSaveQuiz };
