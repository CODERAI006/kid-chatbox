/**
 * Topic image component with fallback
 */

import { Box, Image, Text } from '@/shared/design-system';
import { motion } from 'framer-motion';

import { resolveStudyImage } from '@/utils/studyImageUrls';

interface TopicImageProps {
  subject: string;
  topic: string;
}

export const TopicImage: React.FC<TopicImageProps> = ({ subject, topic }) => {
  const { url, label } = resolveStudyImage(topic, subject, topic);

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
          src={url}
          alt={`${label} — ${topic}`}
          width="100%"
          height="100%"
          objectFit="cover"
          fallback={
            <Box
              width="100%"
              height="100%"
              bg="gradient-to-r"
              bgGradient="linear(to-r, blue.400, purple.500)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="6xl">{subject.charAt(0)}</Text>
            </Box>
          }
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

