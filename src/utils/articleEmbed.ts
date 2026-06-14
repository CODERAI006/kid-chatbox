/** Hosts that block iframe embedding (X-Frame-Options / CSP frame-ancestors). */
const BLOCKED_IFRAME_HOSTS = new Set([
  'news.google.com',
  'consent.google.com',
  'accounts.google.com',
]);

export function isEmbeddableArticleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return !BLOCKED_IFRAME_HOSTS.has(host) && !host.endsWith('.google.com');
  } catch {
    return false;
  }
}

export function getInitialReaderMode(url: string): 'iframe' | 'summary' {
  return isEmbeddableArticleUrl(url) ? 'iframe' : 'summary';
}
