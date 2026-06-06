/**
 * Shared helpers for single and bulk scheduled test forms.
 */

export interface ScheduleFormData {
  quizId: string;
  scheduledFor: string;
  visibleFrom: string;
  visibleUntil: string;
  durationMinutes: string;
  planIds: string[];
  userIds: string[];
  instructions: string;
}

export const emptyScheduleForm = (): ScheduleFormData => ({
  quizId: '',
  scheduledFor: '',
  visibleFrom: '',
  visibleUntil: '',
  durationMinutes: '',
  planIds: [],
  userIds: [],
  instructions: '',
});

/** Format Date for `<input type="datetime-local" />` */
export const toDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const atHour = (base: Date, daysOffset: number, hour: number, minute = 0): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

export type SchedulePreset = 'today' | 'tomorrowMorning' | 'thisWeekend' | 'nextWeek';

export const SCHEDULE_PRESET_OPTIONS: { key: SchedulePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrowMorning', label: 'Tomorrow 9 AM' },
  { key: 'thisWeekend', label: 'This weekend' },
  { key: 'nextWeek', label: 'Next week' },
];

/** Quick-fill open / close windows for common scheduling patterns. */
export const applySchedulePreset = (
  preset: SchedulePreset,
  current: ScheduleFormData
): ScheduleFormData => {
  const now = new Date();
  let opens: Date;
  let closes: Date;

  if (preset === 'today') {
    const todayNine = atHour(now, 0, 9);
    opens = now < todayNine ? todayNine : now;
    closes = atHour(now, 0, 23, 59);
  } else if (preset === 'tomorrowMorning') {
    opens = atHour(now, 1, 9);
    closes = atHour(opens, 7, 23, 59);
  } else if (preset === 'thisWeekend') {
    const day = now.getDay();
    const daysUntilSat = day === 6 ? 0 : day === 0 ? 0 : 6 - day;
    opens = atHour(now, daysUntilSat, 10);
    closes = atHour(opens, 2, 20);
  } else {
    opens = atHour(now, 7, 9);
    closes = atHour(opens, 7, 23, 59);
  }

  const openStr = toDatetimeLocal(opens);
  const closeStr = toDatetimeLocal(closes);
  return {
    ...current,
    scheduledFor: openStr,
    visibleFrom: openStr,
    visibleUntil: closeStr,
    durationMinutes: current.durationMinutes || '60',
  };
};

/** Defaults when opening the schedule modal for a specific quiz. */
export const defaultScheduleForQuiz = (
  quizId: string,
  timeLimit?: number,
  allPlanIds: string[] = []
): ScheduleFormData => {
  const base = applySchedulePreset('tomorrowMorning', emptyScheduleForm());
  return {
    ...base,
    quizId,
    durationMinutes: timeLimit ? String(timeLimit) : base.durationMinutes,
    planIds: allPlanIds,
  };
};

export const defaultScheduleForm = (allPlanIds: string[] = []): ScheduleFormData =>
  applySchedulePreset('tomorrowMorning', { ...emptyScheduleForm(), planIds: allPlanIds });

/** Keep scheduledFor aligned with visibleFrom when admin sets the open time. */
export const withVisibleFrom = (form: ScheduleFormData, visibleFrom: string): ScheduleFormData => ({
  ...form,
  visibleFrom,
  scheduledFor: !form.scheduledFor || form.scheduledFor === form.visibleFrom ? visibleFrom : form.scheduledFor,
});

export const validateScheduleForm = (
  data: ScheduleFormData,
  isEditing: boolean
): string | null => {
  if (!isEditing && !data.quizId) return 'Choose a quiz to schedule.';
  if (!data.visibleFrom) return 'Set when students can start the test.';
  if (!data.scheduledFor) return 'Set the official scheduled date.';
  if (data.planIds.length === 0 && data.userIds.length === 0) {
    return 'Select at least one plan so students can see this test.';
  }
  if (data.visibleUntil && new Date(data.visibleUntil) <= new Date(data.visibleFrom)) {
    return 'Close time must be after the open time.';
  }
  return null;
};
