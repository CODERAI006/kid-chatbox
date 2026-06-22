/**
 * Study Mode — config form → AI lesson with Q&A, images, and quiz handoff.
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, VStack, Text, Spinner, Alert, AlertIcon, Container,
} from '@/shared/design-system';
import { StudyModeForm, StudyTopicConfig } from './StudyModeForm';
import { StudyLessonView } from './study/StudyLessonView';
import { generateLesson, getIntroductionText } from '@/services/study';
import { lessonToPersist } from '@/utils/lessonPersist';
import { QuizConfig } from '@/types/quiz';
import { Lesson } from '@/services/study';
import { authApi, studyApi, profileApi } from '@/services/api';
import { User } from '@/types';
import { STUDY_MODE_MESSAGES } from '@/constants/study';
import { useFontSize } from '@/contexts/FontSizeContext';

type StudyPhase = 'config' | 'loading' | 'lesson';

export const StudyMode: React.FC = () => {
  const navigate = useNavigate();
  const { fontSize } = useFontSize();
  const [phase, setPhase] = useState<StudyPhase>('config');
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [studyMeta, setStudyMeta] = useState<StudyTopicConfig | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTopicSubmit = useCallback(async (topicConfig: StudyTopicConfig) => {
    setIsGenerating(true);
    let userProfile: User | null = null;

    try {
      const { user: freshUser } = await profileApi.getProfile();
      userProfile = freshUser as User | null;
    } catch {
      try {
        const { user: authUser } = await authApi.fetchCurrentUser();
        userProfile = authUser as User | null;
      } catch {
        const { user } = authApi.getCurrentUser();
        userProfile = user as User | null;
      }
    }

    if (!userProfile?.age || !userProfile?.preferredLanguage) {
      setError(STUDY_MODE_MESSAGES.ERROR_PROFILE_INCOMPLETE);
      setPhase('config');
      setIsGenerating(false);
      return;
    }

    const quizConfig: QuizConfig = {
      age: userProfile.age,
      language: userProfile.preferredLanguage as QuizConfig['language'],
      subject: topicConfig.subject,
      subtopics: topicConfig.subtopics,
      questionCount: 15,
      difficulty: topicConfig.difficulty,
      gradeLevel: topicConfig.gradeLevel,
      examStyle: topicConfig.examStyle,
      instructions: topicConfig.instructions,
    };

    setConfig(quizConfig);
    setStudyMeta(topicConfig);
    setPhase('loading');
    setError(null);
    setSessionSaved(false);

    try {
      const generatedLesson = await generateLesson(quizConfig, userProfile, {
        lessonStyle: topicConfig.lessonStyle,
        lessonDepth: topicConfig.lessonDepth,
        contentFocus: topicConfig.contentFocus,
        examStyle: topicConfig.examStyle,
        gradeLevel: topicConfig.gradeLevel,
      });
      setLesson(generatedLesson);
      setPhase('lesson');

      try {
        const { user } = authApi.getCurrentUser();
        if (user) {
          await studyApi.saveStudySession({
            user_id: (user as { id: string }).id,
            timestamp: new Date().toISOString(),
            subject: quizConfig.subject,
            topic: quizConfig.subtopics[0] || '',
            age: quizConfig.age,
            language: quizConfig.language,
            difficulty: quizConfig.difficulty,
            lesson_title: generatedLesson.title,
            lesson_introduction: getIntroductionText(generatedLesson.introduction),
            lesson_explanation: generatedLesson.explanation,
            lesson_key_points: generatedLesson.keyPoints,
            lesson_examples: generatedLesson.examples,
            lesson_summary: generatedLesson.summary,
            lesson_content: lessonToPersist(generatedLesson),
          });
          setSessionSaved(true);
        }
      } catch (saveErr) {
        console.error('Failed to save study session:', saveErr);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : STUDY_MODE_MESSAGES.ERROR_GENERATION_FAILED,
      );
      setPhase('config');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const getUserGrade = (): string => {
    if (studyMeta?.gradeLevel) return studyMeta.gradeLevel;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.grade || `Class ${Math.floor((config?.age || 8) / 2) + 1}`;
      }
    } catch { /* ignore */ }
    return `Class ${Math.floor((config?.age || 8) / 2) + 1}`;
  };

  const getProfileGrade = (): string | undefined => {
    try {
      const { user } = authApi.getCurrentUser();
      return (user as User | null)?.grade;
    } catch {
      return undefined;
    }
  };

  const baseFontSize = `${fontSize}px`;
  const headingSize = `${fontSize * 1.5}px`;
  const subHeadingSize = `${fontSize * 1.25}px`;

  if (phase === 'config') {
    return (
      <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 2, md: 4 }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <StudyModeForm
            onTopicSubmit={handleTopicSubmit}
            userGrade={getProfileGrade()}
            isGenerating={isGenerating}
          />
          {error && (
            <Alert status="error" maxWidth="960px" borderRadius="lg" mt={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}
        </motion.div>
      </Container>
    );
  }

  if (phase === 'loading') {
    return (
      <Box padding={{ base: 4, md: 6 }} display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <VStack spacing={6}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
          </motion.div>
          <VStack spacing={2}>
            <Text fontSize={subHeadingSize} fontWeight="bold">{STUDY_MODE_MESSAGES.LOADING_MESSAGE}</Text>
            <Text fontSize={baseFontSize} color="gray.600">
              Building your {studyMeta?.lessonStyle?.toLowerCase() || 'personalized'} lesson…
            </Text>
          </VStack>
        </VStack>
      </Box>
    );
  }

  if (phase === 'lesson' && lesson && config) {
    return (
      <StudyLessonView
        lesson={lesson}
        config={config}
        studyMeta={studyMeta ?? undefined}
        gradeLabel={getUserGrade()}
        fontSize={baseFontSize}
        headingSize={headingSize}
        sessionSaved={sessionSaved}
        onTakeQuiz={() => navigate('/quiz', { state: { config } })}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  return null;
};
