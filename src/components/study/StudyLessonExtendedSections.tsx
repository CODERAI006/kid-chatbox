/**
 * Extended sections (6–32) for the premium 32-section study module.
 */
import { useState } from 'react';
import {
  Box, VStack, HStack, Text, Badge, SimpleGrid, Button, Collapse,
} from '@/shared/design-system';
import type { Lesson } from '@/services/study';
import { StudySectionCard } from './StudySectionCard';
import { PracticeQASection } from './PracticeQASection';
import type { StudySectionVisibility } from '@/utils/studyAgeProfile';

interface Props {
  lesson: Lesson;
  fontSize: string;
  sectionVisibility: StudySectionVisibility;
}

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <VStack spacing={2} align="stretch">
    {items.map((item, i) => (
      <Text key={i} lineHeight="tall" color="gray.700">• {item}</Text>
    ))}
  </VStack>
);

const McqList: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!lesson.mcqs?.length) return null;
  return (
    <StudySectionCard id="mcqs" title="📝 Multiple Choice Questions" delay={0.37} titleColor="blue.800" borderColor="blue.300" bg="blue.50">
      <VStack spacing={3} align="stretch">
        {lesson.mcqs.map((mcq, i) => (
          <Box key={i} p={4} bg="white" borderRadius="lg" borderWidth={1} borderColor="blue.100">
            <Text fontWeight="semibold" mb={2}>Q{i + 1}. {mcq.question}</Text>
            <VStack align="stretch" spacing={1} mb={2}>
              {mcq.options.map((opt, j) => (
                <Text key={j} fontSize="sm" color={j === mcq.correctIndex ? 'green.700' : 'gray.700'}>
                  {String.fromCharCode(65 + j)}. {opt}
                </Text>
              ))}
            </VStack>
            <Button size="xs" variant="outline" onClick={() => setOpen(open === i ? null : i)}>
              {open === i ? 'Hide explanation' : 'Show explanation'}
            </Button>
            <Collapse in={open === i}>
              <Text mt={2} fontSize="sm" color="gray.600">{mcq.explanation}</Text>
            </Collapse>
          </Box>
        ))}
      </VStack>
    </StudySectionCard>
  );
};

