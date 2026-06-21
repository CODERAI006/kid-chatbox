/**
 * Backend API service for authentication, quiz results, and analytics
 */

import axios, { type InternalAxiosRequestConfig, isAxiosError } from 'axios';
import {
  clearSession,
  redirectToLoginIfNeeded,
  isPublicAuthRequest,
} from '@/services/session';
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
import {
  fetchWordsOfTheDayCached,
  type WordsOfDayCacheOptions,
} from '@/utils/wordOfDayDailyCache';

/**
 * All backend routes live under `/api`. If env omits `/api`, requests hit the wrong path and return 404.
 *
 * In local dev, prefer the Express origin directly (same host, port 3001) instead of `/api` on the Vite
 * port: the Vite HTTP proxy has been observed to stall or drop very large JSON responses from `/ai/chat`
 * even after the backend finishes — the UI then stays on “STEP n of …” forever.
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = String(error.config?.url || '');
      const hadToken = Boolean(localStorage.getItem('auth_token'));
      if (hadToken && !isPublicAuthRequest(requestUrl)) {
        clearSession();
        redirectToLoginIfNeeded();
      }
    }
    return Promise.reject(error);
  }
);

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
      return 'The AI request timed out. Try fewer questions or Basic difficulty, then try again.';
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
        'or try fewer questions / a faster model. Then try again.'
      );
    }
    if (status === 503) {
      return (
        error.response?.data?.message ||
        'Service temporarily unavailable. The AI or database may be starting up — try again in a moment.'
      );
    }
    if (status === 413) {
      return (
        error.response?.data?.message ||
        'File is too large to upload. Use an image under 50MB, or ask your admin to raise nginx client_max_body_size.'
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
 * Proxied AI chat (server-side model routing). Requires auth token.
 */
/** Per-request cap for AI chat (quiz batches can be slow on CPU). */
const AI_CHAT_DEFAULT_TIMEOUT_MS = 480_000;

