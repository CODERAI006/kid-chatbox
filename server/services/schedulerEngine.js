/**
 * Scheduler Engine — IST-aware ticks, batch generation via quizBatchGenerator.
 */

const cron = require('node-cron');
const { pool } = require('../config/database');
const { runSchedulerJobUnified } = require('./quizBatchGenerator');
const { matchesRunTime, alreadyRanToday, DEFAULT_TIMEZONE } = require('../utils/timezoneUtils');
const {
  runNightlyBatch,
  runCatchupBatch,
  runDailyContentBatch,
  cleanupStaleBatchRuns,
} = require('./dailyContentBatchJob');
const { todayYmdInTimezone } = require('../utils/timezoneUtils');

/**
 * @param {Object} job
 * @param {boolean} [manual]
 */
function shouldFire(job, manual = false) {
  if (manual) return true;

  const tz = job.timezone || DEFAULT_TIMEZONE;
  if (!matchesRunTime(job.run_time, new Date(), tz)) return false;

  if (job.frequency_type === 'weekly') {
    const { getZonedParts } = require('../utils/timezoneUtils');
    const { day } = getZonedParts(new Date(), tz);
    if (job.day_of_week !== day) return false;
  }

  if (alreadyRanToday(job.last_run_at, new Date(), tz)) return false;

  if (job.last_run_at) {
    const diff = Date.now() - new Date(job.last_run_at).getTime();
    if (diff < 55_000) return false;
  }

  return true;
}

async function runSchedulerJob(job, manual = false) {
  console.log(`[Scheduler] Running job "${job.job_name}" (manual=${manual})`);
  return runSchedulerJobUnified(job, manual);
}

async function tickJobs() {
  try {
    const { rows: jobs } = await pool.query(
      `SELECT * FROM quiz_scheduler_jobs WHERE status = 'active'`
    );

    for (const job of jobs) {
      if (shouldFire(job)) {
        runSchedulerJob(job).catch((err) =>
          console.error(`[Scheduler] Job "${job.job_name}" failed:`, err.message)
        );
      }
    }
  } catch (err) {
    console.error('[Scheduler] tickJobs error:', err.message);
  }
}

async function updateQuizStatuses() {
  try {
    const now = new Date().toISOString();

    const { rowCount: activated } = await pool.query(
      `UPDATE generated_quizzes
       SET status='live', updated_at=NOW()
       WHERE status='scheduled' AND visibility_start_time <= $1`,
      [now]
    );

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

let started = false;

async function pregenerateWordOfDay() {
  try {
    const result = await runNightlyBatch();
    if (result.skipped) {
      console.log(`[Scheduler] Nightly content batch skipped: ${result.reason || 'unknown'}`);
    }
  } catch (err) {
    console.error('[Scheduler] Nightly content batch error:', err.message);
  }
}

async function runMorningCatchup() {
  try {
    const result = await runCatchupBatch();
    if (!result.skipped) {
      console.log(`[Scheduler] Morning catch-up batch completed for ${result.targetDate}`);
    }
  } catch (err) {
    console.error('[Scheduler] Morning catch-up batch error:', err.message);
  }
}

async function warmTodayOnBoot() {
  try {
    const targetDate = todayYmdInTimezone(DEFAULT_TIMEZONE);
    await runDailyContentBatch({
      targetDate,
      trigger: 'boot',
      skipNews: true,
    });
  } catch (err) {
    console.error('[Scheduler] Boot warm-up error:', err.message);
  }
}

function startScheduler() {
  if (started) return;
  started = true;

  cleanupStaleBatchRuns().catch((err) =>
    console.error('[Scheduler] cleanupStaleBatchRuns error:', err.message),
  );

  cron.schedule('* * * * *', tickJobs, { timezone: 'UTC' });
  cron.schedule('*/5 * * * *', updateQuizStatuses, { timezone: 'UTC' });
  // 23:45 IST — pregenerate tomorrow's WOTD, expressions, facts & news for active user grades
  cron.schedule('45 23 * * *', pregenerateWordOfDay, { timezone: 'Asia/Kolkata' });
  // 00:20 IST — catch-up for today if nightly job missed anything
  cron.schedule('20 0 * * *', runMorningCatchup, { timezone: 'Asia/Kolkata' });
  updateQuizStatuses();
  // Warm today's cache on boot for active user grades (skip news — nightly cron handles it)
  setTimeout(() => warmTodayOnBoot(), 20_000);

  console.log('✅ Quiz Scheduler Engine started (IST nightly content batch @ 23:45, catch-up @ 00:20)');
}

module.exports = { startScheduler, runSchedulerJob };
