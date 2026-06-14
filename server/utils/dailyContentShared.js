/**
 * Shared daily content — one AI/scrape batch per calendar day for all classes.
 */

/** Canonical grade label used only for age-appropriate AI prompts (not per-class cache). */
const SHARED_AI_GRADE_LABEL = 'Class 6 / Grade 6';

/** Middle-school complexity — readable across primary and secondary. */
const SHARED_WOTD_COMPLEXITY = 'intermediate';

module.exports = {
  SHARED_AI_GRADE_LABEL,
  SHARED_WOTD_COMPLEXITY,
};