export const aiApi = {
  chat: async (params: {
    messages: AiChatMessage[];
    temperature?: number;
    num_predict?: number;
    /** Override axios wait (ms). Default 8m so the UI does not hang forever on slow AI runs. */
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
        'AI returned an empty message. Try again with fewer questions or Basic difficulty.'
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

export type LearningBotSavedChat = {
  id: string;
  archived: boolean;
  preview: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
};

/**
 * Persisted learning chat. Same API for students and admins.
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

  listConversations: async (): Promise<{ success: boolean; conversations: LearningBotSavedChat[] }> => {
    const response = await apiClient.get<{
      success: boolean;
      conversations: LearningBotSavedChat[];
    }>('/learning-bot/conversations');
    return response.data;
  },

  getConversationById: async (
    conversationId: string
  ): Promise<{
    success: boolean;
    conversation: LearningBotSavedChat;
    messages: LearningBotUiMessage[];
  }> => {
    const response = await apiClient.get<{
      success: boolean;
      conversation: LearningBotSavedChat;
      messages: LearningBotUiMessage[];
      message?: string;
    }>(`/learning-bot/conversations/${conversationId}`);
    if (!response.data.success || !response.data.conversation) {
      throw new Error(response.data.message || 'Could not load chat');
    }
    return {
      success: true,
      conversation: response.data.conversation,
      messages: response.data.messages || [],
    };
  },

  openConversation: async (
    conversationId: string
  ): Promise<{ success: boolean; conversationId: string; messages: LearningBotUiMessage[] }> => {
    const response = await apiClient.post<{
      success: boolean;
      conversationId: string;
      messages: LearningBotUiMessage[];
      message?: string;
    }>(`/learning-bot/conversations/${conversationId}/open`, {});
    if (!response.data.success || !response.data.conversationId) {
      throw new Error(response.data.message || 'Could not open chat');
    }
    return {
      success: true,
      conversationId: response.data.conversationId,
      messages: response.data.messages || [],
    };
  },

  saveConversation: async (): Promise<void> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      '/learning-bot/conversation/save',
      {}
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Save failed');
    }
  },

  sendMessage: async (params: {
    conversationId: string | null;
    text: string;
    mode?: 'workspace' | 'chat';
    format?: string;
  }): Promise<{
    conversationId: string;
    content: string;
    structured?: Record<string, unknown> | null;
    model?: string;
  }> => {
    const response = await apiClient.post<{
      success: boolean;
      conversationId?: string;
      content?: string;
      structured?: Record<string, unknown> | null;
      model?: string;
      message?: string;
    }>('/learning-bot/message', params);
    if (!response.data.success || response.data.content == null || !response.data.conversationId) {
      throw new Error(response.data.message || 'Learning bot failed');
    }
    return {
      conversationId: response.data.conversationId,
      content: response.data.content,
      structured: response.data.structured ?? null,
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

  exportConversation: async (conversationId: string): Promise<{
    success: boolean;
    conversationId: string;
    messages: LearningBotUiMessage[];
    downloadUrl?: string;
  }> => {
    const response = await apiClient.post<{
      success: boolean;
      conversationId: string;
      messages: LearningBotUiMessage[];
      downloadUrl?: string;
      message?: string;
    }>('/learning-bot/conversation/export', { conversationId });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Export failed');
    }
    return response.data;
  },

  downloadConversationPdf: async (conversationId: string): Promise<Blob> => {
    const response = await apiClient.get<Blob>(
      `/learning-bot/conversation/${conversationId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
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
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email: data.email,
      password: data.password,
      name: data.name,
      birthDate: data.birthDate,
      grade: data.grade,
      preferredLanguage: data.preferredLanguage,
    });
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
    clearSession();
  },

  /**
   * Verify the stored token with the server (e.g. after refresh or admin delete).
   */
  validateSession: async (): Promise<User | null> => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
      const user = response.data.user;
      if (!user) {
        clearSession();
        return null;
      }
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
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
        question_image_prompt?: string;
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
        question_image_prompt?: string;
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

  submitQuizAttempt: async (
    attemptId: string,
    payload: {
      answers: Array<{ questionId: string; answer: string; timeSpent?: number }>;
      timeTaken: number;
      scheduledTest?: boolean;
    }
  ): Promise<{ success: boolean; result: Record<string, unknown> }> => {
    const response = await apiClient.post(`/quizzes/attempts/${attemptId}/submit`, payload);
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
      created_by_id?: string | null;
      created_by_name?: string | null;
      subtopics?: string[];
      is_mine?: boolean;
      is_same_grade?: boolean;
      generation_source?: 'mine' | 'peer' | 'admin' | 'other';
    }>;
    viewer_grade?: string | null;
  }> => {
    const response = await apiClient.get('/quizzes/library', { params });
    return response.data;
  },

  /**
   * Queue server-side AI quiz generation. Returns 202 quickly — poll getAiQuizGenerationJob.
   */
  enqueueAiQuizGeneration: async (
    body: Record<string, unknown>,
    opts?: { signal?: AbortSignal }
  ): Promise<{ success: boolean; jobId: string; message?: string }> => {
    const response = await apiClient.post('/quizzes/ai-generate-job', body, {
      timeout: 120_000,
      signal: opts?.signal,
    });
    return response.data;
  },

  getAiQuizGenerationJob: async (
    jobId: string,
    opts?: { signal?: AbortSignal }
  ): Promise<{
    success: boolean;
    job: {
      id: string;
      status: string;
      error_message?: string | null;
      quiz_id?: string | null;
      created_at: string;
      updated_at: string;
    };
  }> => {
    const response = await apiClient.get(`/quizzes/ai-generate-job/${jobId}`, {
      timeout: 45_000,
      signal: opts?.signal,
    });
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

  /** Photorealistic study lesson images (hero + gallery via Ollama Cloud). */
  enrichLessonImages: async (payload: {
    subject: string;
    topic: string;
    gradeLevel?: string;
    introductionImageKeyword?: string;
    introductionImagePrompt?: string;
    imageKeywords?: string[];
    imageGallery?: Array<{ keyword: string; label?: string; imagePrompt?: string }>;
  }): Promise<{
    success: boolean;
    introImageUrl: string | null;
    galleryImages: Array<{ url: string; label: string; keyword: string }>;
  }> => {
    const response = await apiClient.post('/study/lesson-images', payload);
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
  getProfile: async (): Promise<{ user: User; profileComplete?: boolean }> => {
    const response = await apiClient.get<{
      success: boolean;
      user: User;
      profileComplete?: boolean;
    }>('/profile');
    if (response.data.user) {
      const user = {
        ...response.data.user,
        profileComplete: response.data.profileComplete,
      };
      localStorage.setItem('user', JSON.stringify(user));
      return { user, profileComplete: response.data.profileComplete };
    }
    return { user: response.data.user, profileComplete: response.data.profileComplete };
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: {
    phone?: string | null;
    phoneCountry?: string;
    preferredLanguage?: string;
    birthDate?: string;
    grade?: string;
  }): Promise<{ user: User; message: string; profileComplete?: boolean }> => {
    const response = await apiClient.put<{
      success: boolean;
      user: User;
      message: string;
      profileComplete?: boolean;
    }>('/profile', data);
    if (response.data.user) {
      const user = {
        ...response.data.user,
        profileComplete: response.data.profileComplete,
      };
      localStorage.setItem('user', JSON.stringify(user));
      return {
        user,
        message: response.data.message,
        profileComplete: response.data.profileComplete,
      };
    }
    return {
      user: response.data.user,
      message: response.data.message,
      profileComplete: response.data.profileComplete,
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
      hide_ai_study?: boolean;
      hide_ai_quiz?: boolean;
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
   * Google Analytics measurement ID (public, cached on server)
   */
  getAnalyticsConfig: async (): Promise<{
    success: boolean;
    googleAnalyticsId: string;
    enabled: boolean;
  }> => {
    const response = await apiClient.get<{
      success: boolean;
      googleAnalyticsId: string;
      enabled: boolean;
    }>('/public/analytics-config');
    return response.data;
  },

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
   * Get active pricing plans for landing page
   */
  getPricingPlans: async (): Promise<{
    success: boolean;
    plans: Array<{
      id: string;
      name: string;
      description: string | null;
      daily_quiz_limit: number;
      daily_topic_limit: number;
      monthly_cost: number;
      hide_ai_study?: boolean;
      hide_ai_quiz?: boolean;
    }>;
  }> => {
    const response = await apiClient.get('/public/plans');
    return response.data;
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
   * Get Word of the Day + 5 expressions for a class and date.
   * Cached per class per calendar day — first fetch hits the server, later loads reuse cache.
   */
  getWordsOfTheDay: async (
    date?: string,
    grade?: string,
    options?: WordsOfDayCacheOptions,
  ): Promise<import('@/types/wordOfDay').WordOfDayResponse> => {
    const fail = (): import('@/types/wordOfDay').WordOfDayResponse => ({
      success: false,
      date: date || '',
      grade: grade || '',
      complexity: 'basic',
      words: [],
      phrases: [],
    });

    try {
      return await fetchWordsOfTheDayCached(
        async () => {
          const params: Record<string, string> = {};
          if (date) params.date = date;
          if (grade) params.grade = grade;
          const response = await apiClient.get('/public/words-of-day', { params });
          return response.data;
        },
        grade,
        date,
        options,
      );
    } catch (error) {
      console.error('Failed to get words of the day:', error);
      return fail();
    }
  },

  /**
   * Get full Word of the Day detail page data
   */
  getWordOfDayDetail: async (
    word: string,
    date?: string,
    grade?: string
  ): Promise<import('@/types/wordOfDay').WordOfDayResponse> => {
    try {
      const params: Record<string, string> = { word };
      if (date) params.date = date;
      if (grade) params.grade = grade;
      const response = await apiClient.get('/public/words-of-day/detail', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get word of the day detail:', error);
      return {
        success: false,
        date: date || '',
        grade: grade || '',
        complexity: 'basic',
        words: [],
        word: { word: '', phonetic: '', audioUrl: null, meanings: [] },
        phrases: [],
      };
    }
  },

  getExpressionDates: async (
    grade?: string,
    limit = 30,
  ): Promise<import('@/types/wordOfDay').DailyPhrasesDatesResponse> => {
    try {
      const response = await apiClient.get('/public/words-of-day/phrases/dates', {
        params: { grade, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get expression dates:', error);
      return { success: false, grade: grade || '', dates: [] };
    }
  },

  getExpressionsArchive: async (
    grade?: string,
    options?: {
      page?: number;
      limit?: number;
      context?: string;
      untilDate?: string;
    },
  ): Promise<import('@/types/wordOfDay').DailyPhrasesArchiveResponse> => {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    try {
      const response = await apiClient.get('/public/words-of-day/phrases/archive', {
        params: {
          grade,
          page,
          limit,
          context: options?.context,
          untilDate: options?.untilDate,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get expressions archive:', error);
      return {
        success: false,
        grade: grade || '',
        untilDate: options?.untilDate || '',
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
        items: [],
        message: 'Failed to load expressions archive',
      };
    }
  },

  /** Facts & Fun — per-class facts/day, cached server + client */
  getDailyFacts: async (
    date?: string,
    grade?: string,
    options?: { bypassCache?: boolean },
  ): Promise<import('@/types/dailyFacts').DailyFactsResponse> => {
    const { fetchDailyFactsCached } = await import('@/utils/dailyFactsDailyCache');

    const fetchFromApi = async (): Promise<import('@/types/dailyFacts').DailyFactsResponse> => {
      try {
        const response = await apiClient.get('/public/facts-and-fun', {
          params: { date, grade },
        });
        return response.data;
      } catch (error) {
        console.error('Failed to get daily facts:', error);
        const axiosErr = error as {
          response?: { data?: import('@/types/dailyFacts').DailyFactsResponse };
        };
        if (axiosErr.response?.data?.message) {
          return axiosErr.response.data;
        }
        return {
          success: false,
          date: date || '',
          grade: grade || '',
          facts: [],
          source: 'ollama',
          message: 'Unable to load facts — is Ollama running?',
        };
      }
    };

    return fetchDailyFactsCached(fetchFromApi, grade, date, options);
  },

  getDailyFactsDates: async (
    grade?: string,
    limit = 30,
  ): Promise<import('@/types/dailyFacts').DailyFactsDatesResponse> => {
    try {
      const response = await apiClient.get('/public/facts-and-fun/dates', {
        params: { grade, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get fact dates:', error);
      return { success: false, grade: grade || '', dates: [] };
    }
  },

  getDailyFactsArchive: async (
    grade?: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      /** @deprecated use category */
      subject?: string;
      untilDate?: string;
    },
  ): Promise<import('@/types/dailyFacts').DailyFactsArchiveResponse> => {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const category = options?.category ?? options?.subject;
    try {
      const response = await apiClient.get('/public/facts-and-fun/archive', {
        params: {
          grade,
          page,
          limit,
          category,
          untilDate: options?.untilDate,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get facts archive:', error);
      return {
        success: false,
        grade: grade || '',
        untilDate: options?.untilDate || '',
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
        items: [],
        message: 'Unable to load fact archive.',
      };
    }
  },

  getDailyFactDetail: async (
    factId: string,
    date?: string,
    grade?: string,
  ): Promise<import('@/types/dailyFacts').DailyFactDetailResponse> => {
    try {
      const response = await apiClient.get('/public/facts-and-fun/detail', {
        params: { factId, date, grade },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get fact detail:', error);
      const axiosErr = error as {
        response?: { data?: import('@/types/dailyFacts').DailyFactDetailResponse };
      };
      if (axiosErr.response?.data?.message) {
        return axiosErr.response.data;
      }
      return {
        success: false,
        date: date || '',
        grade: grade || '',
        message: 'Unable to load fact details.',
      };
    }
  },

  /** Daily top puzzles for a grade (cached per day). */
  getDailyPuzzles: async (
    date?: string,
    grade?: string,
  ): Promise<import('@/types/puzzle').DailyPuzzlesResponse> => {
    try {
      const response = await apiClient.get('/public/puzzles/daily', { params: { date, grade } });
      return response.data;
    } catch (error) {
      console.error('Failed to get daily puzzles:', error);
      return { success: false, date: date || '', grade: grade || '', puzzles: [] };
    }
  },

  getPuzzleGrades: async (): Promise<import('@/types/puzzle').PuzzleGradesResponse> => {
    try {
      const response = await apiClient.get('/public/puzzles/grades');
      return response.data;
    } catch {
      return { success: false, grades: [], allGrades: [] };
    }
  },

  getPuzzleArchive: async (
    grade?: string,
    opts?: { untilDate?: string; page?: number; limit?: number; all?: boolean },
  ): Promise<import('@/types/puzzle').PuzzleArchiveResponse> => {
    try {
      const response = await apiClient.get('/public/puzzles/archive', {
        params: { grade, untilDate: opts?.untilDate, page: opts?.page, limit: opts?.limit, all: opts?.all ? 'true' : undefined },
      });
      return response.data;
    } catch {
      return { success: false, grade: grade || '', untilDate: '', puzzles: [], items: [] };
    }
  },

  getPuzzleById: async (id: string): Promise<{ success: boolean; puzzle?: import('@/types/puzzle').Puzzle }> => {
    try {
      const response = await apiClient.get(`/public/puzzles/${id}`);
      return response.data;
    } catch {
      return { success: false };
    }
  },

  /**
   * Aggregated education news (RSS/web scraping — no NewsAPI)
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

  /** Topic categories for kid-friendly education news */
  getEducationNewsTopics: async (): Promise<import('@/types/educationNews').EducationTopicsResponse> => {
    try {
      const response = await apiClient.get('/public/education-news/topics');
      return response.data;
    } catch (error) {
      console.error('Failed to get education news topics:', error);
      return { success: false, categories: [], updatedAt: '' };
    }
  },

  /** Category news — served from daily DB cache (AI runs once per day) */
  getEducationNewsByCategory: async (params: {
    category: import('@/types/educationNews').EducationNewsCategoryId;
    page?: number;
    pageSize?: number;
    forceRefresh?: boolean;
  }): Promise<import('@/types/educationNews').EducationNewsResponse> => {
    try {
      const response = await apiClient.get('/public/education-news', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get category education news:', error);
      return {
        success: false,
        category: {
          id: params.category,
          label: '',
          icon: '📰',
          color: 'blue',
          description: '',
          topics: [],
          exampleQuestions: [],
        },
        articles: [],
        totalResults: 0,
        page: 1,
        pageSize: 20,
        message: 'Unable to load stories',
      };
    }
  },

  /** Single formatted story from today's cache */
  getEducationArticle: async (
    articleId: string,
    category: import('@/types/educationNews').EducationNewsCategoryId,
  ): Promise<import('@/types/educationNews').EducationArticleResponse> => {
    try {
      const response = await apiClient.get(`/public/education-news/${articleId}`, {
        params: { category },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get education article:', error);
      return { success: false, message: 'Story not found' };
    }
  },
};

export const studyBuddyApi = {
  getDashboard: async (): Promise<import('@/types/studyBuddy').StudyBuddyDashboard> => {
    const response = await apiClient.get<{ success: boolean } & import('@/types/studyBuddy').StudyBuddyDashboard>(
      '/study-buddies'
    );
    return response.data;
  },

  lookup: async (buddyId: string): Promise<{ user: import('@/types/studyBuddy').StudyBuddyUser }> => {
    const response = await apiClient.get<{ success: boolean; user: import('@/types/studyBuddy').StudyBuddyUser }>(
      `/study-buddies/lookup/${encodeURIComponent(buddyId.trim())}`
    );
    return { user: response.data.user };
  },

  sendRequest: async (buddyId: string, message?: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/study-buddies/requests', {
      buddyId: buddyId.trim(),
      message,
    });
    return { message: response.data.message };
  },

  respondToRequest: async (
    requestId: string,
    action: 'accept' | 'reject' | 'cancel'
  ): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
      `/study-buddies/requests/${requestId}`,
      { action }
    );
    return { message: response.data.message };
  },

  shareQuiz: async (
    buddyIds: string[],
    quizLibraryId: string,
    message?: string
  ): Promise<{ message: string; sharedCount?: number }> => {
    const ids = [...new Set(buddyIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      sharedCount?: number;
    }>('/study-buddies/quiz-shares', {
      buddyIds: ids,
      quizLibraryId,
      message,
    });
    return { message: response.data.message, sharedCount: response.data.sharedCount };
  },

  startSharedQuiz: async (shareId: string): Promise<{ quizId: string }> => {
    const response = await apiClient.post<{ success: boolean; quizId: string }>(
      `/study-buddies/quiz-shares/${shareId}/start`
    );
    return { quizId: response.data.quizId };
  },
};

export const notificationsApi = {
  list: async (opts?: {
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<import('@/types/notification').NotificationsResponse> => {
    const response = await apiClient.get<import('@/types/notification').NotificationsResponse>(
      '/notifications',
      {
        params: {
          limit: opts?.limit,
          unreadOnly: opts?.unreadOnly ? 'true' : undefined,
        },
      }
    );
    return response.data;
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};

export const feedbackApi = {
  submit: async (
    payload: import('@/types/feedback').SubmitFeedbackPayload,
  ): Promise<import('@/types/feedback').SubmitFeedbackResponse> => {
    const response = await apiClient.post('/feedback', payload);
    return response.data;
  },
};

