import type { StudyPlanRecord } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { normalizePlanDateKey } from '@/utils/studyPlanDisplay';

export type PlanDisplayStatus = 'ongoing' | 'completed' | 'cancelled';

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** UI status for schedule list icons and badges. */
export function getPlanDisplayStatus(plan: StudyPlanRecord): PlanDisplayStatus {
  if (plan.status === 'cancelled') return 'cancelled';
  const examKey = normalizePlanDateKey(plan.examDate);
  if (plan.status === 'completed' || examKey < todayDateKey()) return 'completed';
  return 'ongoing';
}

export function findPlanDayToday(schedule: StudyPlanDay[]): StudyPlanDay | null {
  const key = todayDateKey();
  return schedule.find((d) => d.date === key) ?? null;
}
