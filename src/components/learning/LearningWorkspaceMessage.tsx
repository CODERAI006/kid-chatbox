/**
 * Renders a full assistant workspace response (card stack).
 */
import { VStack, Text, Box } from '@/shared/design-system';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';
import { filterCardsByStudyFormat } from '@/utils/formatCardFilter';
import type { LearningStudyFormat } from '@/types/learningWorkspace';
import { LearningWorkspaceCardView } from './LearningWorkspaceCardView';

interface Props {
  content: string;
  studyFormat?: LearningStudyFormat | null;
  onAskPrompt?: (prompt: string) => void;
}

export function LearningWorkspaceMessage({ content, studyFormat, onAskPrompt }: Props) {
  const workspace = resolveWorkspace(content);
  const cards = filterCardsByStudyFormat(workspace.cards, studyFormat);

  return (
    <VStack align="stretch" spacing={2} w="100%">
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">
        🤖 Guru AI · {workspace.topic}
      </Text>
      {cards.map((card, i) => (
        <LearningWorkspaceCardView key={`${card.type}-${i}`} card={card} onAskPrompt={onAskPrompt} />
      ))}
      {cards.length === 0 && (
        <Box p={3} borderRadius="md" bg="orange.50">
          <Text fontSize="sm" color="orange.800">
            Could not build cards for this format. Try asking again or pick a new topic.
          </Text>
        </Box>
      )}
      {workspace.progressPercent != null && !cards.some((c) => c.type === 'progress') && (
        <Box fontSize="xs" color="gray.500">
          Mastery estimate: {workspace.progressPercent}%
        </Box>
      )}
    </VStack>
  );
}
