/**
 * Nightly batch — pregenerate daily content for active user grades.
 * Usage: node server/scripts/run-daily-content-batch.js [--today] [--date=YYYY-MM-DD]
 */

require('dotenv').config();

const { pool } = require('../config/database');
const { migrateDailyContentBatch } = require('./migrate-daily-content-batch');
const {
  runDailyContentBatch,
  runNightlyBatch,
  runCatchupBatch,
} = require('../services/dailyContentBatchJob');
const {
  DEFAULT_TIMEZONE,
  todayYmdInTimezone,
  tomorrowYmdInTimezone,
} = require('../utils/timezoneUtils');

function parseArgs() {
  const args = process.argv.slice(2);
  let targetDate = tomorrowYmdInTimezone(DEFAULT_TIMEZONE);
  let trigger = 'manual';

  for (const arg of args) {
    if (arg === '--today') {
      targetDate = todayYmdInTimezone(DEFAULT_TIMEZONE);
    } else if (arg === '--catchup') {
      return { mode: 'catchup' };
    } else if (arg === '--nightly') {
      return { mode: 'nightly' };
    } else if (arg.startsWith('--date=')) {
      targetDate = arg.slice('--date='.length);
    }
  }

  return { mode: 'custom', targetDate, trigger };
}

async function main() {
  await migrateDailyContentBatch();

  const opts = parseArgs();
  let result;

  if (opts.mode === 'nightly') {
    result = await runNightlyBatch();
  } else if (opts.mode === 'catchup') {
    result = await runCatchupBatch();
  } else {
    result = await runDailyContentBatch({
      targetDate: opts.targetDate,
      trigger: opts.trigger,
    });
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Daily content batch failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
