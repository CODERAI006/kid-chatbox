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

/** Pick one word for a date + grade using deterministic rotation */
function getWordForDate(date, grade, complexity) {
  const pool = WORD_POOLS[complexity] || WORD_POOLS.basic;
  const epochDay = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const gradeSeed = grade.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const index = Math.abs(epochDay + gradeSeed) % pool.length;
  return pool[index];
}

module.exports = { WORD_POOLS, getWordForDate };
