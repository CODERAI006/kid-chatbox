/**
 * Daily puzzle generation — AI batch + web scrape + category quota fill.
 */

const { pool } = require('../config/database');
const { getDailyCategoryPlan, DAILY_CATEGORY_SLOTS } = require('../data/puzzleCategoryConfig');
const { generatePuzzlesBatch, generateSingleCategory } = require('../utils/puzzleAi');
const { scrapeAndImport } = require('./puzzleScraperService');
const { isLlmConfigured } = require('../utils/ollamaClient');

async function getGlobalFlags() {
  const r = await pool.query(`SELECT ai_generation_enabled, auto_scrape_enabled FROM puzzle_global_config WHERE id = 1`);
  return r.rows[0] || { ai_generation_enabled: true, auto_scrape_enabled: true };
}

async function saveGeneratedPuzzle(p) {
  await pool.query(
    `INSERT INTO puzzles (id, category, puzzle_type, class_from, class_to, difficulty,
      question, options, answer, explanation, time_limit, points, source, generation_prompt, skill_area, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,true)
     ON CONFLICT (id) DO UPDATE SET
       question = EXCLUDED.question,
       options = EXCLUDED.options,
       answer = EXCLUDED.answer,
       explanation = EXCLUDED.explanation,
       generation_prompt = COALESCE(EXCLUDED.generation_prompt, puzzles.generation_prompt),
       skill_area = EXCLUDED.skill_area,
       source = EXCLUDED.source,
       updated_at = CURRENT_TIMESTAMP`,
    [
      p.id, p.category, p.puzzleType, p.classFrom, p.classTo, p.difficulty,
      p.question, JSON.stringify(p.options), JSON.stringify(p.answer),
      p.explanation, p.timeLimit, p.points, p.source || 'ai',
      p.generationPrompt || null, p.skillArea || null,
    ],
  );
}

async function ensureDailyContent(dateStr, gradeLabel, classNum) {
  const flags = await getGlobalFlags();
  const plan = getDailyCategoryPlan(classNum);
  let aiPrompt = null;
  let aiCount = 0;
  let scrapeCount = 0;

  if (flags.ai_generation_enabled && isLlmConfigured()) {
    try {
      const { puzzles, prompt } = await generatePuzzlesBatch(dateStr, gradeLabel, classNum, plan);
      aiPrompt = prompt;
      for (const p of puzzles) {
        await saveGeneratedPuzzle(p);
        aiCount += 1;
      }
    } catch (err) {
      console.warn('Puzzle AI batch failed:', err.message);
    }
  }

  if (aiCount < 10 && flags.ai_generation_enabled && isLlmConfigured()) {
    for (const slot of plan) {
      if (aiCount >= 20) break;
      const need = slot.quota || 1;
      for (let i = 0; i < need && aiCount < 20; i++) {
        try {
          const p = await generateSingleCategory(dateStr, gradeLabel, classNum, slot);
          if (p) {
            await saveGeneratedPuzzle(p);
            aiCount += 1;
          }
        } catch { /* continue */ }
      }
    }
  }

  if (flags.auto_scrape_enabled) {
    try {
      const scrape = await scrapeAndImport({ count: 15, enrich: true });
      scrapeCount = scrape.inserted || 0;
    } catch (err) {
      console.warn('Puzzle scrape failed:', err.message);
    }
  }

  return { aiCount, scrapeCount, aiPrompt, categories: DAILY_CATEGORY_SLOTS.length };
}

module.exports = { ensureDailyContent, saveGeneratedPuzzle, getGlobalFlags };
