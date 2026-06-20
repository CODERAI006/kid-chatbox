import { useCallback, useEffect, useState } from 'react';
import {
  canOfferMobileInstall,
  getMobilePlatform,
  isStandaloneApp,
  registerInstallServiceWorker,
  type MobilePlatform,
} from '@/utils/pwaInstall';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(() => canOfferMobileInstall());
  const [platform, setPlatform] = useState<MobilePlatform | null>(() => getMobilePlatform());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    void registerInstallServiceWorker();

    const syncInstallState = (nativePromptReady = false) => {
      const installed = isStandaloneApp();
      setPlatform(getMobilePlatform());
      setCanInstall(!installed && (canOfferMobileInstall() || nativePromptReady));
      if (installed) setDeferredPrompt(null);
    };

    syncInstallState();

    const onBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      syncInstallState(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setCanInstall(false);
    }

    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall,
    platform,
    hasNativePrompt: deferredPrompt !== null,
    promptInstall,
  };
}
