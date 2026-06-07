/**
 * Mirror completed library/scheduled quiz attempts into quiz_results for Quiz History.
 */
const { pool } = require('../config/database');

function parseStoredAnswer(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatAnswer(value) {
  const parsed = parseStoredAnswer(value);
  if (parsed == null) return null;
  if (Array.isArray(parsed)) return parsed.join(', ');
  return String(parsed);
}

/**
 * @param {string} attemptId
 * @param {string} userId
 * @param {{ scheduledTest?: boolean }} [opts]
 * @returns {Promise<string|null>} quiz_results id or null
 */
async function syncQuizAttemptToHistory(attemptId, userId, opts = {}) {
  const existing = await pool.query(
    'SELECT id FROM quiz_results WHERE quiz_attempt_id = $1',
    [attemptId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const attemptRes = await pool.query(
    `SELECT qa.*, q.name AS quiz_name, q.subject AS quiz_subject, q.age_group
     FROM quiz_attempts qa
     INNER JOIN quizzes q ON q.id = qa.quiz_id
     WHERE qa.id = $1 AND qa.user_id = $2 AND qa.status = 'completed'`,
    [attemptId, userId]
  );

  if (attemptRes.rows.length === 0) {
    return null;
  }

  const attempt = attemptRes.rows[0];

  let isScheduled = Boolean(opts.scheduledTest);
  if (!isScheduled) {
    const scheduledRes = await pool.query(
      `SELECT 1 FROM scheduled_tests st
       WHERE st.quiz_id = $1
       AND (
         $2::uuid = ANY(st.user_ids)
         OR EXISTS (
           SELECT 1 FROM user_plans up
           WHERE up.user_id = $2::uuid AND up.plan_id = ANY(st.plan_ids)
         )
       )
       LIMIT 1`,
      [attempt.quiz_id, userId]
    );
    isScheduled = scheduledRes.rows.length > 0;
  }

  const answersRes = await pool.query(
    `SELECT qaa.*, qq.question_text, qq.options, qq.correct_answer, qq.explanation, qq.order_index
     FROM quiz_attempt_answers qaa
     INNER JOIN quiz_questions qq ON qq.id = qaa.question_id
     WHERE qaa.attempt_id = $1
     ORDER BY qq.order_index NULLS LAST, qq.created_at`,
    [attemptId]
  );

  const ageMatch = String(attempt.age_group || '8').match(/^(\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : 8;
  const quizLabel = attempt.quiz_name || 'Quiz';
  const subtopic = isScheduled ? `Scheduled · ${quizLabel}` : quizLabel;

  const wrongNotes = answersRes.rows
    .map((row, index) =>
      !row.is_correct ? `Q${index + 1}: ${row.explanation || 'Review this question.'}` : null
    )
    .filter(Boolean)
    .join(' | ');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO quiz_results (
        user_id, subject, subtopic, age, language,
        correct_count, wrong_count, explanation_of_mistakes,
        time_taken, score_percentage, quiz_attempt_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        userId,
        attempt.quiz_subject || 'General',
        subtopic,
        age,
        'English',
        attempt.correct_answers || 0,
        attempt.wrong_answers || 0,
        wrongNotes,
        attempt.time_taken || 0,
        parseFloat(attempt.score_percentage) || 0,
        attemptId,
      ]
    );

    const quizResultId = insertResult.rows[0].id;

    for (let i = 0; i < answersRes.rows.length; i += 1) {
      const row = answersRes.rows[i];
      const options =
        row.options == null
          ? null
          : typeof row.options === 'string'
            ? row.options
            : JSON.stringify(row.options);

      await client.query(
        `INSERT INTO quiz_answers (
          quiz_result_id, question_number, question,
          child_answer, correct_answer, explanation, is_correct, options
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          quizResultId,
          i + 1,
          row.question_text,
          formatAnswer(row.user_answer),
          formatAnswer(row.correct_answer) || '',
          row.explanation || '',
          row.is_correct,
          options,
        ]
      );
    }

    await client.query('COMMIT');
    return quizResultId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { syncQuizAttemptToHistory };
