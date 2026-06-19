/**
 * Timezone helpers (IST default via Asia/Kolkata). No external deps.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * @param {Date} [date]
 * @param {string} [timeZone]
 */
function getZonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    hours: parseInt(get('hour'), 10),
    minutes: parseInt(get('minute'), 10),
    day: WEEKDAY_MAP[get('weekday')] ?? 0,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

/**
 * @param {string} runTime HH:mm
 * @param {Date} [date]
 * @param {string} [timeZone]
 */
function matchesRunTime(runTime, date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const { hours, minutes } = getZonedParts(date, timeZone);
  const [jh, jm] = runTime.split(':').map(Number);
  return hours === jh && minutes === jm;
}

/**
 * @param {string|null|undefined} lastRunAt ISO timestamp
 * @param {Date} [date]
 * @param {string} [timeZone]
 */
function alreadyRanToday(lastRunAt, date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  if (!lastRunAt) return false;
  const today = getZonedParts(date, timeZone).dateKey;
  const last = getZonedParts(new Date(lastRunAt), timeZone).dateKey;
  return today === last;
}

/** YYYY-MM-DD in the given timezone (en-CA locale). */
function formatDateInTimezone(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDaysToYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function todayYmdInTimezone(timeZone = DEFAULT_TIMEZONE) {
  return formatDateInTimezone(new Date(), timeZone);
}

function tomorrowYmdInTimezone(timeZone = DEFAULT_TIMEZONE) {
  return addDaysToYmd(todayYmdInTimezone(timeZone), 1);
}

/** Parse YYYY-MM-DD to a local Date (noon) for service date helpers. */
function ymdToLocalDate(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

module.exports = {
  DEFAULT_TIMEZONE,
  getZonedParts,
  matchesRunTime,
  alreadyRanToday,
  formatDateInTimezone,
  addDaysToYmd,
  todayYmdInTimezone,
  tomorrowYmdInTimezone,
  ymdToLocalDate,
};
