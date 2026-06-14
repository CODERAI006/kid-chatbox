/**
 * CBSE / NCERT grade hints for age-appropriate vocabulary prompts.
 */

const CBSE_BOOKS = {
  early: 'NCERT English (Marigold) and Hindi (Rimjhim) — Classes 1–3',
  middle: 'NCERT English (Honeysuckle, Honeycomb) and supplementary readers — Classes 4–8',
  secondary: 'NCERT English (Beehive, Moments, First Flight, Footprints) — Classes 9–10',
  senior: 'NCERT English (Flamingo, Vistas, Kaleidoscope) and CBSE board exam vocabulary — Classes 11–12',
};

/** @param {string} gradeLabel */
function extractClassNumber(gradeLabel) {
  const m = String(gradeLabel || '').match(/Class\s*(\d{1,2})|Grade\s*(\d{1,2})/i);
  if (m) return Number(m[1] || m[2]);
  if (/pre-k|nursery/i.test(gradeLabel)) return 0;
  return 5;
}

/**
 * @param {string} gradeLabel
 * @param {'basic'|'intermediate'|'advanced'} complexity
 */
function getCbseVocabularyGuidance(gradeLabel, complexity) {
  const cls = extractClassNumber(gradeLabel);
  const age = cls <= 0 ? 4 : cls + 5;

  if (cls <= 3) {
    return {
      age,
      classLevel: cls <= 0 ? 'Pre-K / Nursery' : `Class ${cls}`,
      bookRef: CBSE_BOOKS.early,
      wordStyle:
        'simple, high-frequency words from NCERT picture books and early reader texts — nouns, verbs, and adjectives children meet in stories and rhymes',
      examples: 'apple, brave, garden, whisper, kindness',
    };
  }
  if (cls <= 5) {
    return {
      age,
      classLevel: `Class ${cls}`,
      bookRef: CBSE_BOOKS.middle,
      wordStyle:
        'vocabulary from NCERT English textbooks and CBSE Class 4–5 readers — words used in stories, poems, and science/social chapters',
      examples: 'courageous, discover, habitat, generous, observe',
    };
  }
  if (cls <= 8) {
    return {
      age,
      classLevel: `Class ${cls}`,
      bookRef: CBSE_BOOKS.middle,
      wordStyle:
        'words commonly found in NCERT English and SST/science chapters for middle school — useful for comprehension and writing',
      examples: 'perseverance, ecosystem, democracy, ambiguous, resilient',
    };
  }
  if (cls <= 10) {
    return {
      age,
      classLevel: `Class ${cls}`,
      bookRef: CBSE_BOOKS.secondary,
      wordStyle:
        'literary and academic words from Beehive, Moments, and CBSE board passages — synonyms/antonyms level suitable for exams',
      examples: 'meticulous, ephemeral, juxtaposition, benevolent, scrutinize',
    };
  }

  return {
    age,
    classLevel: `Class ${cls}`,
    bookRef: CBSE_BOOKS.senior,
    wordStyle:
      complexity === 'expert' || complexity === 'advanced'
        ? 'advanced literary and argumentative vocabulary from Flamingo/Vistas and CBSE Class 11–12 writing tasks'
        : 'board-exam vocabulary from NCERT senior secondary English — precise, formal, and context-rich',
    examples: 'paradigm, eloquent, substantiate, nuanced, rhetoric',
  };
}

module.exports = { getCbseVocabularyGuidance, extractClassNumber, CBSE_BOOKS };
