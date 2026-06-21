/**
 * Simple in-memory rate limiter for chat endpoints.
 */

const WINDOW_MS = Number(process.env.CHAT_RATE_WINDOW_MS) || 60_000;
const MAX_REQUESTS = Number(process.env.CHAT_RATE_MAX) || 30;

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

function chatRateLimit(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next();

  const now = Date.now();
  let bucket = buckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(userId, bucket);
  }

  bucket.count += 1;

  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - bucket.count)));

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many chat requests. Please wait a moment and try again.',
    });
  }

  next();
}

module.exports = { chatRateLimit };
