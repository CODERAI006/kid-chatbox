import { useState, type ReactNode } from 'react';
import {
  Box,
  Text,
  Button,
  HStack,
  VStack,
  Progress,
  Link,
  SimpleGrid,
  Image,
} from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';
import { InteractiveFlashcardDeck } from '@/components/shared/InteractiveFlashcardDeck';
import { FLASHCARD_MORE_PROMPT } from '@/constants/flashcards';
import { flashcardsFromWorkspaceCard } from '@/utils/flashcardNormalize';
import { ExplanationCardBody } from './ExplanationCardBody';
import { AiRichContentView } from './AiRichContentView';
import { speakText, unlockSpeechSynthesis } from '@/utils/speechSynthesis';

interface Props {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
}

function CardShell({
  emoji,
  title,
  children,
  accent = 'blue',
}: {
  emoji: string;
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <Box
      borderWidth="1px"
      borderColor={`${accent}.200`}
      borderRadius="lg"
      bg="white"
      overflow="hidden"
      boxShadow="sm"
    >
      <HStack px={3} py={2} bg={`${accent}.50`} borderBottomWidth="1px" borderColor={`${accent}.100`}>
        <Text fontSize="lg">{emoji}</Text>
        <Text fontSize="sm" fontWeight="bold" color={`${accent}.800`}>
          {title}
        </Text>
      </HStack>
      <Box px={3} py={3}>{children}</Box>
    </Box>
  );
}

function QuizCardBody({ card }: { card: LearningWorkspaceCard }) {
  const [picked, setPicked] = useState<string | null>(null);
  const correct = card.correctOptionId;
  const isCorrect = picked != null && picked === correct;

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" fontWeight="semibold">{card.question}</Text>
      <VStack align="stretch" spacing={1}>
        {(card.options || []).map((opt) => {
          const chosen = picked === opt.id;
          const showCorrect = picked != null && opt.id === correct;
          const showWrong = chosen && opt.id !== correct;
          return (
            <Button
              key={opt.id}
              size="sm"
              variant={chosen ? 'solid' : 'outline'}
              colorScheme={showCorrect ? 'green' : showWrong ? 'red' : 'blue'}
              justifyContent="flex-start"
              isDisabled={picked != null}
              onClick={() => setPicked(opt.id)}
            >
              {opt.label}
            </Button>
          );
        })}
      </VStack>
      {picked != null && (
        <Box mt={1} p={2} borderRadius="md" bg={isCorrect ? 'green.50' : 'orange.50'}>
          <Text fontSize="sm" fontWeight="semibold" color={isCorrect ? 'green.700' : 'orange.700'}>
            {isCorrect ? '✅ Correct' : '💡 Not quite'}
          </Text>
          <Text fontSize="sm" mt={1}>
            {isCorrect ? card.correctFeedback : card.wrongFeedback || card.correctFeedback}
          </Text>
        </Box>
      )}
    </VStack>
  );
}

function FlashcardDeckBody({
  card,
  onAskPrompt,
}: {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
}) {
  const items = flashcardsFromWorkspaceCard(card);

  return (
    <InteractiveFlashcardDeck
      cards={items}
      compact
      onRequestMore={onAskPrompt ? () => onAskPrompt(FLASHCARD_MORE_PROMPT) : undefined}
    />
  );
}

function DiagramHotspots({ card }: { card: LearningWorkspaceCard }) {
  const [active, setActive] = useState<string | null>(null);
  const hotspots = card.hotspots || [];
  const activeSpot = hotspots.find((h) => h.id === active);

  return (
    <VStack align="stretch" spacing={2}>
      {card.imageUrl && (
        <Image src={card.imageUrl} alt={card.imageAlt || card.title || 'Diagram'} borderRadius="md" />
      )}
      <SimpleGrid columns={2} spacing={2}>
        {hotspots.map((hs) => (
          <Button
            key={hs.id}
            size="sm"
            variant={active === hs.id ? 'solid' : 'outline'}
            colorScheme="teal"
            onClick={() => setActive(hs.id)}
          >
            {hs.label}
          </Button>
        ))}
      </SimpleGrid>
      {activeSpot && (
        <Box p={2} bg="teal.50" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold">👆 {activeSpot.label}</Text>
          <Text fontSize="sm" mt={1}>{activeSpot.detail}</Text>
        </Box>
      )}
    </VStack>
  );
}

