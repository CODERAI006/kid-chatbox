/**
 * Loads GA measurement ID from API (cached), then tracks SPA route changes.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveAnalyticsConfig } from '@/services/analyticsConfig';
import {
  buildAnalyticsPagePath,
  initGoogleAnalytics,
  setGoogleAnalyticsMeasurementId,
  trackGoogleAnalyticsPageView,
} from '@/utils/googleAnalytics';

export const GoogleAnalytics: React.FC = () => {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const config = await resolveAnalyticsConfig();
      if (cancelled || !config?.enabled || !config.googleAnalyticsId) {
        return;
      }

      setGoogleAnalyticsMeasurementId(config.googleAnalyticsId);
      initGoogleAnalytics();
      if (!cancelled) {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const pagePath = buildAnalyticsPagePath(
      location.pathname,
      location.search,
      location.hash
    );
    trackGoogleAnalyticsPageView(pagePath);
  }, [ready, location.pathname, location.search, location.hash]);

  return null;
};
