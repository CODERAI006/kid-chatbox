/**
 * Computes structured insights from retrieved database rows.
 */

function round(n) {
  return Math.round(Number(n) * 10) / 10;
}

function analyzeRetrievedData(queryResults, intent) {
  const summary = {
    intent,
    subjectAverages: [],
    recentScores: [],
    strengths: [],
    weaknesses: [],
    trends: { direction: 'stable', delta: 0 },
    progress: null,
    studyActivity: [],
    atRiskStudents: [],
    dataSources: [],
  };

  for (const result of queryResults) {
    if (result.error) continue;
    summary.dataSources.push(result.planId);

    if (result.purpose === 'performance_scores') {
      ingestPerformance(result, summary);
    }
    if (result.purpose === 'learning_progress') {
      summary.progress = ingestProgress(result);
    }
    if (result.purpose === 'study_activity') {
      summary.studyActivity = result.rows.slice(0, 8);
    }
    if (result.purpose === 'quiz_attempts' && result.rows.length) {
      summary.atRiskStudents = result.rows
        .filter((r) => Number(r.avg_score) < 60)
        .slice(0, 10);
    }
  }

  if (summary.subjectAverages.length >= 2) {
    const sorted = [...summary.subjectAverages].sort(
      (a, b) => Number(a.avg_score) - Number(b.avg_score)
    );
    summary.weaknesses = sorted.slice(0, 2).map((s) => ({
      subject: s.subject,
      avgScore: round(s.avg_score),
    }));
    summary.strengths = sorted
      .slice(-2)
      .reverse()
      .map((s) => ({ subject: s.subject, avgScore: round(s.avg_score) }));
  }

  if (summary.recentScores.length >= 4) {
    const half = Math.floor(summary.recentScores.length / 2);
    const older = summary.recentScores.slice(0, half);
    const newer = summary.recentScores.slice(half);
    const avg = (arr) =>
      arr.reduce((s, r) => s + Number(r.score || 0), 0) / (arr.length || 1);
    const delta = avg(newer) - avg(older);
    summary.trends = {
      direction: delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'stable',
      delta: round(delta),
    };
  }

  return summary;
}

function ingestPerformance(result, summary) {
  if (result.aggregates?.subjectAverages?.length) {
    summary.subjectAverages = result.aggregates.subjectAverages.map((r) => ({
      subject: r.subject,
      avg_score: round(r.avg_score),
      quiz_count: Number(r.quiz_count || 0),
    }));
  }

  for (const row of result.rows) {
    if (row.avg_score !== undefined && row.user_id) {
      summary.atRiskStudents.push({
        user_id: row.user_id,
        user_name: row.user_name,
        subject: row.subject,
        avg_score: round(row.avg_score),
      });
      continue;
    }
    if (row.score !== undefined) {
      summary.recentScores.push({
        subject: row.subject,
        score: round(row.score),
        recordedAt: row.recorded_at,
      });
    }
  }
}

function ingestProgress(result) {
  const rows = result.rows || [];
  if (!rows.length) return { completedCount: 0, avgProgress: 0, totalTimeSpent: 0 };

  const completedCount = rows.filter((r) => r.is_completed).length;
  const avgProgress =
    rows.reduce((s, r) => s + Number(r.progress || 0), 0) / rows.length;
  const totalTimeSpent = rows.reduce((s, r) => s + Number(r.time_spent || 0), 0);

  return {
    completedCount,
    avgProgress: round(avgProgress),
    totalTimeSpent,
    trackedSubtopics: rows.length,
  };
}

module.exports = { analyzeRetrievedData, round };
