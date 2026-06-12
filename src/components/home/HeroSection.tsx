/**
 * Hero section component for home page
 * Enhanced with React Bits animations
 */

import { motion } from 'framer-motion';
import { VStack, HStack, Text, Button, Heading } from '@/shared/design-system';
import { APP_CONSTANTS } from '@/constants/app';
import { AnimatedBounce, SparkButton } from '@/components/shared/ReactBitsAnimations';

interface HeroSectionProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const HeroSection: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <VStack spacing={6} textAlign="center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Heading
            size={{ base: '2xl', md: '4xl' }}
            bgGradient="linear(to-r, purple.600, pink.600, blue.600)"
            bgClip="text"
            fontWeight="extrabold"
            letterSpacing="tight"
          >
            <AnimatedBounce>
              {APP_CONSTANTS.BRAND_NAME}
            </AnimatedBounce>
          </Heading>
        </motion.div>

        <Text
          fontSize={{ base: 'lg', md: '2xl' }}
          color="white"
          fontWeight="bold"
          textShadow="2px 2px 4px rgba(0,0,0,0.3)"
        >
          AI study, quizzes, schedules & Guru chat — one portal 🤖✨
        </Text>

        <Text
          fontSize={{ base: 'sm', md: 'lg' }}
          color="whiteAlpha.900"
          maxW="680px"
          textShadow="1px 1px 2px rgba(0,0,0,0.3)"
          px={{ base: 4, md: 0 }}
        >
          Personalized lessons, competitive quizzes, daily vocabulary, study buddies, and a 24/7 AI
          tutor built for kids and teens. Everything you need to learn smarter — before and after
          every test 🎓
        </Text>
      </VStack>
    </motion.div>
  );
};

export const HeroButtons: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onLogin,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
    >
      <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap" justifyContent="center">
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
                _hover={{
                  bg: 'purple.600',
                  transform: 'translateY(-2px)',
                  boxShadow: '2xl',
                }}
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
                _hover={{
                  bg: 'rgba(255, 255, 255, 0.2)',
                  transform: 'translateY(-2px)',
                }}
              >
                Login 👋
              </Button>
            </SparkButton>
          </motion.div>
        </HStack>
      </motion.div>
    );
  };

