/**
 * Shared quiz rankings helpers — AI tutor results + admin/library quiz attempts.
 */

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function buildParticipant(row) {
  const totalQuestions = parseInt(row.total_questions, 10) || 1;
  const correctAnswers = parseInt(row.correct_count, 10) || 0;
  const timeTaken = parseInt(row.time_taken, 10) || 1;
  const scorePercentage = parseFloat(row.score_percentage) || 0;

  const scoreComponent = scorePercentage * 0.6;
  const questionsComponent = (correctAnswers / totalQuestions) * 100 * 0.2;
  const avgTimePerQuestion = timeTaken / totalQuestions;
  const idealTimePerQuestion = 30;
  const timeEfficiency = Math.max(
    0,
    Math.min(100, (idealTimePerQuestion / avgTimePerQuestion) * 100)
  );
  const timeComponent = timeEfficiency * 0.2;
  const compositeScore = scoreComponent + questionsComponent + timeComponent;

  return {
    attemptId: row.id,
    userId: row.user_id,
    userName: row.user_name || 'Unknown',
    userEmail: row.user_email || '',
    subject: row.subject || 'General',
    subtopic: row.subtopic || 'General',
    age: row.age ?? null,
    language: row.language ?? null,
    timestamp: row.timestamp,
    scorePercentage: Math.round(scorePercentage),
    correctAnswers,
    totalQuestions,
    wrongAnswers: parseInt(row.wrong_count, 10) || 0,
    timeTaken,
    timeTakenFormatted: formatTime(timeTaken),
    compositeScore: Math.round(compositeScore * 10) / 10,
    scoreBreakdown: {
      scoreComponent: Math.round(scoreComponent * 10) / 10,
      questionsComponent: Math.round(questionsComponent * 10) / 10,
      timeComponent: Math.round(timeComponent * 10) / 10,
    },
  };
}

function sortParticipants(participants, sortBy) {
  const sorted = [...participants];
  switch (sortBy) {
    case 'score':
      sorted.sort((a, b) => b.scorePercentage - a.scorePercentage);
      break;
    case 'time':
      sorted.sort((a, b) => a.timeTaken - b.timeTaken);
      break;
    case 'questions':
      sorted.sort((a, b) => {
        const ratioA = a.correctAnswers / a.totalQuestions;
        const ratioB = b.correctAnswers / b.totalQuestions;
        return ratioB - ratioA;
      });
      break;
    case 'composite':
    default:
      sorted.sort((a, b) => b.compositeScore - a.compositeScore);
      break;
  }
  sorted.forEach((p, i) => {
    p.rank = i + 1;
  });
  return sorted;
}

function buildSummary(participants) {
  const summary = {
    totalAttempts: participants.length,
    totalParticipants: new Set(participants.map((p) => p.userId)).size,
    averageScore:
      participants.length > 0
        ? Math.round(
            participants.reduce((sum, p) => sum + p.scorePercentage, 0) / participants.length
          )
        : 0,
    averageTime:
      participants.length > 0
        ? Math.round(participants.reduce((sum, p) => sum + p.timeTaken, 0) / participants.length)
        : 0,
    subjects: {},
  };

  participants.forEach((p) => {
    if (!summary.subjects[p.subject]) {
      summary.subjects[p.subject] = { attempts: 0, averageScore: 0, participants: new Set() };
    }
    summary.subjects[p.subject].attempts++;
    summary.subjects[p.subject].participants.add(p.userId);
  });

  Object.keys(summary.subjects).forEach((subject) => {
    const subjectParticipants = participants.filter((p) => p.subject === subject);
    summary.subjects[subject].averageScore =
      subjectParticipants.length > 0
        ? Math.round(
            subjectParticipants.reduce((sum, p) => sum + p.scorePercentage, 0) /
              subjectParticipants.length
          )
        : 0;
    summary.subjects[subject].participants = summary.subjects[subject].participants.size;
  });

  return summary;
}

