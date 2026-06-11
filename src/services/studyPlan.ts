import { apiClient } from './api';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';

export type StudyPlanRecord = {
  id: string;
  examName: string;
  examDate: string;
  hoursPerDay: number;
  schedule: StudyPlanDay[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export const studyPlanApi = {
  getActive: async (): Promise<{ plan: StudyPlanRecord | null; today: StudyPlanDay | null }> => {
    const res = await apiClient.get<{
      success: boolean;
      plan: StudyPlanRecord | null;
      today: StudyPlanDay | null;
    }>('/study-plan/active');
    return { plan: res.data.plan, today: res.data.today };
  },

  getToday: async (): Promise<{
    hasPlan: boolean;
    planId?: string;
    examName?: string;
    today: StudyPlanDay | null;
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      hasPlan: boolean;
      planId?: string;
      examName?: string;
      today: StudyPlanDay | null;
    }>('/study-plan/today');
    return res.data;
  },

  create: async (payload: {
    examName: string;
    examDate: string;
    hoursPerDay: number;
    schedule: StudyPlanDay[];
  }): Promise<{ plan: StudyPlanRecord; today: StudyPlanDay | null }> => {
    const res = await apiClient.post<{
      success: boolean;
      plan: StudyPlanRecord;
      today: StudyPlanDay | null;
      message?: string;
    }>('/study-plan', payload);
    if (!res.data.success || !res.data.plan) {
      throw new Error(res.data.message || 'Could not save study plan');
    }
    return { plan: res.data.plan, today: res.data.today };
  },
};
