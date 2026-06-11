/**
 * Builds a day-by-day exam prep schedule from topics and timeline.
 */

export type StudyPlanDay = {
  dayNumber: number;
  date: string;
  topics: string[];
  focus: string;
  durationMinutes: number;
  tasks: string[];
};

export type BuildScheduleInput = {
  examName: string;
  topics: string[];
  startDate: Date;
  examDate: Date;
  hoursPerDay: number;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function dayCount(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function buildTasks(examName: string, topics: string[], minutes: number, isReview: boolean): string[] {
  if (isReview) {
    return [
      `Quick recap of all ${examName} topics covered so far`,
      'Practice 5–10 mixed questions from weak areas',
      'Write a one-page summary from memory',
    ];
  }
  const list = topics.map((t) => `Study: ${t}`);
  list.push(`Practice questions on: ${topics.join(', ')}`);
  if (minutes >= 90) list.push('Teach the topic aloud in 2 minutes (Feynman technique)');
  return list;
}

/** Splits topics across available study days with review days before the exam. */
export function buildExamSchedule(input: BuildScheduleInput): StudyPlanDay[] {
  const topics = input.topics.map((t) => t.trim()).filter(Boolean);
  if (topics.length === 0) return [];

  const totalDays = dayCount(input.startDate, input.examDate);
  const reviewDays = totalDays >= 5 ? 2 : totalDays >= 3 ? 1 : 0;
  const studySlotDays = Math.max(1, totalDays - reviewDays);
  const minutesPerDay = Math.round(input.hoursPerDay * 60);
  const perDay = Math.max(1, Math.ceil(topics.length / studySlotDays));

  const days: StudyPlanDay[] = [];
  let topicIdx = 0;

  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(input.startDate, i);
    const isReview = i >= studySlotDays;
    const dayTopics: string[] = [];

    if (isReview) {
      dayTopics.push(
        reviewDays === 2 && i === studySlotDays
          ? 'Half-syllabus revision'
          : `Full ${input.examName} revision`
      );
    } else {
      for (let j = 0; j < perDay && topicIdx < topics.length; j += 1) {
        dayTopics.push(topics[topicIdx]);
        topicIdx += 1;
      }
      if (dayTopics.length === 0) dayTopics.push('Buffer / catch-up day');
    }

    const focus = isReview
      ? `Review day — strengthen memory before ${input.examName}`
      : `Learn & practice: ${dayTopics.join(', ')}`;

    days.push({
      dayNumber: i + 1,
      date: toDateKey(date),
      topics: dayTopics,
      focus,
      durationMinutes: minutesPerDay,
      tasks: buildTasks(input.examName, dayTopics, minutesPerDay, isReview),
    });
  }

  return days;
}

export function buildStudyPlanPrompt(examName: string, day: StudyPlanDay): string {
  return (
    `I am preparing for "${examName}" (Day ${day.dayNumber}). ` +
    `Today's focus: ${day.focus}. Topics: ${day.topics.join(', ')}. ` +
    `Tasks: ${day.tasks.join('; ')}. ` +
    `Create a structured lesson for today with hook, explanation, key facts, and a short quiz (3 questions).`
  );
}
