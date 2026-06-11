/**
 * Locks page scroll while overlays (e.g. chat) are open — prevents scroll chaining and pull-to-refresh on the page behind.
 */
import { useEffect } from 'react';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { style: htmlStyle } = document.documentElement;
    const { style: bodyStyle } = document.body;

    const snapshot = {
      htmlOverflow: htmlStyle.overflow,
      bodyOverflow: bodyStyle.overflow,
      htmlOverscroll: htmlStyle.overscrollBehavior,
      bodyOverscroll: bodyStyle.overscrollBehavior,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyWidth: bodyStyle.width,
    };

    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overscrollBehavior = 'none';
    bodyStyle.overscrollBehavior = 'none';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      htmlStyle.overflow = snapshot.htmlOverflow;
      bodyStyle.overflow = snapshot.bodyOverflow;
      htmlStyle.overscrollBehavior = snapshot.htmlOverscroll;
      bodyStyle.overscrollBehavior = snapshot.bodyOverscroll;
      bodyStyle.position = snapshot.bodyPosition;
      bodyStyle.top = snapshot.bodyTop;
      bodyStyle.width = snapshot.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
