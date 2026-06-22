/**
 * Full-viewport hero — headline, CTAs, and 3D mascot in a responsive grid.
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
import { HeroImage } from '@/components/home/HeroImage';
import { HeroButtons } from '@/components/home/HeroSection';
import { AppInstallButton } from '@/components/layout/AppInstallButton';

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

interface HomeHeroProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onGetStarted, onLogin }) => (
  <Box
    as="section"
    minH={{ base: 'auto', lg: 'min(88vh, 820px)' }}
    display="flex"
    alignItems="center"
    pt={{ base: 20, md: 24 }}
    pb={{ base: 10, md: 12 }}
  >
    <motion.div variants={container} initial="hidden" animate="visible" style={{ width: '100%' }}>
      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        spacing={{ base: 6, lg: 10 }}
        alignItems="center"
      >
        <VStack spacing={{ base: 5, md: 6 }} align={{ base: 'center', lg: 'flex-start' }} textAlign={{ base: 'center', lg: 'left' }}>
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
              maxW="540px"
            >
              AI study, quizzes & Guru chat — one portal for kids 🤖✨
            </Text>
          </motion.div>

          <motion.div variants={item}>
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              color="whiteAlpha.800"
              maxW="520px"
              lineHeight="tall"
            >
              Personalized lessons, daily puzzles, vocabulary, and a 24/7 AI tutor.
              Everything you need to learn smarter — before and after every test.
            </Text>
          </motion.div>

          <motion.div variants={item} style={{ width: '100%' }}>
            <VStack spacing={3} align={{ base: 'center', lg: 'flex-start' }} w="100%">
              <HeroButtons onGetStarted={onGetStarted} onLogin={onLogin} />
              <AppInstallButton variant="outline" />
            </VStack>
          </motion.div>
        </VStack>

        <motion.div variants={item}>
          <Box display="flex" justifyContent="center" alignItems="center">
            <HeroImage />
          </Box>
        </motion.div>
      </SimpleGrid>

      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ cursor: 'pointer' }}
          onClick={() => document.querySelector('#daily')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <VStack spacing={1} opacity={0.7} transition="opacity 0.2s" _hover={{ opacity: 1 }}>
            <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider" textTransform="uppercase">
              Explore daily content
            </Text>
            <Text fontSize="lg" color="cyan.300" aria-hidden>
              ↓
            </Text>
          </VStack>
        </motion.div>
      </motion.div>
    </motion.div>
  </Box>
);
