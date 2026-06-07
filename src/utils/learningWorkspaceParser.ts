/**
 * Parse assistant JSON into workspace cards; fallback to plain text.
 */

import type {
  LearningCardType,
  LearningWorkspaceCard,
  LearningWorkspaceResponse,
} from '@/types/learningWorkspace';
import { normalizeFlashcardList, normalizeFlashcardPair } from '@/utils/flashcardNormalize';

const CARD_TYPES = new Set<LearningCardType>([
  'hook',
  'explanation',
  'text',
  'diagram',
  'image',
  'interactive',
  'video',
  'audio',
  'example',
  'quiz',
  'flashcard',
  'askDeeper',
  'progress',
  'timeline',
  'comparison',
  'code',
  'formula',
]);

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
  return items.length ? items : undefined;
}

function normalizeCard(raw: unknown): LearningWorkspaceCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = asString(obj.type) as LearningCardType | undefined;
  if (!type || !CARD_TYPES.has(type)) return null;

  const card: LearningWorkspaceCard = { type };

  card.title = asString(obj.title);
  card.body = asString(obj.body) ?? asString(obj.text);
  card.bullets = asStringArray(obj.bullets);
  card.readMore = asString(obj.readMore);
  card.imageUrl = asString(obj.imageUrl);
  card.imageAlt = asString(obj.imageAlt);
  card.videoUrl = asString(obj.videoUrl);
  card.videoLabel = asString(obj.videoLabel);
  card.audioText = asString(obj.audioText);
  card.exampleEmoji = asString(obj.exampleEmoji);
  card.question = asString(obj.question);
  card.correctOptionId = asString(obj.correctOptionId);
  card.correctFeedback = asString(obj.correctFeedback);
  card.wrongFeedback = asString(obj.wrongFeedback);
  const singlePair = normalizeFlashcardPair(obj);
  if (singlePair) {
    card.front = singlePair.front;
    card.back = singlePair.back;
  }
  card.progressLabel = asString(obj.progressLabel);
  card.code = asString(obj.code);
  card.language = asString(obj.language);
  card.formula = asString(obj.formula);
  card.formulaExplanation = asString(obj.formulaExplanation);

  if (typeof obj.progressPercent === 'number' && Number.isFinite(obj.progressPercent)) {
    card.progressPercent = Math.max(0, Math.min(100, Math.round(obj.progressPercent)));
  }

  if (Array.isArray(obj.hotspots)) {
    card.hotspots = obj.hotspots
      .map((h) => {
        if (!h || typeof h !== 'object') return null;
        const hs = h as Record<string, unknown>;
        const label = asString(hs.label);
        const detail = asString(hs.detail);
        if (!label || !detail) return null;
        return {
          id: asString(hs.id) || label.toLowerCase().replace(/\s+/g, '-'),
          label,
          detail,
        };
      })
      .filter(Boolean) as LearningWorkspaceCard['hotspots'];
  }

  if (Array.isArray(obj.options)) {
    card.options = obj.options
      .map((o, i) => {
        if (!o || typeof o !== 'object') return null;
        const opt = o as Record<string, unknown>;
        const label = asString(opt.label);
        if (!label) return null;
        return { id: asString(opt.id) || `opt-${i}`, label };
      })
      .filter(Boolean) as LearningWorkspaceCard['options'];
  }

  if (Array.isArray(obj.prompts)) {
    card.prompts = asStringArray(obj.prompts);
  }

  if (Array.isArray(obj.flashcards)) {
    card.flashcards = normalizeFlashcardList(obj.flashcards);
  }

  if (obj.comparison && typeof obj.comparison === 'object') {
    const cmp = obj.comparison as Record<string, unknown>;
    const leftTitle = asString(cmp.leftTitle);
    const leftBody = asString(cmp.leftBody);
    const rightTitle = asString(cmp.rightTitle);
    const rightBody = asString(cmp.rightBody);
    if (leftTitle && leftBody && rightTitle && rightBody) {
      card.comparison = { leftTitle, leftBody, rightTitle, rightBody };
    }
  }

  if (Array.isArray(obj.timeline)) {
    card.timeline = obj.timeline
      .map((t) => {
        if (!t || typeof t !== 'object') return null;
        const row = t as Record<string, unknown>;
        const label = asString(row.label);
        const detail = asString(row.detail);
        if (!label || !detail) return null;
        return { label, detail };
      })
      .filter(Boolean) as NonNullable<LearningWorkspaceCard['timeline']>;
  }

  return card;
}

export function parseLearningWorkspace(content: string): LearningWorkspaceResponse | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : trimmed;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const topic = asString(parsed.topic) || 'Your topic';
    const cardsRaw = Array.isArray(parsed.cards) ? parsed.cards : [];
    const cards = cardsRaw.map(normalizeCard).filter(Boolean) as LearningWorkspaceCard[];

    if (!cards.length) return null;

    let progressPercent: number | undefined;
    if (typeof parsed.progressPercent === 'number' && Number.isFinite(parsed.progressPercent)) {
      progressPercent = Math.max(0, Math.min(100, Math.round(parsed.progressPercent)));
    }

    return { topic, progressPercent, cards };
  } catch {
    return null;
  }
}

export function plainTextWorkspace(content: string): LearningWorkspaceResponse {
  return {
    topic: 'Learning',
    cards: [{ type: 'text', title: 'Response', body: content }],
  };
}

export function resolveWorkspace(content: string): LearningWorkspaceResponse {
  return parseLearningWorkspace(content) ?? plainTextWorkspace(content);
}
