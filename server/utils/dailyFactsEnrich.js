/**
 * On-demand deeper explanation for a single daily fact (double-click detail view).
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');

function parseDetailJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function fallbackDetail(fact) {
  return {
    explanation: fact.fact,
    reasoning: 'Scientists and teachers check facts using books, experiments, and trusted records before sharing them with students.',
    didYouKnow: `This fact is about ${fact.title.toLowerCase()}.`,
    realLifeLink: 'Look for examples of this idea in your textbook, news for kids, or when you explore the world around you.',
  };
}

/**
 * @param {{ title: string, fact: string, subject: string, emoji?: string }} fact
 * @param {string} gradeLabel
 */
async function generateFactDetail(fact, gradeLabel) {
  const base = fallbackDetail(fact);
  if (!isLlmConfigured()) return base;

  const cbse = getCbseVocabularyGuidance(gradeLabel || 'Class 5 / Grade 5', 'intermediate');
  const subjectLabel = String(fact.subject || 'general').replace(/_/g, ' ');

  const prompt = `You are a friendly CBSE teacher for ${cbse.classLevel} students (age ~${cbse.age}).
The child double-clicked this fact to learn more:

Title: ${fact.title}
Subject area: ${subjectLabel}
Fact: ${fact.fact}

Using ONLY your training knowledge (no web browsing), return ONLY valid JSON:
{
  "explanation": "3-5 simple sentences that explain the fact more clearly for a child",
  "reasoning": "2-4 sentences explaining WHY this is true — the science, history, or logic behind it",
  "didYouKnow": "one surprising related fun fact (1-2 sentences)",
  "realLifeLink": "1-2 sentences connecting this to school, India, or daily life"
}
Keep language simple, accurate, and age-appropriate. No scary content.`;

  try {
    const { content } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content: 'You explain educational facts to Indian school children. Return only JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.55,
      num_predict: 700,
      logContext: `dailyFacts.detail id=${fact.id || fact.title}`,
    });

    const parsed = parseDetailJson(content);
    if (!parsed) return base;

    return {
      explanation: String(parsed.explanation || base.explanation).slice(0, 900),
      reasoning: String(parsed.reasoning || base.reasoning).slice(0, 900),
      didYouKnow: String(parsed.didYouKnow || base.didYouKnow).slice(0, 420),
      realLifeLink: String(parsed.realLifeLink || base.realLifeLink).slice(0, 420),
    };
  } catch (err) {
    console.warn('[dailyFactsEnrich] detail failed:', err.message);
    return base;
  }
}

function normalizeFactDetail(fact) {
  const base = fallbackDetail(fact);
  return {
    ...fact,
    explanation: String(fact.explanation || base.explanation).slice(0, 900),
    reasoning: String(fact.reasoning || base.reasoning).slice(0, 900),
    didYouKnow: String(fact.didYouKnow || base.didYouKnow).slice(0, 420),
    realLifeLink: String(fact.realLifeLink || base.realLifeLink).slice(0, 420),
  };
}

module.exports = { generateFactDetail, fallbackDetail, normalizeFactDetail };
