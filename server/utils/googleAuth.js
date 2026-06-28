/**
 * Google ID token verification via OAuth2 tokeninfo endpoint.
 */

const axios = require('axios');

/**
 * Verify a Google ID token and return profile claims.
 * @param {string} idToken
 * @returns {Promise<{ email: string, name: string, picture: string | null, sub: string }>}
 */
async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`;
  let response;

  try {
    response = await axios.get(url, { timeout: 8000 });
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message || 'Invalid Google token';
    throw new Error(msg);
  }

  const data = response.data;
  if (!data?.email || !data?.sub) {
    throw new Error('Invalid Google token payload');
  }

  return {
    email: String(data.email).toLowerCase(),
    name: data.name ? String(data.name) : String(data.email).split('@')[0],
    picture: data.picture ? String(data.picture) : null,
    sub: String(data.sub),
  };
}

module.exports = { verifyGoogleIdToken };
