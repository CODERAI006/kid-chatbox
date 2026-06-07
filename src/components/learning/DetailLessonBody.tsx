/**
 * Full in-chat detailed lesson — no modal, all sections visible.
 */
import { Box, Badge, Divider, Text, VStack } from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';
import { AiRichContentView } from './AiRichContentView';

interface Props {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
}

function BulletBlock({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <Box p={3} borderRadius="md" bg={`${accent}.50`} borderWidth="1px" borderColor={`${accent}.100`}>
      <Badge mb={2} colorScheme={accent}>{title}</Badge>
      <VStack align="stretch" spacing={1}>
        {items.map((item) => (
          <Text key={item} fontSize="sm" lineHeight="tall">
            • {item}
          </Text>
        ))}
      </VStack>
    </Box>
  );
}

export function DetailLessonBody({ card, onAskPrompt }: Props) {
  const detail = card.readMore?.trim() || '';

  return (
    <VStack align="stretch" spacing={4}>
      {card.body && (
        <Box>
          <Badge mb={2} colorScheme="blue">Introduction</Badge>
          <AiRichContentView content={card.body} onAction={onAskPrompt} compact />
        </Box>
      )}
      {detail && (
        <Box>
          <Badge mb={2} colorScheme="purple">Full lesson</Badge>
          <AiRichContentView content={detail} onAction={onAskPrompt} />
        </Box>
      )}
      {(card.bullets?.length ?? 0) > 0 && (
        <BulletBlock title="Key points" items={card.bullets!} accent="teal" />
      )}
      {!card.body && !detail && (
        <AiRichContentView content="No lesson content yet." onAction={onAskPrompt} compact />
      )}
      <Divider />
      <Text fontSize="xs" color="gray.500">
        Read everything here in chat — scroll for facts and points to remember below.
      </Text>
    </VStack>
  );
}

/** Text / facts card for detailed lessons. */
export function DetailFactsCard({ card }: { card: LearningWorkspaceCard }) {
  const items = card.bullets || [];
  const title = card.title || 'Notes';
  const isRemember = /remember|recall|revise/i.test(title);

  return (
    <VStack align="stretch" spacing={2}>
      {card.body && <AiRichContentView content={card.body} compact />}
      {items.length > 0 && (
        <BulletBlock
          title={title}
          items={items}
          accent={isRemember ? 'orange' : 'cyan'}
        />
      )}
    </VStack>
  );
}
