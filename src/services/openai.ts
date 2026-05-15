/**
 * Quiz AI via backend → local Ollama (see docs/ollama-api.md).
 */

import axios from 'axios';
import { QuizConfig, Question } from '@/types/quiz';
import { aiApi } from '@/services/api';

export function isQuizGenerationAbort(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return err.code === 'ERR_CANCELED' || err.name === 'CanceledError';
  }
  if (err && typeof err === 'object') {
    const name = (err as { name?: string }).name;
    if (name === 'AbortError') return true;
  }
  return false;
}

/**
 * Retry on:
 *  - SyntaxError (model returned malformed JSON)
 *  - empty_ai_response (Ollama returned blank — common on first cold call)
 *
 * Do NOT retry on network errors (Ollama down) — that surfaces a clear "not running" message.
 * Do NOT retry on axios cancellations.
 */
function isRetryableBatchFailure(err: unknown): boolean {
  if (isQuizGenerationAbort(err)) return false;
  if (axios.isAxiosError(err)) return false;
  if (err instanceof SyntaxError) return true;
  if (err instanceof Error && err.message === 'empty_ai_response') return true;
  return false;
}

/** True when Ollama is simply not reachable (not a model/parsing problem). */
export function isOllamaUnreachable(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return !err.response; // no HTTP response = network failure
  }
  if (err instanceof Error) {
    return (
      err.message.includes('Cannot reach Ollama') ||
      err.message.includes('fetch failed') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('Network Error')
    );
  }
  return false;
}

async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number,
  num_predict: number,
  timeoutMs?: number,
  signal?: AbortSignal
): Promise<string> {
  const { content, model } = await aiApi.chat({
    messages,
    temperature,
    num_predict,
    timeoutMs,
    signal,
  });
  console.info('[QuizAI] chatCompletion received', {
    model,
    contentChars: content?.length ?? 0,
    preview: content?.slice(0, 120),
  });
  return content;
}

/**
 * Ollama sometimes emits `["number":1,...` instead of `[{"number":1,...` (missing `{` after `[`),
 * which makes JSON.parse fail — user stays on loading with no questions until retry succeeds.
 */
function repairMalformedQuizArrayJson(json: string): string {
  const s = json.trim();
  if (/^\[\s*"number"\s*:/i.test(s) && !/^\[\s*\{/.test(s)) {
    return s.replace(/^\[\s*"number"\s*:/i, '[{"number":');
  }
  return s;
}

/** Pull JSON array from model output (markdown fences, preamble, trailing text). */
function extractJsonArrayFromModelOutput(raw: string): string {
  let s = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i;
  const fm = s.match(fence);
  if (fm) {
    s = fm[1].trim();
  }
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start !== -1 && end > start) {
    return repairMalformedQuizArrayJson(s.slice(start, end + 1));
  }
  return repairMalformedQuizArrayJson(s);
}

function extractPrimaryJsonPayloadFromModelOutput(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return trimmed;
  }

  const fence = /```(?:json)?\s*([\s\S]*?)```/i;
  const fm = trimmed.match(fence);
  const candidate = fm ? fm[1].trim() : trimmed;

  const firstBrace = candidate.indexOf('{');
  const firstBracket = candidate.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) {
    return candidate;
  }

  const startsWithObject =
    firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
  const start = startsWithObject ? firstBrace : firstBracket;
  const openChar = startsWithObject ? '{' : '[';
  const closeChar = startsWithObject ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, i + 1);
      }
    }
  }

  return candidate.slice(start);
}

function extractQuestionArrayFromParsedPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const knownArrayKeys = ['questions', 'items', 'data', 'quiz', 'result'];

    for (const key of knownArrayKeys) {
      if (Array.isArray(data[key])) {
        return data[key] as unknown[];
      }
    }

    const objectKeys = Object.keys(data);
    const numericKeysOnly =
      objectKeys.length > 0 && objectKeys.every((k) => /^\d+$/.test(k));
    if (numericKeysOnly) {
      return objectKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k]);
    }
  }

  return [];
}

function normalizeLetterAnswer(v: unknown): 'A' | 'B' | 'C' | 'D' | null {
  const x = String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^ABCD]/g, '');
  if (x === 'A' || x === 'B' || x === 'C' || x === 'D') return x;
  return null;
}

/** Chunk size when a quiz is too large for one response (truncation risk). */
const QUIZ_BATCH_SIZE = 5;
/**
 * Single-call cap: above this, chunk into QUIZ_BATCH_SIZE (logs show 15-q Expert JSON often truncates or breaks).
 */
