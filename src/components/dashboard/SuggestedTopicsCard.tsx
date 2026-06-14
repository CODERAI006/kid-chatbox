/**
 * Topics to improve — compact rows (same pattern as RecentActivityCard).
 */

import {
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
} from '@/shared/design-system';
import { FiTarget } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { MESSAGES } from '@/constants/app';
import { SuggestedTopicRow, type SuggestedTopicItem } from './SuggestedTopicMiniCard';

export type { SuggestedTopicItem };

interface SuggestedTopicsCardProps {
  items: SuggestedTopicItem[];
  hasQuizHistory: boolean;
}

const PREVIEW_LIMIT = 2;

export const SuggestedTopicsCard: React.FC<SuggestedTopicsCardProps> = ({
  items,
  hasQuizHistory,
}) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');

  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  if (!hasQuizHistory) {
    return (
      <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
        <CardBody p={{ base: 3, md: 4 }}>
          <HStack justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
            <HStack spacing={2}>
              <FiTarget color="var(--chakra-colors-blue-500)" />
              <Heading size={{ base: 'xs', sm: 'sm' }} color={titleColor}>
                {MESSAGES.SUGGESTED_TOPICS}
              </Heading>
            </HStack>
          </HStack>
          <Text fontSize="xs" color={subtitleColor}>
            Take a quiz to see topics that need practice.
          </Text>
          <Button size="xs" mt={2} colorScheme="blue" onClick={() => navigate('/quiz#ai-quiz')}>
            Take a quiz
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
        <CardBody p={{ base: 3, md: 4 }}>
          <HStack justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
            <HStack spacing={2}>
              <FiTarget color="var(--chakra-colors-blue-500)" />
              <Heading size={{ base: 'xs', sm: 'sm' }} color={titleColor}>
                {MESSAGES.SUGGESTED_TOPICS}
              </Heading>
            </HStack>
            {hasMore && (
              <Button size="xs" variant="ghost" colorScheme="blue" onClick={onOpen}>
                View all ({items.length}) →
              </Button>
            )}
          </HStack>

          <VStack spacing={2} align="stretch">
            {previewItems.map((item) => (
              <SuggestedTopicRow key={`${item.name}-${item.rank}`} item={item} />
            ))}
          </VStack>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader color={titleColor} fontSize="md">
            {MESSAGES.SUGGESTED_TOPICS}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={2} align="stretch">
              {items.map((item) => (
                <SuggestedTopicRow key={`all-${item.name}-${item.rank}`} item={item} />
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
