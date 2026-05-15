/**
 * Backend API service for authentication, quiz results, and analytics
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  SocialLoginData,
  QuizResultRequest,
  QuizResultResponse,
  QuizHistoryResponse,
  StudySessionRequest,
  StudySessionResponse,
  StudyHistoryResponse,
  AnalyticsData,
  RecommendedTopicsResponse,
  User,
} from '@/types';
import { QuizConfig } from '@/types/quiz';

/**
 * All backend routes live under `/api`. If env omits `/api`, requests hit the wrong path and return 404.
 *
 * In local dev, prefer the Express origin directly (same host, port 3001) instead of `/api` on the Vite
 * port: the Vite HTTP proxy has been observed to stall or drop very large JSON responses from `/ai/chat`
 * even after the backend finishes and logs the Ollama payload — the UI then stays on “STEP n of …” forever.
 * Set `VITE_USE_VITE_PROXY=1` to force `/api` through the proxy, or `VITE_API_BASE_URL` to point elsewhere.
 */
function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw && String(raw).trim().length > 0) {
    const trimmed = String(raw).replace(/\/+$/, '');
    if (trimmed.endsWith('/api')) return trimmed;
    return `${trimmed}/api`;
  }
  if (import.meta.env.DEV) {
    const useProxy =
      import.meta.env.VITE_USE_VITE_PROXY === '1' ||
      String(import.meta.env.VITE_USE_VITE_PROXY || '').toLowerCase() === 'true';
    if (useProxy) {
      return '/api';
    }
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const { protocol, hostname } = window.location;
      const port = String(import.meta.env.VITE_API_PORT || '3001').trim();
      return `${protocol}//${hostname}:${port}/api`;
    }
    return 'http://127.0.0.1:3001/api';
  }
  return 'http://localhost:3001/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Resolve API origin on every request in dev (avoids stale baseURL from module init and keeps
 * hostname/port aligned with the page when using direct Express instead of the Vite proxy).
 */
function applyDevApiBaseUrl(config: InternalAxiosRequestConfig): void {
  if (!import.meta.env.DEV) return;
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw && String(raw).trim().length > 0) return;
  const useProxy =
    import.meta.env.VITE_USE_VITE_PROXY === '1' ||
    String(import.meta.env.VITE_USE_VITE_PROXY || '').toLowerCase() === 'true';
  if (useProxy) {
    config.baseURL = '/api';
    return;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    const port = String(import.meta.env.VITE_API_PORT || '3001').trim();
    config.baseURL = `${protocol}//${hostname}:${port}/api`;
  }
}

