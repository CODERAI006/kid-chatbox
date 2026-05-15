/**
 * Admin API service
 * Handles all admin-related API calls
 */

import { apiClient } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  ageGroup?: string;
  grade?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  avatarUrl?: string;
  parentContact?: string;
  createdAt: string;
  approvedAt?: string;
  lastLogin?: string;
  roles?: Array<{ name: string }>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Array<{ id: string; name: string }>;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  ageGroup: string;
  difficultyLevel: string;
  thumbnailUrl?: string;
  category?: string;
  learningOutcomes?: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtopic {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  difficultyLevel: string;
  illustrationUrl?: string;
  videoUrl?: string;
  voiceNarrationUrl?: string;
  aiStory?: string;
  keyPoints?: unknown;
  orderIndex: number;
  isActive: boolean;
}

export interface StudyMaterial {
  id: string;
  subtopicId: string;
  contentType: string;
  title: string;
  content: unknown;
  orderIndex: number;
  ageGroup?: string;
  isPublished: boolean;
}

export interface Quiz {
  id: string;
  subtopicId: string;
  name: string;
  description?: string;
  ageGroup: string;
  difficulty: string;
  numberOfQuestions: number;
  passingPercentage: number;
  timeLimit?: number;
  isActive: boolean;
  inLibrary?: boolean;
  gradeLevel?: string;
  subject?: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionType: string;
  questionText: string;
  questionImageUrl?: string;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string;
  hint?: string;
  points: number;
  orderIndex: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalTopics: number;
  totalQuizzes: number;
  totalAttempts: number;
  avgScore: number;
}

/**
 * Admin API service
 */
