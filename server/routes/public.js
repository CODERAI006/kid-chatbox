/**
 * Public routes - No authentication required
 */

const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');
const { trackEvent, EVENT_TYPES } = require('../utils/eventTracker');
const { VOCABULARY_WORDS_1000 } = require('../data/vocabulary-1000-words');
const { SYNONYMS_ANTONYMS_FALLBACK } = require('../data/synonyms-antonyms-fallback');
const {
  getCategoryNews,
  getAggregatedNews,
  getArticleById,
  getTopicsOverview,
} = require('../services/educationNewsService');

const router = express.Router();

// Word list for Word of the Day feature (1000 words)
const VOCABULARY_WORDS = VOCABULARY_WORDS_1000;

/**
 * Get a word based on the current day
 */
const getWordOfTheDay = () => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24
  );
  const wordIndex = dayOfYear % VOCABULARY_WORDS.length;
  return VOCABULARY_WORDS[wordIndex];
};

/** Local calendar date YYYY-MM-DD for Word-of-the-Day cache rows */
function wordOfTheDayCacheDate() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function readWordOfTheDayCache(wordKey, cacheDate) {
  const r = await pool.query(
    `SELECT payload FROM word_of_the_day_cache
     WHERE word_key = $1 AND cache_date = $2::date`,
    [wordKey, cacheDate]
  );
  return r.rows.length > 0 ? r.rows[0].payload : null;
}

