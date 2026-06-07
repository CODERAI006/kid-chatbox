/**
 * Study lesson content page — layout driven by selected study options.
 */
import { motion } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Heading, Alert, AlertIcon,
  Badge, Container, SimpleGrid,
} from '@/shared/design-system';
import { QuizConfig } from '@/types/quiz';
import { Lesson } from '@/services/study';
import { AnimatedCard } from './AnimatedCard';
import { TopicImage } from './TopicImage';
import { AnimatedSection } from './AnimatedSection';
import { AnimatedListItem } from './AnimatedListItem';
import { KeyPointCard } from './KeyPointCard';
import { StudyImageGallery } from './StudyImageGallery';
import { PracticeQASection } from './PracticeQASection';
import type { StudyTopicConfig } from '../StudyModeForm';

interface StudyLessonViewProps {
  lesson: Lesson;
  config: QuizConfig;
  studyMeta?: StudyTopicConfig;
  gradeLabel: string;
  fontSize: string;
  headingSize: string;
  sessionSaved: boolean;
  onTakeQuiz: () => void;
  onBack: () => void;
}

export const StudyLessonView: React.FC<StudyLessonViewProps> = ({
  lesson,
  config,
  studyMeta,
  gradeLabel,
  fontSize,
  headingSize,
  sessionSaved,
  onTakeQuiz,
  onBack,
}) => {
  const topic = config.subtopics[0] || config.subtopics.join(', ');
  const showQA = studyMeta?.contentFocus?.includes('Q&A Practice') ?? true;
  const showFunFacts = (lesson.funFacts?.length ?? 0) > 0;
  const showGallery = studyMeta?.contentFocus?.includes('Diagrams & Images') ?? true;

  return (
    <Box padding={{ base: 4, md: 6 }} bg="gray.50" minHeight="100vh" style={{ fontSize }}>
      <Container maxW="container.xl">
        <VStack spacing={{ base: 4, md: 6 }} align="stretch">
          <AnimatedCard delay={0.1} boxShadow="xl">
            <VStack spacing={3} align="stretch">
              <HStack flexWrap="wrap" gap={2}>
                <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="md">
                  {gradeLabel}
                </Badge>
                <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="md">
                  {config.subject}
                </Badge>
                {studyMeta?.examStyle && (
                  <Badge colorScheme="purple" fontSize="sm" px={2} py={1} borderRadius="md">
                    {studyMeta.examStyle}
                  </Badge>
                )}
                {studyMeta?.lessonStyle && (
                  <Badge colorScheme="orange" fontSize="sm" px={2} py={1} borderRadius="md">
                    {studyMeta.lessonStyle}
                  </Badge>
                )}
                {studyMeta?.lessonDepth && (
                  <Badge colorScheme="teal" fontSize="sm" px={2} py={1} borderRadius="md">
                    {studyMeta.lessonDepth}
                  </Badge>
                )}
              </HStack>
              <Heading size="xl" color="blue.700" textAlign="center" fontSize={headingSize}>
                {lesson.title}
              </Heading>
              <Text textAlign="center" color="gray.600" fontSize="sm">
                Topic: <strong>{topic}</strong>
              </Text>
            </VStack>
          </AnimatedCard>

          <TopicImage subject={config.subject} topic={topic} />

          {showGallery && (
            <AnimatedCard delay={0.15}>
              <StudyImageGallery
                subject={config.subject}
                topic={topic}
                keywords={lesson.imageKeywords}
              />
            </AnimatedCard>
          )}

          <AnimatedCard delay={0.2}>
            <AnimatedSection title="Introduction" delay={0.25} titleColor="blue.600">
              {lesson.introduction.split('\n\n').map((p, i) => (
                <Text key={i} lineHeight="tall" color="gray.700" mb={i < 2 ? 4 : 0}>
                  {p.trim()}
                </Text>
              ))}
            </AnimatedSection>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <AnimatedSection title="Topic Explanation" delay={0.35} titleColor="blue.600">
              <VStack spacing={2} align="stretch">
                {lesson.explanation.map((point, index) => (
                  <AnimatedListItem key={index} text={point} index={index} fontSize={fontSize} />
                ))}
              </VStack>
            </AnimatedSection>
          </AnimatedCard>

          {showFunFacts && (
            <AnimatedCard delay={0.35} bg="cyan.50" borderWidth={2} borderColor="cyan.200">
              <AnimatedSection title="🌟 Fun Facts" delay={0.4} titleColor="cyan.700" borderColor="cyan.300">
                <VStack spacing={3} align="stretch">
                  {lesson.funFacts!.map((fact, i) => (
                    <Box key={i} p={3} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="cyan.400">
                      <Text lineHeight="tall" color="gray.700">{fact}</Text>
                    </Box>
                  ))}
                </VStack>
              </AnimatedSection>
            </AnimatedCard>
          )}

          {lesson.examples.length > 0 && (
            <AnimatedCard delay={0.4} bg="green.50" borderWidth={2} borderColor="green.200">
              <AnimatedSection title="Real-world Examples" delay={0.45} titleColor="green.600" borderColor="green.300">
                <VStack spacing={4} align="stretch">
                  {lesson.examples.map((example, index) => (
                    <Box
                      key={index}
                      p={{ base: 4, md: 5 }}
                      borderRadius="lg"
                      bg="white"
                      borderLeftWidth={4}
                      borderLeftColor="green.400"
                    >
                      <Badge colorScheme="green" mb={2}>Example {index + 1}</Badge>
                      <Text lineHeight="tall" color="gray.700">{example}</Text>
                    </Box>
                  ))}
                </VStack>
              </AnimatedSection>
            </AnimatedCard>
          )}

          {showQA && (lesson.practiceQuestions?.length ?? 0) > 0 && (
            <AnimatedCard delay={0.45} bg="blue.50" borderWidth={2} borderColor="blue.200">
              <AnimatedSection
                title="✏️ Practice Questions & Answers"
                delay={0.5}
                titleColor="blue.700"
                borderColor="blue.300"
              >
                <PracticeQASection questions={lesson.practiceQuestions!} fontSize={fontSize} />
              </AnimatedSection>
            </AnimatedCard>
          )}

          <AnimatedCard delay={0.5} bg="yellow.50" borderWidth={2} borderColor="yellow.300">
            <AnimatedSection title="📌 Key Points to Remember" delay={0.55} titleColor="yellow.700" borderColor="yellow.400">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
                {lesson.keyPoints.map((point, index) => (
                  <KeyPointCard key={index} point={point} index={index} fontSize={fontSize} />
                ))}
              </SimpleGrid>
            </AnimatedSection>
          </AnimatedCard>

          <AnimatedCard delay={0.6} bg="purple.50" borderWidth={2} borderColor="purple.300">
            <AnimatedSection title="Summary" delay={0.65} titleColor="purple.700" borderColor="purple.400">
              <Text lineHeight="tall" color="gray.700" fontWeight="medium">{lesson.summary}</Text>
            </AnimatedSection>
          </AnimatedCard>

          <AnimatedCard delay={0.7} boxShadow="xl">
            <VStack spacing={4}>
              {sessionSaved && (
                <Alert status="success" borderRadius="lg">
                  <AlertIcon />
                  <Text>Your study session has been saved! 📚</Text>
                </Alert>
              )}
              <HStack spacing={4} justifyContent="center" flexWrap="wrap" w="100%">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button colorScheme="blue" size="lg" onClick={onTakeQuiz} px={8}>
                    Take Quiz on This Topic 🎯
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button colorScheme="gray" size="lg" onClick={onBack} px={8}>
                    Back to Dashboard
                  </Button>
                </motion.div>
              </HStack>
            </VStack>
          </AnimatedCard>
        </VStack>
      </Container>
    </Box>
  );
};
