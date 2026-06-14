/**
 * Education news pipeline — scrape (RSS/cheerio/playwright) + AI + daily cache.
 */

const { EDUCATION_CATEGORIES } = require('../utils/educationNewsCategories');
const { scrapeCategory } = require('../utils/educationNewsScraper');
const { processArticles } = require('../utils/newsAiProcessor');
const { formatCacheDate, readCache, writeCache } = require('../utils/educationNewsDbCache');
const {
  ensureSourcesSeeded,
  countSources,
  listActiveSources,
  createPipelineRun,
  finishPipelineRun,
  getLatestPipelineRun,
  getRunningPipelineRun,
  upsertArticle,
  upsertLearningContent,
} = require('../utils/newsArticleRepo');
const { isPlaywrightEnabled } = require('../utils/newsPlaywrightScraper');

const ENRICH_LIMIT = Number(process.env.NEWS_ENRICH_LIMIT) || 8;
let syncInProgress = false;

async function persistEnrichedArticles(articles) {
  for (const article of articles.slice(0, ENRICH_LIMIT)) {
    try {
      const dbId = await upsertArticle(article, null);
      if (dbId) await upsertLearningContent(dbId, article);
    } catch (err) {
      console.warn('[newsPipeline] persist failed:', article.title?.slice(0, 40), err.message);
    }
  }
}

async function syncCategory(categoryId, { forceRefresh = false, enrich = true } = {}) {
  const cacheDate = formatCacheDate();
  const scraped = await scrapeCategory(categoryId, { bypassCache: forceRefresh, maxItems: 24 });
  const articles = enrich
    ? await processArticles(scraped, categoryId, { limit: ENRICH_LIMIT })
    : scraped;

  if (enrich) await persistEnrichedArticles(articles);

  await writeCache(categoryId, cacheDate, {
    articles,
    builtAt: new Date().toISOString(),
    source: 'pipeline',
  });

  return { articleCount: articles.length, cacheDate };
}

function dedupeArticles(items) {
  const seen = new Set();
  return items.filter((article) => {
    const key = article.id || article.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildAllFromCache(cacheDate) {
  const all = [];
  for (const cat of EDUCATION_CATEGORIES) {
    const hit = await readCache(cat.id, cacheDate);
    if (hit?.payload?.articles?.length) {
      all.push(...hit.payload.articles);
    }
  }
  const merged = dedupeArticles(all);
  merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  await writeCache('all', cacheDate, { articles: merged, builtAt: new Date().toISOString() });
}

async function runDailySync({ forceRefresh = false, triggerType = 'cron' } = {}) {
  if (syncInProgress) {
    const running = await getRunningPipelineRun();
    if (running) return { skipped: true, reason: 'sync_already_running' };
  }

  syncInProgress = true;
  await ensureSourcesSeeded();
  const run = await createPipelineRun(triggerType);
  const stats = { cacheDate: formatCacheDate(), categories: {}, errors: [] };

  try {
    for (const cat of EDUCATION_CATEGORIES) {
      try {
        const result = await syncCategory(cat.id, { forceRefresh, enrich: true });
        stats.categories[cat.id] = result.articleCount;
      } catch (err) {
        stats.errors.push({ category: cat.id, message: err.message });
        console.error(`[newsPipeline] ${cat.id} failed:`, err.message);
      }
    }

    await buildAllFromCache(stats.cacheDate);
    await finishPipelineRun(run.id, { status: 'completed', stats });
    return { success: true, runId: run.id, stats };
  } catch (err) {
    await finishPipelineRun(run.id, { status: 'failed', stats, errorMessage: err.message });
    throw err;
  } finally {
    syncInProgress = false;
  }
}

async function getPipelineStatus() {
  await ensureSourcesSeeded();
  const counts = await countSources();
  const latestRun = await getLatestPipelineRun();
  const running = await getRunningPipelineRun();
  const sources = await listActiveSources();

  return {
    success: true,
    isRunning: syncInProgress || Boolean(running),
    sourceCount: counts.total,
    activeSourceCount: counts.active,
    playwrightEnabled: isPlaywrightEnabled(),
    sources: sources.slice(0, 20),
    latestRun: latestRun ? {
      id: latestRun.id,
      started_at: latestRun.started_at,
      finished_at: latestRun.finished_at,
      status: latestRun.status,
      trigger_type: latestRun.trigger_type,
      stats_json: latestRun.stats_json,
      error_message: latestRun.error_message,
    } : undefined,
  };
}

module.exports = {
  syncCategory,
  runDailySync,
  getPipelineStatus,
};
