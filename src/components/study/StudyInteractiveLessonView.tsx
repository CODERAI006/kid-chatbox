/**
 * Visual-first interactive study lesson view (18-section design).
 */
import { motion } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Alert, AlertIcon, Container,
} from '@/shared/design-system';
import { QuizConfig } from '@/types/quiz';
import { Lesson } from '@/services/study';
import { StudySectionCard } from './StudySectionCard';
import { StudyInteractiveSectionContent } from './StudyInteractiveSectionContent';
import { StudyInteractiveSectionNav } from './StudyInteractiveSectionNav';
import type { StudyTopicConfig } from '../StudyModeForm';

const SECTION_STYLES: Record<string, { titleColor: string; borderColor: string; bg: string }> = {
  hero: { titleColor: 'blue.700', borderColor: 'blue.300', bg: 'blue.50' },
  'why-learn': { titleColor: 'teal.700', borderColor: 'teal.200', bg: 'teal.50' },
  'big-picture': { titleColor: 'purple.700', borderColor: 'purple.200', bg: 'purple.50' },
  roadmap: { titleColor: 'indigo.700', borderColor: 'indigo.200', bg: 'indigo.50' },
  'concept-cards': { titleColor: 'teal.800', borderColor: 'teal.300', bg: 'teal.50' },
  infographics: { titleColor: 'cyan.700', borderColor: 'cyan.200', bg: 'cyan.50' },
  'memory-aids': { titleColor: 'yellow.800', borderColor: 'yellow.300', bg: 'yellow.50' },
  'learning-steps': { titleColor: 'purple.700', borderColor: 'purple.200', bg: 'purple.50' },
  'real-life': { titleColor: 'green.700', borderColor: 'green.200', bg: 'green.50' },
  'common-mistakes': { titleColor: 'red.700', borderColor: 'red.200', bg: 'red.50' },
  'remember-this': { titleColor: 'blue.800', borderColor: 'blue.300', bg: 'blue.50' },
  'cheat-sheet': { titleColor: 'gray.700', borderColor: 'gray.400', bg: 'gray.100' },
  flashcards: { titleColor: 'purple.700', borderColor: 'purple.300', bg: 'purple.50' },
  'quick-quiz': { titleColor: 'blue.800', borderColor: 'blue.300', bg: 'blue.50' },
  'knowledge-check': { titleColor: 'teal.800', borderColor: 'teal.300', bg: 'teal.50' },
  'ask-ai': { titleColor: 'purple.700', borderColor: 'purple.400', bg: 'purple.50' },
  'final-revision': { titleColor: 'indigo.800', borderColor: 'indigo.300', bg: 'indigo.50' },
  celebration: { titleColor: 'pink.700', borderColor: 'pink.300', bg: 'pink.50' },
};

interface Props {
  lesson: Lesson;
  config: QuizConfig;
  studyMeta?: StudyTopicConfig;
  fontSize: string;
  sessionSaved: boolean;
  onTakeQuiz: () => void;
  onBack: () => void;
}

export const StudyInteractiveLessonView: React.FC<Props> = ({
  lesson,
  config,
  fontSize,
  sessionSaved,
  onTakeQuiz,
  onBack,
}) => {
  const topic = config.subtopics[0] || config.subtopics.join(', ');
  const sections = lesson.sections ?? [];

  return (
    <Box padding={{ base: 4, md: 6 }} bg="gray.50" minHeight="100vh" style={{ fontSize }}>
      <Container maxW="container.lg">
        <VStack spacing={{ base: 4, md: 5 }} align="stretch">
          <StudyInteractiveSectionNav sections={sections} />

          {sections.map((section, i) => {
            const style = SECTION_STYLES[section.type] ?? { titleColor: 'blue.600', borderColor: 'blue.200', bg: 'white' };
            return (
              <StudySectionCard
                key={section.id}
                id={section.id}
                title={`${section.icon} ${section.title}`}
                delay={0.1 + i * 0.02}
                titleColor={style.titleColor}
                borderColor={style.borderColor}
                bg={style.bg}
              >
                <StudyInteractiveSectionContent
                  section={section}
                  topic={topic}
                  subject={config.subject}
                />
              </StudySectionCard>
            );
          })}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box p={5} bg="white" borderRadius="2xl" boxShadow="xl" borderWidth={2} borderColor="blue.200">
              <VStack spacing={4}>
                {sessionSaved && (
                  <Alert status="success" borderRadius="lg">
                    <AlertIcon />
                    <Text>Your study session has been saved! 📚</Text>
                  </Alert>
                )}
                <HStack spacing={4} justifyContent="center" flexWrap="wrap" w="100%">
                  <Button colorScheme="blue" size="lg" onClick={onTakeQuiz} px={8}>
                    Take Quiz on This Topic 🎯
                  </Button>
                  <Button colorScheme="gray" size="lg" onClick={onBack} px={8}>
                    Back to Dashboard
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </motion.div>
        </VStack>
      </Container>
    </Box>
  );
};
