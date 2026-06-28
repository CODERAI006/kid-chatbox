/**
 * Client session helpers — clear auth state when the server rejects the session.
 */

const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw && String(raw).trim().length > 0) {
    const trimmed = String(raw).replace(/\/+$/, '');
    if (trimmed.endsWith('/api')) return trimmed;
    return `${trimmed}/api`;
  }
  if (import.meta.env.DEV) {
    const useProxy =
      import.meta.env.VITE_USE_VITE_PROXY === '1' ||
      String(import.meta.env.VITE_USE_VITE_PROXY || '').toLowerCase() === 'true';
    if (useProxy) return '/api';
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const { protocol, hostname } = window.location;
      const port = String(import.meta.env.VITE_API_PORT || '3001').trim();
      return `${protocol}//${hostname}:${port}/api`;
    }
    return 'http://127.0.0.1:3001/api';
  }
  return 'http://localhost:3001/api';
}

export async function clearSession(): Promise<void> {
  try {
    await fetch(`${resolveApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    /* best effort — still clear local state */
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('userLoggedOut'));
}

export function redirectToLoginIfNeeded(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (PUBLIC_PATHS.has(path)) return;
  window.location.replace('/login');
}

export function isPublicAuthRequest(url: string): boolean {
  return /\/auth\/(login|register|google|social|logout)(\/|$|\?)/.test(url);
}

export function hasLocalSessionHint(): boolean {
  return Boolean(localStorage.getItem('user'));
}
