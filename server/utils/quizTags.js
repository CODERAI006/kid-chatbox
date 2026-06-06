/**
 * Shared quiz tag extraction for library + scheduler batches.
 */

const extractTags = (config) => {
  const tags = [];

  if (config.subject) {
    tags.push(`subject:${String(config.subject).toLowerCase()}`);
  }
  if (config.difficulty) {
    tags.push(`difficulty:${String(config.difficulty).toLowerCase()}`);
  }
  if (config.subtopics && Array.isArray(config.subtopics)) {
    config.subtopics.forEach((subtopic) => {
      tags.push(`topic:${String(subtopic).toLowerCase()}`);
    });
  }
  if (config.gradeLevel) {
    tags.push(`grade:${String(config.gradeLevel).toLowerCase()}`);
  }
  if (config.examStyle) {
    tags.push(`exam:${String(config.examStyle).toLowerCase()}`);
  }
  if (config.age != null) {
    tags.push(`age:${config.age}`);
  }
  if (config.language) {
    tags.push(`language:${String(config.language).toLowerCase()}`);
  }

  if (config.instructions) {
    const instructions = String(config.instructions).toLowerCase();
    const grammarElements = [
      'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
      'conjunction', 'tense', 'punctuation', 'grammar',
    ];
    grammarElements.forEach((element) => {
      if (instructions.includes(element)) tags.push(`grammar:${element}`);
    });
    if (instructions.includes('scenario') || instructions.includes('real-world')) {
      tags.push('scenario:real-world');
    }
    if (instructions.includes('story') || instructions.includes('narrative')) {
      tags.push('scenario:story-based');
    }
    if (instructions.includes('problem-solving')) {
      tags.push('scenario:problem-solving');
    }
  }

  return tags;
};

/**
 * @param {Object} opts
 */
function buildSchedulerTags(opts) {
  const base = extractTags({
    subject: opts.subject,
    difficulty: opts.schedulerDifficulty || opts.difficulty,
    subtopics: opts.subtopics || [],
    gradeLevel: opts.gradeLevel,
    age: opts.ageGroup,
    language: opts.language || 'English',
  });

  const extra = ['source:scheduler'];
  if (opts.batchTag) extra.push(`batch:${opts.batchTag}`);
  if (opts.setIndex != null && opts.setsTotal != null) {
    extra.push(`set:${opts.setIndex}-of-${opts.setsTotal}`);
  }
  if (opts.variantIndex != null) extra.push(`variant:${opts.variantIndex}`);
  if (opts.jobId) extra.push(`job:${opts.jobId}`);

  return [...new Set([...base, ...extra])];
}

module.exports = { extractTags, buildSchedulerTags };
