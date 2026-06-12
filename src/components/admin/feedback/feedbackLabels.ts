import { FEATURE_WISHES, RATING_EMOJIS } from '@/constants/feedback';

const wishMap = Object.fromEntries(FEATURE_WISHES.map((f) => [f.id, f.label]));

export function wishLabel(id: string): string {
  return wishMap[id] || id.replace(/_/g, ' ');
}

export function ratingEmoji(rating: number): string {
  return RATING_EMOJIS[Math.min(Math.max(rating, 1), 5) - 1] || '⭐';
}

export function sourceLabel(source: string): string {
  if (source === 'quiz_results') return 'After Quiz';
  if (source === 'sidebar') return 'Side Nav';
  return 'General';
}