/** @param {import('pg').Pool} pool */
async function getRankableQuizzes(pool) {
  const [libraryRes, resultsRes, adminRes] = await Promise.all([
    pool.query(`
      SELECT id, title, subject, subtopics, difficulty, question_count, created_at, is_active
      FROM quiz_library
      WHERE is_active = true
      ORDER BY created_at DESC
    `),
    pool.query(`
      SELECT DISTINCT subject, subtopic,
        COUNT(*) AS attempt_count,
        COUNT(DISTINCT user_id) AS participant_count,
        AVG(score_percentage) AS avg_score,
        MAX(timestamp) AS last_attempt
      FROM quiz_results
      GROUP BY subject, subtopic
      HAVING COUNT(*) > 0
      ORDER BY last_attempt DESC, attempt_count DESC
    `),
    pool.query(`
      SELECT
        q.id,
        q.name,
        q.subject,
        COALESCE(s.title, q.name) AS subtopic,
        q.difficulty,
        q.number_of_questions,
        q.in_library,
        COUNT(qa.id) FILTER (WHERE qa.status = 'completed') AS attempt_count,
        COUNT(DISTINCT qa.user_id) FILTER (WHERE qa.status = 'completed') AS participant_count,
        AVG(qa.score_percentage) FILTER (WHERE qa.status = 'completed') AS avg_score,
        MAX(qa.completed_at) FILTER (WHERE qa.status = 'completed') AS last_attempt
      FROM quizzes q
      LEFT JOIN subtopics s ON q.subtopic_id = s.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      WHERE q.is_active = true
        AND (q.in_library = true OR qa.status = 'completed')
      GROUP BY q.id, q.name, q.subject, s.title, q.difficulty, q.number_of_questions, q.in_library, q.created_at
      ORDER BY last_attempt DESC NULLS LAST, q.created_at DESC
    `),
  ]);

  const libraryQuizzes = libraryRes.rows.map((row) => {
    const subtopic =
      Array.isArray(row.subtopics) && row.subtopics.length > 0 ? row.subtopics[0] : 'General';
    return {
      id: `library_${row.id}`,
      libraryId: row.id,
      title: row.title,
      subject: row.subject,
      subtopic,
      displayName: row.title,
      difficulty: row.difficulty,
      questionCount: row.question_count,
      attemptCount: 0,
      participantCount: 0,
      avgScore: 0,
      lastAttempt: row.created_at,
      source: 'library',
    };
  });

  const resultsQuizzes = resultsRes.rows.map((row) => ({
    id: `${row.subject}_${row.subtopic}`,
    subject: row.subject,
    subtopic: row.subtopic,
    displayName: `${row.subject} - ${row.subtopic}`,
    attemptCount: parseInt(row.attempt_count, 10),
    participantCount: parseInt(row.participant_count, 10),
    avgScore: Math.round(parseFloat(row.avg_score) || 0),
    lastAttempt: row.last_attempt,
    source: 'ai-tutor',
  }));

  const adminQuizzes = adminRes.rows.map((row) => ({
    id: `quiz_${row.id}`,
    quizId: row.id,
    title: row.name,
    subject: row.subject || 'General',
    subtopic: row.subtopic || row.name,
    displayName: row.name,
    difficulty: row.difficulty,
    questionCount: row.number_of_questions,
    attemptCount: parseInt(row.attempt_count, 10) || 0,
    participantCount: parseInt(row.participant_count, 10) || 0,
    avgScore: Math.round(parseFloat(row.avg_score) || 0),
    lastAttempt: row.last_attempt,
    inLibrary: row.in_library,
    source: 'admin',
  }));

  const mergedLibrary = libraryQuizzes.map((libQuiz) => {
    const match = resultsQuizzes.find(
      (r) => r.subject === libQuiz.subject && r.subtopic === libQuiz.subtopic
    );
    return match
      ? {
          ...libQuiz,
          attemptCount: match.attemptCount,
          participantCount: match.participantCount,
          avgScore: match.avgScore,
          lastAttempt: match.lastAttempt,
        }
      : libQuiz;
  });

  const unmatchedResults = resultsQuizzes.filter(
    (r) => !libraryQuizzes.some((l) => l.subject === r.subject && l.subtopic === r.subtopic)
  );

  const allQuizzes = [...mergedLibrary, ...adminQuizzes, ...unmatchedResults];

  allQuizzes.sort((a, b) => {
    const dateA = new Date(a.lastAttempt || 0).getTime();
    const dateB = new Date(b.lastAttempt || 0).getTime();
    if (dateB !== dateA) return dateB - dateA;
    return (b.attemptCount || 0) - (a.attemptCount || 0);
  });

  return allQuizzes;
}

