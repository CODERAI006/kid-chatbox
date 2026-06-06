/**
 * Plan-based visibility for AI Study / AI Quiz modes.
 */

import { useCallback, useEffect, useState } from 'react';
import { authApi, planApi } from '@/services/api';
import { getUserId } from '@/utils/userAccess';

export interface PlanAiFlags {
  hideAiStudy: boolean;
  hideAiQuiz: boolean;
  loading: boolean;
  showAiStudy: boolean;
  showAiQuiz: boolean;
  refresh: () => Promise<void>;
}

async function resolveUserId(explicitUserId?: string | null): Promise<string | null> {
  if (explicitUserId) return explicitUserId;

  const cached = getUserId(authApi.getCurrentUser().user as Record<string, unknown> | null);
  if (cached) return cached;

  try {
    const { user } = await authApi.fetchCurrentUser();
    return getUserId(user as Record<string, unknown> | null);
  } catch {
    return null;
  }
}

export function usePlanAiFlags(userId?: string | null): PlanAiFlags {
  const [hideAiStudy, setHideAiStudy] = useState(false);
  const [hideAiQuiz, setHideAiQuiz] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const resolvedId = await resolveUserId(userId);
      if (!resolvedId) {
        setHideAiStudy(false);
        setHideAiQuiz(false);
        return;
      }

      const data = await planApi.getUserPlan(resolvedId);
      setHideAiStudy(Boolean(data.plan?.hide_ai_study));
      setHideAiQuiz(Boolean(data.plan?.hide_ai_quiz));
    } catch {
      setHideAiStudy(false);
      setHideAiQuiz(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuthChange = () => {
      refresh();
    };
    window.addEventListener('userLoggedOut', onAuthChange);
    window.addEventListener('userProfileUpdated', onAuthChange);
    window.addEventListener('focus', onAuthChange);
    return () => {
      window.removeEventListener('userLoggedOut', onAuthChange);
      window.removeEventListener('userProfileUpdated', onAuthChange);
      window.removeEventListener('focus', onAuthChange);
    };
  }, [refresh]);

  return {
    hideAiStudy,
    hideAiQuiz,
    loading,
    showAiStudy: !hideAiStudy,
    showAiQuiz: !hideAiQuiz,
    refresh,
  };
}
