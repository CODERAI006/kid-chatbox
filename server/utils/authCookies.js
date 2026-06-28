/**
 * HttpOnly auth cookie helpers.
 */

const { getAuthCookieOptions } = require('./jwtConfig');

const COOKIE_NAME = 'auth_token';

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  const opts = getAuthCookieOptions();
  res.clearCookie(COOKIE_NAME, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
  });
}

module.exports = {
  COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
};
