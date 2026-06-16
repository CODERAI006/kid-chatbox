/**
 * PWA install helpers — detect mobile platforms and installed (standalone) state.
 */

export type MobilePlatform = 'ios' | 'android';

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

export function getMobilePlatform(): MobilePlatform | null {
  if (isIosDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  return null;
}

/** True on iOS/Android browsers when the app is not already installed to the home screen. */
export function canOfferMobileInstall(): boolean {
  return getMobilePlatform() !== null && !isStandaloneApp();
}

export async function registerInstallServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Install UI still works with manual instructions if SW registration fails.
  }
}
