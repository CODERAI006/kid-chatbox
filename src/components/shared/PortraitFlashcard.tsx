/**
 * Portrait-oriented flip card for study flashcards (mobile-friendly).
 */
import { Box, Text, Badge, VStack } from '@/shared/design-system';
import type { FlashcardItem } from '@/utils/flashcardNormalize';

interface Props {
  card: FlashcardItem;
  flipped: boolean;
  onFlip: () => void;
  compact?: boolean;
}

export function PortraitFlashcard({ card, flipped, onFlip, compact = false }: Props) {
  return (
    <Box
      w="100%"
      maxW="340px"
      mx="auto"
      position="relative"
      sx={{ perspective: '1200px' }}
    >
      <Box
        as="button"
        type="button"
        w="100%"
        position="relative"
        aria-label={flipped ? 'Show question' : 'Show answer'}
        onClick={onFlip}
        sx={{
          aspectRatio: '3 / 4',
          minH: compact ? '320px' : '380px',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          border: 'none',
          bg: 'transparent',
          p: 0,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        {/* Front — question */}
        <Box
          position="absolute"
          inset={0}
          borderRadius="2xl"
          borderWidth="2px"
          borderColor="blue.300"
          bgGradient="linear(to-br, blue.50, purple.50)"
          boxShadow="xl"
          p={6}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          sx={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <VStack spacing={3}>
            <Badge colorScheme="blue" borderRadius="full" px={3}>
              ❓ Your turn
            </Badge>
            <Text fontSize="xs" color="blue.700" fontWeight="semibold">
              Think… then tap to flip
            </Text>
            <Text
              fontSize={{ base: 'md', sm: 'lg' }}
              fontWeight="bold"
              color="gray.800"
              lineHeight="tall"
              textAlign="center"
              fontStyle="italic"
            >
              {card.front || 'Question missing'}
            </Text>
          </VStack>
        </Box>

        {/* Back — answer */}
        <Box
          position="absolute"
          inset={0}
          borderRadius="2xl"
          borderWidth="2px"
          borderColor="green.400"
          bgGradient="linear(to-br, green.50, teal.50)"
          boxShadow="xl"
          p={6}
          display="flex"
          flexDirection="column"
          justifyContent="center"
          sx={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <VStack spacing={3}>
            <Badge colorScheme="green" borderRadius="full" px={3}>
              ✅ Answer
            </Badge>
            <Text
              fontSize={{ base: 'md', sm: 'lg' }}
              fontWeight="semibold"
              color="gray.800"
              lineHeight="tall"
              textAlign="center"
            >
              {card.back || 'Answer missing'}
            </Text>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
