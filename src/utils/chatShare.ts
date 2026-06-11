import { APP_CONSTANTS } from '@/constants/app';

const SHARE_BASE = `Try ${APP_CONSTANTS.BRAND_NAME} — your AI study buddy!`;

export function buildNewChatShareText(topic?: string): string {
  if (topic && topic !== 'Pick a format to start') {
    return `${SHARE_BASE}\n\nI'm studying: ${topic}\nStart your own session today!`;
  }
  return `${SHARE_BASE}\n\nStart a fresh learning chat — pick a topic and learn with AI cards, quizzes & flashcards.`;
}

export async function shareOrCopyText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: APP_CONSTANTS.BRAND_NAME, text });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'failed';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
