/**
 * Five common daily & school-life phrases for Word of the Day.
 */

import { Box, Card, CardBody, Heading, Text, VStack, Badge, HStack } from '@/shared/design-system';
import type { DailyPhrase } from '@/types/wordOfDay';

interface CommonPhrasesSectionProps {
  phrases: DailyPhrase[];
}

export const CommonPhrasesSection: React.FC<CommonPhrasesSectionProps> = ({ phrases }) => {
  if (!phrases.length) return null;

  return (
    <Card bg="teal.50" borderColor="teal.200" borderWidth={1.5}>
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={3} align="stretch">
          <Heading size="sm" color="teal.700">
            🗣️ 5 Phrases for Daily & School Life
          </Heading>
          <Text fontSize="xs" color="gray.600">
            Useful expressions you can use every day
          </Text>
          {phrases.map((item, i) => (
            <Box
              key={`${item.phrase}-${i}`}
              bg="white"
              p={3}
              borderRadius="md"
              borderLeft="4px solid"
              borderLeftColor={item.context === 'school' ? 'blue.400' : 'green.400'}
            >
              <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
                <Text fontWeight="bold" fontSize="sm" color="teal.800">
                  {i + 1}. "{item.phrase}"
                </Text>
                <Badge colorScheme={item.context === 'school' ? 'blue' : 'green'} fontSize="2xs">
                  {item.context === 'school' ? 'School' : 'Daily life'}
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.700" mb={1}>{item.meaning}</Text>
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                Example: {item.example}
              </Text>
            </Box>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};
