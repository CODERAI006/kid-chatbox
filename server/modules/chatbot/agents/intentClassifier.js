/**
 * Detect whether a user question needs database-backed analysis vs generic tutoring.
 */

const ANALYTICS_PATTERNS = [
  {
    intent: 'weakness_analysis',
    patterns: [
      /\b(weakness|weaknesses|weak|weak areas|struggling|worst subject|lowest score)\b/i,
      /\bwhat (?:are|is) my (?:weak|weakness|problem)\b/i,
      /\bwhere (?:am i|do i) (?:weak|struggle|need help)\b/i,
    ],
  },
  {
    intent: 'improvement_recommendation',
    patterns: [
      /\bhow (?:can|do|should) i improve\b/i,
      /\bhow to (?:get better|improve|boost)\b/i,
      /\bstudy plan|action plan|recommendations?\b/i,
      /\bwhat should i (?:focus|work on|practice)\b/i,
    ],
  },
  {
    intent: 'score_trend',
    patterns: [
      /\b(?:scores?|performance|grades?) (?:dropping|declining|falling|trend)\b/i,
      /\bwhy (?:are|is) my (?:scores?|grades?)\b/i,
      /\bcompare (?:my )?(?:performance|scores?|progress)\b/i,
      /\blast (\d+ )?(?:months?|weeks?|days?)\b/i,
      /\bprogress (?:over|trend|history)\b/i,
    ],
  },
  {
    intent: 'subject_analysis',
    patterns: [
      /\b(?:subject|topic|subtopic) (?:needs?|need) improvement\b/i,
      /\b(?:math|mathematics|science|english|hindi|social)\b.*\b(?:score|performance|average)\b/i,
      /\b(?:best|strongest|top) subject\b/i,
    ],
  },
  {
    intent: 'study_activity',
    patterns: [
      /\b(?:study|learning) (?:history|sessions?|time|activity)\b/i,
      /\bhow (?:much|often) (?:have i|did i) stud(?:y|ied)\b/i,
      /\bquiz (?:history|results?|attempts?|count)\b/i,
    ],
  },
  {
    intent: 'risk_detection',
    patterns: [
      /\b(?:at risk|failing|fail|intervention|lowest.?performing|struggling students?)\b/i,
      /\bwhich students?\b/i,
      /\bclass (?:performance|average|comparison)\b/i,
      /\bschool.?wide|attendance vs|correlation\b/i,
    ],
  },
  {
    intent: 'ranking_comparison',
    patterns: [
      /\brank(?:ing)?|leaderboard|top (?:students?|performers?)\b/i,
      /\bcompare (?:class|students?)\b/i,
    ],
  },
];

/**
 * @param {string} question
 * @returns {{ isAnalytics: boolean, intent: string | null, confidence: number }}
 */
function classifyIntent(question) {
  const text = String(question || '').trim();
  if (!text) {
    return { isAnalytics: false, intent: null, confidence: 0 };
  }

  for (const entry of ANALYTICS_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        return { isAnalytics: true, intent: entry.intent, confidence: 0.85 };
      }
    }
  }

  const softSignals =
    /\b(my|me|i)\b.*\b(score|quiz|result|performance|progress|average|percent)\b/i.test(text) ||
    /\b(show|analyze|analysis|report|summary|insights?)\b.*\b(data|stats|performance)\b/i.test(text);

  if (softSignals) {
    return { isAnalytics: true, intent: 'general_performance', confidence: 0.55 };
  }

  return { isAnalytics: false, intent: null, confidence: 0 };
}

function shouldUseDataAgent(question, mode) {
  if (mode === 'analytics') return true;
  return classifyIntent(question).isAnalytics;
}

module.exports = { classifyIntent, shouldUseDataAgent, ANALYTICS_PATTERNS };