async function writeWordOfTheDayCache(wordKey, cacheDate, payload) {
  await pool.query(
    `INSERT INTO word_of_the_day_cache (word_key, cache_date, payload)
     VALUES ($1, $2::date, $3::jsonb)
     ON CONFLICT (word_key, cache_date) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
    [wordKey, cacheDate, JSON.stringify(payload)]
  );
}

/**
 * Generate additional example sentences using local Ollama
 */
async function generateExampleSentences(word, partOfSpeech, definition) {
  try {
    if (!isLlmConfigured()) {
      return [];
    }

    const prompt = `Generate 3 simple, educational example sentences using the word "${word}" (${partOfSpeech}).
Definition: ${definition}

Requirements:
- Sentences should be appropriate for children aged 6-14
- Keep sentences simple and clear
- Show different contexts of usage
- Make them educational and engaging

Return ONLY a JSON array of sentences, nothing else. Format: ["sentence 1", "sentence 2", "sentence 3"]`;

    const { content: raw } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content:
            'You are an educational assistant helping children learn vocabulary. Generate simple, clear example sentences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      num_predict: 512,
      logContext: `public.wordOfDayExamples word=${word}`,
    });

    const content = raw.trim();
    const sentences = JSON.parse(content);
    return Array.isArray(sentences) ? sentences.slice(0, 3) : [];
  } catch (error) {
    console.error('Error generating example sentences:', error.message);
    return [];
  }
}

/**
 * Track home page view
 * POST /api/public/home-view
 */
router.post('/home-view', async (req, res, next) => {
  try {
    // Get IP address (handles proxies)
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    // Track the home screen view event
    await trackEvent({
      userId: null, // Public view, no user ID
      eventType: EVENT_TYPES.HOME_SCREEN_VIEWED,
      resourceType: 'home_page',
      resourceId: null, // No specific resource ID for home page view
      metadata: {
        timestamp: new Date().toISOString(),
        referrer: req.headers.referer || null,
        page: 'home',
      },
      ipAddress,
      userAgent,
    });

    res.json({
      success: true,
      message: 'Home page view tracked',
    });
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error('Failed to track home view:', error);
    res.json({
      success: true,
      message: 'Home page view tracked',
    });
  }
});

/**
 * Get total home page views count
 * GET /api/public/home-views
 */
router.get('/home-views', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total_views
       FROM activity_logs
       WHERE event_type = $1`,
      [EVENT_TYPES.HOME_SCREEN_VIEWED]
    );

    const totalViews = parseInt(result.rows[0].total_views, 10) || 0;

    res.json({
      success: true,
      totalViews,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get Word of the Day with definition, examples, and phonetics
 * GET /api/public/word-of-the-day
 * Optional query param: ?word=hello (for testing)
 */
router.get('/word-of-the-day', async (req, res, next) => {
  try {
    const word = req.query.word || getWordOfTheDay();
    const wordKey = String(word).toLowerCase().trim();
    const cacheDate = wordOfTheDayCacheDate();

    try {
      const cached = await readWordOfTheDayCache(wordKey, cacheDate);
      if (cached) {
        return res.json(cached);
      }
    } catch (cacheErr) {
      console.warn('[word-of-the-day] cache read skipped:', cacheErr.message);
    }

    // Fetch word data from Free Dictionary API
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { timeout: 5000 }
    );

    if (response.data && response.data.length > 0) {
      const wordData = response.data[0];
      
      // Extract phonetics with audio
      const phonetic = wordData.phonetic || 
        (wordData.phonetics && wordData.phonetics.length > 0 ? 
          wordData.phonetics[0].text : '');
      
      const audioUrl = wordData.phonetics?.find((p) => p.audio)?.audio || null;

      // Extract ALL examples from ALL meanings and definitions
      const allExamples = [];
      wordData.meanings.forEach((meaning) => {
        meaning.definitions.forEach((def) => {
          if (def.example) {
            allExamples.push(def.example);
          }
        });
      });

      // Process meanings with ALL definitions
      const meaningsPromises = wordData.meanings.slice(0, 3).map(async (meaning) => {
        // Get first definition for AI sentence generation
        const firstDef = meaning.definitions[0];
        
        // Generate additional example sentences using AI
        const aiExamples = await generateExampleSentences(
          wordData.word,
          meaning.partOfSpeech,
          firstDef.definition
        );

        // Get synonyms and antonyms from API or fallback
        let synonyms = meaning.synonyms ? meaning.synonyms.slice(0, 5) : [];
        let antonyms = meaning.antonyms ? meaning.antonyms.slice(0, 5) : [];
        
        // Use fallback if no synonyms/antonyms from API
        if (synonyms.length === 0 && antonyms.length === 0) {
          const fallback = SYNONYMS_ANTONYMS_FALLBACK[wordData.word.toLowerCase()];
          if (fallback) {
            synonyms = fallback.synonyms || [];
            antonyms = fallback.antonyms || [];
          }
        }

        return {
          partOfSpeech: meaning.partOfSpeech,
          definitions: meaning.definitions.slice(0, 2).map((def) => ({
            definition: def.definition,
            example: def.example || null,
          })),
          synonyms,
          antonyms,
          // Combine API examples and AI-generated examples
          additionalExamples: [...allExamples, ...aiExamples].slice(0, 6),
        };
      });

      const meanings = await Promise.all(meaningsPromises);

      const body = {
        success: true,
        word: wordData.word,
        phonetic,
        audioUrl,
        meanings,
        sourceUrl: wordData.sourceUrls ? wordData.sourceUrls[0] : null,
      };

      try {
        await writeWordOfTheDayCache(wordKey, cacheDate, body);
      } catch (writeErr) {
        console.error('[word-of-the-day] cache write failed:', writeErr.message);
      }

      res.json(body);
    } else {
      res.status(404).json({
        success: false,
        message: 'Word not found',
      });
    }
  } catch (error) {
    console.error('Error fetching word of the day:', error.message);
    
    // Return a fallback response if API fails
    res.json({
      success: true,
      word: getWordOfTheDay(),
      phonetic: '',
      audioUrl: null,
      meanings: [{
        partOfSpeech: 'adjective',
        definitions: [{
          definition: 'Check back tomorrow for a new word!',
          example: null,
        }],
        synonyms: [],
        antonyms: [],
        additionalExamples: [],
      }],
      sourceUrl: null,
    });
  }
});

/**
 * Education topic categories for kid-friendly news
 * GET /api/public/education-news/topics
 */
router.get('/education-news/topics', async (req, res) => {
  try {
    res.json(getTopicsOverview());
  } catch (error) {
    console.error('education-news topics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load topics' });
  }
});

/**
 * Category-based education news (daily cache + AI-formatted page content)
 * GET /api/public/education-news?category=science&page=1&pageSize=8&forceRefresh=false
 */
router.get('/education-news', async (req, res) => {
  try {
    const category = String(req.query.category || 'science').trim();
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 8;
    const forceRefresh = req.query.forceRefresh === 'true';

    const result = await getCategoryNews(category, { page, pageSize, forceRefresh });
    if (!result.success) {
      return res.status(result.status || 500).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('education-news fetch:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch education news' });
  }
});

/**
 * Single formatted story from today's cache
 * GET /api/public/education-news/:articleId?category=science
 */
router.get('/education-news/:articleId', async (req, res) => {
  try {
    const category = String(req.query.category || 'science').trim();
    const result = await getArticleById(category, req.params.articleId);
    if (!result.success) {
      return res.status(result.status || 404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('education-news article:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load story' });
  }
});

/**
 * Aggregated education news (RSS/web scraping — no NewsAPI)
 * GET /api/public/news?page=1&pageSize=10
 */
router.get('/news', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 10, 20);
    const forceRefresh = req.query.forceRefresh === 'true';
    const result = await getAggregatedNews({ page, pageSize, forceRefresh });
    res.json(result);
  } catch (error) {
    console.error('Error fetching education news:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch education news',
      articles: [],
      totalResults: 0,
      page: 1,
      pageSize: 10,
    });
  }
});

/**
 * GET /api/public/plans
 * Active pricing plans for landing page (no auth)
 */
/**
 * GET /api/public/analytics-config
 * Google Analytics measurement ID (from DB cache; no auth)
 */
router.get('/analytics-config', async (req, res, next) => {
  try {
    const {
      getCachedGoogleAnalyticsSettings,
      loadGoogleAnalyticsSettings,
    } = require('../utils/googleAnalyticsSettings');

    let settings = getCachedGoogleAnalyticsSettings();
    if (!settings.googleAnalyticsId) {
      settings = await loadGoogleAnalyticsSettings();
    }

    res.json({
      success: true,
      googleAnalyticsId: settings.enabled ? settings.googleAnalyticsId : '',
      enabled: settings.enabled,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/plans', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        description,
        daily_quiz_limit,
        daily_topic_limit,
        monthly_cost,
        hide_ai_study,
        hide_ai_quiz
      FROM plans
      WHERE status = 'active'
      ORDER BY monthly_cost ASC, name ASC`
    );

    res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

