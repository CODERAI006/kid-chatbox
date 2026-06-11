import type { StudyPlanDay } from '@/utils/studyPlanSchedule';

const PREFIX = 'study-plan-lesson:';

function cacheKey(planId: string, dateKey: string): string {
  return `${PREFIX}${planId}:${dateKey}`;
}

export function getCachedLesson(planId: string, day: StudyPlanDay): string | null {
  try {
    return localStorage.getItem(cacheKey(planId, day.date));
  } catch {
    return null;
  }
}

export function setCachedLesson(planId: string, day: StudyPlanDay, content: string): void {
  try {
    localStorage.setItem(cacheKey(planId, day.date), content);
  } catch {
    // ignore quota errors
  }
}

export function clearCachedLesson(planId: string, day: StudyPlanDay): void {
  try {
    localStorage.removeItem(cacheKey(planId, day.date));
  } catch {
    // ignore
  }
}
