/**
 * Resolves stored upload paths (/uploads/...) to a browser-loadable URL.
 * Uploads are served at the server root, not under /api.
 */

function stripApiSuffix(base: string): string {
  return base.replace(/\/+$/, '').replace(/\/api$/i, '');
}

export function resolveUploadUrl(filePath?: string | null): string {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;

  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw && String(raw).trim().length > 0) {
    return `${stripApiSuffix(String(raw).trim())}${normalized}`;
  }

  // Dev: Vite proxies /uploads to Express (same page origin).
  // Prod: Express serves /uploads alongside the built app.
  return normalized;
}
