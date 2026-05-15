/**
 * Background worker: Ollama quiz generation + persist to quizzes (in_library).
 */

const { pool } = require('../config/database');
const { generateQuizQuestions } = require('../utils/openai');
const { trackQuizCreated } = require('../utils/eventTracker');

function buildTopics(payload) {
  const subject = (payload.subject || '').trim();
  const subs = Array.isArray(payload.subtopics) ? payload.subtopics : [];
  const list = [subject, ...subs.map((s) => String(s || '').trim())].filter(Boolean);
  return [...new Set(list)];
}

/**
 * @param {string} jobId
 */
async function runQuizAiGenerationJob(jobId) {
  const jobRes = await pool.query(
    `SELECT id, user_id, request_payload FROM quiz_ai_generation_jobs WHERE id = $1`,
    [jobId]
  );
  if (jobRes.rows.length === 0) {
    console.warn('[quiz-ai-job] missing job', jobId);
    return;
  }
  const { user_id: userId, request_payload: payload } = jobRes.rows[0];

  try {
    await pool.query(
      `UPDATE quiz_ai_generation_jobs SET status = 'running', updated_at = NOW() WHERE id = $1`,
      [jobId]
    );

    const numberOfQuestions = Math.min(
      50,
      Math.max(1, Number(payload.numberOfQuestions) || 10)
    );
    const difficulty = payload.difficulty || 'Basic';
    const topics = buildTopics(payload);
    if (topics.length === 0) {
      throw new Error('subject is required');
    }

    const language = payload.language || 'English';
    const gradeLevel = payload.gradeLevel || null;
    const sampleQuestion = payload.sampleQuestion || undefined;
    const examStyle = payload.examStyle || undefined;
    const ageGroup = payload.ageGroup != null ? String(payload.ageGroup) : null;
    const timeLimit = payload.timeLimit != null ? Number(payload.timeLimit) : null;
    const passingPercentage = Math.min(100, Math.max(1, Number(payload.passingPercentage) || 60));

    const descParts = [];
    if (payload.instructions) descParts.push(String(payload.instructions).trim());
    if (payload.age != null) descParts.push(`Learner age: ${payload.age}`);
    const description = descParts.length ? descParts.join('\n\n') : null;

    const subject = String(payload.subject || topics[0]).trim();
    const name =
      (payload.name && String(payload.name).trim()) ||
      `AI Quiz: ${subject} (${new Date().toISOString().slice(0, 10)})`;

    const generatedQuestions = await generateQuizQuestions({
      numberOfQuestions,
      difficulty,
      topics,
      language,
      subtopicId: payload.subtopicId || undefined,
      description: description || undefined,
      gradeLevel: gradeLevel || undefined,
      sampleQuestion,
      examStyle,
    });

    const quizResult = await pool.query(
      `INSERT INTO quizzes (
        subtopic_id, name, description, age_group, grade_level, subject, difficulty,
        number_of_questions, passing_percentage, time_limit, created_by, in_library
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *`,
      [
        payload.subtopicId || null,
        name,
        description,
        ageGroup,
        gradeLevel,
        subject,
        difficulty,
        generatedQuestions.length,
        passingPercentage,
        Number.isFinite(timeLimit) ? timeLimit : null,
        userId,
      ]
    );
    const quiz = quizResult.rows[0];

    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      await pool.query(
        `INSERT INTO quiz_questions (
          quiz_id, question_type, question_text, options,
          correct_answer, explanation, points, order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          quiz.id,
          'multiple_choice',
          q.question,
          JSON.stringify(q.options),
          JSON.stringify(q.correctAnswer),
          q.explanation,
          1,
          i,
        ]
      );
    }

    await trackQuizCreated(userId, quiz.id);

    await pool.query(
      `UPDATE quiz_ai_generation_jobs
       SET status = 'completed', quiz_id = $1, updated_at = NOW(), error_message = NULL
       WHERE id = $2`,
      [quiz.id, jobId]
    );
    console.info('[quiz-ai-job] completed', { jobId, quizId: quiz.id, questions: generatedQuestions.length });
  } catch (err) {
    const msg = (err && err.message) || String(err);
    console.error('[quiz-ai-job] failed', { jobId, message: msg });
    await pool.query(
      `UPDATE quiz_ai_generation_jobs
       SET status = 'failed', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [msg.slice(0, 2000), jobId]
    );
  }
}

module.exports = { runQuizAiGenerationJob };
