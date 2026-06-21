/**
 * Landing page content — public-facing feature showcase before login.
 */

export type LandingFeature = {
  emoji: string;
  title: string;
  description: string;
};

export type LandingFeatureGroup = {
  id: string;
  label: string;
  tagline: string;
  features: LandingFeature[];
};

export const LANDING_VALUE_STATS = [
  { emoji: '🤖', value: '24/7', label: 'Guru AI tutor' },
  { emoji: '📚', value: '3+', label: 'Study tools' },
  { emoji: '🎯', value: '5+', label: 'Quiz modes' },
  { emoji: '📅', value: 'Daily', label: 'Schedules & words' },
] as const;

export const LANDING_HOW_IT_WORKS = [
  {
    step: '1',
    emoji: '🎉',
    title: 'Create a free account',
    description: 'Sign up with age and grade so lessons and quizzes match your level.',
  },
  {
    step: '2',
    emoji: '🚀',
    title: 'Pick your learning path',
    description: 'Study with AI, take quizzes, follow schedules, or chat with Guru anytime.',
  },
  {
    step: '3',
    emoji: '📈',
    title: 'Track growth & compete',
    description: 'See progress, rankings, word-of-the-day streaks, and share quizzes with buddies.',
  },
] as const;

export const LANDING_FEATURE_GROUPS: LandingFeatureGroup[] = [
  {
    id: 'study',
    label: 'Study Hub',
    tagline: 'Learn smarter, not harder',
    features: [
      {
        emoji: '📚',
        title: 'AI Study Mode',
        description: 'Personalized lessons that adapt to your pace, subject, and grade level.',
      },
      {
        emoji: '📖',
        title: 'Study Library',
        description: 'Browse curated lessons and open rich study content anytime.',
      },
      {
        emoji: '📝',
        title: 'Study History',
        description: 'Review past sessions and pick up exactly where you left off.',
      },
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz Hub',
    tagline: 'Practice, compete, improve',
    features: [
      {
        emoji: '🎯',
        title: 'AI Quiz Mode',
        description: 'Instant quizzes with smart feedback on every answer.',
      },
      {
        emoji: '📅',
        title: 'Scheduled Tests',
        description: 'Join teacher-planned tests and never miss an important exam window.',
      },
      {
        emoji: '🏆',
        title: 'Rankings & History',
        description: 'Climb the leaderboard and review every score in one place.',
      },
      {
        emoji: '📂',
        title: 'Quiz Library',
        description: 'Explore ready-made quizzes by topic instead of starting from scratch.',
      },
    ],
  },
  {
    id: 'daily',
    label: 'Daily Learning',
    tagline: 'Small habits, big results',
    features: [
      {
        emoji: '☀️',
        title: 'Word of the Day',
        description: 'Fresh vocabulary, idioms, and communication tips every day.',
      },
      {
        emoji: '🌍',
        title: 'Facts & Fun',
        description: 'Kid-friendly news and curiosity bites to stay informed and engaged.',
      },
      {
        emoji: '🧩',
        title: 'Daily Puzzles',
        description: 'Top 5 brain teasers every day — math, logic, science, and more by grade.',
      },
      {
        emoji: '🔔',
        title: 'Smart Reminders',
        description: 'Notifications for schedules, tests, and study plans so nothing slips.',
      },
    ],
  },
  {
    id: 'social',
    label: 'Guru & Community',
    tagline: 'Never learn alone',
    features: [
      {
        emoji: '💬',
        title: 'Guru AI Chat',
        description: 'Ask questions, get explanations, and revisit past conversations anytime.',
      },
      {
        emoji: '👥',
        title: 'Study Buddies',
        description: 'Connect with friends and share quizzes to learn together.',
      },
      {
        emoji: '📊',
        title: 'Progress Dashboard',
        description: 'Analytics, suggested topics, and plan usage at a glance.',
      },
    ],
  },
];

export const LANDING_BENEFITS = [
  {
    emoji: '🎓',
    title: 'Built for kids & teens',
    description: 'Age-aware registration and grade-based content keep learning appropriate and fun.',
  },
  {
    emoji: '🛡️',
    title: 'Safe learning space',
    description: 'Structured modules, plan limits, and admin oversight — not an open-ended chatbot.',
  },
  {
    emoji: '💎',
    title: 'Free to start, room to grow',
    description: 'Freemium plans unlock more AI study and quiz sessions as you upgrade.',
  },
] as const;
