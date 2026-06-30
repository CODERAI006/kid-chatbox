/** Limits and validation for Study Mode AI prompts and responses. */

export const STUDY_PROMPT_LIMITS = {
  maxExtraInstructionsChars: 400,
  maxTopicChars: 120,
  maxSubjectChars: 60,
  /** Legacy story intro — only enforced for old-format lessons. */
  minIntroLines: 8,
  minFlashcards: 12,
  minKeyPoints: 8,
  minConceptCards: 3,
  minQuickQuiz: 5,
  minSections: 15,
  minExplanationSteps: 4,
  maxNumPredict: 16384,
  maxLessonAttempts: 3,
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

/** Expand a slightly-short story intro using lesson context instead of failing generation. */
export function padLessonIntro(
  introText: string,
  extras: { whyLearnThis?: string; summary?: string; keyPoints?: string[] },
  topic: string,
): string {
  let text = introText.trim();
  if (!text || countIntroLines(text) >= STUDY_PROMPT_LIMITS.minIntroLines) {
    return text;
  }

  const sources = [
    extras.whyLearnThis,
    extras.summary,
    ...(extras.keyPoints || []).slice(0, 6),
  ].filter((s): s is string => Boolean(s?.trim()));

  for (const source of sources) {
    if (countIntroLines(text) >= STUDY_PROMPT_LIMITS.minIntroLines) break;
    const parts = source
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    for (const part of parts) {
      if (countIntroLines(text) >= STUDY_PROMPT_LIMITS.minIntroLines) break;
      if (text.includes(part)) continue;
      text += `\n\n${part}`;
    }
  }

  let safety = 0;
  while (countIntroLines(text) < STUDY_PROMPT_LIMITS.minIntroLines && safety < 2) {
    text +=
      `\n\nAs our story about ${topic} continues, each new detail helps you see why this topic matters in real life.`;
    safety += 1;
  }

  return text.trim();
}
