/**
 * Detect workspace vs conversational replies for rendering and mode restore.
 */
import type { LearningBotUiMessage } from '@/services/api';
import type { LearningBotMode } from '@/types/learningWorkspace';
import { parseLearningWorkspace } from '@/utils/learningWorkspaceParser';

export function isWorkspaceContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('"cards"')) return false;
  return parseLearningWorkspace(trimmed) !== null;
}

export function inferChatMode(messages: LearningBotUiMessage[]): LearningBotMode {
  for (const m of messages) {
    if (m.role === 'assistant' && isWorkspaceContent(m.content)) return 'workspace';
  }
  if (messages.some((m) => m.role === 'assistant')) return 'chat';
  return 'workspace';
}
