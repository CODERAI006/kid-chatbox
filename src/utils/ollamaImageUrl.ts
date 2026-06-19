/** Ollama Cloud uploads and Pollinations.ai fallback URLs for quiz/study images. */
export const OLLAMA_IMAGE_PATH = '/uploads/quiz-images/';
const POLLINATIONS_HOST = 'image.pollinations.ai';

export function isOllamaGeneratedImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith(OLLAMA_IMAGE_PATH) || trimmed.includes('/uploads/quiz-images/');
}

export function isPollinationsImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.includes(POLLINATIONS_HOST)) return true;
  try {
    return new URL(trimmed).hostname === POLLINATIONS_HOST;
  } catch {
    return false;
  }
}

export function isQuizImageUrl(url?: string | null): boolean {
  return isOllamaGeneratedImageUrl(url) || isPollinationsImageUrl(url);
}

export function resolveOllamaImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (isPollinationsImageUrl(trimmed)) return trimmed;
  if (!isOllamaGeneratedImageUrl(trimmed)) return undefined;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