export const adminApi = {
  /**
   * Get all users with filters
   */
  getUsers: async (params?: {
    status?: string;
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; pagination: unknown }> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Get user by ID with analytics
   */
  getUser: async (id: string): Promise<{ user: User; analytics: unknown }> => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Approve or reject user
   */
  approveUser: async (
    id: string,
    status: 'approved' | 'rejected',
    moduleAccess?: string[]
  ): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/approve`, { status, moduleAccess });
  },

  /**
   * Assign roles to user
   */
  assignRoles: async (id: string, roleIds: string[]): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/roles`, { roleIds });
  },

  /**
   * Update user
   */
  updateUser: async (id: string, data: Partial<User>): Promise<void> => {
    await apiClient.put(`/admin/users/${id}`, data);
  },

  /**
   * Reset user password
   */
  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/reset-password`, { newPassword });
  },

  /**
   * Suspend user
   */
  suspendUser: async (id: string): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/suspend`);
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  /**
   * Get all roles
   */
  getRoles: async (): Promise<{ roles: Role[] }> => {
    const response = await apiClient.get('/admin/roles');
    return response.data;
  },

  /**
   * Get all permissions
   */
  getPermissions: async (): Promise<{ permissions: Permission[] }> => {
    const response = await apiClient.get('/admin/permissions');
    return response.data;
  },

  /**
   * Create a new user
   */
  createUser: async (data: {
    email: string;
    password?: string;
    name: string;
    age?: number;
    ageGroup?: string;
    grade?: string;
    parentContact?: string;
    roles?: string[];
    moduleAccess?: string[];
    status?: 'approved' | 'pending';
  }): Promise<{ user: User; message: string }> => {
    const response = await apiClient.post('/admin/users/create', data);
    return response.data;
  },

  /**
   * Create topic
   */
  createTopic: async (data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ topic: Topic }> => {
    const response = await apiClient.post('/topics', data);
    return response.data;
  },

  /**
   * Get all topics
   */
  getTopics: async (params?: {
    ageGroup?: string;
    category?: string;
    difficultyLevel?: string;
    isActive?: boolean;
  }): Promise<{ topics: Topic[] }> => {
    const response = await apiClient.get('/topics', { params });
    return response.data;
  },

  /**
   * Get topic by ID
   */
  getTopic: async (id: string): Promise<{ topic: Topic; subtopics: Subtopic[] }> => {
    const response = await apiClient.get(`/topics/${id}`);
    return response.data;
  },

  /**
   * Update topic
   */
  updateTopic: async (id: string, data: Partial<Topic>): Promise<{ topic: Topic }> => {
    const response = await apiClient.put(`/topics/${id}`, data);
    return response.data;
  },

  /**
   * Delete topic
   */
  deleteTopic: async (id: string): Promise<void> => {
    await apiClient.delete(`/topics/${id}`);
  },

  /**
   * Create subtopic
   */
  createSubtopic: async (
    topicId: string,
    data: Omit<Subtopic, 'id' | 'topicId'>
  ): Promise<{ subtopic: Subtopic }> => {
    const response = await apiClient.post(`/topics/${topicId}/subtopics`, data);
    return response.data;
  },

  /**
   * Update subtopic
   */
  updateSubtopic: async (id: string, data: Partial<Subtopic>): Promise<{ subtopic: Subtopic }> => {
    const response = await apiClient.put(`/topics/subtopics/${id}`, data);
    return response.data;
  },

  /**
   * Delete subtopic
   */
  deleteSubtopic: async (id: string): Promise<void> => {
    await apiClient.delete(`/topics/subtopics/${id}`);
  },

  /**
   * Create study material
   */
  createStudyMaterial: async (
    data: Omit<StudyMaterial, 'id'>
  ): Promise<{ material: StudyMaterial }> => {
    const response = await apiClient.post('/study-material', data);
    return response.data;
  },

  /**
   * Get study materials for subtopic
   */
  getStudyMaterials: async (
    subtopicId: string,
    ageGroup?: string
  ): Promise<{ materials: StudyMaterial[] }> => {
    const response = await apiClient.get(`/study-material/subtopic/${subtopicId}`, {
      params: { ageGroup },
    });
    return response.data;
  },

  /**
   * Update study material
   */
  updateStudyMaterial: async (
    id: string,
    data: Partial<StudyMaterial>
  ): Promise<{ material: StudyMaterial }> => {
    const response = await apiClient.put(`/study-material/${id}`, data);
    return response.data;
  },

  /**
   * Delete study material
   */
  deleteStudyMaterial: async (id: string): Promise<void> => {
    await apiClient.delete(`/study-material/${id}`);
  },

  /**
   * Create quiz
   */
  createQuiz: async (data: Omit<Quiz, 'id'>): Promise<{ quiz: Quiz }> => {
    const response = await apiClient.post('/quizzes', data);
    return response.data;
  },

  /**
   * Get quizzes for subtopic
   */
  getQuizzes: async (subtopicId: string, ageGroup?: string): Promise<{ quizzes: Quiz[] }> => {
    const response = await apiClient.get(`/quizzes/subtopic/${subtopicId}`, {
      params: { ageGroup },
    });
    return response.data;
  },

  /**
   * Get quiz by ID
   */
  getQuiz: async (id: string): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> => {
    const response = await apiClient.get(`/quizzes/${id}`);
    return response.data;
  },

  /**
   * Update quiz
   */
  updateQuiz: async (id: string, data: Partial<Quiz>): Promise<{ quiz: Quiz }> => {
    const response = await apiClient.put(`/quizzes/${id}`, data);
    return response.data;
  },

  /**
   * Delete quiz
   */
  deleteQuiz: async (id: string): Promise<void> => {
    await apiClient.delete(`/quizzes/${id}`);
  },

  /**
   * Add question to quiz
   */
  addQuestion: async (
    quizId: string,
    data: Omit<QuizQuestion, 'id' | 'quizId'>
  ): Promise<{ question: QuizQuestion }> => {
    const response = await apiClient.post(`/quizzes/${quizId}/questions`, data);
    return response.data;
  },

  /**
   * Update question
   */
  updateQuestion: async (
    id: string,
    data: Partial<QuizQuestion>
  ): Promise<{ question: QuizQuestion }> => {
    const response = await apiClient.put(`/quizzes/questions/${id}`, data);
    return response.data;
  },

  /**
   * Delete question
   */
  deleteQuestion: async (id: string): Promise<void> => {
    await apiClient.delete(`/quizzes/questions/${id}`);
  },

  /**
   * Get analytics summary
   */
  getAnalyticsSummary: async (): Promise<{ summary: AnalyticsSummary }> => {
    const response = await apiClient.get('/admin/analytics/summary');
    return response.data;
  },

  /**
   * Get user analytics
   */
  getUserAnalytics: async (params?: {
    ageGroup?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ users: unknown[] }> => {
    const response = await apiClient.get('/admin/analytics/users', { params });
    return response.data;
  },

  /**
   * Get topic analytics
   */
  getTopicAnalytics: async (): Promise<{ topics: unknown[] }> => {
    const response = await apiClient.get('/admin/analytics/topics');
    return response.data;
  },

  /**
   * Get engagement analytics
   */
  getEngagementAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    ageGroup?: string;
  }): Promise<{
    engagement: {
      dailyActiveUsers: Array<{ date: string; count: number }>;
      weeklyActiveUsers: Array<{ week: string; count: number }>;
      monthlyActiveUsers: Array<{ month: string; count: number }>;
      sessionDuration: Array<{ duration_range: string; count: number }>;
      activeHours: Array<{ hour: number; count: number }>;
    };
  }> => {
    const response = await apiClient.get('/admin/analytics/engagement', { params });
    return response.data;
  },

  /**
   * Get study analytics
   */
  getStudyAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    study: {
      mostStudied: unknown[];
      leastStudied: unknown[];
      completionRate: number;
      avgStudyTime: number;
    };
  }> => {
    const response = await apiClient.get('/admin/analytics/study', { params });
    return response.data;
  },

  /**
   * Get quiz analytics
   */
  getQuizAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    ageGroup?: string;
  }): Promise<{
    quizzes: {
      mostAttempted: unknown[];
      successByDifficulty: unknown[];
      highErrorRateQuestions: unknown[];
    };
  }> => {
    const response = await apiClient.get('/admin/analytics/quizzes', { params });
    return response.data;
  },

  /**
   * Get insights
   */
  getInsights: async (): Promise<{
    insights: Array<{
      type: string;
      title: string;
      message: string;
      data: unknown[];
      recommendation: string;
    }>;
  }> => {
    const response = await apiClient.get('/admin/analytics/insights');
    return response.data;
  },

  /**
   * Generate quiz with AI
   */
  generateQuiz: async (data: {
    subtopicId?: string;
    name: string;
    description?: string;
    ageGroup?: string;      // optional — gradeLevel is preferred
    difficulty: string;
    numberOfQuestions: number;
    passingPercentage?: number;
    timeLimit?: number;
    topics?: string[];
    language?: string;
    gradeLevel?: string;
    subject?: string;
    sampleQuestion?: string;
    examStyle?: string;
  }): Promise<{ quiz: Quiz; questions: QuizQuestion[]; message: string }> => {
    const response = await apiClient.post('/quizzes/generate', data);
    return response.data;
  },

  /**
   * Upload quiz from JSON
   */
  uploadQuiz: async (data: {
    subtopicId?: string;
    name: string;
    description?: string;
    ageGroup?: string;      // optional — gradeLevel is preferred
    gradeLevel?: string;
    subject?: string;
    difficulty: string;
    passingPercentage?: number;
    timeLimit?: number;
    questions: Array<{
      question: string;
      questionType?: string;
      questionImageUrl?: string;
      options?: unknown;
      correctAnswer: unknown;
      explanation?: string;
      justification?: string;
      hint?: string;
      points?: number;
    }>;
  }): Promise<{ quiz: Quiz; questions: QuizQuestion[]; message: string }> => {
    const response = await apiClient.post('/quizzes/upload', data);
    return response.data;
  },

  /**
   * Get all quizzes
   */
  getAllQuizzes: async (params?: {
    ageGroup?: string;
    difficulty?: string;
    subtopicId?: string;
  }): Promise<{ quizzes: Quiz[] }> => {
    const response = await apiClient.get('/quizzes', { params });
    return response.data;
  },

  /**
   * Toggle whether a quiz is visible in the student Quiz Library
   */
  toggleQuizLibrary: async (quizId: string, inLibrary: boolean): Promise<{ quiz: Quiz }> => {
    const response = await apiClient.patch(`/quizzes/${quizId}/library`, { inLibrary });
    return response.data;
  },

  /**
   * Get all quiz history (admin only)
   */
  getQuizHistory: async (params?: {
    userId?: string;
    subject?: string;
    subtopic?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    results: Array<{
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
      answer_count: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await apiClient.get('/admin/quiz-history', { params });
    return response.data;
  },

  /**
   * Get quiz history details by ID (admin only)
   */
  getQuizHistoryDetails: async (id: string): Promise<{
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
    const response = await apiClient.get(`/admin/quiz-history/${id}`);
    return response.data;
  },

  /**
   * Delete quiz history entry (admin only)
   */
  deleteQuizHistory: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/quiz-history/${id}`);
  },

  /**
   * Get filter options for quiz history (unique subjects and users)
   */
  getQuizHistoryFilters: async (): Promise<{
    subjects: string[];
    users: Array<{ id: string; name: string; email: string }>;
  }> => {
    const response = await apiClient.get('/admin/quiz-history/filters');
    return response.data;
  },

  /**
   * Get quiz results analytics with rankings
   */
  getQuizResultsAnalytics: async (params?: {
    subject?: string;
    subtopic?: string;
    sortBy?: 'score' | 'time' | 'questions' | 'composite';
    limit?: number;
  }): Promise<{
    summary: {
      totalAttempts: number;
      totalParticipants: number;
      averageScore: number;
      averageTime: number;
      subjects: Record<string, {
        attempts: number;
        averageScore: number;
        participants: number;
      }>;
    };
    leaderboard: Array<{
      attemptId: string;
      userId: string;
      userName: string;
      userEmail: string;
      subject: string;
      subtopic: string;
      age: number;
      language: string;
      timestamp: string;
      scorePercentage: number;
      correctAnswers: number;
      totalQuestions: number;
      wrongAnswers: number;
      timeTaken: number;
      timeTakenFormatted: string;
      compositeScore: number;
      rank: number;
      scoreBreakdown: {
        scoreComponent: number;
        questionsComponent: number;
        timeComponent: number;
      };
    }>;
    participants: Array<{
      attemptId: string;
      userId: string;
      userName: string;
      userEmail: string;
      subject: string;
      subtopic: string;
      age: number;
      language: string;
      timestamp: string;
      scorePercentage: number;
      correctAnswers: number;
      totalQuestions: number;
      wrongAnswers: number;
      timeTaken: number;
      timeTakenFormatted: string;
      compositeScore: number;
      rank: number;
      scoreBreakdown: {
        scoreComponent: number;
        questionsComponent: number;
        timeComponent: number;
      };
    }>;
  }> => {
    const response = await apiClient.get('/admin/analytics/quiz-results', { params });
    return response.data;
  },
};

export interface StudyLibraryContent {
  id: string;
  title: string;
  description?: string;
  contentType: 'ppt' | 'pdf' | 'text';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  textContent?: string;
  subject?: string;
  ageGroup?: string;
  difficulty?: string;
  language?: string;
  publishDate?: string;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  createdByName?: string;
  createdByEmail?: string;
}

export const studyLibraryContentApi = {
  /**
   * Get all study library content
   */
  getStudyLibraryContent: async (params?: {
    page?: number;
    limit?: number;
    contentType?: 'ppt' | 'pdf' | 'text';
    isPublished?: boolean;
    subject?: string;
    ageGroup?: string;
  }): Promise<{
    content: StudyLibraryContent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const response = await apiClient.get('/admin/study-library-content', { params });
    return response.data;
  },

  /**
   * Get study library content by ID
   */
  getStudyLibraryContentById: async (id: string): Promise<{ content: StudyLibraryContent }> => {
    const response = await apiClient.get(`/admin/study-library-content/${id}`);
    return response.data;
  },

  /**
   * Create study library content with file upload
   */
  createStudyLibraryContent: async (
    data: {
      title: string;
      description?: string;
      contentType: 'ppt' | 'pdf' | 'text';
      textContent?: string;
      subject?: string;
      ageGroup?: string;
      difficulty?: string;
      language?: string;
      publishDate?: string;
      isPublished?: boolean;
    },
    file?: File
  ): Promise<{ content: StudyLibraryContent; message: string }> => {
    const formData = new FormData();
    
    // Add file if provided
    if (file) {
      formData.append('file', file);
    }

    // Add other fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await apiClient.post('/admin/study-library-content', formData);
    return response.data;
  },

  /**
   * Update study library content
   */
  updateStudyLibraryContent: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      contentType?: 'ppt' | 'pdf' | 'text';
      textContent?: string;
      subject?: string;
      ageGroup?: string;
      difficulty?: string;
      language?: string;
      publishDate?: string;
      isPublished?: boolean;
    },
    file?: File
  ): Promise<{ content: StudyLibraryContent; message: string }> => {
    const formData = new FormData();

    // Add file if provided
    if (file) {
      formData.append('file', file);
    }

    // Add other fields
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await apiClient.put(`/admin/study-library-content/${id}`, formData);
    return response.data;
  },

  /**
   * Delete study library content
   */
  deleteStudyLibraryContent: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/study-library-content/${id}`);
  },
};

