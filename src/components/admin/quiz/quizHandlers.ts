/**
 * Quiz Management Handlers
 * Extracted handler functions for quiz operations
 */

import { adminApi, scheduledTestsApi, ScheduledTest } from '@/services/admin';
import { Quiz, QuizQuestion } from '@/services/admin';
import { parseQuestions, mapQuizData } from './quizUtils';
import { handleFileUpload, MAX_LINES } from './csvParsing';
import { ensureTopicAndSubtopic } from './topicUtils';
import { useToast } from '@/shared/design-system';
import { Topic } from '@/services/admin';

interface HandlersDependencies {
  toast: ReturnType<typeof useToast>;
  setLoading: (loading: boolean) => void;
  loadQuizzes: () => Promise<void>;
  loadTopics: () => Promise<void>;
  loadScheduledTests: () => Promise<void>;
  topics: Topic[];
  onClose?: () => void;
  onScheduleClose?: () => void;
  onViewOpen?: () => void;
  onEditOpen?: () => void;
  onEditQuizOpen?: () => void;
  onEditQuizClose?: () => void;
  onViewScheduledTestOpen?: () => void;
  setViewingQuiz?: (quiz: { quiz: Quiz; questions: QuizQuestion[] } | null) => void;
  setEditingQuestion?: (question: QuizQuestion | null) => void;
  setEditingQuiz?: (quiz: Quiz | null) => void;
  setViewingScheduledTest?: (test: ScheduledTest | null) => void;
  setEditingScheduledTestId?: (id: string | null) => void;
  viewingQuiz?: { quiz: Quiz; questions: QuizQuestion[] } | null;
}

