/**
 * Renders a single interactive study section by type.
 */
import { useState } from 'react';
import {
  Box, VStack, HStack, Text, Badge, SimpleGrid, Heading, Button, Collapse,
} from '@/shared/design-system';
import type {
  StudyInteractiveSection,
  ConceptCard,
  QuickQuizQuestion,
  KnowledgeCheckItem,
  WhyLearnCard,
  RealLifeCard,
  MistakeCard,
  CheatSheetItem,
} from '@/types/studyInteractive';
import { StudyVisualDiagram } from './StudyVisualDiagram';
import { StudyFlashcards } from './StudyFlashcards';
import { StudyQuickQuiz } from './StudyQuickQuiz';
import { StudyKnowledgeCheck } from './StudyKnowledgeCheck';
import { StudyAskTeacher } from './StudyAskTeacher';

function asArray<T>(raw: unknown, mapper: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapper).filter((x): x is T => x !== null);
}

function ConceptCardView({ card }: { card: ConceptCard }) {
  const [showPractice, setShowPractice] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <Box p={4} bg="white" borderRadius="2xl" borderWidth={2} borderColor="teal.200" boxShadow="md">
      <Heading size="sm" color="teal.700" mb={2}>{card.title}</Heading>
      <Text fontSize="sm" color="gray.700" mb={3} lineHeight="tall">{card.definition}</Text>

      {card.visual && <StudyVisualDiagram visual={card.visual} />}

      <VStack align="stretch" spacing={2} mt={3}>
        {card.steps?.map((s) => (
          <HStack key={s.step} align="start" spacing={2}>
            <Badge colorScheme="teal" flexShrink={0}>{s.step}</Badge>
            <Box>
              <Text fontSize="sm" fontWeight="semibold">{s.title}</Text>
              <Text fontSize="xs" color="gray.600">{s.detail}</Text>
            </Box>
          </HStack>
        ))}
      </VStack>

      <Box mt={3} p={3} bg="green.50" borderRadius="lg">
        <Text fontSize="sm" color="green.800">💡 {card.example}</Text>
      </Box>

      <Box mt={3} p={3} bg="purple.50" borderRadius="lg">
        <Text fontSize="xs" fontWeight="bold" color="purple.700">🧠 Memory trick</Text>
        <Text fontSize="sm">{card.memoryTrick}</Text>
      </Box>

      <Button mt={3} size="sm" variant="outline" colorScheme="blue" onClick={() => setShowPractice(!showPractice)}>
        {showPractice ? 'Hide practice' : 'Try practice question'}
      </Button>
      <Collapse in={showPractice}>
        <Box mt={2} p={3} bg="blue.50" borderRadius="lg">
          <Text fontSize="sm" fontWeight="semibold">{card.practice?.question}</Text>
          {card.practice?.hint && <Text fontSize="xs" color="gray.500" mt={1}>Hint: {card.practice.hint}</Text>}
          <Button mt={2} size="xs" onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? 'Hide answer' : 'Show answer'}
          </Button>
          <Collapse in={showAnswer}>
            <Text mt={2} fontSize="sm" color="green.700">{card.practice?.answer}</Text>
          </Collapse>
        </Box>
      </Collapse>

      <Box mt={3} p={2} bg="orange.50" borderRadius="md">
        <Text fontSize="xs" color="orange.700">⚠️ {card.commonMistake}</Text>
      </Box>
      <Text fontSize="xs" color="gray.500" mt={2} fontStyle="italic">📌 {card.quickRecap}</Text>
    </Box>
  );
}

interface Props {
  section: StudyInteractiveSection;
  topic: string;
  subject: string;
}

