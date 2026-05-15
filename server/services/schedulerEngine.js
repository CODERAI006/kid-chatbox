/**
 * Scheduler Engine
 * - Ticks every minute: checks active jobs and fires quiz generation
 * - Ticks every 5 minutes: updates generated_quizzes status transitions
 *
 * Uses node-cron (no Redis required).
 */

const cron = require('node-cron');
const { pool } = require('../config/database');
const { generateAndSaveQuiz } = require('./quizGeneratorService');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse HH:mm string into { hours, minutes } */
const parseRunTime = (runTime) => {
  const [h, m] = runTime.split(':').map(Number);
  return { hours: h, minutes: m };
};

/** Return current UTC hour and minute */
const utcNow = () => {
  const d = new Date();
  return { hours: d.getUTCHours(), minutes: d.getUTCMinutes(), day: d.getUTCDay() };
};

/**
 * Determine if a job should fire right now (UTC).
 * Guards against duplicate runs by checking last_run_at.
 */
function shouldFire(job) {
  const { hours, minutes, day } = utcNow();
  const { hours: jh, minutes: jm } = parseRunTime(job.run_time);

  if (hours !== jh || minutes !== jm) return false;
  if (job.frequency_type === 'weekly' && job.day_of_week !== day) return false;

  // Prevent duplicate run within the same minute
  if (job.last_run_at) {
    const last = new Date(job.last_run_at);
    const diff = Date.now() - last.getTime();
    if (diff < 55_000) return false; // fired < 55 s ago
  }
  return true;
}

// ─── exported run helper (also called by /run-now route) ─────────────────────

/**
 * Run a specific scheduler job immediately.
 * @param {Object} job   - quiz_scheduler_jobs row
 * @param {boolean} [manual=false] - skip fire-time check
 */
async function runSchedulerJob(job, manual = false) {
  console.log(`[Scheduler] Running job "${job.job_name}" (manual=${manual})`);
  return generateAndSaveQuiz(job, manual);
}

// ─── Main ticker (every minute) ──────────────────────────────────────────────

async function tickJobs() {
  try {
    const { rows: jobs } = await pool.query(
      `SELECT * FROM quiz_scheduler_jobs WHERE status = 'active'`
    );

    for (const job of jobs) {
      if (shouldFire(job)) {
        // Fire async – don't await so one slow job doesn't block others
        runSchedulerJob(job).catch((err) =>
          console.error(`[Scheduler] Job "${job.job_name}" failed:`, err.message)
        );
      }
    }
  } catch (err) {
    console.error('[Scheduler] tickJobs error:', err.message);
  }
}

// ─── Status updater (every 5 minutes) ────────────────────────────────────────

async function updateQuizStatuses() {
  try {
    const now = new Date().toISOString();

    // scheduled → live
    const { rowCount: activated } = await pool.query(
      `UPDATE generated_quizzes
       SET status='live', updated_at=NOW()
       WHERE status='scheduled' AND visibility_start_time <= $1`,
      [now]
    );

    // live → expired
    const { rowCount: expired } = await pool.query(
      `UPDATE generated_quizzes
       SET status='expired', updated_at=NOW()
       WHERE status='live'
         AND visibility_end_time IS NOT NULL
         AND visibility_end_time < $1`,
      [now]
    );

    if (activated || expired) {
      console.log(`[Scheduler] Status update: +${activated} live, +${expired} expired`);
    }
  } catch (err) {
    console.error('[Scheduler] updateQuizStatuses error:', err.message);
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

let started = false;

function startScheduler() {
  if (started) return;
  started = true;

  // Tick every minute
  cron.schedule('* * * * *', tickJobs, { timezone: 'UTC' });

  // Update statuses every 5 minutes
  cron.schedule('*/5 * * * *', updateQuizStatuses, { timezone: 'UTC' });

  // Run status sync immediately on startup
  updateQuizStatuses();

  console.log('✅ Quiz Scheduler Engine started (UTC ticks: 1-min jobs, 5-min status sync)');
}

module.exports = { startScheduler, runSchedulerJob };
