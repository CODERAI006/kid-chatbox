/**
 * RSS + lightweight HTML scraping for kid education news (no external news API).
 */

const crypto = require('crypto');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const { EDUCATION_CATEGORIES } = require('./educationNewsCategories');
const { resolveGoogleNewsUrl, isGoogleNewsArticleUrl } = require('./googleNewsUrlDecoder');
const { FEEDS_BY_CATEGORY } = require('./newsFeedSources');
const { ensureSourcesSeeded, listActiveSources } = require('./newsArticleRepo');
const { formatCacheDate } = require('./educationNewsDbCache');

function buildArticleId(categoryId, link) {
  const hash = crypto.createHash('sha256').update(link).digest('base64url').slice(0, 22);
  return `${categoryId}_${hash}`;
}

const parser = new Parser({
  timeout: 12000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['source', 'feedSource'],
    ],
  },
});

const CACHE_TTL_MS = 45 * 60 * 1000;
const cache = new Map();

function googleNewsRss(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function cacheKey(categoryId) {
  return `edu_news_${categoryId}_${formatCacheDate()}`;
}

function pickImage(item) {
  if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  const media = item.mediaContent?.[0]?.$ || item.mediaThumbnail?.[0]?.$;
  if (media?.url) return media.url;
  const html = item.content || item['content:encoded'] || item.summary || '';
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1] || null;
}

function stripHtml(html) {
  if (!html) return '';
  return cheerio.load(html).text().replace(/\s+/g, ' ').trim();
}

function parseFeedSourceName(item, fallback) {
  const raw = item.feedSource;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw?._) return String(raw._).trim();
  if (raw?.['#']) return String(raw['#']).trim();
  return fallback;
}

function cleanGoogleNewsTitle(title, sourceName) {
  if (!sourceName) return title;
  const suffix = ` - ${sourceName}`;
  if (title.endsWith(suffix)) return title.slice(0, -suffix.length).trim();
  return title;
}

function normalizeItem(item, categoryId, sourceName) {
  const feedSource = parseFeedSourceName(item, sourceName);
  const rawTitle = (item.title || '').trim();
  const title = cleanGoogleNewsTitle(rawTitle, feedSource);
  const link = item.link || item.guid || '';
  if (!title || !link) return null;

  const rawDesc = item.contentSnippet || stripHtml(item.content) || item.summary || '';
  const description = rawDesc.slice(0, 320);
  const publisher = feedSource || sourceName || 'Education Feed';

  return {
    id: buildArticleId(categoryId, link),
    category: categoryId,
    title,
    description,
    summary: description,
    url: link,
    urlToImage: pickImage(item),
    source: { id: null, name: publisher },
    author: item.creator || item.author || publisher || 'Editor',
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    content: null,
    funFact: null,
    relatedTopics: [],
    kidSummary: null,
    readTimeMinutes: Math.max(2, Math.ceil(description.split(/\s+/).length / 120)),
  };
}

async function resolvePublisherUrls(articles, maxResolve = 8) {
  const pending = articles.filter((a) => isGoogleNewsArticleUrl(a.url)).slice(0, maxResolve);
  await Promise.all(pending.map(async (article) => {
    const resolved = await resolveGoogleNewsUrl(article.url);
    if (!resolved || resolved === article.url) return;
    article.url = resolved;
    article.id = buildArticleId(article.category, resolved);
  }));
}

async function fetchFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return { title: feed.title || 'News', items: feed.items || [] };
  } catch (err) {
    console.warn('[educationNewsScraper] feed failed:', url, err.message);
    return { title: 'News', items: [] };
  }
}

async function fetchOgImage(pageUrl) {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'KidChatbox-EducationBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSummaries(categoryId, limit = 4) {
  const cat = EDUCATION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cat.searchTerms)}&format=json&srlimit=${limit}&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    const searchData = await searchRes.json();
    const titles = (searchData.query?.search || []).map((s) => s.title).slice(0, limit);
    if (!titles.length) return [];

    const summaries = await Promise.all(titles.map(async (title) => {
      try {
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const r = await fetch(sumUrl, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) return null;
        const data = await r.json();
        return normalizeItem({
          title: data.title,
          link: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          contentSnippet: data.extract,
          isoDate: new Date().toISOString(),
          creator: 'Wikipedia',
          enclosure: data.thumbnail?.source ? { url: data.thumbnail.source } : undefined,
        }, categoryId, 'Wikipedia');
      } catch {
        return null;
      }
    }));

    return summaries.filter(Boolean);
  } catch (err) {
    console.warn('[educationNewsScraper] Wikipedia failed:', err.message);
    return [];
  }
}

async function categoryFeedUrls(categoryId) {
  await ensureSourcesSeeded();
  const dbSources = await listActiveSources(categoryId);
  const dbUrls = dbSources
    .filter((s) => s.source_type === 'rss' && s.is_active !== false)
    .map((s) => s.url);

  const cat = EDUCATION_CATEGORIES.find((c) => c.id === categoryId);
  const staticFeeds = FEEDS_BY_CATEGORY[categoryId] || [];
  const googleFeed = cat ? [googleNewsRss(cat.searchTerms)] : [];

  return [...new Set([...staticFeeds, ...dbUrls, ...googleFeed])];
}

async function scrapeCategory(categoryId, { maxItems = 24, bypassCache = false } = {}) {
  const key = cacheKey(categoryId);
  const hit = cache.get(key);
  if (!bypassCache && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.articles;
  }

  const feeds = await categoryFeedUrls(categoryId);
  const feedResults = await Promise.all(feeds.map(fetchFeed));
  const wikiArticles = await fetchWikipediaSummaries(categoryId, 5);

  const seenUrls = new Set();
  const seenIds = new Set();
  const articles = [];

  for (const feed of feedResults) {
    for (const item of feed.items) {
      const normalized = normalizeItem(item, categoryId, feed.title);
      if (!normalized || seenUrls.has(normalized.url) || seenIds.has(normalized.id)) continue;
      seenUrls.add(normalized.url);
      seenIds.add(normalized.id);
      articles.push(normalized);
      if (articles.length >= maxItems) break;
    }
    if (articles.length >= maxItems) break;
  }

  for (const w of wikiArticles) {
    if (!seenUrls.has(w.url) && !seenIds.has(w.id)) {
      seenUrls.add(w.url);
      seenIds.add(w.id);
      articles.push(w);
    }
  }

  articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  await resolvePublisherUrls(articles);

  const needImages = articles.filter((a) => !a.urlToImage).slice(0, 6);
  await Promise.all(needImages.map(async (a) => {
    const img = await fetchOgImage(a.url);
    if (img) a.urlToImage = img;
  }));

  cache.set(key, { at: Date.now(), articles });
  return articles;
}

async function scrapeAllCategories({ maxPerCategory = 8 } = {}) {
  const all = [];
  for (const cat of EDUCATION_CATEGORIES) {
    const items = await scrapeCategory(cat.id, { maxItems: maxPerCategory });
    all.push(...items);
  }
  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return all;
}

module.exports = {
  buildArticleId,
  scrapeCategory,
  scrapeAllCategories,
};
