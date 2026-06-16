/**
 * Per-class daily cache for Word of the Day + Expression of the Day payloads.
 * First open of the day fetches from the API; later opens reuse memory/localStorage.
 */

import type { WordOfDayResponse } from '@/types/wordOfDay';
import { toYMD } from '@/utils/calendarDay';

const STORAGE_PREFIX = 'wotd_daily_v10';

const memory = new Map<string, WordOfDayResponse>();
const inflight = new Map<string, Promise<WordOfDayResponse>>();

export interface WordsOfDayCacheOptions {
  bypassCache?: boolean;
}

function normalizeDate(date?: string): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return toYMD(new Date());
}

/** Align cache keys across grade label variants (e.g. "Class 5" vs "Class 5 / Grade 5"). */
export function gradeCacheSegment(grade?: string): string {
  const raw = String(grade || 'Class 5 / Grade 5').trim().toLowerCase();
  const match = raw.match(/(\d{1,2})/);
  if (match) return `class-${match[1]}`;
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}

function storageKey(grade?: string, date?: string): string {
  return `${STORAGE_PREFIX}:${gradeCacheSegment(grade)}:${normalizeDate(date)}`;
}

function isValidPayload(data: WordOfDayResponse | null | undefined): data is WordOfDayResponse {
  return Boolean(data?.success && data.words?.length);
}

function readLocal(key: string): WordOfDayResponse | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WordOfDayResponse;
    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, data: WordOfDayResponse): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota or private browsing */
  }
}

export function readWordsOfTheDayCache(
  grade?: string,
  date?: string,
): WordOfDayResponse | null {
  const key = storageKey(grade, date);
  const fromMemory = memory.get(key);
  if (isValidPayload(fromMemory)) return fromMemory;

  const fromStorage = readLocal(key);
  if (fromStorage) {
    memory.set(key, fromStorage);
    return fromStorage;
  }
  return null;
}

export function writeWordsOfTheDayCache(
  grade: string | undefined,
  date: string | undefined,
  data: WordOfDayResponse,
): void {
  if (!isValidPayload(data)) return;
  const key = storageKey(grade, date);
  memory.set(key, data);
  writeLocal(key, data);
}

export function clearWordsOfTheDayCache(grade?: string, date?: string): void {
  if (grade !== undefined && date !== undefined) {
    const key = storageKey(grade, date);
    memory.delete(key);
    inflight.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  memory.clear();
  inflight.clear();
}

/**
 * Returns cached data or runs fetchFn once per class+date (dedupes concurrent callers).
 */
export async function fetchWordsOfTheDayCached(
  fetchFn: () => Promise<WordOfDayResponse>,
  grade?: string,
  date?: string,
  options?: WordsOfDayCacheOptions,
): Promise<WordOfDayResponse> {
  const key = storageKey(grade, date);

  if (!options?.bypassCache) {
    const cached = readWordsOfTheDayCache(grade, date);
    if (cached) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;
  } else {
    inflight.delete(key);
  }

  const promise = fetchFn()
    .then((response) => {
      inflight.delete(key);
      if (isValidPayload(response)) {
        writeWordsOfTheDayCache(grade, date, response);
      }
      return response;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
