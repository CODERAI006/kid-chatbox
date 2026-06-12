/**
 * Client session helpers — clear auth state when the server rejects the token.
 */

const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

export function clearSession(): void {
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
  return /\/auth\/(login|register|google|social)(\/|$|\?)/.test(url);
}
