/**
 * Renders an optional illustration above a quiz question.
 */
import { Box, Image } from '@/shared/design-system';
import { resolveQuizQuestionImageUrl } from '@/utils/quizImageUrls';

interface QuizQuestionImageProps {
  imageUrl?: string | null;
  alt?: string;
}

export const QuizQuestionImage: React.FC<QuizQuestionImageProps> = ({
  imageUrl,
  alt = 'Question illustration',
}) => {
  const src = resolveQuizQuestionImageUrl(imageUrl);
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
    </Box>
  );
};
