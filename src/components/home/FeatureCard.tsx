/**
 * Feature card component with hover animations
 * Matches dark Three.js theme with glassmorphic design
 * Enhanced with React Bits animations
 */

import { motion } from 'framer-motion';
import { Card, CardBody, VStack, Text, Heading } from '@/shared/design-system';

interface FeatureCardProps {
  emoji: string;
  title: string;
  description: string;
  delay: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  emoji,
  title,
  description,
  delay,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        bg="rgba(255, 255, 255, 0.05)"
        backdropFilter="blur(10px)"
        border="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        borderRadius={{ base: 'lg', md: 'xl' }}
        boxShadow="0 8px 32px rgba(0, 0, 0, 0.3)"
        height="100%"
        cursor="pointer"
        transition="all 0.3s"
        w="100%"
        _hover={{
          bg: 'rgba(255, 255, 255, 0.08)',
          borderColor: 'rgba(0, 242, 255, 0.3)',
          boxShadow: '0 12px 40px rgba(0, 242, 255, 0.2)',
        }}
        _active={{
          transform: 'scale(0.98)',
        }}
      >
        <CardBody p={{ base: 4, sm: 4, md: 4 }}>
          <VStack spacing={{ base: 3, md: 3 }} align="center" justify="center" h="100%">
            <Text
              fontSize={{ base: '3xl', sm: '3xl', md: '2xl' }}
              lineHeight="1"
              display="block"
            >
              {emoji}
            </Text>
            <Heading
              size={{ base: 'sm', sm: 'sm', md: 'sm' }}
              color="#00f2ff"
              textAlign="center"
              fontWeight="600"
              px={{ base: 2, md: 0 }}
            >
              {title}
            </Heading>
            <Text
              fontSize={{ base: 'xs', sm: 'xs', md: 'sm' }}
              color="rgba(255, 255, 255, 0.7)"
              textAlign="center"
              lineHeight={{ base: '1.4', md: '1.5' }}
              px={{ base: 1, md: 0 }}
            >
              {description}
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </motion.div>
  );
};

