export type DailyContentBatchJob = {
  id: string;
  name: string;
  schedule: string;
  description: string;
  contents: string[];
  defaultTarget?: string;
  skipNews?: boolean;
};

export type DailyContentActiveGrade = {
  grade: string;
  userCount: number;
  rawGrades: string[];
  wordOfDayEnabled: boolean;
  factsEnabled: boolean;
};

export type DailyContentGradeCacheStatus = {
  grade: string;
  userCount: number;
  wordOfDayEnabled: boolean;
  factsEnabled: boolean;
  wordOfDayReady: boolean;
  wordCount: number;
  factsReady: boolean;
  factCount: number;
};

export type DailyContentBatchStats = {
  targetDate?: string;
  trigger?: string;
  userGrades?: DailyContentActiveGrade[];
  wordOfDay?: { built?: number; total?: number; detailsBuilt?: number };
  facts?: { built?: number; total?: number };
  news?: { built?: number; skipped?: boolean };
};

export type DailyContentBatchRun = {
  id: number;
  target_date: string;
  trigger_type: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at?: string | null;
  stats_json?: DailyContentBatchStats | null;
  error_message?: string | null;
};

export type DailyContentBatchOverview = {
  success: boolean;
  isRunning: boolean;
  jobs: DailyContentBatchJob[];
  activeUserGrades: DailyContentActiveGrade[];
  cacheToday: DailyContentGradeCacheStatus[];
  cacheTomorrow: DailyContentGradeCacheStatus[];
  recentRuns: DailyContentBatchRun[];
  todayIst: string;
  tomorrowIst: string;
  timezone: string;
};

export type TriggerDailyContentBatchOptions = {
  jobId?: 'nightly' | 'catchup' | 'boot';
  today?: boolean;
  date?: string;
  skipNews?: boolean;
  forceNewsRefresh?: boolean;
  sync?: boolean;
};
