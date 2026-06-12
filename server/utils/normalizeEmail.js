/**
 * Normalize and validate email addresses for auth flows.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} raw
 * @returns {string|null} Lowercase trimmed email, or null if invalid
 */
const normalizeEmail = (raw) => {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
};

/**
 * @param {unknown} raw
 * @returns {{ email: string|null, error: string|null }}
 */
const parseEmail = (raw) => {
  const email = normalizeEmail(raw);
  if (email) {
    return { email, error: null };
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { email: null, error: 'Please enter a valid email address' };
  }

  return { email: null, error: 'Email is required' };
};

module.exports = { normalizeEmail, parseEmail };
