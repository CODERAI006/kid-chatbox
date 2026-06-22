/**
 * CBSE study lesson prompt — 32-section premium curriculum module for Study Mode.
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
import { buildStudyModulePrompt } from '@/utils/studyModulePrompt';

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

  return buildStudyModulePrompt({
    topic,
    subject: config.subject,
    grade,
    curriculum: board,
    ageGroup: `${studentAge} years (${getAgeBandLabel(ageBand)})`,
    ageBand,
    studentName: kidName,
    language,
    lessonStyle,
    storyGuidance: storyGuide,
    extraInstructions: extraInstructions || undefined,
    showExamSection,
  });
}
