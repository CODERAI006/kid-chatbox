/**
 * Custom hook for pull-to-refresh functionality
 * Works on both mobile and desktop
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean; // Enable/disable pull to refresh
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  canPull: boolean;
}

const CHAT_OVERLAY_SELECTOR = '[data-chat-overlay]';

function isInsideChatOverlay(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(CHAT_OVERLAY_SELECTOR) !== null;
}

/**
 * Hook for pull-to-refresh functionality
 * @param options - Configuration options
 * @returns Pull to refresh state and handlers
 */
export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canPull, setCanPull] = useState(true);
  
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Pull to refresh error:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, isRefreshing]);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current || document.documentElement;
    elementRef.current = element;

    const handleTouchStart = (e: TouchEvent) => {
      if (isInsideChatOverlay(e.target)) {
        setCanPull(false);
        isPulling.current = false;
        return;
      }

      // Only allow pull from top of page
      if (window.scrollY > 0) {
        setCanPull(false);
        return;
      }

      const touch = e.touches[0];
      startY.current = touch.clientY;
      currentY.current = touch.clientY;
      isPulling.current = true;
      setCanPull(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || !canPull) return;

      const touch = e.touches[0];
      currentY.current = touch.clientY;
      
      const distance = currentY.current - startY.current;
      
      // Only allow pulling down
      if (distance > 0 && window.scrollY === 0) {
        // Prevent default scrolling while pulling
        if (distance > 10) {
          e.preventDefault();
        }
        
        // Cap the pull distance
        const maxPull = threshold * 1.5;
        const cappedDistance = Math.min(distance, maxPull);
        setPullDistance(cappedDistance);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      
      isPulling.current = false;
      
      // Trigger refresh if pulled beyond threshold
      if (pullDistance >= threshold && canPull) {
        handleRefresh();
      } else {
        // Reset if not enough pull
        setPullDistance(0);
      }
    };

    // Mouse events for desktop (optional)
    const handleMouseDown = (e: MouseEvent) => {
      if (isInsideChatOverlay(e.target)) {
        setCanPull(false);
        isPulling.current = false;
        return;
      }

      if (window.scrollY > 0) {
        setCanPull(false);
        return;
      }

      startY.current = e.clientY;
      currentY.current = e.clientY;
      isPulling.current = true;
      setCanPull(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPulling.current || !canPull) return;
      
      currentY.current = e.clientY;
      const distance = currentY.current - startY.current;
      
      if (distance > 0 && window.scrollY === 0) {
        if (distance > 10) {
          e.preventDefault();
        }
        const maxPull = threshold * 1.5;
        const cappedDistance = Math.min(distance, maxPull);
        setPullDistance(cappedDistance);
      } else {
        setPullDistance(0);
      }
    };

    const handleMouseUp = () => {
      if (!isPulling.current) return;
      
      isPulling.current = false;
      
      if (pullDistance >= threshold && canPull) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    // Add mouse event listeners for desktop
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, threshold, pullDistance, canPull, handleRefresh]);

  return {
    isRefreshing,
    pullDistance,
    canPull,
  };
};


