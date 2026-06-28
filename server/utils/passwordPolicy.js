/**
 * Password validation policy.
 */

/**
 * @param {string} password
 * @returns {{ ok: boolean, message: string }}
 */
function validatePassword(password) {
  if (password == null || typeof password !== 'string') {
    return { ok: false, message: 'Password is required' };
  }

  const value = password.trim();
  if (value.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(value)) {
    return { ok: false, message: 'Password must contain at least one letter' };
  }
  if (!/\d/.test(value)) {
    return { ok: false, message: 'Password must contain at least one number' };
  }

  return { ok: true, message: '' };
}

module.exports = { validatePassword };
