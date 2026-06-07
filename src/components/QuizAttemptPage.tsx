/**
 * Full-screen library / on-demand quiz session at /quiz/attempt/:attemptId
 */
import { Box } from '@/shared/design-system';
import { QuizTutor } from './QuizTutor';
import { QuizTutorErrorBoundary } from './QuizTutorErrorBoundary';

export const QuizAttemptPage: React.FC = () => (
  <Box py={{ base: 2, md: 4 }} px={{ base: 2, md: 4 }}>
    <QuizTutorErrorBoundary>
      <QuizTutor mode="library-attempt" />
    </QuizTutorErrorBoundary>
  </Box>
);
