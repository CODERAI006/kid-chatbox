/**
 * Scheduler Engine — IST-aware ticks, batch generation via quizBatchGenerator.
 */

const cron = require('node-cron');
const { pool } = require('../config/database');
const { runSchedulerJobUnified } = require('./quizBatchGenerator');
const { matchesRunTime, alreadyRanToday, DEFAULT_TIMEZONE } = require('../utils/timezoneUtils');
const { pregenerateForDate } = require('./wordOfDayService');
const { pregenerateForDate: pregenerateDailyFacts } = require('./dailyFactsService');
const { pregenerateForDate: pregenerateEducationNews } = require('./educationNewsService');

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
    const { cacheDate, built, total, skipped } = await pregenerateForDate(new Date());
    if (built > 0) {
      console.log(`[Scheduler] Word of Day shared edition built for ${cacheDate}`);
    } else if (skipped) {
      console.log(`[Scheduler] Word of Day already cached for ${cacheDate}`);
    }
  } catch (err) {
    console.error('[Scheduler] Word of Day pregenerate error:', err.message);
  }
}

async function pregenerateFactsAndFun() {
  try {
    const { cacheDate, built, skipped } = await pregenerateDailyFacts(new Date());
    if (built > 0) {
      console.log(`[Scheduler] Facts & Fun shared edition built for ${cacheDate}`);
    } else if (skipped) {
      console.log(`[Scheduler] Facts & Fun already cached for ${cacheDate}`);
    }
  } catch (err) {
    console.error('[Scheduler] Facts & Fun pregenerate error:', err.message);
  }
}

async function pregenerateNews() {
  try {
    const { cacheDate, built } = await pregenerateEducationNews();
    if (built > 0) {
      console.log(`[Scheduler] Education news pregenerated (${built} buckets) for ${cacheDate}`);
    }
  } catch (err) {
    console.error('[Scheduler] Education news pregenerate error:', err.message);
  }
}

function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule('* * * * *', tickJobs, { timezone: 'UTC' });
  cron.schedule('*/5 * * * *', updateQuizStatuses, { timezone: 'UTC' });
  // 00:10 IST — build today's words for all grades before students open the app
  cron.schedule('10 0 * * *', pregenerateWordOfDay, { timezone: 'Asia/Kolkata' });
  cron.schedule('20 0 * * *', pregenerateFactsAndFun, { timezone: 'Asia/Kolkata' });
  cron.schedule('30 0 * * *', pregenerateNews, { timezone: 'Asia/Kolkata' });
  updateQuizStatuses();
  setTimeout(() => pregenerateWordOfDay(), 15_000);
  setTimeout(() => pregenerateFactsAndFun(), 25_000);
  setTimeout(() => pregenerateNews(), 35_000);

  console.log('✅ Quiz Scheduler Engine started (IST-aware job matching, 1-min / 5-min ticks)');
}

module.exports = { startScheduler, runSchedulerJob };
