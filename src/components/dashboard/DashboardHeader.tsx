/**
 * Dashboard greeting header with grade badge.
 */

import { motion } from 'framer-motion';
import { VStack, Heading, Text, Badge, HStack, useColorModeValue } from '@/shared/design-system';

interface DashboardHeaderProps {
  greeting: string;
  grade?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ greeting, grade }) => {
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <VStack align={{ base: 'center', md: 'start' }} spacing={2} w="100%">
        <HStack spacing={3} flexWrap="wrap" justify={{ base: 'center', md: 'flex-start' }}>
          <Heading
            size={{ base: 'md', sm: 'lg', md: 'xl' }}
            color="blue.600"
            lineHeight="shorter"
            textAlign={{ base: 'center', md: 'left' }}
          >
            {greeting}
          </Heading>
          {grade && (
            <Badge colorScheme="purple" fontSize="xs" borderRadius="full" px={3} py={1}>
              Grade {grade}
            </Badge>
          )}
        </HStack>
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          color={subtitleColor}
          textAlign={{ base: 'center', md: 'left' }}
        >
          Here&apos;s your learning hub — pick up where you left off or try something new today.
        </Text>
      </VStack>
    </motion.div>
  );
};
