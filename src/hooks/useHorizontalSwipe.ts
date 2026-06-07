/**
 * Horizontal swipe detection for touch and pointer drag.
 */
import { useCallback, useRef } from 'react';
import type { PointerEvent, TouchEvent } from 'react';

const SWIPE_THRESHOLD_PX = 48;

export function useHorizontalSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);

  const reset = useCallback(() => {
    startX.current = null;
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (startX.current == null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX.current;
      const dx = endX - startX.current;
      if (dx <= -SWIPE_THRESHOLD_PX) onLeft();
      else if (dx >= SWIPE_THRESHOLD_PX) onRight();
      reset();
    },
    [onLeft, onRight, reset]
  );

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (startX.current == null) return;
      const dx = e.clientX - startX.current;
      if (dx <= -SWIPE_THRESHOLD_PX) onLeft();
      else if (dx >= SWIPE_THRESHOLD_PX) onRight();
      reset();
    },
    [onLeft, onRight, reset]
  );

  return { onTouchStart, onTouchEnd, onPointerDown, onPointerUp, onPointerCancel: reset };
}