export function LearningWorkspaceCardView({ card, onAskPrompt }: Props) {
  switch (card.type) {
    case 'hook':
      return (
        <CardShell emoji="🎯" title={card.title || "What you'll learn"} accent="yellow">
          <VStack align="stretch" spacing={1}>
            {(card.bullets || []).map((b, i) => (
              <Text key={i} fontSize="sm">• {b}</Text>
            ))}
          </VStack>
        </CardShell>
      );

    case 'explanation':
    case 'text':
      return (
        <CardShell emoji="📖" title={card.title || 'Explanation'}>
          <ExplanationCardBody card={card} onAskPrompt={onAskPrompt} />
        </CardShell>
      );

    case 'diagram':
    case 'interactive':
    case 'image':
      return (
        <CardShell emoji="🖼" title={card.title || 'Visualize'} accent="teal">
          <DiagramHotspots card={card} />
        </CardShell>
      );

    case 'video':
      return (
        <CardShell emoji="🎥" title={card.title || 'Watch'} accent="red">
          <Text fontSize="sm" mb={2}>{card.videoLabel || 'Short video'}</Text>
          {card.videoUrl ? (
            <Link href={card.videoUrl} isExternal color="blue.600" fontSize="sm" fontWeight="semibold">
              ▶ Play video
            </Link>
          ) : (
            <Text fontSize="xs" color="gray.500">Video link not available</Text>
          )}
        </CardShell>
      );

    case 'audio':
      return (
        <CardShell emoji="🔊" title={card.title || 'Audio Summary'} accent="purple">
          <Text fontSize="sm" mb={2}>{card.audioText}</Text>
          <Button
            size="sm"
            colorScheme="purple"
            onClick={() => {
              if (card.audioText) {
                unlockSpeechSynthesis();
                void speakText(card.audioText);
              }
            }}
          >
            Play summary
          </Button>
        </CardShell>
      );

    case 'example':
      return (
        <CardShell emoji={card.exampleEmoji || '🍕'} title={card.title || 'Example'} accent="orange">
          <AiRichContentView content={card.body || ''} onAction={onAskPrompt} compact />
        </CardShell>
      );

    case 'quiz':
      return (
        <CardShell emoji="🧠" title={card.title || 'Quick Challenge'} accent="green">
          <QuizCardBody card={card} />
        </CardShell>
      );

    case 'flashcard':
      return (
        <CardShell emoji="⚡" title={card.title || 'Flashcards'} accent="purple">
          <FlashcardDeckBody card={card} onAskPrompt={onAskPrompt} />
        </CardShell>
      );

    case 'askDeeper':
      return (
        <CardShell emoji="🤔" title={card.title || 'Curious?'} accent="cyan">
          <VStack align="stretch" spacing={1}>
            {(card.prompts || []).map((p) => (
              <Button
                key={p}
                size="sm"
                variant="ghost"
                justifyContent="flex-start"
                onClick={() => onAskPrompt?.(p)}
              >
                • {p}
              </Button>
            ))}
          </VStack>
        </CardShell>
      );

    case 'progress':
      return (
        <CardShell emoji="🏆" title={card.title || 'Progress'} accent="green">
          <Text fontSize="sm" mb={2}>
            {card.progressLabel || 'Topic progress'}: {card.progressPercent ?? 0}%
          </Text>
          <Progress
            value={card.progressPercent ?? 0}
            size="sm"
            colorScheme="green"
            borderRadius="full"
          />
        </CardShell>
      );

    case 'timeline':
      return (
        <CardShell emoji="📅" title={card.title || 'Timeline'} accent="gray">
          <VStack align="stretch" spacing={2}>
            {(card.timeline || []).map((row, i) => (
              <Box key={i} pl={3} borderLeftWidth={3} borderColor="blue.300">
                <Text fontSize="sm" fontWeight="bold">{row.label}</Text>
                <Text fontSize="sm" color="gray.600">{row.detail}</Text>
              </Box>
            ))}
          </VStack>
        </CardShell>
      );

    case 'comparison':
      return (
        <CardShell emoji="⚖️" title={card.title || 'Compare'} accent="pink">
          {card.comparison && (
            <SimpleGrid columns={2} spacing={2}>
              <Box p={2} bg="blue.50" borderRadius="md">
                <Text fontSize="xs" fontWeight="bold">{card.comparison.leftTitle}</Text>
                <Text fontSize="sm" mt={1}>{card.comparison.leftBody}</Text>
              </Box>
              <Box p={2} bg="purple.50" borderRadius="md">
                <Text fontSize="xs" fontWeight="bold">{card.comparison.rightTitle}</Text>
                <Text fontSize="sm" mt={1}>{card.comparison.rightBody}</Text>
              </Box>
            </SimpleGrid>
          )}
        </CardShell>
      );

    case 'code':
      return (
        <CardShell emoji="💻" title={card.title || 'Code'} accent="gray">
          <Box as="pre" fontSize="xs" p={2} bg="gray.900" color="green.200" borderRadius="md" overflowX="auto">
            {card.code}
          </Box>
        </CardShell>
      );

    case 'formula':
      return (
        <CardShell emoji="∑" title={card.title || 'Formula'} accent="indigo">
          <Text fontSize="md" fontWeight="bold" fontFamily="mono">{card.formula}</Text>
          {card.formulaExplanation && (
            <Text fontSize="sm" mt={2} color="gray.600">{card.formulaExplanation}</Text>
          )}
        </CardShell>
      );

    default:
      return null;
  }
}
