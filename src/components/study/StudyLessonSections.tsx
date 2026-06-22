/**
 * Renders sections 2–32 of the study lesson (below format).
 */
import { SimpleGrid, VStack, HStack, Text, Badge, Box } from '@/shared/design-system';
import { QuizConfig } from '@/types/quiz';
import { Lesson } from '@/services/study';
import { AnimatedListItem } from './AnimatedListItem';
import { PracticeQASection } from './PracticeQASection';
import { StudyFlashcards } from './StudyFlashcards';
import { StudySectionCard } from './StudySectionCard';
import { StudyAskTeacher } from './StudyAskTeacher';
import { StudyLessonExtendedSections } from './StudyLessonExtendedSections';
import type { StudySectionVisibility } from '@/utils/studyAgeProfile';

interface StudyLessonSectionsProps {
  lesson: Lesson;
  config: QuizConfig;
  topic: string;
  fontSize: string;
  sectionVisibility: StudySectionVisibility;
}

const BulletList: React.FC<{ items: string[]; accent?: string }> = ({ items, accent = 'gray.700' }) => (
  <VStack spacing={2} align="stretch">
    {items.map((item, i) => (
      <Text key={i} lineHeight="tall" color={accent}>• {item}</Text>
    ))}
  </VStack>
);

export const StudyLessonSections: React.FC<StudyLessonSectionsProps> = ({
  lesson,
  config,
  topic,
  fontSize,
  sectionVisibility,
}) => {
  const visualItems = lesson.visualLearningDescription ?? lesson.visualLearningSuggestions ?? [];

  return (
    <>
      {lesson.whyLearnThis && (
        <StudySectionCard id="why-learn" title="💡 Why Learn This?" delay={0.14} titleColor="teal.700" borderColor="teal.200" bg="teal.50">
          <Text lineHeight="tall" color="gray.700">{lesson.whyLearnThis}</Text>
        </StudySectionCard>
      )}

      {lesson.quickSummary && (
        <StudySectionCard id="quick-summary" title="⚡ Quick Summary" delay={0.16} titleColor="cyan.700" borderColor="cyan.200" bg="cyan.50">
          <Text lineHeight="tall" color="gray.700" fontWeight="medium">{lesson.quickSummary}</Text>
        </StudySectionCard>
      )}

      {lesson.explanation.length > 0 && (
        <StudySectionCard id="detailed-explanation" title="📖 Detailed Explanation" delay={0.18}>
          <VStack spacing={2} align="stretch">
            {lesson.explanation.map((point, index) => (
              <AnimatedListItem key={index} text={point} index={index} fontSize={fontSize} />
            ))}
          </VStack>
        </StudySectionCard>
      )}

      {sectionVisibility.visualLearning && visualItems.length > 0 && (
        <StudySectionCard id="visual-learning" title="🎨 Visual Learning Description" delay={0.2} titleColor="orange.700" borderColor="orange.200" bg="orange.50">
          <BulletList items={visualItems} />
        </StudySectionCard>
      )}

      {lesson.realLifeAnalogy && (
        <StudySectionCard id="real-life-analogy" title="🌍 Real-Life Analogy" delay={0.22} titleColor="green.700" borderColor="green.200" bg="green.50">
          <Box p={4} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="green.400">
            <Text lineHeight="tall" color="gray.700" fontStyle="italic">{lesson.realLifeAnalogy}</Text>
          </Box>
        </StudySectionCard>
      )}

      {lesson.examples.length > 0 && (
        <StudySectionCard id="real-world-examples" title="🔍 Real-World Examples" delay={0.24} titleColor="green.600" borderColor="green.300" bg="green.50">
          <VStack spacing={3} align="stretch">
            {lesson.examples.map((example, index) => (
              <Box key={index} p={4} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="green.400">
                <Badge colorScheme="green" mb={2}>Example {index + 1}</Badge>
                <Text lineHeight="tall" color="gray.700">{example}</Text>
              </Box>
            ))}
          </VStack>
        </StudySectionCard>
      )}

      {sectionVisibility.keyTerms && (lesson.keyTerms?.length ?? 0) > 0 && (
        <StudySectionCard id="key-terms" title="📝 Key Terms" delay={0.26} titleColor="blue.700" borderColor="blue.300" bg="blue.50">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {lesson.keyTerms!.map((kt, i) => (
              <Box key={i} p={4} bg="white" borderRadius="lg" boxShadow="sm">
                <Text fontWeight="bold" color="blue.700" mb={1}>{kt.term}</Text>
                <Text fontSize="sm" color="gray.600" lineHeight="tall">{kt.definition}</Text>
                {kt.easyExample && (
                  <Text fontSize="xs" color="blue.600" mt={1}>e.g. {kt.easyExample}</Text>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </StudySectionCard>
      )}

      {(lesson.funFacts?.length ?? 0) > 0 && (
        <StudySectionCard id="fun-facts" title="🌟 Fun Facts" delay={0.28} titleColor="pink.700" borderColor="pink.200" bg="pink.50">
          <VStack spacing={3} align="stretch">
            {lesson.funFacts!.map((fact, i) => (
              <Box key={i} p={3} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="pink.400">
                <Text lineHeight="tall" color="gray.700">{fact}</Text>
              </Box>
            ))}
          </VStack>
        </StudySectionCard>
      )}

      {(lesson.didYouKnow?.length ?? 0) > 0 && (
        <StudySectionCard id="did-you-know" title="🤔 Did You Know?" delay={0.3} titleColor="purple.700" borderColor="purple.200" bg="purple.50">
          <BulletList items={lesson.didYouKnow!} />
        </StudySectionCard>
      )}

      {sectionVisibility.commonMistakes && (lesson.commonMistakes?.length ?? 0) > 0 && (
        <StudySectionCard id="common-mistakes" title="⚠️ Common Mistakes" delay={0.32} titleColor="red.700" borderColor="red.200" bg="red.50">
          <VStack spacing={2} align="stretch">
            {lesson.commonMistakes!.map((m, i) => (
              <Box key={i} p={3} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="red.400">
                <Text lineHeight="tall" color="gray.700">{m}</Text>
              </Box>
            ))}
          </VStack>
        </StudySectionCard>
      )}

      {sectionVisibility.examNotes && (lesson.examNotes?.length ?? 0) > 0 && (
        <StudySectionCard id="exam-notes" title="📋 Exam Notes" delay={0.34} titleColor="yellow.800" borderColor="yellow.300" bg="yellow.50">
          <BulletList items={lesson.examNotes!} accent="gray.800" />
        </StudySectionCard>
      )}

      {sectionVisibility.practiceQuestions && (lesson.practiceQuestions?.length ?? 0) > 0 && (
        <StudySectionCard id="questions-answers" title="✏️ Questions & Answers" delay={0.36} titleColor="blue.700" borderColor="blue.300" bg="blue.50">
          <PracticeQASection questions={lesson.practiceQuestions!} fontSize={fontSize} />
        </StudySectionCard>
      )}

      {sectionVisibility.thinkingQuestions && (lesson.thinkingQuestions?.length ?? 0) > 0 && (
        <StudySectionCard id="thinking-questions" title="🧠 Thinking Questions" delay={0.38} titleColor="indigo.700" borderColor="indigo.200" bg="indigo.50">
          <VStack spacing={3} align="stretch">
            {lesson.thinkingQuestions!.map((q, i) => (
              <Box key={i} p={4} bg="white" borderRadius="lg" borderWidth={1} borderColor="indigo.100">
                <Badge colorScheme="purple" mb={2}>Think {i + 1}</Badge>
                <Text lineHeight="tall" color="gray.700">{q}</Text>
              </Box>
            ))}
          </VStack>
        </StudySectionCard>
      )}

      {(lesson.flashcards?.length ?? 0) > 0 && (
        <StudySectionCard id="flashcards" title="🃏 Flashcards" delay={0.4} titleColor="purple.700" borderColor="purple.300" bg="purple.50">
          <StudyFlashcards cards={lesson.flashcards!} />
        </StudySectionCard>
      )}

      {sectionVisibility.oneMinuteRevision && (lesson.oneMinuteRevision?.length ?? 0) > 0 && (
        <StudySectionCard id="one-minute-revision" title="⏱️ Quick Review" delay={0.42} titleColor="orange.800" borderColor="orange.300" bg="orange.50">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
            {lesson.oneMinuteRevision!.map((line, i) => (
              <HStack key={i} spacing={2} align="start">
                <Badge colorScheme="orange" flexShrink={0}>{i + 1}</Badge>
                <Text fontSize="sm" color="gray.700" lineHeight="tall">{line}</Text>
              </HStack>
            ))}
          </SimpleGrid>
        </StudySectionCard>
      )}

      <StudyLessonExtendedSections
        lesson={lesson}
        fontSize={fontSize}
        sectionVisibility={sectionVisibility}
      />

      <StudySectionCard id="ask-ai-teacher" title="🤖 Ask AI Teacher" delay={0.44} titleColor="purple.700" borderColor="purple.400" bg="purple.50">
        <StudyAskTeacher topic={topic} subject={config.subject} suggestedPrompts={lesson.askAiTeacherPrompts} />
      </StudySectionCard>
    </>
  );
};
