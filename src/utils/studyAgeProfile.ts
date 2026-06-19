/** Age bands and section visibility for Study Mode (ages 4–19). */

export type StudyAgeBand = 'early' | 'primary' | 'middle' | 'secondary';

export interface StudySectionVisibility {
  examNotes: boolean;
  commonMistakes: boolean;
  thinkingQuestions: boolean;
  practiceQuestions: boolean;
  oneMinuteRevision: boolean;
  visualLearning: boolean;
  keyTerms: boolean;
}

const CLASS_AGE: Record<number, number> = {
  1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 15, 11: 16, 12: 17,
};

export function parseClassNumber(gradeLevel?: string): number | null {
  if (!gradeLevel) return null;
  const m = gradeLevel.match(/(?:class|grade)\s*(\d{1,2})/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? n : null;
}

export function resolveStudentAge(age?: number, gradeLevel?: string): number {
  if (typeof age === 'number' && age >= 4 && age <= 19) return Math.round(age);
  const cls = parseClassNumber(gradeLevel);
  if (cls && CLASS_AGE[cls]) return CLASS_AGE[cls];
  return 10;
}

export function getStudyAgeBand(studentAge: number): StudyAgeBand {
  if (studentAge <= 8) return 'early';
  if (studentAge <= 11) return 'primary';
  if (studentAge <= 14) return 'middle';
  return 'secondary';
}

export function getStudySectionVisibility(band: StudyAgeBand): StudySectionVisibility {
  switch (band) {
    case 'early':
      return {
        examNotes: false,
        commonMistakes: false,
        thinkingQuestions: false,
        practiceQuestions: true,
        oneMinuteRevision: true,
        visualLearning: true,
        keyTerms: true,
      };
    case 'primary':
      return {
        examNotes: false,
        commonMistakes: true,
        thinkingQuestions: true,
        practiceQuestions: true,
        oneMinuteRevision: true,
        visualLearning: true,
        keyTerms: true,
      };
    case 'middle':
      return {
        examNotes: true,
        commonMistakes: true,
        thinkingQuestions: true,
        practiceQuestions: true,
        oneMinuteRevision: true,
        visualLearning: true,
        keyTerms: true,
      };
    default:
      return {
        examNotes: true,
        commonMistakes: true,
        thinkingQuestions: true,
        practiceQuestions: true,
        oneMinuteRevision: true,
        visualLearning: true,
        keyTerms: true,
      };
  }
}

export function getAgeBandStoryGuidance(band: StudyAgeBand, kidName: string): string {
  const guides: Record<StudyAgeBand, string> = {
    early: `Write like a bedtime story for ages 4–8. Use ${kidName}'s name, very short sentences, wonder, and gentle humour. No exam jargon.`,
    primary: `Write like an adventure story for ages 9–11. Use ${kidName}'s name, vivid scenes, and curious questions. Keep vocabulary simple.`,
    middle: `Write like a discovery story for ages 12–14. Balance narrative with clear facts. Connect to school life and hobbies.`,
    secondary: `Write like an engaging magazine feature for ages 15–19. Strong hook, real-world stakes, and board-relevant depth where needed.`,
  };
  return guides[band];
}

export function getAgeBandLabel(band: StudyAgeBand): string {
  const labels: Record<StudyAgeBand, string> = {
    early: 'Young learners (4–8)',
    primary: 'Primary (9–11)',
    middle: 'Middle school (12–14)',
    secondary: 'Senior (15–19)',
  };
  return labels[band];
}