apiClient.interceptors.request.use((config) => {
  applyDevApiBaseUrl(config);
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

/**
 * Extract error message from axios error
 * @param error - The error object (can be axios error or regular error)
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Axios error - check response data first
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    // Network error or no response (includes connection refused when API is down)
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
      return 'The AI request timed out. Check that Ollama is running and try fewer questions or Basic difficulty.';
    }
    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message === 'Network Error'
    ) {
      if (import.meta.env.DEV) {
        return `Cannot reach the API at ${API_BASE_URL}. Start the backend (e.g. npm run dev:server) or run frontend + API together with npm run dev:all.`;
      }
      return 'Network error. Please check your connection and try again.';
    }
    // Status code errors
    const status = error.response?.status;
    if (status === 504 || status === 502) {
      return (
        'Gateway timed out before the AI response reached your browser. The server may still finish ' +
        'in the background (check PM2 logs). Fix: increase reverse-proxy timeouts for /api ' +
        '(e.g. nginx proxy_read_timeout 600s; proxy_connect_timeout 600s; proxy_send_timeout 600s), ' +
        'or try fewer questions / a smaller Ollama model. Then try again.'
      );
    }
    if (status === 503) {
      return (
        error.response?.data?.message ||
        'Service temporarily unavailable. The AI or database may be starting up — try again in a moment.'
      );
    }
    if (status) {
      return `Request failed with status ${status}`;
    }
    return error.message || 'An unexpected error occurred';
  }
  // Regular Error object
  if (error instanceof Error) {
    return error.message;
  }
  // Unknown error type
  return 'An unexpected error occurred';
};

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Proxied local Ollama chat (server → Ollama). Requires auth token.
 */
/** Per-request cap for Ollama-backed chat (quiz batches can be slow on CPU). */
const AI_CHAT_DEFAULT_TIMEOUT_MS = 480_000;

export const aiApi = {
  chat: async (params: {
    messages: AiChatMessage[];
    temperature?: number;
    num_predict?: number;
    /** Override axios wait (ms). Default 8m so the UI does not hang forever without Ollama. */
    timeoutMs?: number;
    /** Cancel in-flight request when user leaves or starts a new quiz (axios ERR_CANCELED). */
    signal?: AbortSignal;
  }): Promise<{ content: string; model?: string }> => {
    const { timeoutMs = AI_CHAT_DEFAULT_TIMEOUT_MS, signal, ...body } = params;
    const response = await apiClient.post<{
      success: boolean;
      content?: string;
      model?: string;
      message?: string;
    }>(
      '/ai/chat',
      { ...body, timeoutMs },
      { timeout: timeoutMs, signal }
    );
    if (!response.data.success || response.data.content == null) {
      throw new Error(response.data.message || 'AI chat failed');
    }
    const content = response.data.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error(
        'AI returned an empty message. If Ollama is running, try a smaller model or lower num_predict in server logs.'
      );
    }
    return { content, model: response.data.model };
  },
};

export type LearningBotUiMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Persisted learning chat (Ollama). Same API for students and admins.
 */
export const learningBotApi = {
  getConversation: async (): Promise<{
    success: boolean;
    conversationId: string | null;
    messages: LearningBotUiMessage[];
  }> => {
    const response = await apiClient.get<{
      success: boolean;
      conversationId: string | null;
      messages: LearningBotUiMessage[];
    }>('/learning-bot/conversation');
    return response.data;
  },

  sendMessage: async (params: {
    conversationId: string | null;
    text: string;
  }): Promise<{ conversationId: string; content: string; model?: string }> => {
    const response = await apiClient.post<{
      success: boolean;
      conversationId?: string;
      content?: string;
      model?: string;
      message?: string;
    }>('/learning-bot/message', params);
    if (!response.data.success || response.data.content == null || !response.data.conversationId) {
      throw new Error(response.data.message || 'Learning bot failed');
    }
    return {
      conversationId: response.data.conversationId,
      content: response.data.content,
      model: response.data.model,
    };
  },

  resetConversation: async (): Promise<void> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      '/learning-bot/conversation/reset',
      {}
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Reset failed');
    }
  },
};

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Social login (Google/Apple)
   */
  socialLogin: async (data: SocialLoginData): Promise<AuthResponse> => {
    // Use /google endpoint for Google, /social for others
    const endpoint = data.provider === 'google' ? '/auth/google' : '/auth/social';
    const response = await apiClient.post<AuthResponse>(endpoint, {
      token: data.token,
      email: data.email,
      name: data.name,
    });
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Logout - clears authentication data and dispatches logout event
   */
  logout: (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    // Dispatch custom event to notify App component
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: (): { user: unknown; token: string | null } => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    return {
      user: userStr ? JSON.parse(userStr) : null,
      token,
    };
  },

  /**
   * Fetch current user from API (includes roles and permissions)
   */
  fetchCurrentUser: async (): Promise<{ user: unknown }> => {
    const response = await apiClient.get<{ success: boolean; user: unknown }>('/auth/me');
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return { user: response.data.user };
  },
};

/**
 * Quiz results API endpoints
 */
