import { useEffect } from 'react';
import { openAppInstall } from '@/components/layout/appInstallEvents';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const SESSION_KEY = 'guru-ai-install-popup-shown';

/** Opens the install popup once per browser session on mobile when install is available. */
export function useAutoAppInstallPrompt(enabled = true): void {
  const { canInstall } = usePwaInstall();

  useEffect(() => {
    if (!enabled || !canInstall) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1');
      openAppInstall();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [canInstall, enabled]);
}