const QUIZ_SINGLE_CALL_MAX_QUESTIONS = 50;

function buildBatchQuizPrompt(
  config: QuizConfig,
  batchSize: number,
  batchIndex: number,
  totalBatches: number
): string {
  let difficultyLevel: string;
  let questionLength: string;

  switch (config.difficulty) {
    case 'Basic':
      difficultyLevel = config.age <= 8 ? 'very easy' : config.age <= 10 ? 'easy' : 'medium';
      questionLength = 'One short sentence per question stem.';
      break;
    case 'Advanced':
      difficultyLevel = config.age <= 8 ? 'easy' : config.age <= 10 ? 'medium' : 'moderately challenging';
      questionLength = 'Up to 2 short sentences per stem; include a little context.';
      break;
    case 'Expert':
      difficultyLevel = config.age <= 10 ? 'challenging' : 'advanced';
      questionLength = 'Up to 2–3 short sentences per stem; require reasoning.';
      break;
    case 'Mix':
      difficultyLevel = 'varied difficulty';
      questionLength = 'Vary stem length: some one line, some two lines.';
      break;
    default:
      difficultyLevel = 'medium';
      questionLength = 'Keep stems age-appropriate.';
  }

  const languageInstruction =
    config.language === 'Hindi'
      ? 'Mostly simple Hindi (Devanagari or clear Roman).'
      : config.language === 'English'
      ? 'English only.'
      : 'Simple mix of Hindi and English.';

  const subtopicsText =
    config.subtopics.length === 1 ? config.subtopics[0] : config.subtopics.join(', ');

  const isCurrentAffairs = config.subject.toLowerCase().includes('current affairs');
  const isChess = config.subject.toLowerCase().includes('chess');

  let subjectHint = '';
  if (isCurrentAffairs) {
    subjectHint = `Current affairs: use events from roughly the last 1–2 years; kid-friendly; avoid heavy politics. Today (UTC): ${new Date().toISOString().slice(0, 10)}.`;
  } else if (isChess) {
    subjectHint = `Chess: age ${config.age}; simple notation OK with plain-language hints.`;
  }

  const userExtra = config.instructions ? config.instructions.trim().slice(0, 700) : '';
  const sample = config.sampleQuestion ? config.sampleQuestion.trim().slice(0, 450) : '';
  const grade = config.gradeLevel ? `Grade/class: ${config.gradeLevel}. ` : '';
  const exam = config.examStyle ? `Exam style: ${config.examStyle}. ` : '';

  return `You generate multiple-choice quiz items for children.

Batch ${batchIndex + 1} of ${totalBatches}: output EXACTLY ${batchSize} questions (JSON array length ${batchSize}).
Context: age ${config.age}, ${languageInstruction}
Subject: ${config.subject}. Subtopic(s): ${subtopicsText}.
Difficulty: ${config.difficulty} (${difficultyLevel}). ${grade}${exam}
Stem style: ${questionLength}
${subjectHint ? `${subjectHint}\n` : ''}
${userExtra ? `Teacher notes (follow if possible):\n${userExtra}\n` : ''}
${sample ? `Style sample (match level, not wording):\n${sample}\n` : ''}

Hard rules (so JSON is not cut off):
- Each item: "number" (1..${batchSize} within this batch), "question", "options" with keys A B C D, "correctAnswer" (single letter A–D), "explanation".
- "explanation": MAX 2 short sentences (~40 words). Name why the right option is right; one line on wrong options is enough.
- One clearly correct option; three plausible distractors.
- Return ONLY one JSON array. No markdown, no text before or after the array.

Shape:
[{"number":1,"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"A","explanation":"..."}, ...]`;
}

/**
 * Generates quiz questions based on configuration
 * @param config - Quiz configuration (age, language, subject, subtopic, difficulty)
 * @returns Promise resolving to array of quiz questions
 * @throws {Error} If API call fails or returns invalid data
 */
export type GenerateQuizProgress = { batchIndex: number; totalBatches: number };

