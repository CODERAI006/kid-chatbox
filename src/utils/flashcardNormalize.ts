/**
 * Normalize AI flashcard shapes to { front, back }.
 * Models often use question/answer or term/definition instead of front/back.
 */

export interface FlashcardItem {
  front: string;
  back: string;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeFlashcardPair(raw: unknown): FlashcardItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const front = pickString(obj, ['front', 'question', 'term', 'prompt', 'q', 'card']);
  const back = pickString(obj, [
    'back',
    'answer',
    'definition',
    'response',
    'reply',
    'a',
    'meaning',
    'explanation',
  ]);

  if (!front || !back) return null;
  return { front, back };
}

export function normalizeFlashcardList(raw: unknown): FlashcardItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeFlashcardPair).filter(Boolean) as FlashcardItem[];
}

export function flashcardsFromWorkspaceCard(card: {
  flashcards?: FlashcardItem[];
  front?: string;
  back?: string;
}): FlashcardItem[] {
  const fromList = normalizeFlashcardList(card.flashcards);
  if (fromList.length) return fromList;

  const single = normalizeFlashcardPair({ front: card.front, back: card.back });
  return single ? [single] : [];
}
