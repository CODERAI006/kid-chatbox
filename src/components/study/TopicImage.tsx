/**
 * Topic hero image — Ollama Cloud URL only (no stock/placeholder images).
 */
import { Box, Image, Text } from '@/shared/design-system';
import { motion } from 'framer-motion';
import { resolveOllamaImageUrl } from '@/utils/ollamaImageUrl';

interface TopicImageProps {
  imageUrl?: string | null;
  label: string;
  subject: string;
  topic: string;
}

export const TopicImage: React.FC<TopicImageProps> = ({ imageUrl, label, subject, topic }) => {
  const src = resolveOllamaImageUrl(imageUrl);
  if (!src) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Box
        position="relative"
        width="100%"
        height="300px"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="lg"
        mb={6}
      >
        <Image
          src={src}
          alt={`${label} — ${topic}`}
          width="100%"
          height="100%"
          objectFit="cover"
        />
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="linear-gradient(to top, rgba(0,0,0,0.7), transparent)"
          padding={4}
        >
          <Text color="white" fontSize="lg" fontWeight="bold">
            {subject} • {topic}
          </Text>
        </Box>
      </Box>
    </motion.div>
  );
};
