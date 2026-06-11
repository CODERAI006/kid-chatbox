/**
 * Extract readable article text from a web page (strip ads, nav, junk).
 */

const cheerio = require('cheerio');

const JUNK_SELECTORS = [
  'script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript',
  '[class*="advert"]', '[class*="sidebar"]', '[id*="sidebar"]', '[class*="cookie"]',
  '[class*="newsletter"]', '[class*="social-share"]', '[class*="related-post"]',
];

const BODY_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.article-body',
  '.post-content',
  '.entry-content',
  '.story-body',
  '#content',
];

function cleanParagraphs(paragraphs) {
  return paragraphs
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 35 && !/^(share|follow|subscribe|read more|advertisement)/i.test(p))
    .slice(0, 24);
}

async function extractPageText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'KidChatbox-EducationBot/1.0 (+https://kid-chatbox.local)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    if (!res.ok) return '';

    const html = await res.text();
    const $ = cheerio.load(html);
    JUNK_SELECTORS.forEach((sel) => { $(sel).remove(); });

    let paragraphs = [];
    for (const sel of BODY_SELECTORS) {
      const root = $(sel).first();
      if (!root.length) continue;
      const ps = root.find('p').map((_, el) => $(el).text()).get();
      const cleaned = cleanParagraphs(ps);
      if (cleaned.join(' ').length > 180) {
        paragraphs = cleaned;
        break;
      }
    }

    if (!paragraphs.length) {
      paragraphs = cleanParagraphs($('p').map((_, el) => $(el).text()).get());
    }

    return paragraphs.join('\n\n').slice(0, 6500);
  } catch (err) {
    console.warn('[educationNewsPageExtract]', url?.slice(0, 60), err.message);
    return '';
  }
}

module.exports = { extractPageText };