export interface ScheduledTest {
  id: string;
  quizId: string;
  scheduledBy: string;
  scheduledFor: string;
  visibleFrom: string;
  visibleUntil?: string;
  durationMinutes?: number;
  planIds: string[];
  userIds: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  instructions?: string;
  createdAt: string;
  updatedAt: string;
  quizName?: string;
  quizDescription?: string;
  scheduledByName?: string;
  plans?: Array<{ id: string; name: string; description?: string }>;
  users?: Array<{ id: string; name: string; email: string }>;
}

export const scheduledTestsApi = {
  /**
   * Create scheduled test
   */
  createScheduledTest: async (data: {
    quizId: string;
    scheduledFor: string;
    visibleFrom: string;
    visibleUntil?: string;
    durationMinutes?: number;
    planIds?: string[];
    userIds?: string[];
    instructions?: string;
  }): Promise<{ scheduledTest: ScheduledTest }> => {
    const response = await apiClient.post('/scheduled-tests', data);
    return response.data;
  },

  /**
   * Get all scheduled tests
   */
  getScheduledTests: async (params?: {
    status?: string;
    quizId?: string;
  }): Promise<{ scheduledTests: ScheduledTest[] }> => {
    const response = await apiClient.get('/scheduled-tests', { params });
    return response.data;
  },

  /**
   * Get scheduled test by ID
   */
  getScheduledTest: async (id: string): Promise<{ scheduledTest: ScheduledTest }> => {
    const response = await apiClient.get(`/scheduled-tests/${id}`);
    return response.data;
  },

  /**
   * Update scheduled test
   */
  updateScheduledTest: async (
    id: string,
    data: Partial<ScheduledTest>
  ): Promise<{ scheduledTest: ScheduledTest }> => {
    const response = await apiClient.put(`/scheduled-tests/${id}`, data);
    return response.data;
  },

  /**
   * Delete scheduled test
   */
  deleteScheduledTest: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduled-tests/${id}`);
  },

  /**
   * Get eligible users for scheduled test
   */
  getEligibleUsers: async (id: string): Promise<{
    users: Array<{ id: string; name: string; email: string; ageGroup?: string; planName: string }>;
    total: number;
  }> => {
    const response = await apiClient.get(`/scheduled-tests/${id}/eligible-users`);
    return response.data;
  },

  /**
   * Get participants and results for a scheduled test
   */
  getScheduledTestParticipants: async (id: string): Promise<{
    scheduledTest: {
      id: string;
      quizName: string;
      scheduledFor: string;
      durationMinutes?: number;
      deadline?: string | null;
      numberOfQuestions: number;
      passingPercentage: number;
    };
    participants: Array<{
      attemptId: string;
      userId: string;
      userName: string;
      userEmail: string;
      startedAt: string;
      completedAt: string;
      timeTaken: number;
      score: number;
      scorePercentage: number;
      correctAnswers: number;
      wrongAnswers: number;
      isOnTime: boolean;
    }>;
    statistics: {
      totalParticipants: number;
      totalMarks: number;
      averageScore: number;
      averagePercentage: number;
      passedCount: number;
      failedCount: number;
      passRate: number;
    };
  }> => {
    const response = await apiClient.get(`/scheduled-tests/${id}/participants`);
    return response.data;
  },
};

