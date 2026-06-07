/**
 * Topic-related image gallery for study lessons.
 */
import { Box, SimpleGrid, Image, Text, Badge, HStack } from '@/shared/design-system';
import { motion } from 'framer-motion';

interface StudyImageGalleryProps {
  subject: string;
  topic: string;
  keywords?: string[];
}

const SUBJECT_SEEDS: Record<string, string[]> = {
  maths: ['math-blackboard', 'numbers-chart', 'geometry-shapes'],
  hindi: ['hindi-books', 'india-culture', 'story-reading'],
  english: ['english-books', 'library-kids', 'writing-desk'],
  science: ['science-lab', 'microscope', 'nature-plants'],
  chess: ['chess-board', 'chess-pieces', 'strategy-game'],
};

function buildImageUrls(subject: string, topic: string, keywords: string[] = []): string[] {
  const key = subject.toLowerCase();
  const base = SUBJECT_SEEDS[key] ?? ['classroom-learning', 'kids-study', 'education-fun'];
  const fromTopic = topic
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter(Boolean);
  const merged = [...keywords, ...fromTopic, ...base]
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = [...new Set(merged)].slice(0, 6);
  return unique.map(
    (seed, i) => `https://picsum.photos/seed/${encodeURIComponent(`${seed}-${i}`)}/640/400`
  );
}

export const StudyImageGallery: React.FC<StudyImageGalleryProps> = ({
  subject,
  topic,
  keywords = [],
}) => {
  const urls = buildImageUrls(subject, topic, keywords);

  return (
    <Box>
      <HStack mb={3} spacing={2}>
        <Text fontSize="lg" fontWeight="bold" color="teal.700">
          📸 Related visuals
        </Text>
        <Badge colorScheme="teal" borderRadius="full">
          {urls.length} images
        </Badge>
      </HStack>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
        {urls.map((url, i) => (
          <motion.div
            key={url}
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
                src={url}
                alt={`${topic} visual ${i + 1}`}
                w="100%"
                h="100%"
                objectFit="cover"
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
                  {keywords[i] || topic} • {subject}
                </Text>
              </Box>
            </Box>
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  );
};
