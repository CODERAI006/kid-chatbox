import { useCallback, useEffect, useState } from 'react';
import { studyPlanApi } from '@/services/studyPlan';
import { authApi } from '@/services/api';

/** True when the student has an active plan with a lesson scheduled for today. */
export function useStudyPlanPendingToday(enabled = true) {
  const [pendingToday, setPendingToday] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setPendingToday(false);
      return;
    }
    const { user } = authApi.getCurrentUser();
    if (!user) {
      setPendingToday(false);
      return;
    }
    try {
      const data = await studyPlanApi.getToday();
      setPendingToday(Boolean(data.hasPlan && data.today));
    } catch {
      setPendingToday(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    window.addEventListener('study-plan:updated', refresh);
    window.addEventListener('study-plan:reminder', refresh);
    return () => {
      window.removeEventListener('study-plan:updated', refresh);
      window.removeEventListener('study-plan:reminder', refresh);
    };
  }, [refresh]);

  return pendingToday;
}
