/**
 * Vocabulary word pools by complexity level for Word of the Day.
 */

const { VOCABULARY_WORDS_1000 } = require('./vocabulary-1000-words');
const { ADVANCED_VOCABULARY_WORDS } = require('./advanced-vocabulary-words');

const BASIC_WORDS = VOCABULARY_WORDS_1000.slice(0, 400);
const INTERMEDIATE_WORDS = VOCABULARY_WORDS_1000.slice(400, 750);

const WORD_POOLS = {
  basic: BASIC_WORDS,
  intermediate: INTERMEDIATE_WORDS,
  advanced: ADVANCED_VOCABULARY_WORDS,
};

const WORDS_PER_DAY = 3;

/** Pick three words for a date + grade using deterministic rotation */
function getWordsForDate(date, grade, complexity) {
  const pool = WORD_POOLS[complexity] || WORD_POOLS.basic;
  const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const gradeSeed = grade.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const start = Math.abs(epochDay + gradeSeed) % pool.length;
  const words = [];
  for (let i = 0; i < WORDS_PER_DAY; i++) {
    words.push(pool[(start + i) % pool.length]);
  }
  return words;
}

/** @deprecated Use getWordsForDate — kept for any legacy callers */
function getWordForDate(date, grade, complexity) {
  return getWordsForDate(date, grade, complexity)[0];
}

module.exports = { WORD_POOLS, WORDS_PER_DAY, getWordsForDate, getWordForDate };
