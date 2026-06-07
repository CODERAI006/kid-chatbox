/** Resolve stored quiz image paths for dev proxy and production static serving. */
export function resolveQuizQuestionImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