export async function generateQuizQuestions(
  config: QuizConfig,
  opts?: { signal?: AbortSignal; onProgress?: (p: GenerateQuizProgress) => void }
): Promise<Question[]> {
  const signal = opts?.signal;
  const onProgress = opts?.onProgress;
  const systemMsg =
    'You are a helpful assistant that generates educational quiz questions for children. ' +
    'Return ONLY a single valid JSON array (no markdown, no commentary before or after). ' +
    'Each array element must be one complete question object.';

  const runOnce = async (userPrompt: string, numPredict: number) => {
    if (signal?.aborted) {
      const e = new DOMException('Quiz generation was cancelled.', 'AbortError');
      throw e;
    }
    return chatCompletion(
      [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userPrompt },
      ],
      0.65,
      numPredict,
      480_000,
      signal
    );
  };

  const parseBatch = (content: string, expectedInBatch: number): Question[] => {
    const raw = String(content ?? '').trim();
    console.info('[QuizAI] parseBatch start', {
      expectedInBatch,
      rawChars: raw.length,
      firstChar: raw[0],
      preview: raw.slice(0, 80),
    });
    if (!raw) {
      throw new Error('empty_ai_response');
    }
    let arr: unknown[];
    const payloadString = extractPrimaryJsonPayloadFromModelOutput(raw);
    try {
      const parsed = JSON.parse(payloadString) as unknown;
      arr = extractQuestionArrayFromParsedPayload(parsed);
    } catch {
      const jsonArrayString = extractJsonArrayFromModelOutput(raw);
      try {
        const parsedArrayFallback = JSON.parse(jsonArrayString) as unknown;
        arr = extractQuestionArrayFromParsedPayload(parsedArrayFallback);
      } catch {
        console.error('[QuizAI] Failed to parse batch JSON', {
          expectedInBatch,
          rawChars: raw.length,
          payloadChars: payloadString.length,
          preview: raw.slice(0, 300),
        });
        throw new SyntaxError('quiz_batch_json');
      }
    }
    const parsedCount = Array.isArray(arr) ? arr.length : 0;
    console.info('[QuizAI] Parsed batch response', { expectedInBatch, parsedCount });
    if (!Array.isArray(arr) || parsedCount === 0) {
      // Retryable — Ollama sometimes returns empty on first cold call
      throw new Error('empty_ai_response');
    }
    if (parsedCount < expectedInBatch) {
      console.warn('[QuizAI] Batch returned fewer questions than expected', {
        expected: expectedInBatch,
        received: parsedCount,
      });
      // Accept partial — validateAndNormalize decides at the aggregate level
    }
    const slice = arr.length > expectedInBatch ? arr.slice(0, expectedInBatch) : arr;
    return slice as Question[];
  };

  /** Accept at least 80 % of the requested count so one short Ollama response doesn't kill the quiz. */
  const MIN_ACCEPT_RATIO = 0.8;

  const validateAndNormalize = (raw: Question[], expected: number): Question[] => {
    const questions = raw.length > expected ? raw.slice(0, expected) : raw;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(
        'No questions were generated. Make sure Ollama is running and try again.'
      );
    }

    const optionToText = (v: unknown): string => {
      if (v == null) return '';
      if (typeof v === 'string') return v.trim();
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return String(v).trim();
    };

    const validated: Question[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] as Question & { options?: Record<string, unknown> };
      const opts = q.options || {};
      const A = optionToText(opts.A ?? (opts as { a?: unknown }).a);
      const B = optionToText(opts.B ?? (opts as { b?: unknown }).b);
      const C = optionToText(opts.C ?? (opts as { c?: unknown }).c);
      const D = optionToText(opts.D ?? (opts as { d?: unknown }).d);
      const letter = normalizeLetterAnswer(q.correctAnswer);
      const explanationRaw = String((q as { explanation?: unknown }).explanation ?? '').trim();
      const explanation =
        explanationRaw ||
        'The correct option matches what the question is asking; the other choices are close but not the best fit.';
      const stem = String((q as { question?: unknown }).question ?? '').trim();
      if (!stem || !A || !B || !C || !D || !letter) {
        // Skip invalid items rather than failing the entire quiz
        console.warn('[QuizAI] Skipping invalid question structure', {
          item: i + 1,
          stem: !!stem,
          A: !!A,
          B: !!B,
          C: !!C,
          D: !!D,
          letter,
          raw: q,
        });
        continue;
      }
      q.question = stem;
      q.options = { A, B, C, D };
      q.correctAnswer = letter;
      q.explanation = explanation;
      q.number = validated.length + 1;
      validated.push(q);
    }

    if (validated.length === 0) {
      throw new Error('No valid questions were found in the model response. Try again.');
    }
    const minAcceptableAfterValidation = Math.max(1, Math.floor(expected * MIN_ACCEPT_RATIO));
    if (validated.length < minAcceptableAfterValidation) {
      throw new Error(
        `Only ${validated.length} of ${expected} questions passed validation ` +
          `(need at least ${minAcceptableAfterValidation}). Try again or use Basic difficulty.`
      );
    }
    if (validated.length < expected) {
      console.warn(`[QuizAI] Proceeding with ${validated.length}/${expected} valid questions.`);
    }
    return validated;
  };

  const total = config.questionCount;
  const batches: number[] = [];
  if (total <= QUIZ_SINGLE_CALL_MAX_QUESTIONS) {
    batches.push(total);
  } else {
    for (let i = 0; i < total; i += QUIZ_BATCH_SIZE) {
      batches.push(Math.min(QUIZ_BATCH_SIZE, total - i));
    }
  }
  const totalBatches = batches.length;
  const merged: Question[] = [];

  try {
    for (let b = 0; b < batches.length; b++) {
      if (signal?.aborted) {
        throw new DOMException('Quiz generation was cancelled.', 'AbortError');
      }
      onProgress?.({ batchIndex: b + 1, totalBatches });
      const n = batches[b];
      const prompt = buildBatchQuizPrompt(config, n, b, totalBatches);
      const tokens = Math.min(16384, Math.max(6144, 1024 + n * 1100));

      let content: string;
      try {
        content = await runOnce(prompt, tokens);
        merged.push(...parseBatch(content, n));
      } catch (firstErr) {
        if (isQuizGenerationAbort(firstErr)) {
          throw firstErr;
        }
        if (!isRetryableBatchFailure(firstErr)) {
          throw firstErr;
        }
        const shortPrompt = `${prompt}\n\nRETRY: Invalid or truncated JSON before. Reply with ONLY a JSON array of exactly ${n} objects. Shorter stems; explanation max 1–2 sentences each.`;
        content = await runOnce(shortPrompt, 16384);
        merged.push(...parseBatch(content, n));
      }
    }

    return validateAndNormalize(merged, total);
  } catch (error) {
    if (isQuizGenerationAbort(error)) {
      throw error;
    }
    console.error('[QuizAI] generateQuizQuestions caught error', {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      isOllamaDown: isOllamaUnreachable(error),
      isSyntax: error instanceof SyntaxError,
    });
    if (isOllamaUnreachable(error)) {
      throw new Error(
        'Ollama is not reachable. Please start Ollama (run: ollama serve) and try again.'
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        'Failed to parse quiz questions (model did not return valid JSON). Try again or switch the Ollama model.'
      );
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while generating quiz questions.');
  }
}

