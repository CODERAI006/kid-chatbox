/**
 * Hero CTA buttons for the landing page.
 */

import { motion } from 'framer-motion';
import { HStack, Button } from '@/shared/design-system';
import { SparkButton } from '@/components/shared/ReactBitsAnimations';

interface HeroButtonsProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const HeroButtons: React.FC<HeroButtonsProps> = ({ onGetStarted, onLogin }) => (
  <HStack
    spacing={{ base: 2, md: 4 }}
    flexWrap="wrap"
    justifyContent={{ base: 'center', lg: 'flex-start' }}
  >
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <SparkButton sparkColor="#a855f7" sparkCount={15}>
        <Button
          size={{ base: 'md', md: 'lg' }}
          colorScheme="purple"
          bg="purple.500"
          color="white"
          px={{ base: 6, md: 8 }}
          py={{ base: 4, md: 6 }}
          fontSize={{ base: 'sm', md: 'lg' }}
          fontWeight="bold"
          borderRadius="full"
          boxShadow="xl"
          onClick={onGetStarted}
          _hover={{ bg: 'purple.600', transform: 'translateY(-2px)', boxShadow: '2xl' }}
        >
          Get Started 🚀
        </Button>
      </SparkButton>
    </motion.div>

    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <SparkButton sparkColor="#00f2ff" sparkCount={12}>
        <Button
          size={{ base: 'md', md: 'lg' }}
          variant="outline"
          borderColor="white"
          color="white"
          px={{ base: 6, md: 8 }}
          py={{ base: 4, md: 6 }}
          fontSize={{ base: 'sm', md: 'lg' }}
          fontWeight="bold"
          borderRadius="full"
          bg="rgba(255, 255, 255, 0.1)"
          backdropFilter="blur(10px)"
          onClick={onLogin}
          _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'translateY(-2px)' }}
        >
          Login 👋
        </Button>
      </SparkButton>
    </motion.div>
  </HStack>
);
