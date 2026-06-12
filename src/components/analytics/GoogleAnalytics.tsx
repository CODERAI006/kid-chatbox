/**
 * Tracks SPA route changes in Google Analytics across all pages.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildAnalyticsPagePath,
  initGoogleAnalytics,
  trackGoogleAnalyticsPageView,
} from '@/utils/googleAnalytics';

export const GoogleAnalytics: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    const pagePath = buildAnalyticsPagePath(
      location.pathname,
      location.search,
      location.hash
    );
    trackGoogleAnalyticsPageView(pagePath);
  }, [location.pathname, location.search, location.hash]);

  return null;
};
