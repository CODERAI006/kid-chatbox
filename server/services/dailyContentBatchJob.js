/**
 * Nightly batch — pregenerate Word of Day, Expressions, Facts & Fun, and News
 * for grades that have active users, so morning app loads are instant.
 */

const { pool } = require('../config/database');
const { getGradesForDailyBatch } = require('../utils/userGrades');
const {
  DEFAULT_TIMEZONE,
  todayYmdInTimezone,
  tomorrowYmdInTimezone,
  ymdToLocalDate,
} = require('../utils/timezoneUtils');
const { pregenerateForDate: pregenerateWordOfDay } = require('./wordOfDayService');
const { pregenerateForDate: pregenerateFacts } = require('./dailyFactsService');
const { ensureDailyNewsFresh } = require('./educationNewsService');
const { readCache: readWotdCache, gradeCacheKey: wotdGradeKey } = require('../utils/wordOfDayDbCache');
const { readCache: readFactsCache, gradeCacheKey: factsGradeKey } = require('../utils/dailyFactsDbCache');

let batchRunning = false;

const BATCH_JOBS = [
  {
    id: 'nightly',
    name: 'Nightly pregeneration',
    schedule: '23:45 IST daily',
    description: 'Builds tomorrow\'s Word of Day, expressions, and Facts & Fun for active user grades.',
    contents: ['Word of Day', 'Expressions', 'Facts & Fun'],
    defaultTarget: 'tomorrow',
    skipNews: true,
  },
  {
    id: 'news-morning',
    name: 'Morning news refresh',
    schedule: '05:45 IST daily',
    description: 'Fetches fresh education news from RSS and Google News for all topics.',
    contents: ['Education News'],
    defaultTarget: 'today',
    newsOnly: true,
  },
  {
    id: 'news-afternoon',
    name: 'Afternoon news refresh',
    schedule: '14:00 IST daily',
    description: 'Refreshes education news if the morning cache is older than 6 hours.',
    contents: ['Education News'],
    defaultTarget: 'today',
    newsOnly: true,
    newsMaxAgeHours: 6,
  },
  {
    id: 'catchup',
    name: 'Morning catch-up',
    schedule: '00:20 IST daily',
    description: 'Fills any missing cache for today and runs the education news pipeline.',
    contents: ['Word of Day', 'Expressions', 'Facts & Fun', 'Education News'],
    defaultTarget: 'today',
    skipNews: false,
  },
  {
    id: 'boot',
    name: 'Server boot warm-up',
    schedule: 'On server start (~20s after boot)',
    description: 'Warms today\'s vocabulary and facts if the server restarted.',
    contents: ['Word of Day', 'Expressions', 'Facts & Fun'],
    defaultTarget: 'today',
    skipNews: true,
  },
];

async function startBatchRun(targetDate, triggerType) {
  const { rows } = await pool.query(
    `INSERT INTO daily_content_batch_runs (target_date, trigger_type, status)
     VALUES ($1::date, $2, 'running')
     RETURNING id`,
    [targetDate, triggerType],
  );
  return rows[0].id;
}

async function finishBatchRun(runId, { status, stats, errorMessage }) {
  await pool.query(
    `UPDATE daily_content_batch_runs
     SET status = $2,
         finished_at = CURRENT_TIMESTAMP,
         stats_json = $3::jsonb,
         error_message = $4
     WHERE id = $1`,
    [runId, status, JSON.stringify(stats || {}), errorMessage || null],
  );
}

async function getLatestBatchRun(targetDate) {
  const { rows } = await pool.query(
    `SELECT id, target_date, trigger_type, status, started_at, finished_at, stats_json, error_message
     FROM daily_content_batch_runs
     WHERE target_date = $1::date
     ORDER BY started_at DESC
     LIMIT 1`,
    [targetDate],
  );
  return rows[0] || null;
}

function isBatchRunning() {
  return batchRunning;
}

function resolveTargetDate(options = {}) {
  if (options.targetDate) return options.targetDate;
  if (options.today === true) return todayYmdInTimezone(DEFAULT_TIMEZONE);
  if (options.jobId === 'nightly') return tomorrowYmdInTimezone(DEFAULT_TIMEZONE);
  if (options.jobId === 'catchup' || options.jobId === 'boot') {
    return todayYmdInTimezone(DEFAULT_TIMEZONE);
  }
  // Manual admin trigger defaults to today so students see content immediately.
  return todayYmdInTimezone(DEFAULT_TIMEZONE);
}

function resolveSkipNews(options = {}) {
  if (options.skipNews === true) return true;
  if (options.skipNews === false) return false;
  if (options.jobId === 'nightly' || options.jobId === 'boot') return true;
  return false;
}

