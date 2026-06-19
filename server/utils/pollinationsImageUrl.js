/** Zero-setup fallback images via Pollinations.ai (no API key). */
const POLLINATIONS_HOST = 'image.pollinations.ai';

/**
 * @param {string} prompt
 * @param {{ width?: number, height?: number }} [opts]
 */
function getPollinationsImageUrl(prompt, opts = {}) {
  const width = opts.width || 768;
  const height = opts.height || 512;
  const clean = String(prompt || 'educational illustration').trim().slice(0, 500);
  return `https://${POLLINATIONS_HOST}/prompt/${encodeURIComponent(clean)}?width=${width}&height=${height}&nologo=true`;
}

function isPollinationsImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes(POLLINATIONS_HOST)) return true;
  try {
    return new URL(trimmed).hostname === POLLINATIONS_HOST;
  } catch {
    return false;
  }
}

function isPollinationsFallbackEnabled() {
  return String(process.env.QUIZ_IMAGE_POLLINATIONS_FALLBACK ?? 'true').toLowerCase() !== 'false';
}

module.exports = {
  POLLINATIONS_HOST,
  getPollinationsImageUrl,
  isPollinationsImageUrl,
  isPollinationsFallbackEnabled,
};