export const quizApi = {
  /**
   * Save quiz result to backend
   */
  saveQuizResult: async (data: QuizResultRequest): Promise<QuizResultResponse> => {
    const response = await apiClient.post<QuizResultResponse>('/quiz/results', data);
    return response.data;
  },

  /**
   * Get user's quiz history
   */
  /**
   * Get quiz result details by ID (student accessible - only their own results)
   */
  getQuizResultDetails: async (id: string): Promise<{
    success: boolean;
    result: {
      id: string;
      user_id: string;
      timestamp: string;
      subject: string;
      subtopic: string;
      age: number;
      language: string;
      correct_count: number;
      wrong_count: number;
      time_taken: number;
      score_percentage: number;
      explanation_of_mistakes: string;
      user_name: string;
      user_email: string;
      answers: Array<{
        questionNumber: number;
        question: string;
        childAnswer: string;
        correctAnswer: string;
        explanation: string;
        isCorrect: boolean;
        options: unknown;
      }>;
    };
  }> => {
    const response = await apiClient.get(`/quiz/results/${id}`);
    return response.data;
  },

  getQuizHistory: async (userId: string): Promise<QuizHistoryResponse> => {
    const response = await apiClient.get<QuizHistoryResponse>(`/quiz/history/${userId}`);
    return response.data;
  },

  /**
   * Start quiz attempt
   */
  startQuizAttempt: async (quizId: string): Promise<{
    attempt: {
      id: string;
      user_id: string;
      quiz_id: string;
      total_questions: number;
      status: string;
      started_at: string;
    };
    quiz: {
      id: string;
      name: string;
      number_of_questions: number;
      time_limit?: number;
      questions: Array<{
        id: string;
        question_type: string;
        question_text: string;
        question_image_url?: string;
        options: unknown;
        correct_answer: string;
        explanation?: string;
        points: number;
      }>;
    };
  }> => {
    const response = await apiClient.post(`/quizzes/${quizId}/attempt`);
    return response.data;
  },

  /**
   * Get quiz attempt (for resuming)
   */
  getQuizAttempt: async (attemptId: string): Promise<{
    attempt: {
      id: string;
      user_id: string;
      quiz_id: string;
      total_questions: number;
      status: string;
      started_at: string;
      answers?: Array<{
        question_id: string;
        user_answer: string;
      }>;
    };
    quiz: {
      id: string;
      name: string;
      number_of_questions: number;
      time_limit?: number;
      questions: Array<{
        id: string;
        question_type: string;
        question_text: string;
        question_image_url?: string;
        options: unknown;
        correct_answer: string;
        explanation?: string;
        points: number;
      }>;
    };
  }> => {
    const response = await apiClient.get(`/quizzes/attempts/${attemptId}`);
    return response.data;
  },

  /**
   * Get quizzes available in the public Quiz Library (student-accessible)
   */
  getLibraryQuizzes: async (params?: {
    difficulty?: string;
    subject?: string;
    gradeLevel?: string;
  }): Promise<{
    quizzes: Array<{
      id: string;
      name: string;
      description?: string;
      difficulty: string;
      grade_level?: string;
      subject?: string;
      number_of_questions: number;
      passing_percentage: number;
      time_limit?: number;
      created_at: string;
    }>;
  }> => {
    const response = await apiClient.get('/quizzes/library', { params });
    return response.data;
  },
};

/**
 * Quiz Library API endpoints
 */
