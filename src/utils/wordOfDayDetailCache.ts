/**
 * Client-side cache for Word of the Day detail pages — instant navigation after list load.
 */

import { publicApi } from '@/services/api';
import type { WordOfDayResponse } from '@/types/wordOfDay';

const PREFIX = 'wotd_detail_v1';

export function wordDetailCacheKey(word: string, date: string, grade: string): string {
  return `${PREFIX}:${grade}:${date}:${word.trim().toLowerCase()}`;
}

export function readWordDetailCache(
  word: string,
  date: string,
  grade: string,
): WordOfDayResponse | null {
  try {
    const raw = sessionStorage.getItem(wordDetailCacheKey(word, date, grade));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WordOfDayResponse;
    return parsed?.success && parsed?.word ? parsed : null;
  } catch {
    return null;
  }
}

export function writeWordDetailCache(
  word: string,
  date: string,
  grade: string,
  data: WordOfDayResponse,
): void {
  try {
    sessionStorage.setItem(wordDetailCacheKey(word, date, grade), JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

/** Prefetch full detail payloads for each word in the background. */
export async function prefetchWordOfDayDetails(
  words: string[],
  date: string,
  grade: string,
): Promise<void> {
  const targets = words
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !readWordDetailCache(w, date, grade));

  if (!targets.length) return;

  await Promise.all(
    targets.map(async (word) => {
      try {
        const response = await publicApi.getWordOfDayDetail(word, date, grade);
        if (response.success && response.word) {
          writeWordDetailCache(word, date, grade, response);
        }
      } catch {
        /* prefetch is best-effort */
      }
    }),
  );
}
