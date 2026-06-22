/**
 * Builds the 32-section curriculum designer prompt for Study Mode AI.
 */
import type { StudyAgeBand } from '@/utils/studyAgeProfile';
import { STUDY_PROMPT_LIMITS } from '@/utils/studyPromptLimits';
import { STUDY_MODULE_JSON_SCHEMA, STUDY_MODULE_STYLE_RULES } from './studyModulePromptSchema';

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
  storyGuidance: string;
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
    storyGuidance,
    extraInstructions,
    showExamSection,
  } = params;

  const ageRules =
    ageBand === 'early'
      ? 'Skip heavy exam jargon. misconceptions/examPrep may be shorter. thinkingQuestions: 3 minimum.'
      : ageBand === 'primary'
        ? 'Light exam tips only. Include comparisons and activities.'
        : 'Full exam prep, MCQs, case studies, and board-aligned content.';

  const examRule = showExamSection
    ? 'Include examPrep (5+5+5), examNotes, mcqs (10), and board-focused tips.'
    : 'Omit examPrep and examNotes or use empty arrays/objects.';

  return `You are an expert curriculum designer, child psychologist, instructional designer, and award-winning teacher.

Create a COMPLETE, HIGHLY ENGAGING, VISUALLY DESCRIPTIVE, STUDENT-FRIENDLY learning module.

TOPIC: ${topic}
Grade Level: ${grade}
Board/Curriculum: ${curriculum}
Student Age: ${ageGroup}
Subject: ${subject}
Student name: ${studentName}
Language: ${language}
Lesson style: ${lessonStyle}
${extraInstructions ? `Extra instructions (follow if safe): ${extraInstructions}` : ''}

GOAL: Generate study material more engaging, memorable, and effective than a standard textbook chapter.
Maximize: understanding, retention, curiosity, critical thinking, exam performance, real-world application.

SECTION GUIDE (map all into the JSON below):
1. lessonHeader — topic, subject, grade, difficulty, time, 5-8 objectives
2. introduction.text — STORY HOOK (300-500 words): relatable child protagonist, wonder, real-world examples, ends with a question
3. whyLearnThis — why it matters in daily life and future learning
4. quickSummary — 5-10 one-line revision bullets
5. visualLearningDescription — diagram descriptions, shape comparisons, ASCII sketches
6. concepts — each with definition, explanation, example, nonExample, commonMistake, checkQuestion
7. realWorldConnections — dailyLife, local, national, global arrays
8. memoryTricks — mnemonics, acronyms, analogies
9. keyTerms — term, definition, easyExample (10-20 terms)
10. funFacts — 5-10 surprising accurate facts
11. didYouKnow — 5 trivia points
12. thinkingQuestions — 5 reasoning questions (not memorization)
13. comparisons — spot-the-difference tables when relevant
14. misconceptions — wrong vs correct (5 items)
15. examPrep — easy/medium/difficult (5 each with answers)
16. mcqs — 10 with 4 options, correctIndex, explanation
17. trueFalse — 10 with answers
18. fillBlanks — 10 with answers
19. matchFollowing — 10 pairs
20. shortAnswer — 10 with model answers
21. longAnswer — 5 exam-style with model answers
22. caseStudies — 3 scenarios with application questions
23. activities — safe, home/classroom hands-on (materials, steps, expectedLearning)
24. projectWork — mini project, research, presentation, creative assignment
25. gamifiedChallenges — explorer/detective/quiz/observation missions, rewards, badges
26. flashcards — 20+ mixed definitions, comparisons, applications
27. oneMinuteRevision — 10 bullets for 60-second revision
28. hotQuestions — 5 critical + 5 creative + 5 analytical
29. aiTutorQa — 15 likely student questions with teacher-like answers
30. discussionPrompts — 5 parent/teacher conversation starters
31. learningLevels — beginner/intermediate/advanced/challenge questions with answers
32. learningOutcomes — measurable checklist (define, explain, compare, apply, analyze)

STORY RULE (CRITICAL):
- introduction.text is a STORY opening, NOT a bullet list.
- Minimum ${STUDY_PROMPT_LIMITS.minIntroLines} sentences/lines. ${storyGuidance}
- Separate paragraphs with \\n\\n.

AGE RULES: ${ageRules}
EXAM RULES: ${examRule}

MINIMUM COUNTS:
- flashcards: ${STUDY_PROMPT_LIMITS.minFlashcards}
- keyPoints: ${STUDY_PROMPT_LIMITS.minKeyPoints}
- keyTerms: 10
- concepts: at least 3

OUTPUT JSON SCHEMA:
${STUDY_MODULE_JSON_SCHEMA}

${STUDY_MODULE_STYLE_RULES}`;
}
