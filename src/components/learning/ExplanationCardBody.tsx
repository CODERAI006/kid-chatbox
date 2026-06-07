/**
 * Explanation card with expandable detailed "Read more" content.
 */
import {
  Box,
  Text,
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

interface Props {
  card: LearningWorkspaceCard;
  onAskPrompt?: (prompt: string) => void;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ExplanationCardBody({ card, onAskPrompt }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const detail = card.readMore?.trim() || '';
  const hasDetail = detail.length > 0;
  const detailParagraphs = splitParagraphs(hasDetail ? detail : card.body || '');

  const openDetail = () => {
    if (hasDetail) onOpen();
    else onAskPrompt?.('Give a detailed explanation with examples, steps, and why it matters.');
  };

  const speak = (text: string) => {
    if (typeof speechSynthesis === 'undefined' || !text.trim()) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  return (
    <>
      <Text fontSize="sm" lineHeight="tall">{card.body}</Text>
      <HStack mt={3} spacing={2} flexWrap="wrap">
        <Button size="sm" colorScheme="blue" variant="outline" onClick={openDetail}>
          📚 {hasDetail ? 'Read full explanation' : 'Get detailed explanation'}
        </Button>
        {(card.audioText || card.body) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => speak(card.audioText || `${card.body}\n\n${detail}`)}
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
                  <Text fontSize="sm" lineHeight="tall">{card.body}</Text>
                </Box>
              )}
              <Box>
                <Badge mb={2} colorScheme="purple">In depth</Badge>
                {detailParagraphs.map((para, i) => (
                  <Text key={i} fontSize="sm" lineHeight="tall" mb={3}>
                    {para}
                  </Text>
                ))}
              </Box>
              <Button size="sm" alignSelf="flex-start" onClick={() => speak(`${card.body}\n\n${detail}`)}>
                🔊 Listen to full explanation
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
