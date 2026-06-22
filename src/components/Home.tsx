/**
 * Unified Home page — landing layout with sticky nav, hero, daily preview, and auth modal.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  Container,
  Text,
  HStack,
  SimpleGrid,
  Heading,
  useDisclosure,
} from '@/shared/design-system';
import { ThreeJSBackground } from '@/components/home/ThreeJSBackground';
import { FloatingElement } from '@/components/home/FloatingElement';
import { HomeNav } from '@/components/home/HomeNav';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeAnimatedSection } from '@/components/home/HomeAnimatedSection';
import { HomeAuthModal } from '@/components/home/HomeAuthModal';
import { LandingShowcase } from '@/components/home/LandingShowcase';
import { DailyPuzzlesPanel } from '@/components/puzzles/DailyPuzzlesPanel';
import { HomeWordOfDayPanel } from '@/components/home/HomeWordOfDayPanel';
import { PUZZLE_HOME_PREVIEW_COUNT } from '@/constants/puzzles';
import { useAutoAppInstallPrompt } from '@/hooks/useAutoAppInstallPrompt';
import { PricingPlansSection } from '@/components/pricing/PricingPlansSection';
import { APP_CONSTANTS } from '@/constants/app';
import { publicApi, authApi } from '@/services/api';
import { User } from '@/types';
import { getPostAuthPath } from '@/utils/profileComplete';

interface HomeProps {
  onAuthSuccess?: () => void;
}

const DESKTOP_FLOATERS = [
  { delay: 0, emoji: '✨', top: '12%', left: '4%' },
  { delay: 0.5, emoji: '🚀', top: '22%', left: '92%' },
  { delay: 1, emoji: '💡', top: '58%', left: '6%' },
  { delay: 1.5, emoji: '🎯', top: '72%', left: '90%' },
] as const;

export const Home: React.FC<HomeProps> = ({ onAuthSuccess }) => {
  useAutoAppInstallPrompt();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'register') {
      setActiveTab(authParam === 'login' ? 0 : 1);
      onOpen();
      setSearchParams({});
    }
  }, [searchParams, onOpen, setSearchParams]);

  useEffect(() => {
    publicApi.trackHomeView().catch((err) => console.error('Failed to track home view:', err));
    publicApi
      .getTotalHomeViews()
      .then((res) => { if (res.success) setTotalViews(res.totalViews); })
      .catch((err) => console.error('Failed to fetch total views:', err));
  }, []);

  const handleGetStarted = useCallback(() => {
    setActiveTab(1);
    setAuthError(null);
    onOpen();
  }, [onOpen]);

  const handleLogin = useCallback(() => {
    setActiveTab(0);
    setAuthError(null);
    onOpen();
  }, [onOpen]);

  const handleAuthSuccess = useCallback(() => {
    const { user } = authApi.getCurrentUser();
    if (!user) return;
    onClose();
    setAuthError(null);
    if (onAuthSuccess) onAuthSuccess();
    else navigate(getPostAuthPath(user as User));
  }, [onClose, navigate, onAuthSuccess]);

  const handleClose = useCallback(() => {
    setAuthError(null);
    onClose();
  }, [onClose]);

  return (
    <Box position="relative" minHeight="100vh" overflow="hidden">
      <ThreeJSBackground />
      <HomeNav onLogin={handleLogin} onGetStarted={handleGetStarted} />

      {DESKTOP_FLOATERS.map((f) => (
        <Box key={f.emoji} display={{ base: 'none', lg: 'block' }}>
          <FloatingElement {...f} />
        </Box>
      ))}

      <Container maxW="7xl" position="relative" zIndex={1} px={{ base: 3, sm: 4, md: 6 }}>
        {totalViews !== null && (
          <Box
            position="fixed"
            top={{ base: 14, md: 16 }}
            right={4}
            bg="rgba(255, 255, 255, 0.12)"
            backdropFilter="blur(10px)"
            borderRadius="full"
            px={3}
            py={1.5}
            zIndex={90}
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <HStack spacing={1.5}>
              <Text fontSize="xs" color="white" aria-hidden>👁️</Text>
              <Text fontSize="xs" color="whiteAlpha.900" fontWeight="semibold">
                {totalViews.toLocaleString()} views
              </Text>
            </HStack>
          </Box>
        )}

        <VStack spacing={{ base: 12, md: 16 }} align="stretch" pb={{ base: 8, md: 12 }}>
          <HomeHero onGetStarted={handleGetStarted} onLogin={handleLogin} />

          <HomeAnimatedSection id="daily">
            <VStack spacing={4} align="stretch">
              <VStack spacing={1} textAlign="center">
                <Heading
                  size={{ base: 'md', md: 'lg' }}
                  color="cyan.300"
                  fontWeight="extrabold"
                >
                  Today&apos;s learning picks 🌟
                </Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.800" maxW="560px" mx="auto">
                  Fresh words and brain-teasing puzzles — updated every day. Sign up to save your streak.
                </Text>
              </VStack>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }} alignItems="stretch">
                <HomeWordOfDayPanel onGetStarted={handleGetStarted} />
                <DailyPuzzlesPanel variant="dark" maxCount={PUZZLE_HOME_PREVIEW_COUNT} showViewAll={false} />
              </SimpleGrid>
            </VStack>
          </HomeAnimatedSection>

          <HomeAnimatedSection id="features" delay={0.05}>
            <LandingShowcase onGetStarted={handleGetStarted} />
          </HomeAnimatedSection>

          <HomeAnimatedSection id="pricing" delay={0.08}>
            <PricingPlansSection variant="landing" />
          </HomeAnimatedSection>
        </VStack>
      </Container>

      <Box
        as="footer"
        bg="rgba(0, 0, 0, 0.5)"
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
        py={6}
        px={4}
        position="relative"
        zIndex={2}
      >
        <HStack justify="space-between" flexWrap="wrap" spacing={4} maxW="7xl" mx="auto">
          <Text fontSize="sm" color="whiteAlpha.700">
            © {new Date().getFullYear()} {APP_CONSTANTS.BRAND_NAME}. All rights reserved.
          </Text>
          <HStack spacing={4} flexWrap="wrap">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Daily', href: '#daily' },
              { label: 'Pricing', href: '#pricing' },
            ].map((link) => (
              <Text
                key={link.href}
                as="a"
                href={link.href}
                fontSize="sm"
                color="cyan.300"
                _hover={{ textDecoration: 'underline' }}
              >
                {link.label}
              </Text>
            ))}
            <Text as={RouterLink} to="/privacy" fontSize="sm" color="cyan.300" _hover={{ textDecoration: 'underline' }}>
              Privacy Policy
            </Text>
            <Text as={RouterLink} to="/disclaimer" fontSize="sm" color="cyan.300" _hover={{ textDecoration: 'underline' }}>
              PII Disclaimer
            </Text>
            <Text fontSize="sm" color="whiteAlpha.600">Made with ❤️ for kids</Text>
          </HStack>
        </HStack>
      </Box>

      <HomeAuthModal
        isOpen={isOpen}
        activeTab={activeTab}
        authError={authError}
        onClose={handleClose}
        onTabChange={setActiveTab}
        onLoginSuccess={handleAuthSuccess}
        onRegisterSuccess={handleAuthSuccess}
        onSwitchToRegister={() => { setActiveTab(1); setAuthError(null); }}
        onSwitchToLogin={() => { setActiveTab(0); setAuthError(null); }}
        onError={setAuthError}
      />
    </Box>
  );
};
