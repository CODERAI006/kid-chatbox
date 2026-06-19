/**
 * CBSE study lesson prompt — story-first 17-section output for Study Mode.
 */
import { QuizConfig } from '@/types/quiz';
import type { StudyLessonOptions } from './study';
import {
  getAgeBandLabel,
  getAgeBandStoryGuidance,
  getStudyAgeBand,
  resolveStudentAge,
} from '@/utils/studyAgeProfile';
import { STUDY_PROMPT_LIMITS } from '@/utils/studyPromptLimits';

export function buildStudyLessonPrompt(
  config: QuizConfig,
  kidName: string,
  classLevel: string,
  examStyle: string,
  studyOptions?: StudyLessonOptions,
): string {
  const topic =
    config.subtopics.length === 1 ? config.subtopics[0] : config.subtopics.join(', ');
  const board = examStyle || studyOptions?.examStyle || config.examStyle || 'CBSE';
  const language = config.language || 'English';
  const grade = studyOptions?.gradeLevel || classLevel;
  const studentAge = resolveStudentAge(config.age, grade);
  const ageBand = getStudyAgeBand(studentAge);
  const storyGuide = getAgeBandStoryGuidance(ageBand, kidName);
  const extraInstructions = (config.instructions || '').trim().slice(
    0,
    STUDY_PROMPT_LIMITS.maxExtraInstructionsChars,
  );
  const lessonStyle = studyOptions?.lessonStyle || 'Story-based';
  const showExamSection = ageBand === 'middle' || ageBand === 'secondary';

  return `You are an expert teacher, storyteller, and visual learning specialist for Indian school students.

AUDIENCE: ${getAgeBandLabel(ageBand)} (about ${studentAge} years old)
Topic: ${topic}
Grade: ${grade}
Board: ${board}
Language: ${language}
Subject: ${config.subject}
Student name: ${kidName}
Lesson style: ${lessonStyle}
${extraInstructions ? `Extra instructions (follow if safe): ${extraInstructions}` : ''}

STORY RULE (CRITICAL):
- Section 1 is "introduction.text" — a STORY opening, NOT a bullet list.
- Write at least ${STUDY_PROMPT_LIMITS.minIntroLines} full lines (sentences). Each line should move the story forward with sensory detail, a character or scene, and a link to the topic.
- ${storyGuide}
- Separate story paragraphs with \\n\\n (double newline).

AGE-APPROPRIATE SECTIONS:
- Use simple words for younger students; add depth for older students.
- funFacts / didYouKnow: surprising but true, kid-friendly.
- ${showExamSection ? 'Include examNotes with board-focused tips.' : 'Omit examNotes or use an empty array [].'}
- ${ageBand === 'early' ? 'Skip heavy exam jargon. commonMistakes and thinkingQuestions may be empty arrays.' : 'Include commonMistakes and thinkingQuestions.'}
- Flashcards: short question on front (end with ?), clear answer on back — easy to read on a phone.

OUTPUT: Valid JSON only. No markdown fences.

{
  "title": "Engaging chapter title",
  "whyLearnThis": "2-3 sentences why this matters for ${kidName}",
  "quickSummary": "3-5 sentence overview",
  "introduction": {
    "text": "STORY: minimum ${STUDY_PROMPT_LIMITS.minIntroLines} lines/sentences with \\n\\n between paragraphs",
    "imageKeyword": "short label",
    "imagePrompt": "Photorealistic educational scene, National Geographic style, natural lighting, no cartoons",
    "imageCaption": "Caption for intro image"
  },
  "explanation": ["Step 1...", "At least ${STUDY_PROMPT_LIMITS.minExplanationSteps} clear steps"],
  "visualLearningDescription": ["What to draw or sketch..."],
  "realLifeAnalogy": "One vivid analogy",
  "examples": ["Example 1", "At least 3 examples"],
  "keyTerms": [{"term": "Word", "definition": "Simple definition"}],
  "funFacts": ["At least 3 fun facts"],
  "didYouKnow": ["At least 2 surprising facts"],
  "commonMistakes": ${showExamSection ? '["Mistake and fix", "At least 2"]' : '[]'},
  "examNotes": ${showExamSection ? '["Board tip 1", "At least 3 tips"]' : '[]'},
  "quizQuestions": [{"question": "...", "answer": "...", "hint": "optional"}],
  "thinkingQuestions": ${ageBand === 'early' ? '[]' : '["Open question 1", "At least 3"]'},
  "flashcards": [{"front": "Question ending with ?", "back": "Short answer"}],
  "oneMinuteRevision": ["At least 8 ultra-short bullets"],
  "askAiTeacherPrompts": ["At least 4 starter questions for Ask AI Teacher"],
  "keyPoints": ["Exactly 20 short key points"],
  "summary": "Encouraging closing paragraph",
  "imageKeywords": ["keyword 1", "keyword 2"],
  "imageGallery": [{"keyword": "label", "label": "Caption", "imagePrompt": "Photorealistic scene..."}]
}

Minimum counts: flashcards ${STUDY_PROMPT_LIMITS.minFlashcards}, keyPoints ${STUDY_PROMPT_LIMITS.minKeyPoints}, keyTerms 8, quizQuestions 5.
Keep every string concise — the JSON must fit in one response.`;
}
