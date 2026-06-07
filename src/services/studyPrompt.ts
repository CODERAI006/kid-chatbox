/**
 * CBSE study lesson prompt — 17-section structured output for Study Mode.
 */
import { QuizConfig } from '@/types/quiz';
import type { StudyLessonOptions } from './study';

export function buildStudyLessonPrompt(
  config: QuizConfig,
  kidName: string,
  classLevel: string,
  examStyle: string,
  studyOptions?: StudyLessonOptions
): string {
  const topic =
    config.subtopics.length === 1 ? config.subtopics[0] : config.subtopics.join(', ');
  const board = examStyle || studyOptions?.examStyle || config.examStyle || 'CBSE';
  const language = config.language || 'English';
  const grade = studyOptions?.gradeLevel || classLevel;

  return `You are an expert CBSE teacher, instructional designer, storyteller, and visual learning specialist.

Create engaging study content for:

Topic: ${topic}
Grade: ${grade}
Board: ${board}
Language: ${language}
Subject: ${config.subject}
Student name: ${kidName}
${config.instructions ? `Extra instructions: ${config.instructions}` : ''}

Generate content in JSON format using ALL 17 sections below.

Rules:
1. Explain in simple age-appropriate language for ${grade}.
2. Use real-world examples students can relate to.
3. Use storytelling and analogies — speak directly to ${kidName} where natural.
4. Keep explanations concise but complete.
5. Include visual learning descriptions (what to draw, label, color-code).
6. Include at least 20 flashcards (front/back pairs).
7. Include quiz Q&A with answers and optional hints.
8. Include 3–5 thinking questions (open-ended, no single answer in JSON).
9. Include 4–6 suggested questions for "Ask AI Teacher".
10. Avoid technical jargon unless defined in keyTerms.
11. Ensure factual correctness for ${board} curriculum.
12. Write in ${language}.
13. imageKeyword must be a specific English phrase for a hero image (e.g. "human heart anatomy model").

Output JSON only with this exact shape:
{
  "title": "Engaging chapter title",
  "whyLearnThis": "2-3 sentences on why this topic matters for ${kidName} and real life",
  "quickSummary": "3-5 sentence overview a student can read in 30 seconds",
  "introduction": {
    "text": "Hook paragraph(s) separated by \\n\\n",
    "imageKeyword": "specific English phrase for hero image",
    "imageCaption": "Short caption for intro image"
  },
  "explanation": ["Detailed step 1...", "Detailed step 2...", "At least 4 steps"],
  "visualLearningDescription": ["Describe diagram 1 to draw...", "Chart or map to sketch..."],
  "realLifeAnalogy": "One vivid analogy connecting the topic to everyday life",
  "examples": ["Real-world example 1", "Real-world example 2", "At least 3 examples"],
  "keyTerms": [{"term": "Word", "definition": "Simple definition"}],
  "funFacts": ["Fun fact 1", "Fun fact 2", "At least 3"],
  "didYouKnow": ["Surprising fact 1", "Surprising fact 2", "At least 2"],
  "commonMistakes": ["Mistake students make and how to avoid it", "At least 3"],
  "examNotes": ["Board exam tip 1", "Important marking point", "At least 4 CBSE-focused notes"],
  "quizQuestions": [{"question": "...", "answer": "...", "hint": "optional"}],
  "thinkingQuestions": ["Open question to ponder 1", "At least 3"],
  "flashcards": [{"front": "Term or question", "back": "Definition or answer"}],
  "oneMinuteRevision": ["Ultra-short bullet 1", "At least 8 quick revision lines"],
  "askAiTeacherPrompts": ["Can you explain ...?", "At least 4 starter questions"],
  "keyPoints": ["Exactly 20 short key points"],
  "summary": "One encouraging closing paragraph",
  "imageKeywords": ["specific keyword 1", "keyword 2", "keyword 3", "keyword 4"]
}

Minimum counts: flashcards 20, keyPoints 20, keyTerms 8, quizQuestions 5.`;
}
