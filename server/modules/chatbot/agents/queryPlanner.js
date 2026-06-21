/**
 * Maps user intent + schema registry to concrete data retrieval plans.
 */

const { resolvePrimaryTable } = require('../../database-schema/schemaRegistry');
const { validatePlanAccess, isAdminOrAnalyst } = require('../../permissions/chatAccessPolicy');

/**
 * @param {string} intent
 * @param {{ level: string, canQueryUsers: boolean }} accessScope
 */
function planQueries(intent, accessScope) {
  const plans = [];
  const performanceTable = resolvePrimaryTable('performance_scores');
  const progressTable = resolvePrimaryTable('learning_progress');
  const studyTable = resolvePrimaryTable('study_activity');
  const attemptsTable = resolvePrimaryTable('quiz_attempts');

  const wantsSchoolWide = [
    'risk_detection',
    'ranking_comparison',
  ].includes(intent);

  if (performanceTable) {
    plans.push({
      id: 'subject_scores',
      purpose: 'performance_scores',
      table: performanceTable.name,
      scope: wantsSchoolWide && isAdminOrAnalyst(accessScope) ? 'school_wide' : 'self',
      includesUserBreakdown: wantsSchoolWide,
      aggregatedOnly: accessScope.level === 'aggregated',
      metrics: ['subject_average', 'recent_scores', 'trend'],
      limit: intent === 'score_trend' ? 24 : 12,
    });
  }

  if (progressTable && ['weakness_analysis', 'improvement_recommendation', 'general_performance'].includes(intent)) {
    plans.push({
      id: 'learning_progress',
      purpose: 'learning_progress',
      table: progressTable.name,
      scope: 'self',
      includesUserBreakdown: false,
      metrics: ['completion_rate', 'time_spent'],
      limit: 20,
    });
  }

  if (studyTable && ['study_activity', 'improvement_recommendation', 'general_performance'].includes(intent)) {
    plans.push({
      id: 'study_sessions',
      purpose: 'study_activity',
      table: studyTable.name,
      scope: 'self',
      includesUserBreakdown: false,
      metrics: ['recent_sessions', 'subject_breakdown'],
      limit: 10,
    });
  }

  if (attemptsTable && intent === 'ranking_comparison' && isAdminOrAnalyst(accessScope)) {
    plans.push({
      id: 'quiz_attempts_rank',
      purpose: 'quiz_attempts',
      table: attemptsTable.name,
      scope: 'aggregated',
      includesUserBreakdown: true,
      aggregatedOnly: true,
      metrics: ['ranking'],
      limit: 15,
    });
  }

  if (plans.length === 0 && performanceTable) {
    plans.push({
      id: 'fallback_performance',
      purpose: 'performance_scores',
      table: performanceTable.name,
      scope: 'self',
      includesUserBreakdown: false,
      metrics: ['subject_average'],
      limit: 12,
    });
  }

  return plans.filter((plan) => validatePlanAccess(plan, accessScope).allowed);
}

module.exports = { planQueries };
