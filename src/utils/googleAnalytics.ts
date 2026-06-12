/**
 * Google Analytics 4 (gtag.js) helpers for SPA page views and custom events.
 */

import { APP_CONSTANTS } from '@/constants/app';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const getMeasurementId = (): string => APP_CONSTANTS.GOOGLE_ANALYTICS_ID;

export const isGoogleAnalyticsEnabled = (): boolean => Boolean(getMeasurementId());

/** Full SPA path: route + query + hash tab (e.g. /quiz#library). */
export const buildAnalyticsPagePath = (
  pathname: string,
  search = '',
  hash = ''
): string => `${pathname}${search}${hash}`;

let initialized = false;

/** Load gtag.js once. Manual page views — React Router handles navigation. */
export const initGoogleAnalytics = (): void => {
  const gaId = getMeasurementId();
  if (!gaId || typeof document === 'undefined' || initialized) {
    return;
  }

  if (document.querySelector(`script[src*="gtag/js"]`)) {
    initialized = true;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  const loader = document.createElement('script');
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(loader);

  window.gtag('js', new Date());
  window.gtag('config', gaId, { send_page_view: false });

  initialized = true;
};

/** Record a virtual page view (pathname + query). */
export const trackGoogleAnalyticsPageView = (pagePath?: string): void => {
  const gaId = getMeasurementId();
  if (!gaId || typeof window === 'undefined' || !window.gtag) {
    return;
  }

  const path =
    pagePath ??
    buildAnalyticsPagePath(
      window.location.pathname,
      window.location.search,
      window.location.hash
    );

  const hashSection = path.includes('#') ? path.split('#').pop() : undefined;

  try {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title,
      page_location: `${window.location.origin}${path}`,
      ...(hashSection ? { page_section: hashSection } : {}),
    });
  } catch (error) {
    console.error('[analytics] Failed to track page view:', error);
  }
};

/** Fire a custom GA4 event (quiz start, signup, etc.). */
export const trackGoogleAnalyticsEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
): void => {
  if (!window.gtag) {
    return;
  }

  try {
    window.gtag('event', eventName, params);
  } catch (error) {
    console.error('[analytics] Failed to track event:', error);
  }
};
