import { Box, Text, VStack } from '@/shared/design-system';
import type { RelatedFact } from '@/types/dailyFacts';

interface Props {
  items: RelatedFact[];
  topicTitle: string;
}

export default function FactMoreFactsList({ items, topicTitle }: Props) {
  if (!items.length) {
    return (
      <Box
        bg="white"
        borderRadius="2xl"
        borderWidth="1px"
        borderColor="gray.100"
        p={{ base: 4, md: 5 }}
      >
        <Text fontSize="sm" fontWeight="bold" color="orange.700" mb={2}>
          📚 More facts on this topic
        </Text>
        <Text fontSize="sm" color="gray.500">
          Bonus facts for &quot;{topicTitle}&quot; will appear in the next saved edition.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="orange.100"
      boxShadow="sm"
      p={{ base: 4, md: 5 }}
    >
      <Text fontSize="sm" fontWeight="bold" color="orange.700" mb={1}>
        📚 {items.length} more facts on this topic
      </Text>
      <Text fontSize="xs" color="gray.500" mb={4}>
        All loaded together — no waiting when you open details.
      </Text>
      <VStack align="stretch" spacing={3}>
        {items.map((item, i) => (
          <Box
            key={`${item.title}-${i}`}
            bg="orange.50"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="orange.100"
            p={3}
          >
            <Text fontSize="xs" fontWeight="bold" color="orange.600" mb={1}>
              #{i + 1} · {item.title}
            </Text>
            <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall">
              {item.fact}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
