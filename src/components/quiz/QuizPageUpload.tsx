/**
 * Upload up to 5 page images for AI quiz generation from notes/textbook photos.
 */
import { useCallback, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Button, IconButton, Image, useToast,
} from '@/shared/design-system';
import {
  QUIZ_PAGE_IMAGE_MAX,
  QUIZ_PAGE_ACCEPT,
  type QuizPageImage,
  filesToQuizPageImages,
} from '@/utils/quizImageUpload';

interface QuizPageUploadProps {
  pages: QuizPageImage[];
  onChange: (pages: QuizPageImage[]) => void;
  isDisabled?: boolean;
}

export const QuizPageUpload: React.FC<QuizPageUploadProps> = ({
  pages,
  onChange,
  isDisabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handlePick = useCallback(() => {
    if (!isDisabled) inputRef.current?.click();
  }, [isDisabled]);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length || isDisabled) return;
    try {
      const added = await filesToQuizPageImages(fileList, pages.length);
      onChange([...pages, ...added]);
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not add images',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [pages, onChange, isDisabled, toast]);

  const removePage = useCallback((id: string) => {
    onChange(pages.filter((p) => p.id !== id));
  }, [pages, onChange]);

  return (
    <Box borderWidth={2} borderColor="purple.200" borderRadius="xl" p={4} bg="purple.50">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="purple.700">
              📄 Generate from page photos (optional)
            </Text>
            <Text fontSize="xs" color="gray.600" mt={1}>
              Upload up to {QUIZ_PAGE_IMAGE_MAX} photos of textbook pages, notes, or worksheets.
              Questions will be based on the text in your images. Requires a vision model in Ollama
              (e.g. run <Text as="code" fontSize="2xs">ollama pull moondream</Text> once on the server).
            </Text>
          </Box>
          <Button size="sm" colorScheme="purple" borderRadius="full" onClick={handlePick}
            isDisabled={isDisabled || pages.length >= QUIZ_PAGE_IMAGE_MAX}>
            + Add pages ({pages.length}/{QUIZ_PAGE_IMAGE_MAX})
          </Button>
        </HStack>

        <input
          ref={inputRef}
          type="file"
          accept={QUIZ_PAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {pages.length > 0 && (
          <HStack flexWrap="wrap" gap={3} align="flex-start">
            {pages.map((page, idx) => (
              <Box key={page.id} position="relative" borderRadius="lg" overflow="hidden"
                borderWidth={2} borderColor="purple.300" bg="white" w="88px">
                <Image src={page.previewUrl} alt={`Page ${idx + 1}`} w="88px" h="112px" objectFit="cover" />
                <Text position="absolute" bottom={1} left={1} fontSize="2xs" fontWeight="bold"
                  bg="blackAlpha.700" color="white" px={1.5} borderRadius="md">
                  p.{idx + 1}
                </Text>
                <IconButton
                  aria-label={`Remove page ${idx + 1}`}
                  icon={<Text fontSize="xs">✕</Text>}
                  size="xs"
                  position="absolute"
                  top={1}
                  right={1}
                  colorScheme="red"
                  borderRadius="full"
                  minW={6}
                  h={6}
                  onClick={() => removePage(page.id)}
                  isDisabled={isDisabled}
                />
              </Box>
            ))}
          </HStack>
        )}
      </VStack>
    </Box>
  );
};