export const quizLibraryApi = {
  /**
   * Save quiz to library
   */
  saveToLibrary: async (data: {
    title?: string;
    description?: string;
    subject: string;
    subtopics?: string[];
    difficulty: string;
    age_group?: number;
    language?: string;
    question_count?: number;
    time_limit?: number;
    grade_level?: string;
    exam_style?: string;
    questions: unknown[];
    config?: QuizConfig;
  }): Promise<{ success: boolean; quiz: unknown; message: string }> => {
    const response = await apiClient.post('/quiz-library', data);
    return response.data;
  },

  /**
   * Get quizzes from library
   */
  getQuizzes: async (params?: {
    subject?: string;
    difficulty?: string;
    tags?: string[];
    grade_level?: string;
    exam_style?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; quizzes: unknown[]; count: number }> => {
    const response = await apiClient.get('/quiz-library', { params });
    return response.data;
  },

  /**
   * Get quiz by ID
   */
  getQuizById: async (id: string): Promise<{ success: boolean; quiz: unknown }> => {
    const response = await apiClient.get(`/quiz-library/${id}`);
    return response.data;
  },

  /**
   * Get suggested quizzes based on subject and tags
   */
  getSuggestions: async (params: {
    subject: string;
    tags?: string[];
  }): Promise<{ success: boolean; suggestions: unknown[] }> => {
    const response = await apiClient.get('/quiz-library/suggestions', { params });
    return response.data;
  },
};

/**
 * Study API endpoints
 */
export const studyApi = {
  /**
   * Save study session to backend
   */
  saveStudySession: async (data: StudySessionRequest): Promise<StudySessionResponse> => {
    const response = await apiClient.post<StudySessionResponse>('/study/sessions', data);
    return response.data;
  },

  /**
   * Get user's study history
   */
  getStudyHistory: async (userId: string): Promise<StudyHistoryResponse> => {
    const response = await apiClient.get<StudyHistoryResponse>(`/study/history/${userId}`);
    return response.data;
  },

  /**
   * Get shared study library with search
   */
  getStudyLibrary: async (params?: {
    search?: string;
    subject?: string;
    age?: number;
    difficulty?: string;
    language?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'popularity';
  }): Promise<{
    success: boolean;
    sessions: unknown[];
    pagination: { total: number; limit: number; offset: number; pages: number };
  }> => {
    try {
      const response = await apiClient.get('/study-library', { params });
      if (response.data.success === false) {
        throw new Error(response.data.message || 'Failed to load study library');
      }
      return response.data;
    } catch (error: any) {
      console.error('Study library API error:', error);
      throw error;
    }
  },

  /**
   * Get study session by ID from library
   */
  getStudySession: async (id: string): Promise<{ session: unknown }> => {
    const response = await apiClient.get(`/study-library/${id}`);
    return response.data;
  },

  /**
   * Get popular study sessions
   */
  getPopularStudySessions: async (limit?: number): Promise<{ sessions: unknown[] }> => {
    const response = await apiClient.get('/study-library/popular', {
      params: { limit },
    });
    return response.data;
  },
};

/**
 * Profile API endpoints
 */
export const profileApi = {
  /**
   * Get user profile
   */
  getProfile: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ success: boolean; user: User }>('/profile');
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return { user: response.data.user };
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: {
    name: string;
    age?: number;
    grade?: string;
    preferredLanguage?: string;
  }): Promise<{ user: User; message: string }> => {
    const response = await apiClient.put<{
      success: boolean;
      user: User;
      message: string;
    }>('/profile', data);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return {
      user: response.data.user,
      message: response.data.message,
    };
  },
};

/**
 * Analytics API endpoints
 */
export const analyticsApi = {
  /**
   * Get user analytics and performance data
   */
  getAnalytics: async (userId: string): Promise<AnalyticsData> => {
    const response = await apiClient.get<AnalyticsData>(`/analytics/${userId}`);
    return response.data;
  },

  /**
   * Get recommended topics for improvement
   */
  getRecommendedTopics: async (userId: string): Promise<RecommendedTopicsResponse> => {
    const response = await apiClient.get<RecommendedTopicsResponse>(
      `/analytics/recommendations/${userId}`
    );
    return response.data;
  },
};

/**
 * Plan API endpoints
 */
/**
 * Scheduled Tests API for students
 */
export const scheduledTestsApi = {
  /**
   * Get scheduled tests for current user
   */
  getMyScheduledTests: async (): Promise<{
    scheduledTests: Array<{
      id: string;
      quizId: string;
      quizName: string;
      quizDescription?: string;
      quizAgeGroup: string;
      quizDifficulty: string;
      numberOfQuestions: number;
      passingPercentage: number;
      timeLimit?: number;
      scheduledFor: string;
      visibleFrom: string;
      visibleUntil?: string;
      durationMinutes?: number;
      status: 'scheduled' | 'active' | 'completed' | 'cancelled';
      instructions?: string;
      scheduledByName?: string;
    }>;
  }> => {
    const response = await apiClient.get('/scheduled-tests/my-tests');
    return response.data;
  },

  /**
   * Get scheduled test by ID (for students)
   */
  getScheduledTest: async (testId: string): Promise<{
    scheduledTest: {
      id: string;
      quiz_id: string;
      quiz_name: string;
      quiz_description?: string;
      quiz_age_group: string;
      quiz_difficulty: string;
      number_of_questions: number;
      passing_percentage: number;
      time_limit?: number;
      scheduled_for: string;
      visible_from: string;
      visible_until?: string;
      duration_minutes?: number;
      status: 'scheduled' | 'active' | 'completed' | 'cancelled';
      instructions?: string;
    };
  }> => {
    const response = await apiClient.get(`/scheduled-tests/${testId}`);
    return response.data;
  },
};

