import { apiClient } from './api';
import type { DailySubtopic, StudyPlanDay } from '@/utils/studyPlanSchedule';

export type StudyPlanRecord = {
  id: string;
  examName: string;
  examBoard?: string | null;
  examDate: string;
  hoursPerDay: number;
  schedule: StudyPlanDay[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export const studyPlanApi = {
  list: async (): Promise<{
    plans: StudyPlanRecord[];
    activePlan: StudyPlanRecord | null;
    today: StudyPlanDay | null;
  }> => {
    const res = await apiClient.get<{
      success: boolean;
      plans: StudyPlanRecord[];
      activePlan: StudyPlanRecord | null;
      today: StudyPlanDay | null;
    }>('/study-plan/list');
    return {
      plans: res.data.plans ?? [],
      activePlan: res.data.activePlan,
      today: res.data.today,
    };
  },

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

  generateLesson: async (payload: {
    examName: string;
    day: StudyPlanDay;
    examBoard?: string | null;
    planId?: string;
  }): Promise<{ content: string; structured?: Record<string, unknown> | null }> => {
    const res = await apiClient.post<{
      success: boolean;
      content?: string;
      structured?: Record<string, unknown> | null;
      message?: string;
    }>('/study-plan/lesson', payload);
    if (!res.data.success || !res.data.content) {
      throw new Error(res.data.message || 'Could not generate lesson');
    }
    return { content: res.data.content, structured: res.data.structured ?? null };
  },

  expandSchedule: async (payload: {
    examName: string;
    topics: string[];
    studyDayCount: number;
    examBoard?: string;
  }): Promise<{ subtopics: DailySubtopic[] }> => {
    const res = await apiClient.post<{
      success: boolean;
      subtopics?: DailySubtopic[];
      message?: string;
    }>('/study-plan/expand-schedule', payload);
    if (!res.data.success || !Array.isArray(res.data.subtopics)) {
      throw new Error(res.data.message || 'Could not expand topics into daily sub-topics');
    }
    return { subtopics: res.data.subtopics };
  },

  create: async (payload: {
    examName: string;
    examDate: string;
    hoursPerDay: number;
    schedule: StudyPlanDay[];
    examBoard?: string;
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
