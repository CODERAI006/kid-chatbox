/**
 * Builds the 18-section visual-first study page prompt for Study Mode AI.
 */
import type { StudyAgeBand } from '@/utils/studyAgeProfile';
import { STUDY_PROMPT_LIMITS } from '@/utils/studyPromptLimits';
import {
  STUDY_INTERACTIVE_JSON_SCHEMA,
  STUDY_INTERACTIVE_STYLE_RULES,
} from './studyInteractivePromptSchema';

export interface StudyModulePromptParams {
  topic: string;
  subject: string;
  grade: string;
  curriculum: string;
  ageGroup: string;
  ageBand: StudyAgeBand;
  studentName: string;
  language: string;
  lessonStyle: string;
  extraInstructions?: string;
  showExamSection: boolean;
}

export function buildStudyModulePrompt(params: StudyModulePromptParams): string {
  const {
    topic,
    subject,
    grade,
    curriculum,
    ageGroup,
    ageBand,
    studentName,
    language,
    lessonStyle,
    extraInstructions,
    showExamSection,
  } = params;

  const ageRules =
    ageBand === 'early'
      ? 'Use very simple words. Quick quiz: mostly easy. Skip exam jargon in final-revision.'
      : ageBand === 'primary'
        ? 'Light exam tips in final-revision. Keep interactions playful like Duolingo.'
        : 'Include exam tips, time-saving tricks, and board-aligned content in final-revision.';

  const examRule = showExamSection
    ? 'Include exam tips and time-saving tricks in final-revision section.'
    : 'Keep final-revision focused on understanding, not exam pressure.';

  return `You are an expert instructional designer, UX designer, and K-12 curriculum specialist.

Your task is NOT to write a textbook.
Create an engaging, visual-first AI study page that helps students LEARN quickly, REMEMBER longer, and ENJOY studying.

Feel like a mix of: Duolingo, Khan Academy, Brilliant.org, Quizlet, Canva Education.

TOPIC: ${topic}
Grade: ${grade}
Board/Curriculum: ${curriculum}
Student Age: ${ageGroup}
Subject: ${subject}
Student name: ${studentName}
Language: ${language}
Lesson style: ${lessonStyle}
${extraInstructions ? `Extra instructions (follow if safe): ${extraInstructions}` : ''}

PRIMARY GOAL: Every section answers ONE learning question. More interaction than reading. Each concept under 2 minutes.

PAGE STRUCTURE — return exactly these 18 sections in the sections array:
1. hero — topic, difficulty, time, grade, subject, one-line description, hero visual
2. why-learn — 3-5 icon cards (icon, title, one sentence each)
3. big-picture — infographic visual (tree/flow) showing topic overview
4. roadmap — learning journey steps with completed/current icons
5. concept-cards — 3+ cards: title, definition (2 lines), visual diagram, steps, example, practice+hint, mistake, memory trick, recap
6. infographics — structured diagram (flowchart/mindmap/comparison)
7. memory-aids — visual mnemonics with remember text
8. learning-steps — animation sequence for frontend (visual.animation + content.steps)
9. real-life — cards: Shopping, Sports, Gaming, Cooking, Travel, School (one sentence each)
10. common-mistakes — warning cards: mistake, why, fix
11. remember-this — max 8 exam-revision bullets
12. cheat-sheet — one-screen revision: formulas, steps, rules, tricks (6-10 items)
13. flashcards — ${STUDY_PROMPT_LIMITS.minFlashcards}+ interactive cards (front question, back max 2 lines)
14. quick-quiz — easy→medium→hard progression with explanation + whyWrong for each
15. knowledge-check — mix of true-false, fill-blank, match, sequence items
16. ask-ai — 8-12 concept-specific student doubts (NOT generic)
17. final-revision — key formulas, mind map visual, exam tips, time tricks
18. celebration — progress, XP, stars, achievement, next topic recommendation

AGE RULES: ${ageRules}
EXAM RULES: ${examRule}

MINIMUM COUNTS:
- concept cards: 3
- flashcards: ${STUDY_PROMPT_LIMITS.minFlashcards}
- quick-quiz questions: 7 (2 easy, 3 medium, 2 hard)
- why-learn cards: 3
- knowledge-check items: 5

OUTPUT JSON SCHEMA:
${STUDY_INTERACTIVE_JSON_SCHEMA}

${STUDY_INTERACTIVE_STYLE_RULES}`;
}
