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
 * Get Education News from NewsAPI
 * GET /api/public/news
 * Optional query params: ?page=1&pageSize=10
 */
router.get('/news', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 20); // Max 20 articles per request
    
    // NewsAPI configuration
    const NEWS_API_KEY = process.env.NEWS_API_KEY || '28ee1c94d3ba4e82b372e9be88d08aed';
    const NEWS_API_URL = 'https://newsapi.org/v2/everything';
    
    // Fetch news from NewsAPI
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: 'education',
        apiKey: NEWS_API_KEY,
        page: page,
        pageSize: pageSize,
        language: 'en',
        sortBy: 'publishedAt',
      },
      timeout: 10000, // 10 second timeout
    });

    if (response.data && response.data.status === 'ok') {
      // Filter and sanitize articles for child-friendly content
      const articles = response.data.articles
        .filter((article) => {
          // Filter out articles with null/missing required fields
          return (
            article.title &&
            article.description &&
            article.url &&
            article.source &&
            article.source.name
          );
        })
        .map((article) => ({
          source: {
            id: article.source.id,
            name: article.source.name,
          },
          author: article.author || 'Unknown Author',
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage || null,
          publishedAt: article.publishedAt,
          content: article.content || null,
        }));

      res.json({
        success: true,
        totalResults: response.data.totalResults,
        articles: articles,
        page: page,
        pageSize: pageSize,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch news from NewsAPI',
        articles: [],
      });
    }
  } catch (error) {
    console.error('Error fetching education news:', error.message);
    
    // Return error response
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to fetch education news',
      articles: [],
    });
  }
});

module.exports = router;

