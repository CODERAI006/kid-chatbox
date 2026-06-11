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

interface Props {
  fact: DailyFact;
  subjectMeta?: FactSubject;
  index: number;
}

export default function FactCard({ fact, subjectMeta, index }: Props) {
  const badge = BADGE_STYLE[fact.subject] || BADGE_STYLE.general_knowledge;
  const label = subjectMeta?.label || fact.subject.replace(/_/g, ' ');

  return (
    <Box
      as="article"
      display="flex"
      flexDirection="column"
      h="100%"
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      overflow="hidden"
      _hover={{ boxShadow: 'md' }}
      transition="box-shadow 0.2s"
    >
      <Box px={4} pt={4} pb={2} display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
        <Text fontSize={{ base: 'xl', md: '2xl' }} aria-hidden>
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
        >
          {label}
        </Badge>
      </Box>
      <VStack align="stretch" px={4} pb={4} flex={1} spacing={2}>
        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.400">
          Fact #{index + 1}
        </Text>
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="extrabold"
          color="gray.900"
          lineHeight="snug"
        >
          {fact.title}
        </Text>
        <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600" lineHeight="relaxed" flex={1}>
          {fact.fact}
        </Text>
      </VStack>
    </Box>
  );
}
