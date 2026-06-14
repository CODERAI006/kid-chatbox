/**
 * Playwright page scraper — VPS-safe, limited concurrency.
 */

const MAX_CONCURRENT = Number(process.env.NEWS_PLAYWRIGHT_CONCURRENCY) || 2;
let activeBrowsers = 0;
const queue = [];

function isPlaywrightEnabled() {
  return process.env.NEWS_PLAYWRIGHT_ENABLED === 'true' || process.env.NEWS_PLAYWRIGHT_ENABLED === '1';
}

async function acquireSlot() {
  if (activeBrowsers < MAX_CONCURRENT) {
    activeBrowsers += 1;
    return;
  }
  await new Promise((resolve) => queue.push(resolve));
  activeBrowsers += 1;
}

function releaseSlot() {
  activeBrowsers = Math.max(0, activeBrowsers - 1);
  const next = queue.shift();
  if (next) next();
}

async function scrapeWithPlaywright(url) {
  if (!isPlaywrightEnabled()) return '';

  let browser;
  try {
    await acquireSlot();
    const { chromium } = require('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.evaluate(() => {
      const junk = document.querySelectorAll('script, style, nav, footer, aside, iframe');
      junk.forEach((el) => el.remove());
      const main = document.querySelector('article, main, [role="main"]') || document.body;
      return (main?.innerText || '').replace(/\s+/g, ' ').trim();
    });
    return text.slice(0, 6500);
  } catch (err) {
    console.warn('[newsPlaywright]', url?.slice(0, 50), err.message);
    return '';
  } finally {
    if (browser) await browser.close().catch(() => {});
    releaseSlot();
  }
}

module.exports = { scrapeWithPlaywright, isPlaywrightEnabled };
