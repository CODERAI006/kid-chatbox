/**
 * Suggested topics — compact cards (preview 3) with view-all modal.
 */

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
} from '@/shared/design-system';
import { FiTarget, FiTrendingUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { MESSAGES } from '@/constants/app';
import { SuggestedTopicMiniCard, type SuggestedTopicItem } from './SuggestedTopicMiniCard';

export type { SuggestedTopicItem };

interface SuggestedTopicsCardProps {
  items: SuggestedTopicItem[];
  hasQuizHistory: boolean;
}

const PREVIEW_LIMIT = 3;

function scoreMeta(score?: number): {
  label: string;
  colorScheme: string;
  progress: number;
} {
  if (score === undefined) {
    return { label: 'Review', colorScheme: 'orange', progress: 40 };
  }
  if (score < 50) {
    return { label: 'Needs work', colorScheme: 'red', progress: score };
  }
  if (score < 70) {
    return { label: 'Getting better', colorScheme: 'orange', progress: score };
  }
  return { label: 'Almost there', colorScheme: 'yellow', progress: score };
}

export const SuggestedTopicsCard: React.FC<SuggestedTopicsCardProps> = ({
  items,
  hasQuizHistory,
}) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const mutedBg = useColorModeValue('gray.50', 'gray.900');

  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  if (!hasQuizHistory) {
    return (
      <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
        <CardBody p={{ base: 4, md: 5 }}>
          <HStack spacing={3} align="start">
            <Box color="blue.500" fontSize="xl" pt={0.5}>
              <FiTrendingUp />
            </Box>
            <VStack align="start" spacing={2} flex={1}>
              <Heading size="sm" color={titleColor}>
                {MESSAGES.SUGGESTED_TOPICS}
              </Heading>
              <Text fontSize="sm" color={subtitleColor}>
                Take a few quizzes and we will highlight topics that need extra practice.
              </Text>
              <Button size="sm" colorScheme="blue" onClick={() => navigate('/quiz#ai-quiz')}>
                Take a quiz to get suggestions
              </Button>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card borderWidth="1px" borderColor={rowBorder} bg={mutedBg} boxShadow="sm" w="100%">
        <CardBody p={{ base: 4, md: 5 }}>
          <Heading size="sm" color={titleColor} mb={1}>
            {MESSAGES.SUGGESTED_TOPICS}
          </Heading>
          <Text fontSize="sm" color={subtitleColor}>
            Great job — no weak areas detected right now. Keep quizzing to stay sharp.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card borderWidth="1px" borderColor={rowBorder} boxShadow="md" w="100%">
        <CardBody p={{ base: 4, md: 5 }}>
          <HStack justify="space-between" align="start" mb={4} flexWrap="wrap" gap={2}>
            <HStack spacing={3} align="start" flex={1} minW="200px">
              <Box color="blue.500" fontSize="xl">
                <FiTarget />
              </Box>
              <Box flex={1}>
                <Heading size={{ base: 'sm', md: 'md' }} color={titleColor} lineHeight="short">
                  {MESSAGES.SUGGESTED_TOPICS}
                </Heading>
                <Text fontSize="sm" color={subtitleColor} mt={1}>
                  Topics with the lowest scores — start with #1.
                </Text>
              </Box>
            </HStack>
            {hasMore && (
              <Button size="xs" variant="ghost" colorScheme="blue" onClick={onOpen}>
                View all ({items.length}) →
              </Button>
            )}
          </HStack>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
            {previewItems.map((item) => (
              <SuggestedTopicMiniCard
                key={`${item.name}-${item.rank}`}
                item={item}
                meta={scoreMeta(item.score)}
                compact
              />
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader color={titleColor}>{MESSAGES.SUGGESTED_TOPICS}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color={subtitleColor} mb={4}>
              All topics ranked by score — focus on the lowest first.
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              {items.map((item) => (
                <SuggestedTopicMiniCard
                  key={`all-${item.name}-${item.rank}`}
                  item={item}
                  meta={scoreMeta(item.score)}
                />
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
