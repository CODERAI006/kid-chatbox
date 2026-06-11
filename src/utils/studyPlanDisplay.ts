import type { StudyPlanDay } from '@/utils/studyPlanSchedule';

export function formatPlanDate(dateKey: string): string {
  try {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

export function isPlanDayToday(dateKey: string): boolean {
  return dateKey === new Date().toISOString().slice(0, 10);
}

export function openStudyPlanDay(examName: string, day: StudyPlanDay): void {
  window.dispatchEvent(
    new CustomEvent('learning-chat:open', {
      detail: { mode: 'study-plan', examName, day },
    })
  );
}

export function openStudyPlanCreator(): void {
  window.dispatchEvent(
    new CustomEvent('learning-chat:open', { detail: { mode: 'new', format: 'studyplan' } })
  );
}

export function startTodayLesson(examName: string, day: StudyPlanDay): void {
  openStudyPlanDay(examName, day);
}
