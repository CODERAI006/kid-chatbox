/**
 * Guess study format from conversation history when reloading a saved chat.
 */
import type { LearningBotUiMessage } from '@/services/api';
import type { LearningStudyFormat } from '@/types/learningWorkspace';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';

const USER_HINTS: Array<{ format: LearningStudyFormat; patterns: RegExp[] }> = [
  { format: 'flashcards', patterns: [/only flashcards/i, /flashcard card with at least/i] },
  { format: 'visualize', patterns: [/only an interactive diagram/i, /diagram card with/i] },
  { format: 'watch', patterns: [/only a video card/i, /video card and an audio/i] },
  { format: 'quiz', patterns: [/only a quiz card/i, /quiz me on/i] },
  { format: 'detail', patterns: [/detailed readMore/i, /detailed lesson/i] },
  { format: 'learn', patterns: [/only a hook card and a short explanation/i] },
  { format: 'chat', patterns: [/let's talk about/i] },
];

function inferFromAssistant(messages: LearningBotUiMessage[]): LearningStudyFormat | null {
  const assistant = messages.find((m) => m.role === 'assistant');
  if (!assistant) return null;

  if (!assistant.content.trim().startsWith('{')) return 'chat';

  const ws = resolveWorkspace(assistant.content);
  const types = new Set(ws.cards.map((c) => c.type));

  if (types.has('flashcard') && !types.has('explanation') && !types.has('quiz')) return 'flashcards';
  if (types.has('quiz') && !types.has('flashcard')) return 'quiz';
  if (types.has('video') || types.has('audio')) return 'watch';
  if (types.has('diagram') || types.has('interactive') || types.has('image')) return 'visualize';
  if (types.has('explanation') || types.has('text')) {
    const expl = ws.cards.find((c) => c.type === 'explanation' || c.type === 'text');
    if (expl?.readMore && expl.readMore.length > 400) return 'detail';
    return 'learn';
  }
  return null;
}

export function inferStudyFormat(messages: LearningBotUiMessage[]): LearningStudyFormat | null {
  const firstUser = messages.find((m) => m.role === 'user');
  if (firstUser) {
    for (const { format, patterns } of USER_HINTS) {
      if (patterns.some((p) => p.test(firstUser.content))) return format;
    }
  }
  return inferFromAssistant(messages);
}
