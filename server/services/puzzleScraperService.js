/**
 * Puzzle web scraper — Open Trivia DB + HTML riddle sources → puzzle bank.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { difficultyMeta } = require('../data/puzzleMeta');
const { bumpStoredDifficulty } = require('../utils/puzzleDifficultyPolicy');

const USER_AGENT = 'KidChatbox-PuzzleBot/1.0 (Educational; +https://kidchatbox.local)';

const OPENTDB_CATEGORY_MAP = {
  9: { category: 'History', puzzleType: 'World History', classFrom: 6, classTo: 12 },
  17: { category: 'Science', puzzleType: 'Science Trivia', classFrom: 6, classTo: 12 },
  18: { category: 'Science', puzzleType: 'Computer Science Trivia', classFrom: 8, classTo: 12 },
  19: { category: 'Math', puzzleType: 'Math Trivia', classFrom: 6, classTo: 12 },
  21: { category: 'GK', puzzleType: 'Sports Trivia', classFrom: 4, classTo: 12 },
  22: { category: 'GK', puzzleType: 'Capital Cities', classFrom: 4, classTo: 12 },
  23: { category: 'History', puzzleType: 'Modern History', classFrom: 6, classTo: 12 },
  27: { category: 'Science', puzzleType: 'Animal Puzzle', classFrom: 3, classTo: 8 },
};

function decodeHtml(str) {
  return String(str || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function questionHash(text) {
  return crypto.createHash('sha256').update(String(text).trim().toLowerCase()).digest('hex').slice(0, 16);
}

function nextId(prefix, hash) {
  return `PZ${prefix}${hash.slice(0, 6).toUpperCase()}`;
}

function normalizeDifficulty(apiDiff) {
  if (apiDiff === 'hard') return 'Hard';
  return 'Medium';
}

async function fetchOpenTdbBatch(amount = 10) {
  const third = Math.ceil(amount / 3);
  const [hardRes, medRes, histRes] = await Promise.all([
    axios.get(`https://opentdb.com/api.php?amount=${third}&type=multiple&difficulty=hard`, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } }),
    axios.get(`https://opentdb.com/api.php?amount=${third}&type=multiple&difficulty=medium&category=22`, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } }),
    axios.get(`https://opentdb.com/api.php?amount=${amount - 2 * third}&type=multiple&difficulty=medium&category=23`, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } }),
  ]);
  const results = [
    ...(hardRes.data?.results || []),
    ...(medRes.data?.results || []),
    ...(histRes.data?.results || []),
  ];
  if (!results.length) return [];
  return results.map((item) => {
    const meta = OPENTDB_CATEGORY_MAP[item.category] || {
      category: 'GK',
      puzzleType: 'General Knowledge',
      classFrom: 4,
      classTo: 12,
    };
    const difficulty = bumpStoredDifficulty(
      normalizeDifficulty(item.difficulty),
      meta.classFrom,
      meta.classTo,
    );
    const { timeLimit, points } = difficultyMeta(difficulty);
    const options = [item.correct_answer, ...item.incorrect_answers]
      .map(decodeHtml)
      .sort(() => Math.random() - 0.5);

    return {
      category: meta.category,
      puzzleType: meta.puzzleType,
      classFrom: meta.classFrom,
      classTo: meta.classTo,
      difficulty,
      question: decodeHtml(item.question),
      options,
      answer: decodeHtml(item.correct_answer),
      explanation: `Source: Open Trivia DB (${item.category}). The correct answer is "${decodeHtml(item.correct_answer)}".`,
      timeLimit,
      points,
      source: 'scraped',
    };
  });
}

/** Scrape riddles from braingle.com RSS (public educational riddles). */
async function fetchBraingleRiddles(limit = 5) {
  try {
    const { data: xml } = await axios.get('https://www.braingle.com/rss/brainteasers.xml', {
      timeout: 15000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const items = [];
    const regex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = regex.exec(xml)) && items.length < limit) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1]
        || (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || [])[1]
        || (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      const cleanDesc = decodeHtml(desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      const answerMatch = cleanDesc.match(/Answer:\s*(.+?)(?:\s*Difficulty:|$)/i);
      const answer = answerMatch ? answerMatch[1].trim() : 'See explanation';
      const question = decodeHtml(title.trim()) || cleanDesc.slice(0, 200);
      if (!question || question.length < 10) continue;

      items.push({
        category: 'Brain Teaser',
        puzzleType: 'Lateral Thinking Puzzle',
        classFrom: 6,
        classTo: 12,
        difficulty: 'Hard',
        question,
        options: null,
        answer,
        explanation: cleanDesc.slice(0, 500) || `Answer: ${answer}`,
        timeLimit: 150,
        points: 18,
        source: 'scraped',
      });
    }
    return items;
  } catch (err) {
    console.warn('Braingle scrape failed:', err.message);
    return [];
  }
}

