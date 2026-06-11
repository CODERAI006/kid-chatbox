import type { StudyPlanDay } from '@/utils/studyPlanSchedule';

/** Normalize API/DB dates (ISO timestamps or YYYY-MM-DD) to a date key. */
export function normalizePlanDateKey(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s.slice(0, 10);
}

export function formatPlanDate(dateKey: string): string {
  const key = normalizePlanDateKey(dateKey);
  if (!key) return '—';
  try {
    const d = new Date(`${key}T12:00:00`);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return key;
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
