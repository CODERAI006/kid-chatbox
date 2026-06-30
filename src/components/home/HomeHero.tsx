/**
 * Centered landing hero — headline, CTAs, and value props (no 3D mascot).
 */

import { motion, type Variants } from 'framer-motion';
import {
  Box,
  VStack,
  SimpleGrid,
  Text,
  Heading,
} from '@/shared/design-system';
import { APP_CONSTANTS } from '@/constants/app';
import { AnimatedBounce } from '@/components/shared/ReactBitsAnimations';
import { HeroButtons } from '@/components/home/HeroSection';
import { AppInstallButton } from '@/components/layout/AppInstallButton';

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const VALUE_PROPS = [
  { emoji: '📚', label: 'AI Study', desc: 'Personalized lessons' },
  { emoji: '🎯', label: 'Smart Quizzes', desc: 'Instant feedback' },
  { emoji: '🧩', label: 'Daily Puzzles', desc: 'Fresh every day' },
] as const;

interface HomeHeroProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onGetStarted, onLogin }) => (
  <Box
    as="section"
    display="flex"
    alignItems="center"
    justifyContent="center"
    pt={{ base: 20, md: 24 }}
    pb={{ base: 8, md: 10 }}
    minH={{ base: 'auto', md: 'min(72vh, 680px)' }}
  >
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      style={{ width: '100%', maxWidth: '820px', margin: '0 auto' }}
    >
      <VStack spacing={{ base: 5, md: 7 }} textAlign="center" px={{ base: 2, md: 0 }}>
        <motion.div variants={item}>
          <Heading
            size={{ base: '2xl', sm: '3xl', md: '4xl' }}
            bgGradient="linear(to-r, purple.300, pink.300, cyan.300)"
            bgClip="text"
            fontWeight="extrabold"
            letterSpacing="tight"
            lineHeight="shorter"
          >
            <AnimatedBounce>{APP_CONSTANTS.BRAND_NAME}</AnimatedBounce>
          </Heading>
        </motion.div>

        <motion.div variants={item}>
          <Text
            fontSize={{ base: 'lg', md: '2xl' }}
            color="white"
            fontWeight="bold"
            textShadow="2px 2px 4px rgba(0,0,0,0.3)"
            maxW="600px"
            mx="auto"
          >
            AI study, quizzes & Guru chat — one portal for kids ✨
          </Text>
        </motion.div>

        <motion.div variants={item}>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.800" maxW="560px" mx="auto" lineHeight="tall">
            Personalized lessons, daily puzzles, vocabulary, and a 24/7 AI tutor.
            Everything you need to learn smarter — before and after every test.
          </Text>
        </motion.div>

        <motion.div variants={item} style={{ width: '100%' }}>
          <VStack spacing={3} align="center">
            <HeroButtons onGetStarted={onGetStarted} onLogin={onLogin} />
            <AppInstallButton variant="outline" />
          </VStack>
        </motion.div>

        <motion.div variants={item} style={{ width: '100%' }}>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} maxW="640px" mx="auto" w="100%">
            {VALUE_PROPS.map((prop, i) => (
              <motion.div
                key={prop.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Box
                  bg="rgba(255,255,255,0.06)"
                  border="1px solid"
                  borderColor="rgba(0,242,255,0.15)"
                  borderRadius="xl"
                  py={3}
                  px={3}
                  backdropFilter="blur(8px)"
                >
                  <Text fontSize="2xl" mb={1} aria-hidden>{prop.emoji}</Text>
                  <Text fontSize="sm" fontWeight="bold" color="cyan.200">{prop.label}</Text>
                  <Text fontSize="xs" color="whiteAlpha.700">{prop.desc}</Text>
                </Box>
              </motion.div>
            ))}
          </SimpleGrid>
        </motion.div>

        <motion.div variants={item}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ cursor: 'pointer', display: 'inline-block' }}
            onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <VStack spacing={1} opacity={0.7} transition="opacity 0.2s" _hover={{ opacity: 1 }}>
              <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider" textTransform="uppercase">
                Explore features
              </Text>
              <Text fontSize="lg" color="cyan.300" aria-hidden>↓</Text>
            </VStack>
          </motion.div>
        </motion.div>
      </VStack>
    </motion.div>
  </Box>
);
