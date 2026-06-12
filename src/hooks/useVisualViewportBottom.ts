/**
 * Tracks bottom inset when mobile browser chrome (toolbars) shows or hides.
 * Keeps fixed bottom UI pinned to the visible viewport instead of the layout viewport.
 */
import { useEffect, useState } from 'react';

function readVisualViewportBottomInset(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function useVisualViewportBottom(): number {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    const update = () => setBottomInset(readVisualViewportBottomInset());
    update();

    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return bottomInset;
}
