/**
 * Read-only view for a saved study lesson (history / library).
 */
import {
  Box, VStack, HStack, Text, Heading, Badge, Container,
} from '@/shared/design-system';
import type { Lesson } from '@/services/study';
import { getIntroductionText } from '@/services/study';
import { QuizConfig } from '@/types/quiz';
import {
  getStudyAgeBand,
  getStudySectionVisibility,
  getAgeBandLabel,
  resolveStudentAge,
} from '@/utils/studyAgeProfile';
import { StudyLessonSections } from './StudyLessonSections';
import { StudyLessonSectionNav } from './StudyLessonSectionNav';
import { StudyInteractiveLessonView } from './StudyInteractiveLessonView';

interface Props {
  lesson: Lesson;
  config: QuizConfig;
  gradeLabel?: string;
  fontSize?: string;
}

export const StudySavedLessonView: React.FC<Props> = ({
  lesson,
  config,
  gradeLabel,
  fontSize = '16px',
}) => {
  const topic = config.subtopics[0] || config.subtopics.join(', ');
  const introText = getIntroductionText(lesson.introduction);
  const studentAge = resolveStudentAge(config.age, gradeLabel);
  const ageBand = getStudyAgeBand(studentAge);
  const sectionVisibility = getStudySectionVisibility(ageBand);

  if (lesson.sections?.length) {
    return (
      <StudyInteractiveLessonView
        lesson={lesson}
        config={config}
        fontSize={fontSize}
        sessionSaved={false}
        onTakeQuiz={() => {}}
        onBack={() => {}}
      />
    );
  }

  return (
    <Container maxW="container.xl" px={0}>
      <VStack spacing={4} align="stretch">
        <StudyLessonSectionNav />
        <Box id="topic-header" scrollMarginTop="88px">
          <Box p={{ base: 4, md: 5 }} borderRadius="2xl" bg="white" borderWidth={1} borderColor="gray.200" boxShadow="md">
            <VStack spacing={3} align="stretch">
              <HStack flexWrap="wrap" gap={2}>
                {gradeLabel && <Badge colorScheme="blue">{gradeLabel}</Badge>}
                <Badge colorScheme="green">{config.subject}</Badge>
                <Badge colorScheme="orange">{getAgeBandLabel(ageBand)}</Badge>
              </HStack>
              <Heading size="md" color="blue.700">📚 {lesson.title}</Heading>
              <Text fontSize="sm" color="gray.600">Topic: <strong>{topic}</strong></Text>
              <Box p={4} borderRadius="xl" bgGradient="linear(to-br, blue.50, purple.50)" borderWidth={1} borderColor="blue.100">
                <Badge colorScheme="blue" mb={3}>📖 Story opening</Badge>
                {introText.split('\n\n').map((p, i) => (
                  <Text key={i} lineHeight="1.9" color="gray.800" mb={3} fontFamily="Georgia, serif">
                    {p.trim()}
                  </Text>
                ))}
              </Box>
            </VStack>
          </Box>
        </Box>
        <StudyLessonSections
          lesson={lesson}
          config={config}
          topic={topic}
          fontSize={fontSize}
          sectionVisibility={sectionVisibility}
        />
        {lesson.summary && (
          <Box p={4} bg="gray.100" borderRadius="lg" textAlign="center">
            <Text lineHeight="tall" color="gray.700" fontWeight="medium">{lesson.summary}</Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
};
