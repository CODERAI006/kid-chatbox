/**
 * Renders an optional illustration above a quiz question.
 */
import { Box, Image, Text } from '@/shared/design-system';
import { resolveQuizQuestionImageUrl } from '@/utils/quizImageUrls';

interface QuizQuestionImageProps {
  imageUrl?: string | null;
  imagePrompt?: string | null;
  alt?: string;
}

export const QuizQuestionImage: React.FC<QuizQuestionImageProps> = ({
  imageUrl,
  imagePrompt,
  alt = 'Question illustration',
}) => {
  const src = resolveQuizQuestionImageUrl(imageUrl);
  const prompt = imagePrompt?.trim();
  if (!src) return null;

  return (
    <Box mb={4} borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor="blue.100" boxShadow="md">
      <Image
        src={src}
        alt={alt}
        width="100%"
        maxH={{ base: '220px', md: '320px' }}
        objectFit="contain"
        bg="white"
        loading="lazy"
      />
      {prompt && (
        <Box px={3} py={2} bg="blue.50" borderTopWidth="1px" borderColor="blue.100">
          <Text fontSize="2xs" fontWeight="semibold" color="blue.700" mb={0.5}>
            Image request
          </Text>
          <Text fontSize="xs" color="gray.600" lineHeight="short" noOfLines={3}>
            {prompt}
          </Text>
        </Box>
      )}
    </Box>
  );
};
