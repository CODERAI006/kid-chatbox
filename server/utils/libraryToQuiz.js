/**
 * Copy quiz_library row → quizzes + quiz_questions (hybrid tracked play).
 */

const { pool } = require('../config/database');

/**
 * @param {string} libraryId
 * @param {string} userId
 * @returns {Promise<string>} quizzes.id
 */
async function copyLibraryToQuiz(libraryId, userId) {
  const libRes = await pool.query(
    `SELECT * FROM quiz_library WHERE id = $1 AND is_active = true`,
    [libraryId]
  );
  if (!libRes.rows.length) {
    throw new Error('Quiz library item not found');
  }
  const lib = libRes.rows[0];

  if (lib.linked_quiz_id) {
    return lib.linked_quiz_id;
  }

  let questions = lib.questions;
  if (typeof questions === 'string') {
    questions = JSON.parse(questions);
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Library quiz has no questions');
  }

  let subtopicId = null;
  const subName = Array.isArray(lib.subtopics) && lib.subtopics[0] ? lib.subtopics[0] : null;
  if (subName) {
    const st = await pool.query(
      `SELECT id FROM subtopics WHERE LOWER(title) = LOWER($1) AND is_active = true LIMIT 1`,
      [subName]
    );
    if (st.rows.length) subtopicId = st.rows[0].id;
  }

  const diffMap = { Easy: 'Basic', Medium: 'Advanced', Hard: 'Expert', Mixed: 'Mix' };
  const aiDifficulty = diffMap[lib.difficulty] || lib.difficulty || 'Mix';

  const quizRes = await pool.query(
    `INSERT INTO quizzes (
      subtopic_id, name, description, age_group, grade_level, subject, difficulty,
      number_of_questions, passing_percentage, time_limit, created_by, in_library
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
    RETURNING id`,
    [
      subtopicId,
      lib.title,
      lib.description,
      lib.age_group != null ? String(lib.age_group) : null,
      lib.grade_level,
      lib.subject,
      aiDifficulty,
      questions.length,
      60,
      lib.time_limit,
      userId,
    ]
  );
  const quizId = quizRes.rows[0].id;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const text = q.question || q.question_text || '';
    const options = q.options || [];
    const correct = q.correctAnswer ?? q.correct_answer ?? '';
    await pool.query(
      `INSERT INTO quiz_questions (
        quiz_id, question_type, question_text, options,
        correct_answer, explanation, points, order_index
      )
      VALUES ($1,'multiple_choice',$2,$3,$4,$5,$6,$7)`,
      [
        quizId,
        text,
        JSON.stringify(options),
        JSON.stringify(correct),
        q.explanation || null,
        q.points || 1,
        i,
      ]
    );
  }

  await pool.query(
    `UPDATE quiz_library SET linked_quiz_id = $1, updated_at = NOW() WHERE id = $2`,
    [quizId, libraryId]
  );

  return quizId;
}

module.exports = { copyLibraryToQuiz };
