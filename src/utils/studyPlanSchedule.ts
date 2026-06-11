/**
 * Builds a day-by-day exam prep schedule from topics and timeline.
 * Each study day gets a distinct sub-topic (AI-expanded or fallback) linked to a parent topic.
 */

export type StudyPlanDay = {
  dayNumber: number;
  date: string;
  topics: string[];
  /** Parent topic this day's sub-topic belongs to */
  sourceTopic?: string;
  focus: string;
  durationMinutes: number;
  tasks: string[];
};

export type DailySubtopic = {
  title: string;
  parent: string;
};

export type BuildScheduleInput = {
  examName: string;
  topics: string[];
  startDate: Date;
  examDate: Date;
  hoursPerDay: number;
  /** One sub-topic per study day (from AI expand or fallback) */
  dailySubtopics?: DailySubtopic[];
};

export type ScheduleDimensions = {
  totalDays: number;
  reviewDays: number;
  studySlotDays: number;
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

export function getScheduleDimensions(startDate: Date, examDate: Date): ScheduleDimensions {
  const totalDays = dayCount(startDate, examDate);
  const reviewDays = totalDays >= 5 ? 2 : totalDays >= 3 ? 1 : 0;
  const studySlotDays = Math.max(1, totalDays - reviewDays);
  return { totalDays, reviewDays, studySlotDays };
}

function splitParentSeeds(parentTopics: string[]): DailySubtopic[] {
  const seeds: DailySubtopic[] = [];
  for (const parent of parentTopics) {
    const parts = parent
      .split(/\band\b|,|&|\/|\+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (parts.length > 1) {
      parts.forEach((part) => seeds.push({ title: part, parent }));
    } else {
      seeds.push({ title: parent, parent });
    }
  }
  return seeds;
}

const DEPTH_LABELS = [
  'Foundations',
  'Core methods',
  'Worked examples',
  'Speed practice',
  'Application problems',
  'Exam-style mixed drill',
];

/** Local fallback when AI expand is unavailable (preview + server backup). */
export function buildFallbackSubtopics(parentTopics: string[], count: number): DailySubtopic[] {
  const topics = parentTopics.map((t) => t.trim()).filter(Boolean);
  if (!topics.length || count < 1) return [];

  const seeds = splitParentSeeds(topics);
  const result: DailySubtopic[] = [];

  for (let i = 0; i < count; i += 1) {
    const seed = seeds[i % seeds.length];
    const depth = Math.floor(i / seeds.length);
    if (depth === 0) {
      result.push({ title: seed.title, parent: seed.parent });
      continue;
    }
    const label = DEPTH_LABELS[depth % DEPTH_LABELS.length];
    result.push({
      title: `${seed.title} — ${label}`,
      parent: seed.parent,
    });
  }
  return result;
}

function buildStudyDayTasks(subtopic: string, parent: string, minutes: number): string[] {
  const tasks = [
    `Study: ${subtopic}`,
    `Relate ${subtopic} to ${parent}`,
    `Practice questions on: ${subtopic}`,
  ];
  if (minutes >= 90) tasks.push(`Teach ${subtopic} aloud in 2 minutes (Feynman technique)`);
  return tasks;
}

function buildReviewTasks(examName: string): string[] {
  return [
    `Quick recap of all ${examName} topics covered so far`,
    'Practice 5–10 mixed questions from weak areas',
    'Write a one-page summary from memory',
  ];
}

function resolveDailySubtopics(
  parentTopics: string[],
  studySlotDays: number,
  provided?: DailySubtopic[],
): DailySubtopic[] {
  if (provided?.length === studySlotDays) return provided;
  return buildFallbackSubtopics(parentTopics, studySlotDays);
}

/** Splits topics into one sub-topic per study day with review days before the exam. */
export function buildExamSchedule(input: BuildScheduleInput): StudyPlanDay[] {
  const parentTopics = input.topics.map((t) => t.trim()).filter(Boolean);
  if (parentTopics.length === 0) return [];

  const { totalDays, reviewDays, studySlotDays } = getScheduleDimensions(
    input.startDate,
    input.examDate,
  );
  const minutesPerDay = Math.round(input.hoursPerDay * 60);
  const dailySubtopics = resolveDailySubtopics(
    parentTopics,
    studySlotDays,
    input.dailySubtopics,
  );

  const days: StudyPlanDay[] = [];

  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(input.startDate, i);
    const isReview = i >= studySlotDays;

    if (isReview) {
      const reviewTopic =
        reviewDays === 2 && i === studySlotDays
          ? 'Half-syllabus revision'
          : `Full ${input.examName} revision`;
      days.push({
        dayNumber: i + 1,
        date: toDateKey(date),
        topics: [reviewTopic],
        focus: `Review day — strengthen memory before ${input.examName}`,
        durationMinutes: minutesPerDay,
        tasks: buildReviewTasks(input.examName),
      });
      continue;
    }

    const sub = dailySubtopics[i];
    days.push({
      dayNumber: i + 1,
      date: toDateKey(date),
      topics: [sub.title],
      sourceTopic: sub.parent,
      focus: `Learn & practice: ${sub.title}`,
      durationMinutes: minutesPerDay,
      tasks: buildStudyDayTasks(sub.title, sub.parent, minutesPerDay),
    });
  }

  return days;
}

export function buildStudyPlanPrompt(examName: string, day: StudyPlanDay): string {
  const parent = day.sourceTopic ? ` (from ${day.sourceTopic})` : '';
  return (
    `I am preparing for "${examName}" (Day ${day.dayNumber}). ` +
    `Today's focus: ${day.focus}. Sub-topic: ${day.topics.join(', ')}${parent}. ` +
    `Tasks: ${day.tasks.join('; ')}. ` +
    `Create a structured lesson for today with hook, explanation, key facts, and a short quiz (3 questions).`
  );
}

export function buildStudyPlanLessonPrompt(examName: string, day: StudyPlanDay): string {
  const parent = day.sourceTopic ? ` Parent topic: ${day.sourceTopic}.` : '';
  return (
    `Exam prep lesson for "${examName}" — Day ${day.dayNumber} (${day.date}). ` +
    `Focus: ${day.focus}. Today's sub-topic: ${day.topics.join(', ')}.${parent} ` +
    `Today's tasks: ${day.tasks.join('; ')}. ` +
    `Make this lesson exciting for a school student — use stories, analogies, and surprising facts. ` +
    `Cover only today's sub-topic in depth; link back to the parent topic where helpful. ` +
    `Include exactly 15 quiz questions (15 separate quiz cards).`
  );
}