export const StudyInteractiveSectionContent: React.FC<Props> = ({ section, topic, subject }) => {
  const { type, content, visual, icon, learningObjective } = section;
  const c = content;

  switch (type) {
    case 'hero':
      return (
        <VStack spacing={4} align="stretch">
          <HStack flexWrap="wrap" gap={2} justify="center">
            <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>{String(c.grade || '')}</Badge>
            <Badge colorScheme="green" fontSize="sm" px={3} py={1}>{String(c.subject || subject)}</Badge>
            <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>{String(c.difficulty || '')}</Badge>
            <Badge colorScheme="orange" fontSize="sm" px={3} py={1}>⏱ {String(c.estimatedTime || '')}</Badge>
          </HStack>
          <Heading size="lg" textAlign="center" color="blue.700">
            {String(c.heroEmoji || icon)} {String(c.topicName || section.title)}
          </Heading>
          <Text textAlign="center" color="gray.600" fontSize="md">{String(c.description || '')}</Text>
          {visual && <StudyVisualDiagram visual={visual} />}
          {learningObjective && (
            <Text fontSize="xs" textAlign="center" color="gray.500">🎯 {learningObjective}</Text>
          )}
        </VStack>
      );

    case 'why-learn': {
      const cards = asArray<WhyLearnCard>(c.cards, (item) => {
        const o = item as Record<string, unknown>;
        return o.title ? { icon: String(o.icon || '💡'), title: String(o.title), sentence: String(o.sentence || '') } : null;
      });
      return (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
          {cards.map((card) => (
            <Box key={card.title} p={4} bg="white" borderRadius="xl" textAlign="center" borderWidth={1} borderColor="teal.200">
              <Text fontSize="3xl">{card.icon}</Text>
              <Text fontWeight="bold" mt={2}>{card.title}</Text>
              <Text fontSize="sm" color="gray.600" mt={1}>{card.sentence}</Text>
            </Box>
          ))}
        </SimpleGrid>
      );
    }

    case 'big-picture':
    case 'infographics':
      return (
        <VStack spacing={3}>
          {visual && <StudyVisualDiagram visual={visual} />}
          {typeof c.caption === 'string' && c.caption && (
            <Text fontSize="sm" textAlign="center" color="gray.600">{c.caption}</Text>
          )}
        </VStack>
      );

    case 'roadmap': {
      const steps = asArray<{ label: string; completed: boolean; icon?: string }>(c.steps, (item) => {
        const o = item as Record<string, unknown>;
        return o.label ? { label: String(o.label), completed: Boolean(o.completed), icon: o.icon ? String(o.icon) : undefined } : null;
      });
      return (
        <VStack spacing={1} align="stretch">
          {steps.map((step, i) => (
            <VStack key={step.label} spacing={0}>
              <HStack p={3} bg={step.completed ? 'green.50' : 'white'} borderRadius="lg" borderWidth={1} borderColor={step.completed ? 'green.200' : 'gray.200'}>
                <Text fontSize="lg">{step.icon || (step.completed ? '✅' : '⬜')}</Text>
                <Text fontSize="sm" fontWeight={step.completed ? 'semibold' : 'normal'}>{step.label}</Text>
              </HStack>
              {i < steps.length - 1 && <Text textAlign="center" color="gray.400">↓</Text>}
            </VStack>
          ))}
        </VStack>
      );
    }

    case 'concept-cards': {
      const cards = asArray<ConceptCard>(c.cards, (item) => {
        const o = item as Record<string, unknown>;
        if (!o.title) return null;
        return {
          title: String(o.title),
          definition: String(o.definition || ''),
          visual: o.visual as ConceptCard['visual'],
          steps: Array.isArray(o.steps) ? o.steps as ConceptCard['steps'] : [],
          example: String(o.example || ''),
          practice: (o.practice as ConceptCard['practice']) || { question: '' },
          commonMistake: String(o.commonMistake || ''),
          memoryTrick: String(o.memoryTrick || ''),
          quickRecap: String(o.quickRecap || ''),
        };
      });
      return (
        <VStack spacing={5} align="stretch">
          {cards.map((card) => <ConceptCardView key={card.title} card={card} />)}
        </VStack>
      );
    }

    case 'memory-aids': {
      const aids = asArray<{ title: string; remember: string; visual?: ConceptCard['visual'] }>(c.aids, (item) => {
        const o = item as Record<string, unknown>;
        return o.title ? { title: String(o.title), remember: String(o.remember || ''), visual: o.visual as ConceptCard['visual'] } : null;
      });
      return (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {aids.map((aid) => (
            <Box key={aid.title} p={4} bg="yellow.50" borderRadius="xl" borderWidth={1} borderColor="yellow.300">
              <Text fontWeight="bold" mb={2}>{aid.title}</Text>
              {aid.visual && <StudyVisualDiagram visual={aid.visual} />}
              <Text fontSize="sm" mt={2} fontWeight="semibold" color="yellow.800">Remember: {aid.remember}</Text>
            </Box>
          ))}
        </SimpleGrid>
      );
    }

    case 'learning-steps': {
      const steps = asArray<{ label: string; description: string }>(c.steps, (item) => {
        const o = item as Record<string, unknown>;
        return o.label ? { label: String(o.label), description: String(o.description || '') } : null;
      });
      return (
        <VStack spacing={3}>
          {visual && <StudyVisualDiagram visual={visual} animate />}
          {steps.map((s, i) => (
            <HStack key={s.label} p={3} bg="white" borderRadius="lg" w="100%">
              <Badge colorScheme="purple">{i + 1}</Badge>
              <Box>
                <Text fontSize="sm" fontWeight="semibold">{s.label}</Text>
                <Text fontSize="xs" color="gray.500">{s.description}</Text>
              </Box>
            </HStack>
          ))}
        </VStack>
      );
    }

    case 'real-life': {
      const cards = asArray<RealLifeCard>(c.cards, (item) => {
        const o = item as Record<string, unknown>;
        return o.category ? { category: String(o.category), icon: String(o.icon || '🌍'), sentence: String(o.sentence || '') } : null;
      });
      return (
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
          {cards.map((card) => (
            <Box key={card.category} p={3} bg="green.50" borderRadius="xl" textAlign="center">
              <Text fontSize="2xl">{card.icon}</Text>
              <Text fontSize="sm" fontWeight="bold" mt={1}>{card.category}</Text>
              <Text fontSize="xs" color="gray.600">{card.sentence}</Text>
            </Box>
          ))}
        </SimpleGrid>
      );
    }

    case 'common-mistakes': {
      const mistakes = asArray<MistakeCard>(c.mistakes, (item) => {
        const o = item as Record<string, unknown>;
        return o.mistake ? { mistake: String(o.mistake), why: String(o.why || ''), fix: String(o.fix || '') } : null;
      });
      return (
        <VStack spacing={3} align="stretch">
          {mistakes.map((m) => (
            <Box key={m.mistake} p={4} bg="red.50" borderRadius="xl" borderLeftWidth={4} borderLeftColor="red.400">
              <Text fontWeight="bold" color="red.700">❌ {m.mistake}</Text>
              <Text fontSize="sm" mt={1} color="gray.600">Why: {m.why}</Text>
              <Text fontSize="sm" mt={1} color="green.700">✅ Fix: {m.fix}</Text>
            </Box>
          ))}
        </VStack>
      );
    }

    case 'remember-this': {
      const bullets = Array.isArray(c.bullets) ? c.bullets.map(String) : [];
      return (
        <Box p={4} bg="blue.50" borderRadius="xl" borderWidth={2} borderColor="blue.200">
          <VStack align="stretch" spacing={2}>
            {bullets.slice(0, 8).map((b, i) => (
              <HStack key={i} align="start">
                <Badge colorScheme="blue">{i + 1}</Badge>
                <Text fontSize="sm">{b}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      );
    }

    case 'cheat-sheet': {
      const items = asArray<CheatSheetItem>(c.items, (item) => {
        const o = item as Record<string, unknown>;
        return o.label ? { label: String(o.label), value: String(o.value || '') } : null;
      });
      return (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
          {items.map((item) => (
            <Box key={item.label} p={3} bg="gray.800" color="white" borderRadius="lg">
              <Text fontSize="xs" color="gray.300">{item.label}</Text>
              <Text fontSize="sm" fontWeight="semibold">{item.value}</Text>
            </Box>
          ))}
        </SimpleGrid>
      );
    }

    case 'flashcards': {
      const cards = asArray<{ front: string; back: string }>(c.cards, (item) => {
        const o = item as Record<string, unknown>;
        return o.front ? { front: String(o.front), back: String(o.back || '') } : null;
      });
      return <StudyFlashcards cards={cards} />;
    }

    case 'quick-quiz': {
      const questions = asArray<QuickQuizQuestion>(c.questions, (item) => {
        const o = item as Record<string, unknown>;
        const options = Array.isArray(o.options) ? o.options.map(String) : [];
        if (!o.question || options.length < 2) return null;
        return {
          difficulty: (['easy', 'medium', 'hard'].includes(String(o.difficulty)) ? o.difficulty : 'easy') as QuickQuizQuestion['difficulty'],
          question: String(o.question),
          options,
          correctIndex: typeof o.correctIndex === 'number' ? o.correctIndex : 0,
          explanation: String(o.explanation || ''),
          whyWrong: Array.isArray(o.whyWrong) ? o.whyWrong.map(String) : undefined,
        };
      });
      return <StudyQuickQuiz questions={questions} />;
    }

    case 'knowledge-check': {
      const items = asArray<KnowledgeCheckItem>(c.items, (item) => {
        const o = item as Record<string, unknown>;
        if (!o.prompt) return null;
        return {
          kind: String(o.kind || 'true-false') as KnowledgeCheckItem['kind'],
          prompt: String(o.prompt),
          answer: o.answer as string | boolean,
          options: Array.isArray(o.options) ? o.options.map(String) : undefined,
          pairs: Array.isArray(o.pairs) ? o.pairs as KnowledgeCheckItem['pairs'] : undefined,
          sequence: Array.isArray(o.sequence) ? o.sequence.map(String) : undefined,
        };
      });
      return <StudyKnowledgeCheck items={items} />;
    }

    case 'ask-ai': {
      const prompts = Array.isArray(c.suggestedQuestions) ? c.suggestedQuestions.map(String) : [];
      return <StudyAskTeacher topic={topic} subject={subject} suggestedPrompts={prompts} />;
    }

    case 'final-revision':
      return (
        <VStack spacing={4} align="stretch">
          {visual && <StudyVisualDiagram visual={visual} />}
          {Array.isArray(c.keyFormulas) && (
            <Box p={3} bg="purple.50" borderRadius="lg">
              <Text fontWeight="bold" mb={2}>📐 Key Formulas</Text>
              {(c.keyFormulas as string[]).map((f, i) => <Text key={i} fontSize="sm">• {f}</Text>)}
            </Box>
          )}
          {Array.isArray(c.examTips) && (
            <Box p={3} bg="yellow.50" borderRadius="lg">
              <Text fontWeight="bold" mb={2}>📝 Exam Tips</Text>
              {(c.examTips as string[]).map((t, i) => <Text key={i} fontSize="sm">• {t}</Text>)}
            </Box>
          )}
          {Array.isArray(c.timeSavingTricks) && (
            <Box p={3} bg="green.50" borderRadius="lg">
              <Text fontWeight="bold" mb={2}>⚡ Time-Saving Tricks</Text>
              {(c.timeSavingTricks as string[]).map((t, i) => <Text key={i} fontSize="sm">• {t}</Text>)}
            </Box>
          )}
        </VStack>
      );

    case 'celebration':
      return (
        <VStack spacing={4} textAlign="center" py={4}>
          <Text fontSize="5xl">🎉</Text>
          <Heading size="md" color="purple.700">{String(c.achievement || 'Topic Complete!')}</Heading>
          <HStack spacing={4} justify="center" flexWrap="wrap">
            <Badge colorScheme="green" fontSize="md" px={3} py={1}>Progress: {String(c.progressPercent ?? 100)}%</Badge>
            <Badge colorScheme="purple" fontSize="md" px={3} py={1}>⭐ {String(c.stars ?? 3)} stars</Badge>
            <Badge colorScheme="orange" fontSize="md" px={3} py={1}>+{String(c.xp ?? 100)} XP</Badge>
          </HStack>
          {typeof c.nextTopic === 'string' && c.nextTopic && (
            <Box p={4} bg="blue.50" borderRadius="xl" w="100%">
              <Text fontSize="sm" color="gray.600">Up next:</Text>
              <Text fontWeight="bold" color="blue.700">{c.nextTopic}</Text>
            </Box>
          )}
        </VStack>
      );

    default:
      return null;
  }
};
