import { useState, type ReactNode } from 'react';
import { Box, Image, Text, Button, HStack, VStack, Progress, Link, SimpleGrid } from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';
import { resolveOllamaImageUrl } from '@/utils/ollamaImageUrl';
import { InteractiveFlashcardDeck } from '@/components/shared/InteractiveFlashcardDeck';
import { FLASHCARD_MORE_PROMPT } from '@/constants/flashcards';
import { flashcardsFromWorkspaceCard } from '@/utils/flashcardNormalize';
import { ExplanationCardBody } from './ExplanationCardBody';
import { DetailLessonBody, DetailFactsCard } from './DetailLessonBody';
import { QuizQuestionCard } from './QuizQuestionCard';
import { AiRichContentView } from './AiRichContentView';
import { speakText, unlockSpeechSynthesis } from '@/utils/speechSynthesis';
import { chatMessageContainerProps, chatResponsiveTextSx } from './chatResponsiveStyles';

interface Props {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
  detailInline?: boolean;
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
      {...chatMessageContainerProps}
      borderWidth="1px"
      borderColor={`${accent}.200`}
      borderRadius="lg"
      bg="white"
      overflow="hidden"
      boxShadow="sm"
      sx={chatResponsiveTextSx}
    >
      <HStack px={3} py={2} bg={`${accent}.50`} borderBottomWidth="1px" borderColor={`${accent}.100`} minW={0}>
        <Text fontSize="lg" flexShrink={0}>{emoji}</Text>
        <Text fontSize="sm" fontWeight="bold" color={`${accent}.800`} minW={0} noOfLines={2}>
          {title}
        </Text>
      </HStack>
      <Box px={{ base: 2, sm: 3 }} py={3} minW={0}>{children}</Box>
    </Box>
  );
}

function QuizCardBody({ card }: { card: LearningWorkspaceCard }) {
  return <QuizQuestionCard card={card} />;
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
  const diagramSrc = resolveOllamaImageUrl(card.imageUrl);

  return (
    <VStack align="stretch" spacing={2}>
      {diagramSrc && (
        <Image
          src={diagramSrc}
          alt={card.imageAlt || card.title || 'Diagram'}
          borderRadius="md"
          maxW="100%"
          w="100%"
          h="auto"
          objectFit="contain"
        />
      )}
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
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

export function LearningWorkspaceCardView({ card, onAskPrompt, detailInline }: Props) {
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
      return (
        <CardShell emoji="📖" title={card.title || 'Explanation'} accent={detailInline ? 'purple' : 'blue'}>
          {detailInline ? (
            <DetailLessonBody card={card} onAskPrompt={onAskPrompt} />
          ) : (
            <ExplanationCardBody card={card} onAskPrompt={onAskPrompt} />
          )}
        </CardShell>
      );

    case 'text':
      return (
        <CardShell
          emoji={/remember/i.test(card.title || '') ? '📝' : '📌'}
          title={card.title || 'Notes'}
          accent={detailInline ? 'cyan' : 'blue'}
        >
          {detailInline ? (
            <DetailFactsCard card={card} />
          ) : (
            <ExplanationCardBody card={card} onAskPrompt={onAskPrompt} />
          )}
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
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
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
          <Box
            as="pre"
            fontSize="xs"
            p={2}
            bg="gray.900"
            color="green.200"
            borderRadius="md"
            maxW="100%"
            overflowX="auto"
            whiteSpace="pre-wrap"
            sx={chatResponsiveTextSx}
          >
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