export const planApi = {
  /**
   * Get all plans
   */
  getAllPlans: async (): Promise<{
    success: boolean;
    plans: Array<{
      id: string;
      name: string;
      description: string | null;
      daily_quiz_limit: number;
      daily_topic_limit: number;
      monthly_cost: number;
      status: string;
    }>;
  }> => {
    const response = await apiClient.get('/plans');
    return response.data;
  },

  /**
   * Get user's current plan and usage
   */
  getUserPlan: async (userId: string): Promise<{
    success: boolean;
    plan: {
      id: string;
      name: string;
      description: string | null;
      daily_quiz_limit: number;
      daily_topic_limit: number;
      monthly_cost: number;
      status: string;
    };
    usage: {
      quizCount: number;
      topicCount: number;
      date: string;
    };
    limits: {
      dailyQuizLimit: number;
      dailyTopicLimit: number;
      remainingQuizzes: number;
      remainingTopics: number;
    };
  }> => {
    const response = await apiClient.get(`/plans/user/${userId}`);
    return response.data;
  },
};

/**
 * Public API endpoints (no authentication required)
 */
export const publicApi = {
  /**
   * Track home page view
   */
  trackHomeView: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post('/public/home-view');
      return response.data;
    } catch (error) {
      // Don't throw - tracking failures shouldn't break the app
      console.error('Failed to track home view:', error);
      return { success: false, message: 'Failed to track view' };
    }
  },

  /**
   * Get total home page views count
   */
  getTotalHomeViews: async (): Promise<{ success: boolean; totalViews: number }> => {
    try {
      const response = await apiClient.get<{ success: boolean; totalViews: number }>(
        '/public/home-views'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get home views:', error);
      return { success: false, totalViews: 0 };
    }
  },

  /**
   * Get Word of the Day with definition, examples, and phonetics
   */
  getWordOfTheDay: async (): Promise<{
    success: boolean;
    word: string;
    phonetic: string;
    audioUrl: string | null;
    meanings: Array<{
      partOfSpeech: string;
      definitions: Array<{
        definition: string;
        example: string | null;
      }>;
      synonyms: string[];
      antonyms: string[];
      additionalExamples: string[];
    }>;
    sourceUrl: string | null;
  }> => {
    try {
      const response = await apiClient.get('/public/word-of-the-day');
      return response.data;
    } catch (error) {
      console.error('Failed to get word of the day:', error);
      return {
        success: false,
        word: 'Error',
        phonetic: '',
        audioUrl: null,
        meanings: [],
        sourceUrl: null,
      };
    }
  },

  /**
   * Get 5 Words of the Day for a given date (advanced vocabulary)
   */
  getWordsOfTheDay: async (
    date?: string
  ): Promise<{
    success: boolean;
    date: string;
    words: Array<{
      word: string;
      phonetic: string;
      audioUrl: string | null;
      meanings: Array<{
        partOfSpeech: string;
        definitions: Array<{ definition: string; example: string | null }>;
        synonyms: string[];
        antonyms: string[];
      }>;
    }>;
  }> => {
    try {
      const params = date ? { date } : {};
      const response = await apiClient.get('/public/words-of-day', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get words of the day:', error);
      return { success: false, date: date || '', words: [] };
    }
  },

  /**
   * Get education news articles
   */
  getEducationNews: async (params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    success: boolean;
    totalResults: number;
    articles: Array<{
      source: {
        id: string | null;
        name: string;
      };
      author: string;
      title: string;
      description: string;
      url: string;
      urlToImage: string | null;
      publishedAt: string;
      content: string | null;
    }>;
    page: number;
    pageSize: number;
  }> => {
    try {
      const response = await apiClient.get('/public/news', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get education news:', error);
      return {
        success: false,
        totalResults: 0,
        articles: [],
        page: 1,
        pageSize: 10,
      };
    }
  },
};