/** @param {import('pg').Pool} pool */
async function fetchAdminQuizAttempts(pool, quizUuid, limit) {
  const result = await pool.query(
    `SELECT
      qa.id,
      qa.user_id,
      qa.completed_at AS timestamp,
      COALESCE(q.subject, 'General') AS subject,
      COALESCE(s.title, q.name, 'General') AS subtopic,
      NULL::integer AS age,
      NULL::varchar AS language,
      qa.correct_answers AS correct_count,
      qa.wrong_answers AS wrong_count,
      qa.time_taken,
      qa.score_percentage,
      u.name AS user_name,
      u.email AS user_email,
      qa.total_questions
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    LEFT JOIN subtopics s ON q.subtopic_id = s.id
    LEFT JOIN users u ON qa.user_id = u.id
    WHERE qa.quiz_id = $1 AND qa.status = 'completed'
    ORDER BY qa.completed_at DESC
    LIMIT $2`,
    [quizUuid, limit]
  );
  return result.rows;
}

/** @param {import('pg').Pool} pool */
async function getQuizRankings(pool, { quizId, subject, subtopic, sortBy = 'composite', limit = 100 }) {
  const cap = parseInt(String(limit), 10) || 100;
  let rows = [];

  if (quizId && typeof quizId === 'string') {
    if (quizId.startsWith('quiz_')) {
      const quizUuid = quizId.replace('quiz_', '');
      rows = await fetchAdminQuizAttempts(pool, quizUuid, cap);
    } else if (quizId.startsWith('library_')) {
      const libraryId = quizId.replace('library_', '');
      const libraryResult = await pool.query(
        'SELECT subject, subtopics FROM quiz_library WHERE id = $1',
        [libraryId]
      );
      if (libraryResult.rows.length > 0) {
        const libQuiz = libraryResult.rows[0];
        const libSubtopic =
          Array.isArray(libQuiz.subtopics) && libQuiz.subtopics.length > 0
            ? libQuiz.subtopics[0]
            : 'General';
        const result = await pool.query(
          `SELECT qr.id, qr.user_id, qr.timestamp, qr.subject, qr.subtopic, qr.age, qr.language,
            qr.correct_count, qr.wrong_count, qr.time_taken, qr.score_percentage,
            u.name AS user_name, u.email AS user_email,
            (qr.correct_count + qr.wrong_count) AS total_questions
          FROM quiz_results qr
          LEFT JOIN users u ON qr.user_id = u.id
          WHERE qr.subject = $1 AND qr.subtopic = $2
          ORDER BY qr.timestamp DESC LIMIT $3`,
          [libQuiz.subject, libSubtopic, cap]
        );
        rows = result.rows;
      }
    } else if (quizId.includes('_')) {
      const [quizSubject, ...subtopicParts] = quizId.split('_');
      const quizSubtopic = subtopicParts.join('_');
      const result = await pool.query(
        `SELECT qr.id, qr.user_id, qr.timestamp, qr.subject, qr.subtopic, qr.age, qr.language,
          qr.correct_count, qr.wrong_count, qr.time_taken, qr.score_percentage,
          u.name AS user_name, u.email AS user_email,
          (qr.correct_count + qr.wrong_count) AS total_questions
        FROM quiz_results qr
        LEFT JOIN users u ON qr.user_id = u.id
        WHERE qr.subject = $1 AND qr.subtopic = $2
        ORDER BY qr.timestamp DESC LIMIT $3`,
        [quizSubject, quizSubtopic, cap]
      );
      rows = result.rows;
    }
  } else {
    let query = `
      SELECT qr.id, qr.user_id, qr.timestamp, qr.subject, qr.subtopic, qr.age, qr.language,
        qr.correct_count, qr.wrong_count, qr.time_taken, qr.score_percentage,
        u.name AS user_name, u.email AS user_email,
        (qr.correct_count + qr.wrong_count) AS total_questions
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (subject) {
      paramCount++;
      query += ` AND qr.subject ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
    }
    if (subtopic) {
      paramCount++;
      query += ` AND qr.subtopic ILIKE $${paramCount}`;
      params.push(`%${subtopic}%`);
    }

    query += ` ORDER BY qr.timestamp DESC LIMIT $${++paramCount}`;
    params.push(cap);
    const result = await pool.query(query, params);
    rows = result.rows;
  }

  const participants = rows.map(buildParticipant);
  const leaderboard = sortParticipants(participants, sortBy);
  const summary = buildSummary(participants);

  return { summary, leaderboard, participants: leaderboard };
}

module.exports = {
  formatTime,
  getRankableQuizzes,
  getQuizRankings,
};
