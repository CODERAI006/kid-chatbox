/**
 * Study lesson image gallery — Ollama Cloud generated URLs only.
 */
import { Box, SimpleGrid, Image, Text, Badge, HStack } from '@/shared/design-system';
import { motion } from 'framer-motion';
import { resolveOllamaImageUrl } from '@/utils/ollamaImageUrl';
import type { StudyGalleryImage } from '@/services/study';

interface StudyImageGalleryProps {
  images: StudyGalleryImage[];
}

export const StudyImageGallery: React.FC<StudyImageGalleryProps> = ({ images }) => {
  const visible = (images || [])
    .map((img) => ({ ...img, src: resolveOllamaImageUrl(img.url) }))
    .filter((img): img is StudyGalleryImage & { src: string } => Boolean(img.src));

  if (!visible.length) return null;

  return (
    <Box>
      <HStack mb={3} spacing={2}>
        <Text fontSize="lg" fontWeight="bold" color="teal.700">
          📸 Related visuals
        </Text>
        <Badge colorScheme="teal" borderRadius="full">
          {visible.length} images
        </Badge>
      </HStack>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
        {visible.map((img, i) => (
          <motion.div
            key={`${img.src}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Box
              borderRadius="xl"
              overflow="hidden"
              boxShadow="md"
              borderWidth={2}
              borderColor="teal.100"
              position="relative"
              height="180px"
            >
              <Image
                src={img.src}
                alt={img.label}
                w="100%"
                h="100%"
                objectFit="cover"
                loading="lazy"
              />
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                bg="linear-gradient(to top, rgba(0,0,0,0.65), transparent)"
                px={3}
                py={2}
              >
                <Text color="white" fontSize="xs" fontWeight="semibold" noOfLines={1}>
                  {img.label}
                </Text>
              </Box>
            </Box>
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  );
};
