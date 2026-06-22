/**
 * Topics to improve — collapsible card with expandable rows.
 */

import { useState } from 'react';
import {
  Text,
  VStack,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  Collapse,
  Box,
} from '@/shared/design-system';
import { FiTarget } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { MESSAGES } from '@/constants/app';
import { CollapsibleDashboardCard } from './CollapsibleDashboardCard';
import { SuggestedTopicRow, type SuggestedTopicItem } from './SuggestedTopicMiniCard';

export type { SuggestedTopicItem };

interface SuggestedTopicsCardProps {
  items: SuggestedTopicItem[];
  hasQuizHistory: boolean;
}

const PREVIEW_LIMIT = 2;

function topicSummary(items: SuggestedTopicItem[]): string {
  if (items.length === 0) return '';
  const top = items[0];
  const extra = items.length > 1 ? ` and ${items.length - 1} more` : '';
  const score = top.score !== undefined ? ` (${top.score}% accuracy)` : '';
  return `Focus on ${top.name}${score}${extra}`;
}

function TopicDetailPanel({ item }: { item: SuggestedTopicItem }) {
  const navigate = useNavigate();
  const muted = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box
      pl={2}
      pr={1}
      pb={2}
      pt={1}
      borderLeftWidth="2px"
      borderColor="blue.300"
      ml={2}
    >
      <Text fontSize="xs" color={muted} mb={2}>
        {item.score !== undefined
          ? `You scored ${item.score}% on quizzes covering this topic. A quick review can boost your accuracy.`
          : 'This topic appeared in your recent quizzes. Tap below to start a focused study session.'}
      </Text>
      <Button size="xs" colorScheme="blue" onClick={() => navigate('/study#ai-study')}>
        Study {item.name} →
      </Button>
    </Box>
  );
}

function ExpandableTopicRow({ item }: { item: SuggestedTopicItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <SuggestedTopicRow item={item} onSelect={() => setOpen((v) => !v)} isExpanded={open} />
      <Collapse in={open} animateOpacity>
        <TopicDetailPanel item={item} />
      </Collapse>
    </Box>
  );
}

export const SuggestedTopicsCard: React.FC<SuggestedTopicsCardProps> = ({
  items,
  hasQuizHistory,
}) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');

  if (!hasQuizHistory) {
    return (
      <CollapsibleDashboardCard
        title={MESSAGES.SUGGESTED_TOPICS}
        icon={<FiTarget color="var(--chakra-colors-blue-500)" />}
        summary="Take a quiz to unlock personalized topic suggestions."
      >
        <Text fontSize="xs" color={subtitleColor}>
          Complete your first quiz and we&apos;ll highlight topics that need more practice.
        </Text>
        <Button size="sm" mt={3} colorScheme="blue" onClick={() => navigate('/quiz#ai-quiz')}>
          Take a quiz
        </Button>
      </CollapsibleDashboardCard>
    );
  }

  if (items.length === 0) return null;

  const previewItems = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  return (
    <>
      <CollapsibleDashboardCard
        title={MESSAGES.SUGGESTED_TOPICS}
        icon={<FiTarget color="var(--chakra-colors-blue-500)" />}
        summary={topicSummary(items)}
        count={items.length}
        headerAction={
          hasMore ? (
            <Button size="xs" variant="ghost" colorScheme="blue" onClick={onOpen}>
              All
            </Button>
          ) : undefined
        }
      >
        <VStack spacing={2} align="stretch">
          <Text fontSize="2xs" color={subtitleColor}>
            Tap a topic to see details and start studying.
          </Text>
          {previewItems.map((item) => (
            <ExpandableTopicRow key={`${item.name}-${item.rank}`} item={item} />
          ))}
        </VStack>
      </CollapsibleDashboardCard>

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
                <ExpandableTopicRow key={`all-${item.name}-${item.rank}`} item={item} />
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
