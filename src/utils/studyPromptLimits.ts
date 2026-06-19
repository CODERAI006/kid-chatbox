/** Limits and validation for Study Mode AI prompts and responses. */

export const STUDY_PROMPT_LIMITS = {
  maxExtraInstructionsChars: 400,
  maxTopicChars: 120,
  maxSubjectChars: 60,
  minIntroLines: 10,
  minFlashcards: 20,
  minKeyPoints: 20,
  minExplanationSteps: 4,
  maxNumPredict: 8192,
} as const;

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeStudyText(input: string, maxLen: number): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function validateStudyInputs(params: {
  topic: string;
  subject: string;
  instructions?: string;
}): { ok: true; topic: string; subject: string; instructions: string } | { ok: false; message: string } {
  const topic = sanitizeStudyText(params.topic, STUDY_PROMPT_LIMITS.maxTopicChars);
  const subject = sanitizeStudyText(params.subject, STUDY_PROMPT_LIMITS.maxSubjectChars);
  const instructions = sanitizeStudyText(
    params.instructions || '',
    STUDY_PROMPT_LIMITS.maxExtraInstructionsChars,
  );

  if (!topic) {
    return { ok: false, message: 'Please enter a shorter, clearer topic (max 120 characters).' };
  }
  if (!subject) {
    return { ok: false, message: 'Please choose a valid subject.' };
  }
  if ((params.instructions || '').length > STUDY_PROMPT_LIMITS.maxExtraInstructionsChars) {
    return {
      ok: false,
      message: `Extra instructions are too long (max ${STUDY_PROMPT_LIMITS.maxExtraInstructionsChars} characters).`,
    };
  }

  return { ok: true, topic, subject, instructions };
}

/** Count story lines: non-empty lines or sentence-like segments. */
export function countIntroLines(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const byNewline = trimmed.split(/\n+/).filter((l) => l.trim().length > 8);
  if (byNewline.length >= STUDY_PROMPT_LIMITS.minIntroLines) return byNewline.length;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 12);
  return Math.max(byNewline.length, sentences.length);
}

export function validateLessonIntro(introText: string): string | null {
  const lines = countIntroLines(introText);
  if (lines < STUDY_PROMPT_LIMITS.minIntroLines) {
    return `Story introduction is too short (${lines}/${STUDY_PROMPT_LIMITS.minIntroLines} lines). Please try generating again.`;
  }
  return null;
}
