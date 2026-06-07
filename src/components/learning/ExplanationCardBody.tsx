/**
 * Explanation card with expandable detailed "Read more" content.
 */
import {
  Box,
  Button,
  HStack,
  VStack,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';
import { speakText, unlockSpeechSynthesis } from '@/utils/speechSynthesis';
import { AiRichContentView } from './AiRichContentView';

interface Props {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
}

export function ExplanationCardBody({ card, onAskPrompt }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const detail = card.readMore?.trim() || '';
  const hasDetail = detail.length > 0;

  const openDetail = () => {
    if (hasDetail) onOpen();
    else onAskPrompt?.('Give a detailed explanation with examples, steps, and why it matters.');
  };

  return (
    <>
      <AiRichContentView content={card.body || ''} onAction={onAskPrompt} compact />
      <HStack mt={3} spacing={2} flexWrap="wrap">
        <Button size="sm" colorScheme="blue" variant="outline" onClick={openDetail}>
          📚 {hasDetail ? 'Read full explanation' : 'Get detailed explanation'}
        </Button>
        {(card.audioText || card.body) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              unlockSpeechSynthesis();
              void speakText(card.audioText || `${card.body}\n\n${detail}`);
            }}
          >
            🔊 Listen
          </Button>
        )}
      </HStack>

      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxH="85vh">
          <ModalHeader fontSize="md">{card.title || 'Detailed explanation'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              {card.body && (
                <Box p={3} bg="blue.50" borderRadius="md">
                  <Badge mb={2} colorScheme="blue">Quick summary</Badge>
                  <AiRichContentView content={card.body} compact />
                </Box>
              )}
              <Box>
                <Badge mb={2} colorScheme="purple">In depth</Badge>
                <AiRichContentView content={hasDetail ? detail : card.body || ''} onAction={onAskPrompt} />
              </Box>
              <Button
                size="sm"
                alignSelf="flex-start"
                onClick={() => {
                  unlockSpeechSynthesis();
                  void speakText(`${card.body}\n\n${detail}`);
                }}
              >
                🔊 Listen to full explanation
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
