/**
 * Polls today's study topic and shows toast + chime when a new day starts.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/shared/design-system';
import { studyPlanApi } from '@/services/studyPlan';
import { playNotificationChime } from '@/utils/notificationSound';

const POLL_MS = 60_000;
const STORAGE_KEY = 'guru_study_plan_notified';

function notifiedKey(planId: string, date: string): string {
  return `${planId}:${date}`;
}

function wasNotified(planId: string, date: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === notifiedKey(planId, date);
  } catch {
    return false;
  }
}

function markNotified(planId: string, date: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, notifiedKey(planId, date));
  } catch {
    /* ignore */
  }
}

type Options = { enabled?: boolean };

export function useStudyPlanNotifications({ enabled = true }: Options = {}) {
  const toast = useToast();
  const checkingRef = useRef(false);

  const checkToday = useCallback(async () => {
    if (!enabled || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const data = await studyPlanApi.getToday();
      if (!data.hasPlan || !data.today || !data.planId) return;
      if (wasNotified(data.planId, data.today.date)) return;

      markNotified(data.planId, data.today.date);
      void playNotificationChime();

      toast({
        title: `📅 Day ${data.today.dayNumber}: ${data.examName}`,
        description: `Today's topics: ${data.today.topics.join(', ')}`,
        status: 'info',
        duration: 12000,
        isClosable: true,
        position: 'top-right',
      });

      window.dispatchEvent(
        new CustomEvent('study-plan:reminder', {
          detail: { examName: data.examName, day: data.today },
        })
      );
    } catch {
      /* silent — user may be logged out */
    } finally {
      checkingRef.current = false;
    }
  }, [enabled, toast]);

  useEffect(() => {
    if (!enabled) return undefined;
    void checkToday();
    const id = window.setInterval(() => void checkToday(), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled, checkToday]);
}
