/**
 * Guess study format from conversation history when reloading a saved chat.
 */
import type { LearningBotUiMessage } from '@/services/api';
import type { LearningStudyFormat } from '@/types/learningWorkspace';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';

const USER_HINTS: Array<{ format: LearningStudyFormat; patterns: RegExp[] }> = [
  { format: 'flashcards', patterns: [/only flashcards/i, /flashcard card with at least/i] },
  { format: 'quiz', patterns: [/separate quiz cards/i, /quiz me on/i, /exactly \d+ separate quiz/i] },
  {
    format: 'detail',
    patterns: [/complete in-chat lesson/i, /Key facts/i, /Points to remember/i],
  },
  { format: 'learn', patterns: [/only a hook card and a short explanation/i] },
  { format: 'chat', patterns: [/let's talk about/i] },
  { format: 'conversation', patterns: [/voice conversation about/i, /friendly voice conversation/i] },
  { format: 'studyplan', patterns: [/preparing for/i, /Day \d+\)/i, /Plan my exam prep/i] },
];

function inferFromAssistant(messages: LearningBotUiMessage[]): LearningStudyFormat | null {
  const assistant = messages.find((m) => m.role === 'assistant');
  if (!assistant) return null;

  if (!assistant.content.trim().startsWith('{')) return 'chat';

  const ws = resolveWorkspace(assistant.content);
  const types = new Set(ws.cards.map((c) => c.type));
  const quizCount = ws.cards.filter((c) => c.type === 'quiz').length;

  if (types.has('flashcard') && !types.has('explanation') && !types.has('quiz')) return 'flashcards';
  if (quizCount >= 2 || (types.has('quiz') && !types.has('flashcard'))) return 'quiz';
  if (types.has('explanation') || types.has('text')) {
    const hasFacts = ws.cards.some(
      (c) => c.type === 'text' && /fact|remember/i.test(c.title || '')
    );
    const expl = ws.cards.find((c) => c.type === 'explanation' || c.type === 'text');
    if (hasFacts || (expl?.readMore && expl.readMore.length > 400)) return 'detail';
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