/**
 * Generates improvement tips based on quiz results
 * @param wrongAnswers - Array of wrong answers with explanations
 * @param age - Age of the child
 * @param language - Language preference
 * @returns Promise resolving to array of improvement tips
 */
export async function generateImprovementTips(
  wrongAnswers: Array<{
    questionNumber: number;
    question: string;
    childAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>,
  age: number,
  language: string
): Promise<string[]> {
  if (wrongAnswers.length === 0) {
    return ['Great job! You answered all questions correctly! 🎉'];
  }

  const languageInstruction =
    language === 'Hindi'
      ? 'Use simple Hindi words. Be encouraging and friendly.'
      : language === 'English'
      ? 'Use simple English. Be encouraging and friendly.'
      : 'Mix simple Hindi and English. Be encouraging and friendly.';

  const prompt = `You are a friendly AI tutor helping a ${age}-year-old child improve.

The child got these questions wrong:
${wrongAnswers
  .map(
    (wa) => `
Question ${wa.questionNumber}: ${wa.question}
Child's answer: ${wa.childAnswer}
Correct answer: ${wa.correctAnswer}
Explanation: ${wa.explanation}
`
  )
  .join('\n')}

${languageInstruction}

Generate 3-5 short, encouraging improvement tips (1-2 lines each) to help the child improve.
Be positive, friendly, and use simple language appropriate for age ${age}.

Return ONLY a JSON array of strings:
["Tip 1", "Tip 2", "Tip 3", ...]`;

  try {
    const content = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates encouraging improvement tips for children. Always return valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      0.7,
      2048
    );

    const jsonString = extractJsonArrayFromModelOutput(content);

    const tips = JSON.parse(jsonString) as string[];

    if (!Array.isArray(tips) || tips.length === 0) {
      return ['Keep practicing! You are doing great! 🌟'];
    }

    return tips;
  } catch (error) {
    console.error('Error generating improvement tips:', error);
    return [
      'Keep practicing! Review the explanations and try again! 🌟',
    ];
  }
}
