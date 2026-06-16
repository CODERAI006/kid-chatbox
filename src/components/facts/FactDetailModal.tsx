import { useEffect, useMemo } from 'react';
import {
  Badge,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@/shared/design-system';
import type { DailyFact, FactCategory } from '@/types/dailyFacts';
import { getFactDetailContent } from './factDetailHelpers';
import FactMoreFactsList from './FactMoreFactsList';
import {
  getCategoryBadgeStyle,
  resolveFactCategorySlug,
} from '@/utils/factCategoryUi';

interface Props {
  fact: DailyFact | null;
  categoryMeta?: FactCategory;
  /** @deprecated use categoryMeta */
  subjectMeta?: { label: string; emoji?: string };
  isOpen: boolean;
  onClose: () => void;
}

function DetailSection({
  icon,
  title,
  body,
  accent,
}: {
  icon: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      p={{ base: 4, md: 5 }}
    >
      <Text fontSize="sm" fontWeight="bold" color={`${accent}.700`} mb={2}>
        {icon} {title}
      </Text>
      <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall">
        {body}
      </Text>
    </Box>
  );
}

export default function FactDetailModal({
  fact,
  categoryMeta,
  subjectMeta,
  isOpen,
  onClose,
}: Props) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const slug = fact ? resolveFactCategorySlug(fact) : 'general';
  const badge = getCategoryBadgeStyle(slug);
  const label = categoryMeta?.label || subjectMeta?.label || slug.replace(/_/g, ' ');
  const detail = useMemo(
    () => (fact ? getFactDetailContent(fact) : null),
    [fact],
  );

  if (!fact || !detail) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      motionPreset="none"
      scrollBehavior="inside"
      blockScrollOnMount
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent m={0} borderRadius={0} maxH="100dvh" bg="gray.50" overflow="hidden">
        <Box
          bgGradient="linear(to-br, orange.400, orange.500, pink.500)"
          color="white"
          px={{ base: 4, md: 8 }}
          pt={{ base: 5, md: 6 }}
          pb={{ base: 6, md: 8 }}
          position="relative"
        >
          <ModalCloseButton
            color="white"
            top={3}
            right={3}
            _hover={{ bg: 'whiteAlpha.300' }}
            size="lg"
          />
          <VStack align="stretch" spacing={3} pr={10}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Text fontSize={{ base: '3xl', md: '4xl' }} aria-hidden>
                {fact.emoji}
              </Text>
              <Badge
                fontSize="xs"
                letterSpacing="wide"
                px={3}
                py={1}
                borderRadius="full"
                bg={badge.bg}
                color={badge.color}
                borderWidth="1px"
                borderColor={badge.borderColor}
              >
                {label}
              </Badge>
              {fact.topic && (
                <Badge
                  fontSize="xs"
                  px={3}
                  py={1}
                  borderRadius="full"
                  bg="whiteAlpha.300"
                  color="white"
                >
                  {fact.topic}
                </Badge>
              )}
            </Box>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" lineHeight="snug">
              {fact.title}
            </Text>
          </VStack>
        </Box>

        <ModalBody px={{ base: 4, md: 8 }} py={{ base: 5, md: 6 }} flex="1" overflowY="auto">
          <VStack align="stretch" spacing={4} maxW="720px" mx="auto" pb={6}>
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="orange.100"
              boxShadow="md"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="xs" fontWeight="bold" color="orange.600" mb={2} textTransform="uppercase">
                The fact
              </Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.800" lineHeight="tall" fontWeight="medium">
                {fact.fact}
              </Text>
            </Box>

            <DetailSection icon="📖" title="Explain it simply" body={detail.explanation} accent="blue" />
            <DetailSection icon="🧠" title="Why is this true?" body={detail.reasoning} accent="purple" />
            <DetailSection icon="✨" title="Did you know?" body={detail.didYouKnow} accent="orange" />
            <DetailSection icon="🏫" title="In real life" body={detail.realLifeLink} accent="teal" />

            <FactMoreFactsList items={fact.moreFacts || []} topicTitle={fact.title} />

            <Button
              size="lg"
              colorScheme="orange"
              borderRadius="xl"
              onClick={onClose}
              w="100%"
              boxShadow="md"
            >
              Got it!
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
