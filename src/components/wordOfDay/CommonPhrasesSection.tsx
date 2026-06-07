/**
 * Five idiomatic phrases — expressions used inside full sentences.
 */

import { Box, Card, CardBody, Heading, Text, VStack, Badge, HStack } from '@/shared/design-system';
import type { DailyPhrase } from '@/types/wordOfDay';

interface CommonPhrasesSectionProps {
  phrases: DailyPhrase[];
  /** Denser layout for dashboard sidebar — still shows all phrases. */
  compact?: boolean;
}

export const CommonPhrasesSection: React.FC<CommonPhrasesSectionProps> = ({
  phrases,
  compact = false,
}) => {
  if (!phrases.length) return null;

  return (
    <Card bg="teal.50" borderColor="teal.200" borderWidth={compact ? 1 : 1.5}>
      <CardBody p={compact ? { base: 2, md: 3 } : { base: 3, md: 4 }}>
        <VStack spacing={compact ? 2 : 3} align="stretch">
          <Heading size={compact ? 'xs' : 'sm'} color="teal.700">
            💬 {phrases.length} Idioms & Expressions
          </Heading>
          {!compact && (
            <Text fontSize="xs" color="gray.600">
              Phrases you can drop into a sentence — like "steal someone's thunder"
            </Text>
          )}
          {phrases.map((item, i) => (
            <Box
              key={`${item.phrase}-${i}`}
              bg="white"
              p={compact ? 2 : 3}
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor={item.context === 'school' ? 'blue.400' : 'green.400'}
            >
              <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1} align="start">
                <Text fontWeight="bold" fontSize={compact ? 'xs' : 'sm'} color="teal.800" flex={1}>
                  {i + 1}. {item.phrase}
                </Text>
                <Badge colorScheme={item.context === 'school' ? 'blue' : 'green'} fontSize="2xs">
                  {item.context === 'school' ? 'School' : 'Daily life'}
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.700" mb={compact ? 0.5 : 1} lineHeight="1.45">
                {item.meaning}
              </Text>
              <Text fontSize="2xs" color="gray.500" fontStyle="italic" noOfLines={compact ? 2 : undefined}>
                "{item.example}"
              </Text>
            </Box>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};
