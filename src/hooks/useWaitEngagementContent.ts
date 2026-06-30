/**
 * Vocabulary + expressions to show while AI generation runs.
 */

import { useEffect, useState } from 'react';
import { publicApi } from '@/services/api';
import type { DailyPhrase, WordEntry } from '@/types/wordOfDay';
import { getUserGradeLabel } from '@/components/wordOfDay/expressionUtils';

export type EngagementItem =
  | { kind: 'word'; word: WordEntry }
  | { kind: 'phrase'; phrase: DailyPhrase };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function useWaitEngagementContent(gradeLabel?: string) {
  const [items, setItems] = useState<EngagementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const grade = gradeLabel?.trim() || getUserGradeLabel();

    (async () => {
      setLoading(true);
      try {
        const res = await publicApi.getWordsOfTheDay(undefined, grade);
        if (cancelled) return;

        const list: EngagementItem[] = [];
        res.words.slice(0, 4).forEach((w) => list.push({ kind: 'word', word: w }));
        res.phrases.slice(0, 4).forEach((p) => list.push({ kind: 'phrase', phrase: p }));

        setItems(shuffle(list));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [gradeLabel]);

  return { items, loading };
}
