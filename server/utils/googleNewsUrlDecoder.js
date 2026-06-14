/**
 * Resolve Google News RSS/article URLs to publisher URLs.
 */
const { decodeGoogleNewsUrl } = require('decode-google-news-url');

function isGoogleNewsArticleUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'news.google.com'
      && parsed.pathname.includes('/articles/');
  } catch {
    return false;
  }
}

async function resolveGoogleNewsUrl(sourceUrl) {
  if (!isGoogleNewsArticleUrl(sourceUrl)) return sourceUrl;
  try {
    const resolved = await decodeGoogleNewsUrl(sourceUrl);
    if (resolved && resolved.startsWith('http') && !isGoogleNewsArticleUrl(resolved)) {
      return resolved;
    }
  } catch (err) {
    console.warn('[googleNewsUrlDecoder] decode failed:', err.message);
  }
  return sourceUrl;
}

module.exports = {
  isGoogleNewsArticleUrl,
  resolveGoogleNewsUrl,
};
