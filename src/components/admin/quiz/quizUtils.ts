/**
 * Utility functions for parsing and mapping quiz data
 */

import { Quiz, QuizQuestion } from '@/services/admin';
import { isOllamaGeneratedImageUrl } from '@/utils/ollamaImageUrl';

/**
 * Parse and map question data from database format to frontend format
 */
export const parseQuestions = (questions: unknown[]): QuizQuestion[] => {
  return questions.map((q: any) => {
    // Map database field names (snake_case) to frontend field names (camelCase)
    // Handle both snake_case and camelCase, prioritize snake_case from DB
    // Check for null/undefined properly - null is a valid value that means "no value"
    const questionText = (q.question_text !== undefined && q.question_text !== null) 
      ? q.question_text 
      : ((q.questionText !== undefined && q.questionText !== null) ? q.questionText : '');
    const questionType = (q.question_type !== undefined && q.question_type !== null)
      ? q.question_type
      : ((q.questionType !== undefined && q.questionType !== null) ? q.questionType : 'multiple_choice');
    const rawImageUrl = (q.question_image_url !== undefined && q.question_image_url !== null)
      ? q.question_image_url
      : ((q.questionImageUrl !== undefined && q.questionImageUrl !== null) ? q.questionImageUrl : null);
    const questionImageUrl = isOllamaGeneratedImageUrl(rawImageUrl)
      ? String(rawImageUrl).trim()
      : undefined;
    const orderIndex = (q.order_index !== undefined && q.order_index !== null)
      ? q.order_index
      : ((q.orderIndex !== undefined && q.orderIndex !== null) ? q.orderIndex : 0);
    
    // Parse options (can be string JSONB or object)
    let options = q.options;
    if (options) {
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          console.error('Error parsing options:', e);
          options = null;
        }
      }
    }

    // Parse correctAnswer (can be string JSONB or string/array)
    let correctAnswer = q.correct_answer !== undefined ? q.correct_answer : q.correctAnswer;
    if (correctAnswer) {
      if (typeof correctAnswer === 'string') {
        try {
          // Try to parse as JSON first (for arrays or complex objects)
          correctAnswer = JSON.parse(correctAnswer);
        } catch (e) {
          // If parsing fails, keep as string (simple answer like "A" or "B")
          correctAnswer = correctAnswer;
        }
      }
    }

    return {
      id: q.id,
      quizId: q.quiz_id || q.quizId,
      questionType: questionType,
      questionText: questionText,
      questionImageUrl: questionImageUrl,
      options: options || null,
      correctAnswer: correctAnswer || null,
      explanation: q.explanation !== undefined ? q.explanation : null,
      hint: q.hint !== undefined ? q.hint : null,
      points: q.points !== undefined ? q.points : 1,
      orderIndex: orderIndex,
    };
  });
};

/**
 * Map quiz data from database format to frontend format
 */
export const mapQuizData = (quiz: Quiz): Quiz => {
  const quizData = quiz as unknown as Record<string, unknown>;
  return {
    ...quiz,
    ageGroup: (quizData.age_group as string | undefined) || quiz.ageGroup,
    numberOfQuestions: quizData.number_of_questions !== undefined ? (quizData.number_of_questions as number) : quiz.numberOfQuestions,
    passingPercentage: quizData.passing_percentage !== undefined ? (quizData.passing_percentage as number) : quiz.passingPercentage,
    timeLimit: quizData.time_limit !== undefined ? ((quizData.time_limit as number | null) ?? undefined) : quiz.timeLimit,
    subtopicId: (quizData.subtopic_id as string | undefined) || quiz.subtopicId,
    isActive: quizData.is_active !== undefined ? (quizData.is_active as boolean) : quiz.isActive,
  };
};