/**
 * @param {Object} [options]
 * @param {string} [options.targetDate] YYYY-MM-DD (IST calendar day to warm)
 * @param {number} [options.runId] Existing run row (async admin trigger)
 * @param {'cron'|'manual'|'catchup'|'boot'} [options.trigger]
 * @param {boolean} [options.skipNews]
 * @param {boolean} [options.forceNewsRefresh]
 */
async function runDailyContentBatch(options = {}) {
  if (batchRunning) {
    console.log('[dailyContentBatch] skipped — batch already running');
    if (options.runId) {
      await finishBatchRun(options.runId, {
        status: 'failed',
        stats: { reason: 'already_running' },
        errorMessage: 'Skipped — another batch was already running',
      });
    }
    return { skipped: true, reason: 'already_running' };
  }

  batchRunning = true;
  const trigger = options.trigger || 'cron';
  const targetDate = resolveTargetDate(options);
  const targetDateObj = ymdToLocalDate(targetDate);
  let runId = options.runId || null;
  const skipNews = resolveSkipNews(options);
  const newsOnly = options.newsOnly === true;

  try {
    let news = { built: 0, skipped: true, cacheDate: targetDate };
    if (!skipNews) {
      news = await ensureDailyNewsFresh({
        forceRefresh: Boolean(options.forceNewsRefresh),
        maxAgeHours: options.newsMaxAgeHours ?? 20,
      });
    }

    if (newsOnly) {
      if (!runId) runId = await startBatchRun(targetDate, trigger);
      const stats = { targetDate, trigger, newsOnly: true, news };
      await finishBatchRun(runId, { status: 'completed', stats });
      console.log(`[dailyContentBatch] news-only completed for ${targetDate} — built ${news.built || 0}`);
      return { success: true, runId, targetDate, news };
    }

    const gradeTargets = await getGradesForDailyBatch();
    const wotdGrades = gradeTargets.filter((g) => g.wordOfDayEnabled).map((g) => g.grade);
    const factsGrades = gradeTargets.filter((g) => g.factsEnabled).map((g) => g.grade);

    if (!gradeTargets.length) {
      console.log('[dailyContentBatch] no active user grades — skipping WOTD/facts');
      if (!skipNews && (news.built > 0 || !news.skipped)) {
        if (!runId) runId = await startBatchRun(targetDate, trigger);
        const stats = { targetDate, trigger, reason: 'no_user_grades', news };
        await finishBatchRun(runId, { status: 'completed', stats });
        return { success: true, runId, targetDate, news, skippedGrades: true };
      }
      if (runId) {
        await finishBatchRun(runId, {
          status: 'failed',
          stats: { targetDate, trigger, reason: 'no_user_grades' },
          errorMessage: 'No active user grades found',
        });
      }
      return { skipped: true, reason: 'no_user_grades', targetDate, runId };
    }

    if (!runId) runId = await startBatchRun(targetDate, trigger);
    console.log(
      `[dailyContentBatch] started for ${targetDate} — ${gradeTargets.length} grade(s), `
        + `${wotdGrades.length} WOTD, ${factsGrades.length} facts`,
    );

    const wotd = wotdGrades.length
      ? await pregenerateWordOfDay(targetDateObj, { grades: wotdGrades })
      : { built: 0, detailsBuilt: 0, total: 0, skipped: true, cacheDate: targetDate };

    const facts = factsGrades.length
      ? await pregenerateFacts(targetDateObj, { grades: factsGrades })
      : { built: 0, total: 0, skipped: true, cacheDate: targetDate };

    const stats = {
      targetDate,
      trigger,
      userGrades: gradeTargets.map((g) => ({
        grade: g.grade,
        userCount: g.userCount,
        wordOfDayEnabled: g.wordOfDayEnabled,
        factsEnabled: g.factsEnabled,
      })),
      wordOfDay: wotd,
      facts,
      news,
    };

    await finishBatchRun(runId, { status: 'completed', stats });
    console.log(
      `[dailyContentBatch] completed for ${targetDate} — `
        + `WOTD ${wotd.built}/${wotd.total}, details ${wotd.detailsBuilt || 0}, `
        + `facts ${facts.built}/${facts.total}, news built ${news.built || 0}`,
    );

    return { success: true, runId, targetDate, ...stats };
  } catch (err) {
    console.error('[dailyContentBatch] failed:', err.message);
    if (runId) {
      await finishBatchRun(runId, {
        status: 'failed',
        stats: { targetDate, trigger },
        errorMessage: err.message,
      });
    }
    throw err;
  } finally {
    batchRunning = false;
  }
}

