import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Badge, Box, Text, VStack } from '@/shared/design-system';
import type { DailyFact, FactSubject } from '@/types/dailyFacts';

const BADGE_STYLE: Record<string, { bg: string; color: string; borderColor: string }> = {
  science: { bg: 'blue.50', color: 'blue.800', borderColor: 'blue.100' },
  geography: { bg: 'green.50', color: 'green.800', borderColor: 'green.100' },
  history: { bg: 'orange.50', color: 'orange.800', borderColor: 'orange.100' },
  current_affairs: { bg: 'pink.50', color: 'pink.800', borderColor: 'pink.100' },
  general_knowledge: { bg: 'purple.50', color: 'purple.800', borderColor: 'purple.100' },
  nature: { bg: 'green.50', color: 'green.700', borderColor: 'green.100' },
  india: { bg: 'orange.50', color: 'orange.700', borderColor: 'orange.200' },
  sports: { bg: 'cyan.50', color: 'cyan.800', borderColor: 'cyan.100' },
  math: { bg: 'indigo.50', color: 'indigo.800', borderColor: 'indigo.100' },
};

const DOUBLE_TAP_MS = 400;

interface Props {
  fact: DailyFact;
  subjectMeta?: FactSubject;
  index: number;
  onOpenDetail?: (fact: DailyFact) => void;
}

export default function FactCard({ fact, subjectMeta, index, onOpenDetail }: Props) {
  const badge = BADGE_STYLE[fact.subject] || BADGE_STYLE.general_knowledge;
  const label = subjectMeta?.label || fact.subject.replace(/_/g, ' ');
  const lastTapRef = useRef(0);

  const openDetail = useCallback(() => {
    onOpenDetail?.(fact);
  }, [fact, onOpenDetail]);

  const handleActivate = useCallback(() => {
    if (!onOpenDetail) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      openDetail();
      return;
    }
    lastTapRef.current = now;
  }, [onOpenDetail, openDetail]);

  return (
    <Box
      as="button"
      type="button"
      display="flex"
      flexDirection="column"
      h="100%"
      minW={0}
      w="100%"
      textAlign="left"
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      overflow="hidden"
      cursor={onOpenDetail ? 'pointer' : 'default'}
      aria-label={onOpenDetail ? `${fact.title}. Double-tap for full details.` : undefined}
      onClick={handleActivate}
      onKeyDown={(e: KeyboardEvent) => {
        if (!onOpenDetail) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      _hover={onOpenDetail ? { boxShadow: 'md', borderColor: 'orange.200' } : undefined}
      _active={onOpenDetail ? { transform: 'scale(0.99)' } : undefined}
      _focusVisible={{ outline: '2px solid', outlineColor: 'orange.400', outlineOffset: '2px' }}
      transition="box-shadow 0.2s, border-color 0.2s, transform 0.1s"
    >
      <Box
        px={{ base: 3, md: 4 }}
        pt={{ base: 3, md: 4 }}
        pb={2}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        minW={0}
        w="100%"
      >
        <Text fontSize={{ base: 'xl', md: '2xl' }} flexShrink={0} aria-hidden>
          {fact.emoji}
        </Text>
        <Badge
          fontSize={{ base: '2xs', sm: 'xs' }}
          textTransform="uppercase"
          letterSpacing="wide"
          px={2}
          py={0.5}
          borderRadius="full"
          borderWidth="1px"
          bg={badge.bg}
          color={badge.color}
          borderColor={badge.borderColor}
          maxW="100%"
          whiteSpace="normal"
          textAlign="right"
        >
          {label}
        </Badge>
      </Box>
      <VStack
        align="stretch"
        px={{ base: 3, md: 4 }}
        pb={{ base: 3, md: 4 }}
        flex={1}
        spacing={2}
        minW={0}
        w="100%"
      >
        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.400">
          Fact #{index + 1}
        </Text>
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="extrabold"
          color="gray.900"
          lineHeight="snug"
          wordBreak="break-word"
        >
          {fact.title}
        </Text>
        <Text
          fontSize={{ base: 'xs', sm: 'sm' }}
          color="gray.600"
          lineHeight="relaxed"
          flex={1}
          noOfLines={{ base: 5, md: 6 }}
          wordBreak="break-word"
        >
          {fact.fact}
        </Text>
        {onOpenDetail && (
          <Text fontSize="2xs" color="orange.500" fontWeight="semibold" pt={1}>
            Double-tap for the full story →
          </Text>
        )}
      </VStack>
    </Box>
  );
}
