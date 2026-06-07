/** Only show images stored from Ollama Cloud generation (/uploads/quiz-images/). */
export const OLLAMA_IMAGE_PATH = '/uploads/quiz-images/';

export function isOllamaGeneratedImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return trimmed.startsWith(OLLAMA_IMAGE_PATH) || trimmed.includes('/uploads/quiz-images/');
}

export function resolveOllamaImageUrl(url?: string | null): string | undefined {
  if (!isOllamaGeneratedImageUrl(url)) return undefined;
  const trimmed = url!.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
