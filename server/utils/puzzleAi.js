/**
 * AI puzzle generation — 2–3 line informative questions with visible prompts.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');
const { targetDifficultyForClass } = require('./puzzleDifficultyPolicy');
const { difficultyMeta } = require('../data/puzzleMeta');
const { expandPlanSlots } = require('../data/puzzleCategoryConfig');
const crypto = require('crypto');

class PuzzleGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PuzzleGenerationError';
  }
}

function buildCategoryPrompt(dateStr, gradeLabel, classNum, slot, index) {
  const cbse = getCbseVocabularyGuidance(gradeLabel, classNum <= 5 ? 'basic' : classNum <= 8 ? 'intermediate' : 'advanced');
  const difficulty = targetDifficultyForClass(classNum);

  return `You are an expert CBSE puzzle designer for Indian school students.

TARGET: ${cbse.classLevel} (age ~${cbse.age}), ${difficulty} difficulty.
CATEGORY: ${slot.category}
PUZZLE TYPE: ${slot.puzzleType}
SKILL DEVELOPMENT: ${slot.skillArea}
Date seed: ${dateStr}-slot${index} — make this question unique and non-repetitive.

REQUIREMENTS:
1. Write a SMART, informative question in 2–3 full sentences (not one-liners).
2. Include a real-life or curriculum context (India/CBSE where relevant).
3. Provide exactly 4 multiple-choice options (one clearly correct).
4. Write a 2–3 sentence explanation teaching the underlying concept.
5. Age-appropriate, educational, no adult/scary content.
6. Develop the skill: ${slot.skillArea}

Return ONLY raw JSON (no markdown):
{
  "question": "2-3 sentence question here...",
  "options": ["A", "B", "C", "D"],
  "answer": "exact text of correct option",
  "explanation": "2-3 sentence educational explanation...",
  "puzzleType": "${slot.puzzleType}"
}`;
}

function buildBatchPrompt(dateStr, gradeLabel, classNum, plan) {
  const cbse = getCbseVocabularyGuidance(gradeLabel, classNum <= 5 ? 'basic' : classNum <= 8 ? 'intermediate' : 'advanced');
  const slots = expandPlanSlots(plan);

  const slotLines = slots.map((s, i) =>
    `${i + 1}. category="${s.category}" type="${s.puzzleType}" skill="${s.skillArea}"`,
  ).join('\n');

  return `You are an expert CBSE puzzle designer. Create exactly ${slots.length} SMART puzzles for ${cbse.classLevel} students (age ~${cbse.age}).

One puzzle per row — cover ALL categories below:
${slotLines}

RULES for EACH puzzle:
- Question: 2–3 informative sentences with context (India/CBSE/skill-building).
- 4 multiple-choice options, one correct.
- Explanation: 2–3 sentences teaching the concept.
- Match the category and skill area for that row.
- Date: ${dateStr} — unique set.

Return ONLY a JSON array of ${slots.length} objects:
[{"category":"Math","puzzleType":"...","question":"...","options":["..."],"answer":"...","explanation":"...","skillArea":"..."}]`;
}

function parsePuzzleJson(raw, slots, classNum) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return [];

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];

    const difficulty = targetDifficultyForClass(classNum);
    const meta = difficultyMeta(difficulty);

    return parsed.map((item, i) => {
      const slot = slots[i] || slots[i % slots.length];
      const q = String(item.question || '').trim();
      if (q.length < 40) return null;

      const hash = crypto.createHash('sha256').update(q.toLowerCase()).digest('hex').slice(0, 8);
      return {
        id: `PZA${hash.toUpperCase()}`,
        category: item.category || slot.category,
        puzzleType: item.puzzleType || slot.puzzleType,
        classFrom: Math.max(1, classNum - 1),
        classTo: Math.min(12, classNum + 1),
        difficulty,
        question: q.slice(0, 600),
        options: Array.isArray(item.options) ? item.options.slice(0, 4) : null,
        answer: item.answer,
        explanation: String(item.explanation || '').slice(0, 800),
        timeLimit: meta.timeLimit,
        points: meta.points,
        skillArea: item.skillArea || slot.skillArea,
        source: 'ai',
        generationPrompt: slot._prompt || null,
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function generatePuzzlesBatch(dateStr, gradeLabel, classNum, plan) {
  if (!isLlmConfigured()) return { puzzles: [], prompt: null, source: 'ai-unavailable' };

  const slots = expandPlanSlots(plan).map((slot, i) => ({
    ...slot,
    _prompt: buildCategoryPrompt(dateStr, gradeLabel, classNum, slot, i),
  }));

  const batchPrompt = buildBatchPrompt(dateStr, gradeLabel, classNum, plan);

  const { content } = await ollamaChat({
    messages: [
      { role: 'system', content: 'You create educational MCQ puzzles for Indian school children. Return valid JSON arrays only.' },
      { role: 'user', content: batchPrompt },
    ],
    temperature: 0.7,
    num_predict: 14000,
    logContext: `puzzleAi batch grade=${gradeLabel} date=${dateStr}`,
  });

  const puzzles = parsePuzzleJson(content, slots, classNum);
  return { puzzles, prompt: batchPrompt, source: 'ai' };
}

async function generateSingleCategory(dateStr, gradeLabel, classNum, slot) {
  if (!isLlmConfigured()) return null;
  const prompt = buildCategoryPrompt(dateStr, gradeLabel, classNum, slot, 0);
  const { content } = await ollamaChat({
    messages: [
      { role: 'system', content: 'Return valid JSON only for one puzzle object.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    num_predict: 2000,
    logContext: `puzzleAi single cat=${slot.category}`,
  });

  const text = String(content || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1) return null;

  try {
    const item = JSON.parse(text.slice(start, end + 1));
    const parsed = parsePuzzleJson(`[${JSON.stringify(item)}]`, [{ ...slot, _prompt: prompt }], classNum);
    return parsed[0] || null;
  } catch {
    return null;
  }
}

module.exports = {
  PuzzleGenerationError,
  buildCategoryPrompt,
  buildBatchPrompt,
  generatePuzzlesBatch,
  generateSingleCategory,
};
