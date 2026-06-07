/**
 * Renders a full assistant workspace response (card stack).
 */
import { VStack, Text, Box } from '@/shared/design-system';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';
import { LearningWorkspaceCardView } from './LearningWorkspaceCardView';

interface Props {
  content: string;
  onAskPrompt?: (prompt: string) => void;
}

export function LearningWorkspaceMessage({ content, onAskPrompt }: Props) {
  const workspace = resolveWorkspace(content);

  return (
    <VStack align="stretch" spacing={2} w="100%">
      <Text fontSize="xs" color="gray.500" fontWeight="semibold">
        🤖 AI Response · {workspace.topic}
      </Text>
      {workspace.cards.map((card, i) => (
        <LearningWorkspaceCardView key={`${card.type}-${i}`} card={card} onAskPrompt={onAskPrompt} />
      ))}
      {workspace.progressPercent != null && !workspace.cards.some((c) => c.type === 'progress') && (
        <Box fontSize="xs" color="gray.500">
          Mastery estimate: {workspace.progressPercent}%
        </Box>
      )}
    </VStack>
  );
}