/** Scrape fun trivia snippets from kids encyclopedia-style pages. */
async function fetchKidsTrivia(limit = 5) {
  try {
    const { data: html } = await axios.get('https://www.sciencekids.co.nz/quizquestions.html', {
      timeout: 15000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const $ = cheerio.load(html);
    const items = [];
    $('li').each((_i, el) => {
      if (items.length >= limit) return false;
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 20 || !text.includes('?')) return;
      items.push({
        category: 'Science',
        puzzleType: 'Science Quiz',
        classFrom: 4,
        classTo: 10,
        difficulty: 'Medium',
        question: text,
        options: null,
        answer: 'Research and think!',
        explanation: 'Explore science topics to find the answer — great for curious minds!',
        timeLimit: 75,
        points: 12,
        source: 'scraped',
      });
    });
    return items;
  } catch (err) {
    console.warn('ScienceKids scrape failed:', err.message);
    return [];
  }
}

const SKILL_AREA_MAP = {
  Math: 'Quantitative reasoning & problem-solving',
  Logic: 'Logical deduction & analytical thinking',
  Language: 'Reading comprehension & vocabulary',
  Science: 'Scientific inquiry & application',
  GK: 'General awareness of India & the world',
  History: 'Historical literacy & cause-effect reasoning',
  'Civic Sense': 'Responsible citizenship & democratic values',
  'Financial Education': 'Money management & financial literacy',
  'Brain Teaser': 'Creative & lateral thinking',
  'Critical Thinking': 'Decision-making & evaluation skills',
};

function enrichScrapedPuzzle(p) {
  const skill = SKILL_AREA_MAP[p.category] || 'Knowledge & reasoning';
  let question = String(p.question || '').trim();
  if (question.length < 90 && p.options?.length) {
    question = `${question}\n\nApply your ${p.category} knowledge — read each option carefully. This builds ${skill.toLowerCase()}.`;
  }
  return {
    ...p,
    question: question.slice(0, 600),
    skillArea: p.skillArea || skill,
    generationPrompt: `Web scrape (${p.source || 'scraped'}): Fetch age-appropriate ${p.category} MCQ from Open Trivia DB / educational RSS. Enriched for 2–3 line context.`,
  };
}

async function upsertScrapedPuzzle(puzzle) {
  const p = enrichScrapedPuzzle(puzzle);
  const hash = questionHash(p.question);
  const id = nextId('W', hash);
  const existing = await pool.query(
    `SELECT id FROM puzzles WHERE id = $1 OR question = $2 LIMIT 1`,
    [id, p.question],
  );
  if (existing.rows.length) return { skipped: true, id: existing.rows[0].id };

  await pool.query(
    `INSERT INTO puzzles (id, category, puzzle_type, class_from, class_to, difficulty,
      question, options, answer, explanation, time_limit, points, source, generation_prompt, skill_area, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,true)
     ON CONFLICT (id) DO NOTHING`,
    [
      id, p.category, p.puzzleType, p.classFrom, p.classTo, p.difficulty,
      p.question, JSON.stringify(p.options), JSON.stringify(p.answer),
      p.explanation, p.timeLimit, p.points, p.source || 'scraped',
      p.generationPrompt, p.skillArea,
    ],
  );
  return { inserted: true, id };
}

async function scrapeAndImport(options = {}) {
  const amount = Math.min(50, Math.max(5, Number(options.count) || 20));
  const batches = await Promise.all([
    fetchOpenTdbBatch(Math.ceil(amount * 0.6)),
    fetchBraingleRiddles(Math.ceil(amount * 0.2)),
    fetchKidsTrivia(Math.ceil(amount * 0.2)),
  ]);

  const merged = batches.flat();
  let inserted = 0;
  let skipped = 0;
  for (const p of merged) {
    const result = await upsertScrapedPuzzle(p);
    if (result.inserted) inserted += 1;
    else skipped += 1;
  }

  return {
    success: true,
    fetched: merged.length,
    inserted,
    skipped,
    sources: ['opentdb.com', 'braingle.com/rss', 'sciencekids.co.nz'],
  };
}

module.exports = {
  scrapeAndImport,
  fetchOpenTdbBatch,
  fetchBraingleRiddles,
  fetchKidsTrivia,
};
