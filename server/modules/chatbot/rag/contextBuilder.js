/**
 * Builds compact RAG context from analyzed data — never sends full DB dumps.
 */

function formatSubjectAverages(list) {
  if (!list?.length) return 'No subject score data available.';
  return list
    .map((s) => `${s.subject}: ${s.avg_score}% avg (${s.quiz_count} quizzes)`)
    .join('\n');
}

function formatRecentScores(list) {
  if (!list?.length) return 'No recent scores recorded.';
  return list
    .slice(0, 12)
    .map((s) => {
      const date = s.recordedAt ? new Date(s.recordedAt).toISOString().slice(0, 10) : 'n/a';
      return `${date} — ${s.subject || 'General'}: ${s.score}%`;
    })
    .join('\n');
}

function formatProgress(progress) {
  if (!progress) return 'No learning progress tracked yet.';
  return [
    `Average progress: ${progress.avgProgress}%`,
    `Completed subtopics: ${progress.completedCount}`,
    `Subtopics tracked: ${progress.trackedSubtopics}`,
    `Total study time (tracked): ${progress.totalTimeSpent} min`,
  ].join('\n');
}

function formatStudyActivity(sessions) {
  if (!sessions?.length) return 'No recent study sessions.';
  return sessions
    .map((s) => {
      const date = s.recorded_at
        ? new Date(s.recorded_at).toISOString().slice(0, 10)
        : 'n/a';
      return `${date} — ${s.subject || 'Study'}: ${s.title || 'Session'}`;
    })
    .join('\n');
}

function formatAtRisk(students) {
  if (!students?.length) return '';
  return students
    .slice(0, 10)
    .map(
      (s) =>
        `${s.user_name || s.user_id}: ${s.avg_score}%${s.subject ? ` (${s.subject})` : ''}`
    )
    .join('\n');
}

/**
 * @param {{ name?: string, grade?: string }} user
 * @param {string} question
 * @param {object} analysis
 */
function buildAnalysisContext(user, question, analysis) {
  const sections = [
    `Student Name: ${user.name || 'User'}`,
    user.grade ? `Grade: ${user.grade}` : null,
    '',
    '=== Performance Summary ===',
    formatSubjectAverages(analysis.subjectAverages),
    '',
    '=== Recent Scores (newest first) ===',
    formatRecentScores(analysis.recentScores),
    '',
    '=== Score Trend ===',
    `Direction: ${analysis.trends.direction} (${analysis.trends.delta >= 0 ? '+' : ''}${analysis.trends.delta}% change)`,
    '',
    '=== Identified Strengths ===',
    analysis.strengths.length
      ? analysis.strengths.map((s) => `${s.subject}: ${s.avgScore}%`).join('\n')
      : 'Not enough data',
    '',
    '=== Identified Weaknesses ===',
    analysis.weaknesses.length
      ? analysis.weaknesses.map((s) => `${s.subject}: ${s.avgScore}%`).join('\n')
      : 'Not enough data',
    '',
    '=== Learning Progress ===',
    formatProgress(analysis.progress),
    '',
    '=== Recent Study Activity ===',
    formatStudyActivity(analysis.studyActivity),
  ];

  if (analysis.atRiskStudents.length) {
    sections.push('', '=== Students Needing Attention ===', formatAtRisk(analysis.atRiskStudents));
  }

  sections.push('', '=== User Question ===', question);

  return sections.filter((s) => s !== null).join('\n');
}

function hasUsableData(analysis) {
  return (
    analysis.subjectAverages.length > 0 ||
    analysis.recentScores.length > 0 ||
    analysis.progress !== null ||
    analysis.studyActivity.length > 0 ||
    analysis.atRiskStudents.length > 0
  );
}

module.exports = { buildAnalysisContext, hasUsableData };
