/**
 * Plan-based visibility for AI Study / AI Quiz modes.
 */

import { useEffect, useState } from 'react';
import { authApi, planApi } from '@/services/api';

export interface PlanAiFlags {
  hideAiStudy: boolean;
  hideAiQuiz: boolean;
  loading: boolean;
  showAiStudy: boolean;
  showAiQuiz: boolean;
}

export function usePlanAiFlags(): PlanAiFlags {
  const [hideAiStudy, setHideAiStudy] = useState(false);
  const [hideAiQuiz, setHideAiQuiz] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { user } = authApi.getCurrentUser();
        const userId = (user as { id?: string } | null)?.id;
        if (!userId) return;

        const data = await planApi.getUserPlan(userId);
        if (cancelled) return;
        setHideAiStudy(Boolean(data.plan?.hide_ai_study));
        setHideAiQuiz(Boolean(data.plan?.hide_ai_quiz));
      } catch {
        /* keep defaults — AI modes visible */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    hideAiStudy,
    hideAiQuiz,
    loading,
    showAiStudy: !hideAiStudy,
    showAiQuiz: !hideAiQuiz,
  };
}
