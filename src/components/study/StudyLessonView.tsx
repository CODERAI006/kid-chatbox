/**
 * Study lesson content page — 17-section layout with sticky nav.
 */
import { motion } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Heading, Alert, AlertIcon,
  Badge, Container, SimpleGrid, Image,
} from '@/shared/design-system';
import { QuizConfig } from '@/types/quiz';
import {
  Lesson,
  getIntroductionText,
  getIntroductionCaption,
} from '@/services/study';
import { resolveOllamaImageUrl } from '@/utils/ollamaImageUrl';
import {
  getStudyAgeBand,
  getStudySectionVisibility,
  getAgeBandLabel,
  resolveStudentAge,
} from '@/utils/studyAgeProfile';
import { countIntroLines } from '@/utils/studyPromptLimits';
import { AnimatedCard } from './AnimatedCard';
import { StudyImageGallery } from './StudyImageGallery';
import { StudyLessonSectionNav } from './StudyLessonSectionNav';
import { StudyLessonSections } from './StudyLessonSections';
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
  const showGallery = studyMeta?.contentFocus?.includes('Diagrams & Images') ?? true;
  const introText = getIntroductionText(lesson.introduction);
  const introSrc = resolveOllamaImageUrl(lesson.introImageUrl);
  const introCaption = getIntroductionCaption(lesson.introduction) || topic;
  const studentAge = resolveStudentAge(config.age, gradeLabel);
  const ageBand = getStudyAgeBand(studentAge);
  const sectionVisibility = getStudySectionVisibility(ageBand);
  const storyLines = countIntroLines(introText);

  return (
    <Box padding={{ base: 4, md: 6 }} bg="gray.50" minHeight="100vh" style={{ fontSize }}>
      <Container maxW="container.xl">
        <VStack spacing={{ base: 4, md: 5 }} align="stretch">
          <StudyLessonSectionNav />

          <Box id="topic-header" scrollMarginTop="88px">
            <AnimatedCard delay={0.1} boxShadow="xl">
              <VStack spacing={4} align="stretch">
                <HStack flexWrap="wrap" gap={2} justify="center">
                  <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="md">{gradeLabel}</Badge>
                  <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="md">{config.subject}</Badge>
                  {studyMeta?.examStyle && (
                    <Badge colorScheme="purple" fontSize="sm" px={2} py={1} borderRadius="md">{studyMeta.examStyle}</Badge>
                  )}
                  <Badge colorScheme="orange" fontSize="sm" px={2} py={1} borderRadius="md">
                    {getAgeBandLabel(ageBand)}
                  </Badge>
                </HStack>
                <Heading size="xl" color="blue.700" textAlign="center" fontSize={headingSize}>
                  📚 {lesson.title}
                </Heading>
                <Text textAlign="center" color="gray.600">
                  Topic: <strong>{topic}</strong>
                </Text>

                <Box
                  p={{ base: 4, md: 5 }}
                  borderRadius="2xl"
                  bgGradient="linear(to-br, blue.50, purple.50)"
                  borderWidth={2}
                  borderColor="blue.200"
                  boxShadow="md"
                >
                  <HStack justify="space-between" flexWrap="wrap" gap={2} mb={3}>
                    <Badge colorScheme="blue" borderRadius="full" px={3}>
                      📖 Story opening
                    </Badge>
                    <Text fontSize="xs" color="gray.500">
                      {storyLines} lines · written for you
                    </Text>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: introSrc ? 2 : 1 }} spacing={5} alignItems="start">
                    {introSrc && (
                      <Box borderRadius="xl" overflow="hidden" boxShadow="lg" borderWidth={2} borderColor="blue.100">
                        <Image
                          src={introSrc}
                          alt={introCaption}
                          w="100%"
                          h={{ base: '220px', md: '300px' }}
                          objectFit="cover"
                        />
                        <Box px={3} py={2} bg="blue.600">
                          <Text color="white" fontSize="sm" fontWeight="semibold">{introCaption}</Text>
                        </Box>
                      </Box>
                    )}
                    <Box>
                      {introText.split('\n\n').map((p, i) => (
                        <Text
                          key={i}
                          lineHeight="1.9"
                          color="gray.800"
                          mb={4}
                          fontSize={{ base: 'md', md: 'lg' }}
                          fontFamily="Georgia, 'Times New Roman', serif"
                        >
                          {p.trim()}
                        </Text>
                      ))}
                    </Box>
                  </SimpleGrid>
                </Box>
              </VStack>
            </AnimatedCard>
          </Box>

          {showGallery && lesson.galleryImages && lesson.galleryImages.length > 0 && (
            <AnimatedCard delay={0.12}>
              <StudyImageGallery images={lesson.galleryImages} />
            </AnimatedCard>
          )}

          <StudyLessonSections
            lesson={lesson}
            config={config}
            topic={topic}
            fontSize={fontSize}
            sectionVisibility={sectionVisibility}
          />

          {lesson.summary && (
            <AnimatedCard delay={0.46} bg="gray.100" borderWidth={2} borderColor="gray.300">
              <Text lineHeight="tall" color="gray.700" fontWeight="medium" textAlign="center">
                {lesson.summary}
              </Text>
            </AnimatedCard>
          )}

          <AnimatedCard delay={0.48} boxShadow="xl">
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
