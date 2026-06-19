/**
 * Per-class daily cache for Facts & Fun payloads.
 */

import type { DailyFactsResponse } from '@/types/dailyFacts';
import { toYMD } from '@/utils/calendarDay';
import { gradeCacheSegment } from '@/utils/wordOfDayDailyCache';

const STORAGE_PREFIX = 'facts_fun_daily_v2';

const memory = new Map<string, DailyFactsResponse>();
const inflight = new Map<string, Promise<DailyFactsResponse>>();

export interface DailyFactsCacheOptions {
  bypassCache?: boolean;
}

function normalizeDate(date?: string): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return toYMD(new Date());
}

function storageKey(grade?: string, date?: string): string {
  return `${STORAGE_PREFIX}:${gradeCacheSegment(grade)}:${normalizeDate(date)}`;
}

function isValidPayload(data: DailyFactsResponse | null | undefined): data is DailyFactsResponse {
  return Boolean(data?.success && data.facts?.length);
}

function readLocal(key: string): DailyFactsResponse | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyFactsResponse;
    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, data: DailyFactsResponse): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota or private browsing */
  }
}

export function readDailyFactsCache(grade?: string, date?: string): DailyFactsResponse | null {
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

export function writeDailyFactsCache(
  grade: string | undefined,
  date: string | undefined,
  data: DailyFactsResponse,
): void {
  if (!isValidPayload(data)) return;
  const key = storageKey(grade, date);
  memory.set(key, data);
  writeLocal(key, data);
}

export async function fetchDailyFactsCached(
  fetchFn: () => Promise<DailyFactsResponse>,
  grade?: string,
  date?: string,
  options?: DailyFactsCacheOptions,
): Promise<DailyFactsResponse> {
  const key = storageKey(grade, date);

  if (!options?.bypassCache) {
    const cached = readDailyFactsCache(grade, date);
    if (cached) return cached;

    const pending = inflight.get(key);
    if (pending) return pending;
  } else {
    inflight.delete(key);
  }

  const promise = fetchFn()
    .then((data) => {
      if (isValidPayload(data)) writeDailyFactsCache(grade, date, data);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
