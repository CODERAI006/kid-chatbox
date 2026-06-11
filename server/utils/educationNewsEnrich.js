/**
 * AI: read page text, remove junk, format kid-friendly story (runs once when building daily cache).
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCategoryById } = require('./educationNewsCategories');
const { extractPageText } = require('./educationNewsPageExtract');

function parseJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function fallbackFromArticle(article, categoryId) {
  const category = getCategoryById(categoryId);
  const summary = article.description || article.summary || '';
  const paras = summary ? [summary] : [];
  return {
    kidSummary: summary.slice(0, 400),
    formattedParagraphs: paras,
    keyPoints: (category?.topics || []).slice(0, 3),
    funFact: category?.exampleQuestions?.[0] || 'Keep exploring!',
    relatedTopics: (category?.topics || []).slice(0, 3),
    summary: summary.slice(0, 400),
  };
}

async function formatArticleWithAi(article, categoryId, pageText) {
  const category = getCategoryById(categoryId);
  const fallback = fallbackFromArticle(article, categoryId);
  const sourceText = pageText || article.description || '';

  if (!isLlmConfigured() || !sourceText.trim()) {
    return { ...article, ...fallback, readTimeMinutes: estimateReadTime(fallback.formattedParagraphs) };
  }

  try {
    const prompt = `You are an editor for Indian school children (ages 8–14, CBSE/ICSE).
Read the raw page text below. Remove ads, navigation, unrelated junk, and adult content.
Return ONLY valid JSON:
{
  "kidSummary": "2 sentences intro a child understands",
  "formattedParagraphs": ["clean paragraph 1", "paragraph 2", "up to 6 short paragraphs"],
  "keyPoints": ["3-5 bullet learning points"],
  "funFact": "one surprising kid-friendly fact",
  "relatedTopics": ["topic1", "topic2", "topic3"]
}
Rules: simple words, no scary violence, age-appropriate, factual, no URLs in text.

Category: ${category?.label || categoryId}
Title: ${article.title}
Source: ${article.source?.name || 'Web'}

RAW TEXT:
${sourceText.slice(0, 5500)}`;

    const raw = await ollamaChat({
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.35, num_predict: 900 },
    });

    const parsed = parseJsonBlock(raw);
    if (!parsed?.formattedParagraphs?.length && !parsed?.kidSummary) {
      return { ...article, ...fallback, readTimeMinutes: estimateReadTime(fallback.formattedParagraphs) };
    }

    const paragraphs = Array.isArray(parsed.formattedParagraphs)
      ? parsed.formattedParagraphs.map(String).filter(Boolean).slice(0, 8)
      : fallback.formattedParagraphs;

    const data = {
      kidSummary: String(parsed.kidSummary || fallback.kidSummary).slice(0, 500),
      formattedParagraphs: paragraphs,
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.slice(0, 5).map(String)
        : fallback.keyPoints,
      funFact: String(parsed.funFact || fallback.funFact).slice(0, 220),
      relatedTopics: Array.isArray(parsed.relatedTopics)
        ? parsed.relatedTopics.slice(0, 4).map(String)
        : fallback.relatedTopics,
      summary: String(parsed.kidSummary || fallback.kidSummary).slice(0, 500),
      readTimeMinutes: estimateReadTime(paragraphs),
    };

    return { ...article, ...data };
  } catch (err) {
    console.warn('[educationNewsEnrich]', article.title?.slice(0, 40), err.message);
    return { ...article, ...fallback, readTimeMinutes: estimateReadTime(fallback.formattedParagraphs) };
  }
}

function estimateReadTime(paragraphs) {
  const words = (paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.min(12, Math.ceil(words / 130)));
}

async function enrichArticle(article, categoryId) {
  const pageText = await extractPageText(article.url);
  return formatArticleWithAi(article, categoryId, pageText);
}

/** Process articles sequentially to avoid overloading Ollama during daily build. */
async function enrichArticles(articles, categoryId, { limit = 8 } = {}) {
  const toEnrich = articles.slice(0, limit);
  const rest = articles.slice(limit);
  const enriched = [];

  for (const article of toEnrich) {
    enriched.push(await enrichArticle(article, categoryId));
  }

  return [...enriched, ...rest.map((a) => ({
    ...a,
    formattedParagraphs: a.description ? [a.description] : [],
    keyPoints: [],
  }))];
}

module.exports = { enrichArticle, enrichArticles, formatArticleWithAi };
