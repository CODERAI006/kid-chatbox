/**
 * JWT and auth cookie configuration.
 */

const DEFAULT_DEV_SECRET = 'your-secret-key-change-in-production';

/** Parse JWT_EXPIRES_IN (e.g. 7d, 12h) to milliseconds for cookie maxAge. */
function parseExpiresToMs(expiresIn) {
  const raw = String(expiresIn || '7d').trim();
  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * (unitMs[match[2].toLowerCase()] || unitMs.d);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Returns JWT secret. Throws in production if missing or weak (<32 chars).
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set to at least 32 characters when NODE_ENV=production'
      );
    }
    return secret;
  }

  return secret || DEFAULT_DEV_SECRET;
}

/** Options for httpOnly auth cookie (use with res.cookie). */
function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const secure =
    isProd &&
    process.env.COOKIE_SECURE !== 'false' &&
    process.env.FORCE_INSECURE_COOKIES !== '1';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: parseExpiresToMs(JWT_EXPIRES_IN),
  };
}

module.exports = {
  getJwtSecret,
  JWT_EXPIRES_IN,
  getAuthCookieOptions,
};