export const createQuizHandlers = (deps: HandlersDependencies) => {
  const {
    toast,
    setLoading,
    loadQuizzes,
    loadTopics,
    loadScheduledTests,
    topics,
    onClose,
    onScheduleClose,
    onViewOpen,
    onEditOpen,
    onEditQuizOpen,
    onEditQuizClose,
    onViewScheduledTestOpen,
    setViewingQuiz,
    setEditingQuestion,
    setEditingQuiz,
    setViewingScheduledTest,
    setEditingScheduledTestId,
    viewingQuiz,
  } = deps;

  const handleAIGenerate = async (data: {
    // Topic fields are optional — new form no longer requires them
    useManualInput?: boolean;
    manualTopicName?: string;
    manualSubtopicName?: string;
    selectedTopic?: string;
    selectedSubtopic?: string;
    name: string;
    description: string;
    ageGroup?: string;      // optional — replaced by gradeLevel
    difficulty: string;
    numberOfQuestions: number;
    passingPercentage: number;
    timeLimit: string;
    topics: string[];
    language: string;
    gradeLevel?: string;
    subject?: string;
    questionType?: string;
    sampleQuestion?: string;
    examStyle?: string;
  }) => {
    // Only name + difficulty are truly required
    if (!data.name?.trim() || !data.difficulty) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a quiz name and select a difficulty level',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);

      // Only try to resolve subtopic if topic fields were explicitly provided
      const subtopicId = (data.useManualInput || data.selectedSubtopic)
        ? await ensureTopicAndSubtopic({
            useManualInput: data.useManualInput ?? false,
            manualTopicName: data.manualTopicName ?? '',
            manualSubtopicName: data.manualSubtopicName ?? '',
            selectedTopic: data.selectedTopic ?? '',
            selectedSubtopic: data.selectedSubtopic ?? '',
            topics,
            ageGroup: data.ageGroup ?? data.gradeLevel ?? '',
            difficulty: data.difficulty,
            loadTopics,
            toast,
          })
        : undefined;

      const result = await adminApi.generateQuiz({
        subtopicId,
        name: data.name.trim(),
        description: data.description,
        ageGroup: data.ageGroup || data.gradeLevel || undefined,
        difficulty: data.difficulty,
        numberOfQuestions: data.numberOfQuestions,
        passingPercentage: data.passingPercentage,
        timeLimit: data.timeLimit ? parseInt(data.timeLimit) : undefined,
        topics: data.topics,
        language: data.language,
        gradeLevel: data.gradeLevel?.trim() || undefined,
        subject: data.subject?.trim() || undefined,
        sampleQuestion: data.sampleQuestion?.trim() || undefined,
        examStyle: data.examStyle?.trim() || undefined,
      });

      toast({
        title: 'Success',
        description: 'Quiz generated successfully with AI',
        status: 'success',
        duration: 3000,
      });

      onClose?.();
      await loadQuizzes();
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const validateQuestions = (questions: any[]): string[] => {
    const validQuestionTypes = ['multiple_choice', 'true_false', 'fill_blank', 'match_pairs', 'image_based'];
    const validationErrors: string[] = [];

    questions.forEach((q: any, index: number) => {
      const questionNum = index + 1;
      const questionText = q.question || q.questionText;
      if (!questionText || (typeof questionText === 'string' && questionText.trim() === '')) {
        validationErrors.push(`Question ${questionNum}: Missing or empty 'question' or 'questionText' field`);
      }

      if (!q.correctAnswer) {
        validationErrors.push(`Question ${questionNum}: Missing 'correctAnswer' field`);
      }

      const questionType = q.questionType || 'multiple_choice';
      if (questionType === 'multiple_choice') {
        if (!q.options || typeof q.options !== 'object' || Object.keys(q.options).length === 0) {
          validationErrors.push(`Question ${questionNum}: Missing or empty 'options' field (required for multiple choice)`);
        } else {
          const correctAnswer = String(q.correctAnswer).toUpperCase();
          const optionKeys = Object.keys(q.options).map((k: string) => k.toUpperCase());
          if (!optionKeys.includes(correctAnswer)) {
            validationErrors.push(`Question ${questionNum}: 'correctAnswer' "${q.correctAnswer}" not found in options`);
          }
        }
      }

      if (q.questionType && !validQuestionTypes.includes(q.questionType)) {
        validationErrors.push(`Question ${questionNum}: Invalid 'questionType'. Must be one of: ${validQuestionTypes.join(', ')}`);
      }

      if (q.correctAnswer && typeof q.correctAnswer !== 'string' && !Array.isArray(q.correctAnswer)) {
        validationErrors.push(`Question ${questionNum}: 'correctAnswer' must be a string or array`);
      }

      if (q.options && typeof q.options !== 'object') {
        validationErrors.push(`Question ${questionNum}: 'options' must be an object`);
      }

      if (q.points !== undefined && (typeof q.points !== 'number' || q.points < 0)) {
        validationErrors.push(`Question ${questionNum}: 'points' must be a non-negative number`);
      }
    });

    return validationErrors;
  };

  const handleJSONUpload = async (data: {
    useManualInput?: boolean;
    manualTopicName?: string;
    manualSubtopicName?: string;
    selectedTopic?: string;
    selectedSubtopic?: string;
    uploadMethod: 'text' | 'file';
    uploadedFile: File | null;
    name: string;
    description: string;
    ageGroup?: string;      // optional — gradeLevel is preferred
    gradeLevel?: string;
    difficulty: string;
    passingPercentage: number;
    timeLimit: string;
    jsonContent: string;
  }) => {
    if (!data.name?.trim() || !data.difficulty) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a quiz name and select a difficulty level',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (data.uploadMethod === 'text' && !data.jsonContent.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide JSON content or upload a file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (data.uploadMethod === 'file' && !data.uploadedFile) {
      toast({
        title: 'Validation Error',
        description: 'Please upload a CSV or JSON file',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (data.useManualInput && !data.manualTopicName?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a topic name when using manual input',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      let questions;

      if (data.uploadMethod === 'file' && data.uploadedFile) {
        try {
          questions = await handleFileUpload(data.uploadedFile);
        } catch (fileError: unknown) {
          const errorMessage = fileError instanceof Error ? fileError.message : 'Failed to parse file';
          toast({
            title: 'File Parse Error',
            description: errorMessage,
            status: 'error',
            duration: 5000,
          });
          return;
        }
      } else {
        try {
          questions = JSON.parse(data.jsonContent);
          if (!Array.isArray(questions)) {
            toast({
              title: 'Invalid Format',
              description: 'JSON must be an array of questions',
              status: 'error',
              duration: 3000,
            });
            return;
          }
          if (questions.length > MAX_LINES) {
            toast({
              title: 'Too Many Questions',
              description: `File exceeds maximum limit of ${MAX_LINES} questions. Current file has ${questions.length} questions.`,
              status: 'error',
              duration: 5000,
            });
            return;
          }
        } catch (parseError) {
          toast({
            title: 'Invalid JSON',
            description: 'Please provide valid JSON format',
            status: 'error',
            duration: 3000,
          });
          return;
        }
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        toast({
          title: 'Invalid Format',
          description: 'Questions must be a non-empty array',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const validationErrors = validateQuestions(questions);
      if (validationErrors.length > 0) {
        toast({
          title: 'Validation Errors',
          description: validationErrors.slice(0, 5).join('; ') + (validationErrors.length > 5 ? ` ... and ${validationErrors.length - 5} more` : ''),
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      setLoading(true);

      const subtopicId = (data.useManualInput || data.selectedSubtopic)
        ? await ensureTopicAndSubtopic({
            useManualInput: data.useManualInput ?? false,
            manualTopicName: data.manualTopicName ?? '',
            manualSubtopicName: data.manualSubtopicName ?? '',
            selectedTopic: data.selectedTopic ?? '',
            selectedSubtopic: data.selectedSubtopic ?? '',
            topics,
            ageGroup: data.ageGroup ?? data.gradeLevel ?? '',
            difficulty: data.difficulty,
            loadTopics,
            toast,
          })
        : undefined;

      const result = await adminApi.uploadQuiz({
        subtopicId,
        name: data.name.trim(),
        description: data.description,
        ageGroup: data.ageGroup || data.gradeLevel || undefined,
        difficulty: data.difficulty,
        passingPercentage: data.passingPercentage,
        timeLimit: data.timeLimit ? parseInt(data.timeLimit) : undefined,
        questions,
      });

      toast({
        title: 'Success',
        description: 'Quiz uploaded successfully',
        status: 'success',
        duration: 3000,
      });

      onClose?.();
      await loadQuizzes();
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload quiz';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTest = async (data: {
    quizId: string;
    scheduledFor: string;
    visibleFrom: string;
    visibleUntil: string;
    durationMinutes: string;
    planIds: string[];
    userIds: string[];
    instructions: string;
  }, editingScheduledTestId: string | null) => {
    if (!data.quizId || !data.scheduledFor || !data.visibleFrom) {
      toast({
        title: 'Validation Error',
        description: 'Quiz, scheduled date, and visible from date are required',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (data.planIds.length === 0 && data.userIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one plan or user',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      if (editingScheduledTestId) {
        await scheduledTestsApi.updateScheduledTest(editingScheduledTestId, {
          scheduledFor: data.scheduledFor,
          visibleFrom: data.visibleFrom,
          visibleUntil: data.visibleUntil || undefined,
          durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : undefined,
          planIds: data.planIds.length > 0 ? data.planIds : undefined,
          userIds: data.userIds.length > 0 ? data.userIds : undefined,
          instructions: data.instructions || undefined,
        });

        toast({
          title: 'Success',
          description: 'Scheduled test updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        await scheduledTestsApi.createScheduledTest({
          quizId: data.quizId,
          scheduledFor: data.scheduledFor,
          visibleFrom: data.visibleFrom,
          visibleUntil: data.visibleUntil || undefined,
          durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : undefined,
          planIds: data.planIds.length > 0 ? data.planIds : undefined,
          userIds: data.userIds.length > 0 ? data.userIds : undefined,
          instructions: data.instructions || undefined,
        });

        toast({
          title: 'Success',
          description: 'Test scheduled successfully',
          status: 'success',
          duration: 3000,
        });
      }

      onScheduleClose?.();
      setEditingScheduledTestId?.(null);
      await loadScheduledTests();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule test';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleViewScheduledTest = async (testId: string) => {
    try {
      setLoading(true);
      const data = await scheduledTestsApi.getScheduledTest(testId);
      const test = data.scheduledTest as unknown as {
        quiz_name?: string;
        quiz_description?: string;
        scheduled_by_name?: string;
        scheduled_for?: string;
        visible_from?: string;
        visible_until?: string;
        duration_minutes?: number;
        plan_ids?: string[];
        user_ids?: string[];
        created_at?: string;
        updated_at?: string;
        quizName?: string;
        quizDescription?: string;
        scheduledByName?: string;
        scheduledFor?: string;
        visibleFrom?: string;
        visibleUntil?: string;
        durationMinutes?: number;
        planIds?: string[];
        userIds?: string[];
        createdAt?: string;
        updatedAt?: string;
        plans?: Array<{ id: string; name: string; description?: string }>;
        users?: Array<{ id: string; name: string; email: string }>;
        [key: string]: unknown;
      };

      const mappedTest: ScheduledTest = {
        id: test.id as string,
        quizId: (test.quiz_id as string) || (test.quizId as string),
        scheduledBy: (test.scheduled_by as string) || (test.scheduledBy as string),
        scheduledFor: (test.scheduled_for as string) || (test.scheduledFor as string),
        visibleFrom: (test.visible_from as string) || (test.visibleFrom as string),
        visibleUntil: (test.visible_until as string) || (test.visibleUntil as string),
        durationMinutes: (test.duration_minutes as number) || (test.durationMinutes as number),
        planIds: (test.plan_ids as string[]) || (test.planIds as string[]) || [],
        userIds: (test.user_ids as string[]) || (test.userIds as string[]) || [],
        status: test.status as 'scheduled' | 'active' | 'completed' | 'cancelled',
        instructions: test.instructions as string | undefined,
        createdAt: (test.created_at as string) || (test.createdAt as string),
        updatedAt: (test.updated_at as string) || (test.updatedAt as string),
        quizName: (test.quiz_name as string) || (test.quizName as string),
        quizDescription: (test.quiz_description as string) || (test.quizDescription as string),
        scheduledByName: (test.scheduled_by_name as string) || (test.scheduledByName as string),
        plans: test.plans,
        users: test.users,
      };
      setViewingScheduledTest?.(mappedTest);
      onViewScheduledTestOpen?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scheduled test';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditScheduledTest = async (testId: string, setScheduleFormData: (data: any) => void, onScheduleOpen: () => void) => {
    try {
      setLoading(true);
      const data = await scheduledTestsApi.getScheduledTest(testId);
      const test = data.scheduledTest as unknown as {
        quiz_id?: string;
        quizId?: string;
        scheduled_for?: string;
        scheduledFor?: string;
        visible_from?: string;
        visibleFrom?: string;
        visible_until?: string;
        visibleUntil?: string;
        duration_minutes?: number;
        durationMinutes?: number;
        plan_ids?: string[];
        planIds?: string[];
        user_ids?: string[];
        userIds?: string[];
        instructions?: string;
        [key: string]: unknown;
      };

      const formatDateTimeLocal = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      const testAny = test as Record<string, unknown>;
      setScheduleFormData({
        quizId: (testAny.quiz_id as string) || (testAny.quizId as string) || '',
        scheduledFor: formatDateTimeLocal((testAny.scheduled_for as string) || (testAny.scheduledFor as string) || ''),
        visibleFrom: formatDateTimeLocal((testAny.visible_from as string) || (testAny.visibleFrom as string) || ''),
        visibleUntil: (testAny.visible_until as string) || (testAny.visibleUntil as string)
          ? formatDateTimeLocal((testAny.visible_until as string) || (testAny.visibleUntil as string) || '')
          : '',
        durationMinutes: (testAny.duration_minutes as number) || (testAny.durationMinutes as number)
          ? String((testAny.duration_minutes as number) || (testAny.durationMinutes as number))
          : '',
        planIds: (testAny.plan_ids as string[]) || (testAny.planIds as string[]) || [],
        userIds: (testAny.user_ids as string[]) || (testAny.userIds as string[]) || [],
        instructions: (testAny.instructions as string) || '',
      });
      setEditingScheduledTestId?.(testId);
      onScheduleOpen();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scheduled test';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      await adminApi.deleteQuiz(quizId);
      toast({
        title: 'Success',
        description: 'Quiz deleted successfully',
        status: 'success',
        duration: 3000,
      });
      await loadQuizzes();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quiz';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteScheduledTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled test?')) {
      return;
    }

    try {
      await scheduledTestsApi.deleteScheduledTest(testId);
      toast({
        title: 'Success',
        description: 'Scheduled test deleted successfully',
        status: 'success',
        duration: 3000,
      });
      await loadScheduledTests();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete scheduled test';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleViewQuiz = async (quiz: Quiz) => {
    try {
      setLoading(true);
      const data = await adminApi.getQuiz(quiz.id);
      const parsedQuestions = parseQuestions(data.questions);
      const mappedQuiz = mapQuizData(data.quiz);

      setViewingQuiz?.({
        quiz: mappedQuiz,
        questions: parsedQuestions,
      });
      onViewOpen?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quiz';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion?.({ ...question });
    onEditOpen?.();
  };

  const handleEditQuiz = (quiz: Quiz, setEditQuizFormData: (data: any) => void, setEditQuizModalTab: (tab: number) => void, setEditQuizJsonFormData: (data: any) => void) => {
    setEditingQuiz?.(quiz);
    setEditQuizFormData({
      name: quiz.name,
      description: quiz.description || '',
      ageGroup: quiz.ageGroup,
      difficulty: quiz.difficulty,
      numberOfQuestions: quiz.numberOfQuestions,
      passingPercentage: quiz.passingPercentage,
      timeLimit: quiz.timeLimit?.toString() || '',
      subtopicId: quiz.subtopicId || '',
      isActive: quiz.isActive,
    });
    setEditQuizModalTab(0);
    setEditQuizJsonFormData({ jsonContent: '' });
    onEditQuizOpen?.();
  };

  const handleUpdateQuiz = async (quizId: string, formData: any) => {
    try {
      setLoading(true);
      await adminApi.updateQuiz(quizId, {
        name: formData.name,
        description: formData.description,
        ageGroup: formData.ageGroup,
        difficulty: formData.difficulty,
        numberOfQuestions: formData.numberOfQuestions,
        passingPercentage: formData.passingPercentage,
        timeLimit: formData.timeLimit ? parseInt(formData.timeLimit, 10) : undefined,
        isActive: formData.isActive,
      });

      toast({
        title: 'Success',
        description: 'Quiz updated successfully',
        status: 'success',
        duration: 3000,
      });

      await loadQuizzes();

      if (viewingQuiz && viewingQuiz.quiz.id === quizId) {
        const data = await adminApi.getQuiz(quizId);
        const parsedQuestions = parseQuestions(data.questions);
        const mappedQuiz = mapQuizData(data.quiz);
        setViewingQuiz?.({
          quiz: mappedQuiz,
          questions: parsedQuestions,
        });
      }

      onEditQuizClose?.();
      setEditingQuiz?.(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update quiz';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuizFromJSON = async (quizId: string, jsonContent: string) => {
    if (!jsonContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste JSON content',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      let quizData: {
        name?: string;
        description?: string;
        ageGroup?: string;
        difficulty?: string;
        passingPercentage?: number;
        timeLimit?: number;
        questions?: Array<{
          question?: string;
          questionText?: string;
          questionType?: string;
          options?: Record<string, string>;
          correctAnswer: string | string[];
          explanation?: string;
          hint?: string;
          points?: number;
        }>;
      };

      try {
        quizData = JSON.parse(jsonContent);
      } catch (parseError) {
        toast({
          title: 'Error',
          description: 'Invalid JSON format. Please check your JSON syntax.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const updateData: Partial<Quiz> = {};
      if (quizData.name) updateData.name = quizData.name;
      if (quizData.description !== undefined) updateData.description = quizData.description;
      if (quizData.ageGroup) updateData.ageGroup = quizData.ageGroup;
      if (quizData.difficulty) updateData.difficulty = quizData.difficulty;
      if (quizData.passingPercentage !== undefined) updateData.passingPercentage = quizData.passingPercentage;
      if (quizData.timeLimit !== undefined) updateData.timeLimit = quizData.timeLimit;

      if (Object.keys(updateData).length > 0) {
        await adminApi.updateQuiz(quizId, updateData);
      }

      if (quizData.questions && Array.isArray(quizData.questions)) {
        const currentQuiz = await adminApi.getQuiz(quizId);
        const currentQuestions = currentQuiz.questions;

        for (const question of currentQuestions) {
          await adminApi.deleteQuestion(question.id);
        }

        for (let i = 0; i < quizData.questions.length; i++) {
          const q = quizData.questions[i];
          const questionText = q.question || q.questionText || '';

          await adminApi.addQuestion(quizId, {
            questionType: q.questionType || 'multiple_choice',
            questionText: questionText,
            questionImageUrl: undefined,
            options: q.options || null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || undefined,
            hint: q.hint || undefined,
            points: q.points || 1,
            orderIndex: i,
          });
        }

        await adminApi.updateQuiz(quizId, {
          numberOfQuestions: quizData.questions.length,
        });
      }

      toast({
        title: 'Success',
        description: 'Quiz updated successfully from JSON',
        status: 'success',
        duration: 3000,
      });

      await loadQuizzes();

      if (viewingQuiz && viewingQuiz.quiz.id === quizId) {
        const data = await adminApi.getQuiz(quizId);
        const parsedQuestions = parseQuestions(data.questions);
        const mappedQuiz = mapQuizData(data.quiz);
        setViewingQuiz?.({
          quiz: mappedQuiz,
          questions: parsedQuestions,
        });
      }

      onEditQuizClose?.();
      setEditingQuiz?.(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update quiz from JSON';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (question: QuizQuestion) => {
    try {
      setLoading(true);
      await adminApi.updateQuestion(question.id, {
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        hint: question.hint,
        points: question.points,
      });

      toast({
        title: 'Success',
        description: 'Question updated successfully',
        status: 'success',
        duration: 3000,
      });

      if (viewingQuiz) {
        const data = await adminApi.getQuiz(viewingQuiz.quiz.id);
        const parsedQuestions = parseQuestions(data.questions);
        const mappedQuiz = mapQuizData(data.quiz);
        setViewingQuiz?.({
          quiz: mappedQuiz,
          questions: parsedQuestions,
        });
      }

      onEditOpen?.();
      setEditingQuestion?.(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    handleAIGenerate,
    handleJSONUpload,
    handleScheduleTest,
    handleViewScheduledTest,
    handleEditScheduledTest,
    handleDeleteQuiz,
    handleDeleteScheduledTest,
    handleViewQuiz,
    handleEditQuestion,
    handleEditQuiz,
    handleUpdateQuiz,
    handleUpdateQuizFromJSON,
    handleUpdateQuestion,
  };
};

