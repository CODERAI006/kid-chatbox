/**
 * Pre-login landing sections — value proposition, modules, how-it-works, benefits.
 */

import { motion } from 'framer-motion';
import {
  Box,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  HStack,
  Button,
} from '@/shared/design-system';
import { FeatureCard } from '@/components/home/FeatureCard';
import {
  LANDING_BENEFITS,
  LANDING_FEATURE_GROUPS,
  LANDING_HOW_IT_WORKS,
  LANDING_VALUE_STATS,
} from '@/constants/landingFeatures';
import { APP_CONSTANTS } from '@/constants/app';

const sectionHeadingProps = {
  size: { base: 'lg' as const, sm: 'xl' as const, md: '2xl' as const },
  color: '#ffffff',
  textAlign: 'center' as const,
  fontWeight: 'extrabold' as const,
  letterSpacing: 'wide' as const,
  textShadow:
    '0 0 15px rgba(0, 242, 255, 0.6), 0 0 30px rgba(0, 242, 255, 0.4), 3px 3px 10px rgba(0,0,0,0.9)',
};

interface LandingShowcaseProps {
  onGetStarted: () => void;
}

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({ onGetStarted }) => {
  return (
    <VStack spacing={{ base: 10, md: 14 }} align="stretch" w="100%" id="features">
      {/* Value stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
      >
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }} maxW="900px" mx="auto" w="100%">
          {LANDING_VALUE_STATS.map((stat, index) => (
            <Box
              key={stat.label}
              bg="rgba(255, 255, 255, 0.06)"
              backdropFilter="blur(10px)"
              border="1px solid"
              borderColor="rgba(0, 242, 255, 0.15)"
              borderRadius="xl"
              py={{ base: 4, md: 5 }}
              px={3}
              textAlign="center"
            >
              <Text fontSize="2xl" mb={1} aria-hidden>
                {stat.emoji}
              </Text>
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="#00f2ff">
                {stat.value}
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="whiteAlpha.800">
                {stat.label}
              </Text>
              {index === 0 && (
                <Text fontSize="2xs" color="whiteAlpha.600" mt={1} display={{ base: 'none', md: 'block' }}>
                  Always-on help
                </Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </motion.div>

      {/* Full platform overview */}
      <VStack spacing={{ base: 6, md: 8 }} align="stretch">
        <VStack spacing={2} px={{ base: 2, md: 0 }}>
          <Heading {...sectionHeadingProps}>
            Everything inside {APP_CONSTANTS.BRAND_NAME} ✨
          </Heading>
          <Text
            fontSize={{ base: 'sm', md: 'md' }}
            color="whiteAlpha.900"
            textAlign="center"
            maxW="640px"
            mx="auto"
            textShadow="1px 1px 3px rgba(0,0,0,0.5)"
          >
            One learning portal — AI tutoring, quizzes, schedules, vocabulary, news, and friends.
            Sign up to unlock the full experience.
          </Text>
        </VStack>

        <VStack spacing={{ base: 8, md: 10 }} align="stretch">
          {LANDING_FEATURE_GROUPS.map((group, groupIndex) => (
            <Box key={group.id}>
              <HStack
                spacing={3}
                mb={{ base: 3, md: 4 }}
                justify={{ base: 'center', md: 'flex-start' }}
                flexWrap="wrap"
              >
                <Heading size="md" color="#00f2ff" fontWeight="bold">
                  {group.label}
                </Heading>
                <Text fontSize="sm" color="whiteAlpha.700">
                  {group.tagline}
                </Text>
              </HStack>
              <SimpleGrid
                columns={{ base: 1, sm: 2, lg: group.features.length > 3 ? 4 : 3 }}
                spacing={{ base: 4, md: 5 }}
              >
                {group.features.map((feature, featureIndex) => (
                  <FeatureCard
                    key={feature.title}
                    emoji={feature.emoji}
                    title={feature.title}
                    description={feature.description}
                    delay={0.1 + groupIndex * 0.15 + featureIndex * 0.08}
                  />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      </VStack>

      {/* How it works */}
      <VStack spacing={{ base: 5, md: 7 }}>
        <Heading {...sectionHeadingProps}>How it works 🛤️</Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 6 }} maxW="960px" mx="auto" w="100%">
          {LANDING_HOW_IT_WORKS.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
            >
              <Box
                bg="rgba(255, 255, 255, 0.05)"
                border="1px solid"
                borderColor="rgba(255, 255, 255, 0.12)"
                borderRadius="2xl"
                p={{ base: 5, md: 6 }}
                h="100%"
                position="relative"
                overflow="hidden"
              >
                <Text
                  position="absolute"
                  top={3}
                  right={4}
                  fontSize="4xl"
                  fontWeight="black"
                  color="rgba(0, 242, 255, 0.12)"
                  lineHeight={1}
                  aria-hidden
                >
                  {step.step}
                </Text>
                <Text fontSize="3xl" mb={3} aria-hidden>
                  {step.emoji}
                </Text>
                <Heading size="sm" color="#00f2ff" mb={2}>
                  {step.title}
                </Heading>
                <Text fontSize="sm" color="whiteAlpha.800" lineHeight="tall">
                  {step.description}
                </Text>
              </Box>
            </motion.div>
          ))}
        </SimpleGrid>
      </VStack>

      {/* Why choose us */}
      <VStack spacing={{ base: 5, md: 7 }}>
        <Heading {...sectionHeadingProps}>Why families choose us 💙</Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 4, md: 6 }} maxW="900px" mx="auto" w="100%">
          {LANDING_BENEFITS.map((benefit, index) => (
            <FeatureCard
              key={benefit.title}
              emoji={benefit.emoji}
              title={benefit.title}
              description={benefit.description}
              delay={0.2 + index * 0.1}
            />
          ))}
        </SimpleGrid>
      </VStack>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Box
          bg="linear-gradient(135deg, rgba(128, 90, 213, 0.35) 0%, rgba(0, 242, 255, 0.2) 100%)"
          border="1px solid"
          borderColor="rgba(0, 242, 255, 0.25)"
          borderRadius="2xl"
          py={{ base: 8, md: 10 }}
          px={{ base: 5, md: 8 }}
          textAlign="center"
          backdropFilter="blur(12px)"
        >
          <Heading size={{ base: 'md', md: 'lg' }} color="white" mb={3}>
            Ready to level up your learning?
          </Heading>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.900" mb={6} maxW="480px" mx="auto">
            Join students using AI study, quizzes, schedules, and Guru chat — all in one place.
          </Text>
          <Button
            size="lg"
            colorScheme="purple"
            bg="purple.500"
            color="white"
            borderRadius="full"
            px={10}
            fontWeight="bold"
            onClick={onGetStarted}
            _hover={{ bg: 'purple.600', transform: 'translateY(-2px)' }}
          >
            Create free account 🚀
          </Button>
        </Box>
      </motion.div>
    </VStack>
  );
};
