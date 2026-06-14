/**
 * Education news — daily DB cache, scrape once per day per category (shared across classes).
 */

const { getCategoryById, getTopicsOverview, EDUCATION_CATEGORIES } = require('../utils/educationNewsCategories');
const {
  formatCacheDate,
  readCache,
  writeCache,
  findArticle,
} = require('../utils/educationNewsDbCache');
const { syncCategory, runDailySync } = require('./newsPipelineService');

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function toNewsArticle(article) {
  return {
    source: article.source,
    author: article.author,
    title: article.title,
    description: article.kidSummary || article.summary || article.description,
    url: article.url,
    urlToImage: article.urlToImage,
    publishedAt: article.publishedAt,
    content: article.funFact || null,
  };
}

async function buildDailyCategory(categoryId, { forceRefresh = false } = {}) {
  const cacheDate = formatCacheDate();

  if (!forceRefresh) {
    const hit = await readCache(categoryId, cacheDate);
    if (hit?.payload?.articles?.length) {
      return {
        articles: hit.payload.articles,
        cachedDate: cacheDate,
        fromCache: true,
        updatedAt: hit.updatedAt,
      };
    }
  }

  console.log(`[educationNews] Building daily cache for ${categoryId}…`);
  const { articleCount } = await syncCategory(categoryId, { forceRefresh, enrich: true });
  const hit = await readCache(categoryId, cacheDate);
  const articles = hit?.payload?.articles || [];

  return {
    articles,
    cachedDate: cacheDate,
    fromCache: false,
    updatedAt: hit?.updatedAt || new Date().toISOString(),
    articleCount,
  };
}

async function buildDailyAll({ forceRefresh = false } = {}) {
  const cacheDate = formatCacheDate();
  const cacheKey = 'all';

  if (!forceRefresh) {
    const hit = await readCache(cacheKey, cacheDate);
    if (hit?.payload?.articles?.length) {
      return {
        articles: hit.payload.articles,
        cachedDate: cacheDate,
        fromCache: true,
        updatedAt: hit.updatedAt,
      };
    }
  }

  const all = [];
  for (const cat of EDUCATION_CATEGORIES) {
    const { articles } = await buildDailyCategory(cat.id, { forceRefresh: false });
    all.push(...articles.slice(0, 6));
  }
  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  await writeCache(cacheKey, cacheDate, { articles: all, builtAt: new Date().toISOString() });
  return {
    articles: all,
    cachedDate: cacheDate,
    fromCache: false,
    updatedAt: new Date().toISOString(),
  };
}

async function getCategoryNews(categoryId, { page = 1, pageSize = 8, forceRefresh = false } = {}) {
  const validIds = [...EDUCATION_CATEGORIES.map((c) => c.id), 'all'];
  const id = validIds.includes(categoryId) ? categoryId : 'science';

  const loaded = id === 'all'
    ? await buildDailyAll({ forceRefresh })
    : await buildDailyCategory(id, { forceRefresh });

  const category = id === 'all'
    ? {
        id: 'all',
        label: 'All Education News',
        icon: '📰',
        color: 'blue',
        description: 'Latest stories across science, tech, sports, history & more',
        topics: [],
        exampleQuestions: [],
      }
    : getCategoryById(id);

  if (!category && id !== 'all') {
    return { success: false, status: 404, message: 'Unknown category' };
  }

  const { articles, cachedDate, fromCache, updatedAt } = loaded;
  const totalResults = articles.length;
  const pageArticles = paginate(articles, page, pageSize);

  return {
    success: true,
    category,
    articles: pageArticles,
    totalResults,
    page,
    pageSize,
    cachedDate,
    fromCache,
    updatedAt: updatedAt || new Date().toISOString(),
  };
}

async function getAggregatedNews({ page = 1, pageSize = 10, forceRefresh = false } = {}) {
  const { articles, cachedDate, fromCache, updatedAt } = await buildDailyAll({ forceRefresh });
  const totalResults = articles.length;
  const pageArticles = paginate(articles, page, pageSize).map(toNewsArticle);

  return {
    success: true,
    totalResults,
    articles: pageArticles,
    page,
    pageSize,
    cachedDate,
    fromCache,
    updatedAt,
  };
}

async function getArticleById(categoryId, articleId) {
  const cacheDate = formatCacheDate();
  let article = await findArticle(categoryId, articleId, cacheDate);
  if (!article && categoryId !== 'all') {
    await buildDailyCategory(categoryId);
    article = await findArticle(categoryId, articleId, cacheDate);
  }
  if (!article) {
    return { success: false, status: 404, message: 'Story not found' };
  }
  return { success: true, article, cachedDate };
}

async function pregenerateForDate({ forceRefresh = false } = {}) {
  const cacheDate = formatCacheDate();

  if (!forceRefresh) {
    const hit = await readCache('all', cacheDate);
    if (hit?.payload?.articles?.length) {
      return { cacheDate, built: 0, skipped: true };
    }
  }

  const result = await runDailySync({ forceRefresh, triggerType: 'cron' });
  if (result.skipped) {
    console.log('[educationNews] pregenerate skipped — sync already running');
    return { cacheDate, built: 0, skipped: true };
  }
  const built = Object.keys(result.stats?.categories || {}).length + 1;
  console.log(`[educationNews] pregenerated via pipeline for ${result.stats?.cacheDate}`);
  return { cacheDate: result.stats?.cacheDate || formatCacheDate(), built };
}

module.exports = {
  getCategoryNews,
  getAggregatedNews,
  getArticleById,
  getTopicsOverview,
  pregenerateForDate,
};
