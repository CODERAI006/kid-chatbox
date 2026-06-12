/**
 * Application-wide constants
 */

export const GURU_CHAT_ICON = '🤖';

export const APP_CONSTANTS = {
  APP_NAME: 'Guru AI',
  BRAND_NAME: 'Guru AI',
  ADMIN_SUPPORT_EMAIL: 'info@guru-ai.cloud',
  MIN_AGE: 6,
  MAX_AGE: 14,
  DEFAULT_QUIZ_QUESTIONS: 15,
  GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '',
  // Spline 3D Robot Scene URL
  // You can use a Spline URL (https://prod.spline.design/...) or a local file path (/assets/3d/bot.splinecode)
  // Set VITE_SPLINE_ROBOT_SCENE in your .env file to enable 3D robot, otherwise emoji robot will be shown
  // Default: Uses smartguru.ai robot scene (same as their website)
  SPLINE_ROBOT_SCENE: import.meta.env.VITE_SPLINE_ROBOT_SCENE || 'https://www.smartguru.ai/assets/3d/bot.spline',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    SOCIAL: '/auth/social',
    LOGOUT: '/auth/logout',
  },
  QUIZ: {
    SAVE_RESULT: '/quiz/results',
    HISTORY: '/quiz/history',
  },
  ANALYTICS: {
    GET: '/analytics',
    RECOMMENDATIONS: '/analytics/recommendations',
  },
} as const;

export const MESSAGES = {
  WELCOME: 'Welcome back! 👋',
  DASHBOARD_GREETING: 'Hello! What would you like to do today?',
  STUDY_MODE_TITLE: 'AI Study Mode 📚',
  QUIZ_MODE_TITLE: 'AI Quiz Mode 🎯',
  LAST_SCORES: 'Your Recent Scores',
  RECENT_ACTIVITY_HINT: 'Showing your 2 most recent study and quiz sessions.',
  SUGGESTED_TOPICS: 'Suggested Topics to Improve',
  IDIOMS_AI_LABEL: "Today's AI-picked idioms for everyday use",
  MOTIVATIONAL: 'Keep practicing! You\'re doing great! 🌟',
  QUIZ_SAVED: 'Your quiz results have been saved! Great job! 🎉',
  QUIZ_HISTORY_TITLE: 'Quiz History 📋',
  QUIZ_HISTORY_EMPTY: 'No quiz history yet. Complete a quiz to see your results here!',
  QUIZ_HISTORY_LOADING: 'Loading your quiz history...',
  QUIZ_HISTORY_ERROR: 'Failed to load quiz history. Please try again.',
  VIEW_QUIZ_DETAILS: 'View Details',
  BACK_TO_DASHBOARD: 'Back to Dashboard',
  NO_QUIZZES_YET: 'You haven\'t completed any quizzes yet.',
  // Word of the Day
  WORD_OF_THE_DAY_TITLE: '📖 Word of the Day',
  WORD_OF_THE_DAY_SUBTITLE: 'Build vocabulary and communication — 3 words + 5 expressions daily',
  WORD_OF_THE_DAY_COMMUNICATION_TIP: '💬 How to use it when you talk or write',
  WORD_OF_THE_DAY_LOADING: 'Loading word...',
  WORD_OF_THE_DAY_ERROR: 'Unable to load word',
  WORD_OF_THE_DAY_DEFINITION: 'Definition',
  WORD_OF_THE_DAY_EXAMPLE: 'Example',
  WORD_OF_THE_DAY_SYNONYMS: 'Synonyms',
  WORD_OF_THE_DAY_ANTONYMS: 'Antonyms',
  WORD_OF_THE_DAY_NO_EXAMPLE: 'No example available',
} as const;