export const StudyLessonExtendedSections: React.FC<Props> = ({
  lesson,
  fontSize,
  sectionVisibility,
}) => (
  <>
    {lesson.lessonHeader?.learningObjectives?.length ? (
      <StudySectionCard id="learning-objectives" title="🎯 Learning Objectives" delay={0.13} titleColor="indigo.700" borderColor="indigo.200" bg="indigo.50">
        <HStack flexWrap="wrap" gap={2} mb={3}>
          {lesson.lessonHeader.difficultyLevel && (
            <Badge colorScheme="purple">{lesson.lessonHeader.difficultyLevel}</Badge>
          )}
          {lesson.lessonHeader.estimatedLearningTime && (
            <Badge colorScheme="blue">⏱ {lesson.lessonHeader.estimatedLearningTime}</Badge>
          )}
        </HStack>
        <BulletList items={lesson.lessonHeader.learningObjectives} />
      </StudySectionCard>
    ) : null}

    {(lesson.concepts?.length ?? 0) > 0 && (
      <StudySectionCard id="concepts" title="🧩 Concept Explanation" delay={0.19} titleColor="teal.800" borderColor="teal.300" bg="teal.50">
        <VStack spacing={4} align="stretch">
          {lesson.concepts!.map((c, i) => (
            <Box key={i} p={4} bg="white" borderRadius="lg" borderLeftWidth={4} borderLeftColor="teal.400">
              <Text fontWeight="bold" color="teal.700" mb={2}>{c.name}</Text>
              <Text fontSize="sm" mb={2}><strong>Definition:</strong> {c.definition}</Text>
              <Text fontSize="sm" mb={2}>{c.explanation}</Text>
              <Text fontSize="sm" color="green.700" mb={1}>✅ Example: {c.example}</Text>
              {c.nonExample && <Text fontSize="sm" color="red.600" mb={1}>❌ Not: {c.nonExample}</Text>}
              {c.commonMistake && <Text fontSize="sm" color="orange.700" mb={1}>⚠️ Mistake: {c.commonMistake}</Text>}
              {c.checkQuestion && <Text fontSize="sm" fontStyle="italic" color="gray.600">🤔 {c.checkQuestion}</Text>}
            </Box>
          ))}
        </VStack>
      </StudySectionCard>
    )}

    {lesson.realWorldConnections && (
      <StudySectionCard id="real-world-connections" title="🌏 Real-World Connections" delay={0.21} titleColor="green.800" borderColor="green.300" bg="green.50">
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {(['dailyLife', 'local', 'national', 'global'] as const).map((key) => {
            const items = lesson.realWorldConnections?.[key];
            if (!items?.length) return null;
            const labels = { dailyLife: 'Daily Life', local: 'Local', national: 'National', global: 'Global' };
            return (
              <Box key={key} p={3} bg="white" borderRadius="lg">
                <Badge mb={2} colorScheme="green">{labels[key]}</Badge>
                <BulletList items={items} />
              </Box>
            );
          })}
        </SimpleGrid>
      </StudySectionCard>
    )}

    {(lesson.memoryTricks?.length ?? 0) > 0 && (
      <StudySectionCard id="memory-tricks" title="🧠 Memory Tricks" delay={0.23} titleColor="yellow.800" borderColor="yellow.300" bg="yellow.50">
        <BulletList items={lesson.memoryTricks!} />
      </StudySectionCard>
    )}

    {(lesson.comparisons?.length ?? 0) > 0 && (
      <StudySectionCard id="comparisons" title="🔀 Spot the Difference" delay={0.25} titleColor="cyan.800" borderColor="cyan.300" bg="cyan.50">
        <VStack spacing={4} align="stretch">
          {lesson.comparisons!.map((cmp, i) => (
            <Box key={i} p={4} bg="white" borderRadius="lg">
              <Text fontWeight="bold" mb={3} textAlign="center">{cmp.title}</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Text fontWeight="semibold" mb={2}>{cmp.leftTitle}</Text>
                  <BulletList items={cmp.leftPoints} />
                </Box>
                <Box p={3} bg="orange.50" borderRadius="md">
                  <Text fontWeight="semibold" mb={2}>{cmp.rightTitle}</Text>
                  <BulletList items={cmp.rightPoints} />
                </Box>
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      </StudySectionCard>
    )}

    {(lesson.misconceptions?.length ?? 0) > 0 && (
      <StudySectionCard id="misconceptions" title="💡 Common Misconceptions" delay={0.31} titleColor="red.700" borderColor="red.200" bg="red.50">
        <VStack spacing={2} align="stretch">
          {lesson.misconceptions!.map((m, i) => (
            <Box key={i} p={3} bg="white" borderRadius="lg">
              <Text color="red.600" fontSize="sm" mb={1}>❌ {m.wrong}</Text>
              <Text color="green.700" fontSize="sm">✅ {m.correct}</Text>
            </Box>
          ))}
        </VStack>
      </StudySectionCard>
    )}

    {sectionVisibility.examNotes && lesson.examPrep && (
      <StudySectionCard id="exam-prep" title="📋 Exam Preparation" delay={0.33} titleColor="yellow.800" borderColor="yellow.300" bg="yellow.50">
        <VStack spacing={4} align="stretch">
          {(['easy', 'medium', 'difficult'] as const).map((level) => {
            const qs = lesson.examPrep?.[level];
            if (!qs?.length) return null;
            return (
              <Box key={level}>
                <Badge mb={2} colorScheme={level === 'easy' ? 'green' : level === 'medium' ? 'orange' : 'red'}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Badge>
                <PracticeQASection questions={qs} fontSize={fontSize} />
              </Box>
            );
          })}
        </VStack>
      </StudySectionCard>
    )}

    <McqList lesson={lesson} />

    {(lesson.trueFalse?.length ?? 0) > 0 && (
      <StudySectionCard id="true-false" title="✅ True or False" delay={0.38}>
        <VStack spacing={2} align="stretch">
          {lesson.trueFalse!.map((tf, i) => (
            <HStack key={i} p={3} bg="white" borderRadius="lg" justify="space-between">
              <Text flex={1}>{tf.statement}</Text>
              <Badge colorScheme={tf.answer ? 'green' : 'red'}>{tf.answer ? 'True' : 'False'}</Badge>
            </HStack>
          ))}
        </VStack>
      </StudySectionCard>
    )}

    {(lesson.activities?.length ?? 0) > 0 && (
      <StudySectionCard id="activities" title="🔬 Hands-On Activities" delay={0.43} titleColor="purple.700" borderColor="purple.300" bg="purple.50">
        <VStack spacing={4} align="stretch">
          {lesson.activities!.map((act, i) => (
            <Box key={i} p={4} bg="white" borderRadius="lg">
              <Text fontWeight="bold" mb={2}>{act.title}</Text>
              {act.materials.length > 0 && (
                <Text fontSize="sm" mb={2}>📦 Materials: {act.materials.join(', ')}</Text>
              )}
              <BulletList items={act.steps.map((s, j) => `Step ${j + 1}: ${s}`)} />
              {act.expectedLearning && (
                <Text fontSize="sm" mt={2} color="green.700">🎯 {act.expectedLearning}</Text>
              )}
            </Box>
          ))}
        </VStack>
      </StudySectionCard>
    )}

    {lesson.projectWork && (
      <StudySectionCard id="project-work" title="📂 Project Work" delay={0.45} titleColor="blue.700" borderColor="blue.300" bg="blue.50">
        <VStack spacing={2} align="stretch">
          {lesson.projectWork.miniProject && <Text>🛠️ <strong>Mini Project:</strong> {lesson.projectWork.miniProject}</Text>}
          {lesson.projectWork.researchActivity && <Text>🔍 <strong>Research:</strong> {lesson.projectWork.researchActivity}</Text>}
          {lesson.projectWork.presentationIdea && <Text>🎤 <strong>Presentation:</strong> {lesson.projectWork.presentationIdea}</Text>}
          {lesson.projectWork.creativeAssignment && <Text>🎨 <strong>Creative:</strong> {lesson.projectWork.creativeAssignment}</Text>}
        </VStack>
      </StudySectionCard>
    )}

    {lesson.gamifiedChallenges && (
      <StudySectionCard id="gamified" title="🎮 Gamified Challenges" delay={0.47} titleColor="pink.700" borderColor="pink.300" bg="pink.50">
        <VStack spacing={2} align="stretch">
          {lesson.gamifiedChallenges.explorerMission && <Text>🧭 Explorer: {lesson.gamifiedChallenges.explorerMission}</Text>}
          {lesson.gamifiedChallenges.detectiveMission && <Text>🔎 Detective: {lesson.gamifiedChallenges.detectiveMission}</Text>}
          {lesson.gamifiedChallenges.quizChallenge && <Text>🎯 Quiz: {lesson.gamifiedChallenges.quizChallenge}</Text>}
          {lesson.gamifiedChallenges.badges?.length ? (
            <HStack flexWrap="wrap" gap={2}>
              {lesson.gamifiedChallenges.badges.map((b, i) => (
                <Badge key={i} colorScheme="pink">🏅 {b}</Badge>
              ))}
            </HStack>
          ) : null}
        </VStack>
      </StudySectionCard>
    )}

    {lesson.hotQuestions && (
      <StudySectionCard id="hot-questions" title="🚀 Higher-Order Thinking" delay={0.49} titleColor="indigo.800" borderColor="indigo.300" bg="indigo.50">
        {(['critical', 'creative', 'analytical'] as const).map((kind) => {
          const items = lesson.hotQuestions?.[kind];
          if (!items?.length) return null;
          return (
            <Box key={kind} mb={3}>
              <Badge mb={2}>{kind.charAt(0).toUpperCase() + kind.slice(1)}</Badge>
              <BulletList items={items} />
            </Box>
          );
        })}
      </StudySectionCard>
    )}

    {(lesson.aiTutorQa?.length ?? 0) > 0 && (
      <StudySectionCard id="ai-tutor-qa" title="🤖 AI Tutor Q&A" delay={0.51} titleColor="purple.700" borderColor="purple.300" bg="purple.50">
        <PracticeQASection
          questions={lesson.aiTutorQa!.map((q) => ({ question: q.question, answer: q.answer }))}
          fontSize={fontSize}
        />
      </StudySectionCard>
    )}

    {(lesson.learningOutcomes?.length ?? 0) > 0 && (
      <StudySectionCard id="learning-outcomes" title="✔️ Learning Outcomes" delay={0.53} titleColor="green.800" borderColor="green.300" bg="green.50">
        <VStack spacing={1} align="stretch">
          {lesson.learningOutcomes!.map((o, i) => (
            <Text key={i} fontSize="sm">□ {o}</Text>
          ))}
        </VStack>
      </StudySectionCard>
    )}
  </>
);