/** Fire-and-forget for admin HTTP — returns immediately; run row created when work starts. */
async function enqueueDailyContentBatch(options = {}) {
  if (batchRunning) {
    return { skipped: true, reason: 'already_running' };
  }

  const targetDate = resolveTargetDate(options);
  const trigger = options.trigger || 'manual';
  const skipNews = resolveSkipNews(options);

  setImmediate(() => {
    runDailyContentBatch({
      ...options,
      targetDate,
      trigger,
      skipNews,
    }).catch((err) => {
      console.error('[dailyContentBatch] async run failed:', err.message);
    });
  });

  return {
    success: true,
    targetDate,
    message: `Batch started in background for ${targetDate}. Students may need to refresh the app.`,
  };
}

async function cleanupStaleBatchRuns(maxAgeMinutes = 120) {
  const { rowCount } = await pool.query(
    `UPDATE daily_content_batch_runs
     SET status = 'failed',
         finished_at = CURRENT_TIMESTAMP,
         error_message = COALESCE(error_message, 'Interrupted — server restarted or timed out')
     WHERE status = 'running'
       AND started_at < NOW() - ($1::text || ' minutes')::interval`,
    [String(maxAgeMinutes)],
  );
  if (rowCount > 0) {
    console.log(`[dailyContentBatch] marked ${rowCount} stale run(s) as failed`);
  }
  return rowCount;
}

async function getGradeCacheStatus(targetDate) {
  const grades = await getGradesForDailyBatch();
  return Promise.all(
    grades.map(async (g) => {
      const wotd = await readWotdCache(wotdGradeKey(g.grade), targetDate);
      const facts = await readFactsCache(factsGradeKey(g.grade), targetDate);
      return {
        grade: g.grade,
        userCount: g.userCount,
        wordOfDayEnabled: g.wordOfDayEnabled,
        factsEnabled: g.factsEnabled,
        wordOfDayReady: Boolean(wotd?.words?.length),
        wordCount: (wotd?.words || []).length,
        factsReady: Boolean(facts?.facts?.length),
        factCount: (facts?.facts || []).length,
      };
    }),
  );
}

async function runNightlyBatch() {
  const targetDate = tomorrowYmdInTimezone(DEFAULT_TIMEZONE);
  const latest = await getLatestBatchRun(targetDate);
  if (latest?.status === 'completed') {
    console.log(`[dailyContentBatch] nightly skipped — ${targetDate} already completed`);
    return { skipped: true, reason: 'already_completed', targetDate };
  }
  return runDailyContentBatch({ targetDate, trigger: 'cron', jobId: 'nightly' });
}

async function runCatchupBatch() {
  const targetDate = todayYmdInTimezone(DEFAULT_TIMEZONE);
  return runDailyContentBatch({ targetDate, trigger: 'catchup', jobId: 'catchup' });
}

async function runNewsMorningBatch() {
  const targetDate = todayYmdInTimezone(DEFAULT_TIMEZONE);
  return runDailyContentBatch({
    targetDate,
    trigger: 'cron',
    jobId: 'news-morning',
    newsOnly: true,
    forceNewsRefresh: true,
    skipNews: false,
  });
}

async function runNewsAfternoonBatch() {
  const targetDate = todayYmdInTimezone(DEFAULT_TIMEZONE);
  return runDailyContentBatch({
    targetDate,
    trigger: 'cron',
    jobId: 'news-afternoon',
    newsOnly: true,
    skipNews: false,
    newsMaxAgeHours: 6,
  });
}

async function listRecentBatchRuns(limit = 14) {
  const { rows } = await pool.query(
    `SELECT id, target_date, trigger_type, status, started_at, finished_at, stats_json, error_message
     FROM daily_content_batch_runs
     ORDER BY started_at DESC
     LIMIT $1`,
    [Math.min(50, Math.max(1, limit))],
  );
  return rows;
}

async function getBatchOverview(limit = 20) {
  const todayIst = todayYmdInTimezone(DEFAULT_TIMEZONE);
  const tomorrowIst = tomorrowYmdInTimezone(DEFAULT_TIMEZONE);
  const [activeUserGrades, recentRuns, cacheToday, cacheTomorrow] = await Promise.all([
    getGradesForDailyBatch(),
    listRecentBatchRuns(limit),
    getGradeCacheStatus(todayIst),
    getGradeCacheStatus(tomorrowIst),
  ]);

  return {
    isRunning: isBatchRunning(),
    jobs: BATCH_JOBS,
    activeUserGrades,
    cacheToday,
    cacheTomorrow,
    recentRuns,
    todayIst,
    tomorrowIst,
    timezone: DEFAULT_TIMEZONE,
  };
}

module.exports = {
  BATCH_JOBS,
  runDailyContentBatch,
  enqueueDailyContentBatch,
  runNightlyBatch,
  runCatchupBatch,
  runNewsMorningBatch,
  runNewsAfternoonBatch,
  getLatestBatchRun,
  listRecentBatchRuns,
  getBatchOverview,
  getGradeCacheStatus,
  cleanupStaleBatchRuns,
  isBatchRunning,
};
