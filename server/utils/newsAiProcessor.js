/**
 * AI learning-content processor — summary, quiz, fun facts, age band.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCategoryById } = require('./educationNewsCategories');
const { extractPageText } = require('./educationNewsPageExtract');
const { scrapeWithPlaywright } = require('./newsPlaywrightScraper');
const { formatArticleWithAi } = require('./educationNewsEnrich');

const MIN_TEXT_FOR_PLAYWRIGHT = 180;

function parseJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function estimateReadTime(paragraphs) {
  const words = (paragraphs || []).join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.min(12, Math.ceil(words / 130)));
}

async function extractArticleText(url) {
  let text = await extractPageText(url);
  if (text.length < MIN_TEXT_FOR_PLAYWRIGHT) {
    const pw = await scrapeWithPlaywright(url);
    if (pw.length > text.length) text = pw;
  }
  return text;
}

async function enrichQuizAndMeta(article, categoryId, base) {
  if (!isLlmConfigured()) return base;

  const category = getCategoryById(categoryId);
  const sourceText = (base.formattedParagraphs || []).join('\n') || base.kidSummary || '';

  try {
    const prompt = `You are an Indian school curriculum assistant (ages 8–14).
From the story below, return ONLY valid JSON:
{
  "funFacts": ["fact 1", "fact 2", "fact 3"],
  "quizQuestions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "hint": "short hint"
    }
  ],
  "difficultyLevel": "easy|medium|hard",
  "ageGroup": "8-10|10-12|12-14",
  "learningObjectives": ["objective 1", "objective 2"]
}
Rules: 3 fun facts, 5 quiz questions, kid-safe, no URLs.

Category: ${category?.label || categoryId}
Title: ${article.title}

STORY:
${sourceText.slice(0, 4000)}`;

    const raw = await ollamaChat({
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.4, num_predict: 1200 },
    });

    const parsed = parseJsonBlock(raw);
    if (!parsed) return base;

    const quizQuestions = Array.isArray(parsed.quizQuestions)
      ? parsed.quizQuestions.slice(0, 5).map((q) => ({
        question: String(q.question || ''),
        options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
        correctIndex: Number(q.correctIndex) || 0,
        hint: q.hint ? String(q.hint) : undefined,
      })).filter((q) => q.question && q.options.length >= 2)
      : [];

    const funFacts = Array.isArray(parsed.funFacts)
      ? parsed.funFacts.slice(0, 3).map(String).filter(Boolean)
      : base.funFact ? [base.funFact] : [];

    return {
      ...base,
      funFacts,
      funFact: funFacts[0] || base.funFact,
      quizQuestions,
      difficultyLevel: String(parsed.difficultyLevel || 'medium'),
      ageGroup: String(parsed.ageGroup || '10-12'),
      learningObjectives: Array.isArray(parsed.learningObjectives)
        ? parsed.learningObjectives.slice(0, 5).map(String)
        : base.keyPoints || [],
    };
  } catch (err) {
    console.warn('[newsAiProcessor] quiz/meta failed:', err.message);
    return base;
  }
}

async function processArticle(article, categoryId) {
  const pageText = await extractArticleText(article.url);
  const base = await formatArticleWithAi(article, categoryId, pageText);
  const enriched = await enrichQuizAndMeta(article, categoryId, base);
  if (!enriched.readTimeMinutes) {
    enriched.readTimeMinutes = estimateReadTime(enriched.formattedParagraphs);
  }
  return enriched;
}

async function processArticles(articles, categoryId, { limit = 8 } = {}) {
  const toProcess = articles.slice(0, limit);
  const rest = articles.slice(limit);
  const processed = [];

  for (const article of toProcess) {
    processed.push(await processArticle(article, categoryId));
  }

  const tail = rest.map((a) => ({
    ...a,
    formattedParagraphs: a.description ? [a.description] : [],
    keyPoints: [],
    readTimeMinutes: 2,
  }));

  return [...processed, ...tail];
}

module.exports = { processArticle, processArticles, extractArticleText };
