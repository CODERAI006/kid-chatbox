/**
 * Unified Home page component - Combines landing page with integrated auth modal
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  Container,
  SimpleGrid,
  Heading,
  Text,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Alert,
  AlertIcon,
} from '@/shared/design-system';
import { ThreeJSBackground } from '@/components/home/ThreeJSBackground';
import { FloatingElement } from '@/components/home/FloatingElement';
import { HeroSection, HeroButtons } from '@/components/home/HeroSection';
import { FeatureCard } from '@/components/home/FeatureCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PricingPlansSection } from '@/components/pricing/PricingPlansSection';
import { APP_CONSTANTS } from '@/constants/app';
import { publicApi } from '@/services/api';
import { authApi } from '@/services/api';

interface HomeProps {
  onAuthSuccess?: () => void;
}

/**
 * Initialize Google Analytics
 */
const initializeGoogleAnalytics = (): void => {
  const gaId = APP_CONSTANTS.GOOGLE_ANALYTICS_ID;
  if (!gaId) {
    return;
  }

  // Check if script already exists
  if (document.querySelector(`script[src*="gtag"]`)) {
    return;
  }

  // Create and append Google Analytics script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `;
  document.head.appendChild(script2);
};

/**
 * Track page view in Google Analytics
 */
const trackPageView = (): void => {
  const gaId = APP_CONSTANTS.GOOGLE_ANALYTICS_ID;
  if (!gaId || typeof window === 'undefined' || !(window as unknown as { gtag?: unknown }).gtag) {
    return;
  }

  try {
    (window as unknown as { gtag: (command: string, targetId: string, config: Record<string, unknown>) => void }).gtag(
      'config',
      gaId,
      {
        page_path: window.location.pathname,
        page_title: document.title,
      }
    );
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

/**
 * Unified Home page component with integrated auth modal
 */
export const Home: React.FC<HomeProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check URL params for auth mode
  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'register') {
      setActiveTab(authParam === 'login' ? 0 : 1);
      onOpen();
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, onOpen, setSearchParams]);

  useEffect(() => {
    // Initialize Google Analytics
    initializeGoogleAnalytics();

    // Track page view in Google Analytics
    setTimeout(() => {
      trackPageView();
    }, 100);

    // Track home page view in backend
    publicApi.trackHomeView().catch((error) => {
      console.error('Failed to track home view:', error);
    });

    // Fetch total views count
    publicApi
      .getTotalHomeViews()
      .then((response) => {
        if (response.success) {
          setTotalViews(response.totalViews);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch total views:', error);
      });
  }, []);

  const handleGetStarted = useCallback(() => {
    setActiveTab(1); // Register tab
    setAuthError(null);
    onOpen();
  }, [onOpen]);

  const handleLogin = useCallback(() => {
    setActiveTab(0); // Login tab
    setAuthError(null);
    onOpen();
  }, [onOpen]);

  const handleLoginSuccess = useCallback(() => {
    const { user: currentUser } = authApi.getCurrentUser();
    if (currentUser) {
      onClose();
      setAuthError(null);
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        navigate('/dashboard');
      }
    }
  }, [onClose, navigate, onAuthSuccess]);

  const handleRegisterSuccess = useCallback(() => {
    const { user: currentUser } = authApi.getCurrentUser();
    if (currentUser) {
      onClose();
      setAuthError(null);
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        navigate('/dashboard');
      }
    }
  }, [onClose, navigate, onAuthSuccess]);

  const handleSwitchToRegister = useCallback(() => {
    setActiveTab(1);
    setAuthError(null);
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setActiveTab(0);
    setAuthError(null);
  }, []);

  const handleClose = useCallback(() => {
    setAuthError(null);
    onClose();
  }, [onClose]);

  return (
    <Box position="relative" minHeight="100vh" overflow="hidden">
      <ThreeJSBackground />

      {/* Floating decorative elements */}
      <FloatingElement delay={0} emoji="✨" top="10%" left="5%" />
      <FloatingElement delay={0.5} emoji="🚀" top="20%" left="90%" />
      <FloatingElement delay={1} emoji="💡" top="60%" left="8%" />
      <FloatingElement delay={1.5} emoji="🎯" top="70%" left="92%" />
      <FloatingElement delay={2} emoji="⭐" top="40%" left="3%" />
      <FloatingElement delay={2.5} emoji="🔥" top="50%" left="95%" />

      <Container maxW="7xl" py={{ base: 8, sm: 10, md: 20 }} position="relative" zIndex={1} px={{ base: 3, sm: 4, md: 6 }}>
        {/* Total Views Badge */}
        {totalViews !== null && (
          <Box
            position="absolute"
            top={4}
            right={4}
            bg="rgba(255, 255, 255, 0.2)"
            backdropFilter="blur(10px)"
            borderRadius="full"
            px={4}
            py={2}
            zIndex={2}
          >
            <HStack spacing={2}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="white" fontWeight="bold">
                👁️
              </Text>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="white" fontWeight="bold">
                {totalViews.toLocaleString()} views
              </Text>
            </HStack>
          </Box>
        )}

        <VStack spacing={12} align="stretch">
          <HeroSection />

          {/* Buttons positioned below the circle */}
          <Box mt={{ base: 6, md: '460px' }} position="relative" zIndex={2}>
            <HeroButtons onGetStarted={handleGetStarted} onLogin={handleLogin} />
          </Box>

          {/* Features Section */}
          <VStack spacing={{ base: 5, sm: 6, md: 8 }} mt={{ base: 0, md: 8 }} position="relative" zIndex={2}>
            <Heading
              size={{ base: 'lg', sm: 'xl', md: '2xl' }}
              color="#ffffff"
              textAlign="center"
              textShadow="0 0 15px rgba(0, 242, 255, 0.6), 0 0 30px rgba(0, 242, 255, 0.4), 0 0 45px rgba(0, 242, 255, 0.2), 3px 3px 10px rgba(0,0,0,0.9)"
              px={{ base: 4, sm: 4, md: 0 }}
              fontSize={{ base: '1.5rem', sm: '1.75rem', md: '2.25rem' }}
              fontWeight="extrabold"
              position="relative"
              zIndex={3}
              mb={{ base: 2, md: 0 }}
              letterSpacing="wide"
            >
              Why Choose {APP_CONSTANTS.BRAND_NAME}? 🎯
            </Heading>

            <SimpleGrid
              columns={{ base: 1, md: 3 }}
              spacing={{ base: 4, sm: 4, md: 6 }}
              width="100%"
              maxW={{ base: '100%', md: '900px' }}
              mx="auto"
              px={{ base: 2, sm: 4, md: 0 }}
            >
              <FeatureCard
                emoji="📚"
                title="AI Study Mode"
                description="Learn at your own pace with AI-powered lessons that adapt to your style"
                delay={0.6}
              />
              <FeatureCard
                emoji="🎯"
                title="AI Quiz Mode"
                description="Test your knowledge with fun quizzes and get instant feedback"
                delay={0.8}
              />
              <FeatureCard
                emoji="📊"
                title="Track Progress"
                description="See your improvement over time with detailed analytics and insights"
                delay={1.0}
              />
            </SimpleGrid>
          </VStack>

          <Box mt={{ base: 8, md: 12 }} position="relative" zIndex={2}>
            <PricingPlansSection variant="landing" />
          </Box>
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
          <HStack spacing={4}>
            <Text
              as="a"
              href="#pricing"
              fontSize="sm"
              color="cyan.300"
              _hover={{ textDecoration: 'underline' }}
            >
              Pricing Plans
            </Text>
            <Text fontSize="sm" color="whiteAlpha.600">
              Made with ❤️ for kids
            </Text>
          </HStack>
        </HStack>
      </Box>

      {/* Auth Modal */}
      <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: 'lg' }} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
        <ModalContent
          bg="rgba(5, 5, 16, 0.95)"
          backdropFilter="blur(20px)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.1)"
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="0 20px 60px rgba(0, 242, 255, 0.2)"
        >
          <ModalCloseButton
            color="white"
            onClick={handleClose}
            zIndex={10}
            _hover={{ color: '#00f2ff', bg: 'rgba(0, 242, 255, 0.1)' }}
          />
          <ModalBody p={0}>
            <Tabs index={activeTab} onChange={setActiveTab}>
              <Box
                bg="rgba(255, 255, 255, 0.05)"
                borderBottom="1px solid"
                borderColor="rgba(255, 255, 255, 0.1)"
                px={6}
                py={4}
              >
                <TabList borderBottom="none">
                <Tab
                  color="rgba(255, 255, 255, 0.7)"
                  _selected={{
                    color: '#00f2ff',
                    borderBottom: '2px solid #00f2ff',
                    fontWeight: 'bold',
                  }}
                  _hover={{ color: '#00f2ff', opacity: 0.8 }}
                  fontSize={{ base: 'sm', md: 'lg' }}
                  px={{ base: 4, md: 6 }}
                  transition="all 0.3s"
                >
                  Login 👋
                </Tab>
                <Tab
                  color="rgba(255, 255, 255, 0.7)"
                  _selected={{
                    color: '#00f2ff',
                    borderBottom: '2px solid #00f2ff',
                    fontWeight: 'bold',
                  }}
                  _hover={{ color: '#00f2ff', opacity: 0.8 }}
                  fontSize={{ base: 'sm', md: 'lg' }}
                  px={{ base: 4, md: 6 }}
                  transition="all 0.3s"
                >
                  Sign Up 🎉
                </Tab>
                </TabList>
              </Box>

              <TabPanels>
                <TabPanel px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }} bg="transparent">
                  <AnimatePresence mode="wait">
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <Alert
                          status="error"
                          borderRadius="md"
                          mb={4}
                          fontSize={{ base: 'xs', md: 'sm' }}
                          bg="rgba(255, 0, 0, 0.1)"
                          border="1px solid"
                          borderColor="rgba(255, 0, 0, 0.3)"
                          color="white"
                        >
                          <AlertIcon />
                          {authError}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <LoginForm
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToRegister={handleSwitchToRegister}
                    onError={setAuthError}
                  />
                </TabPanel>
                <TabPanel px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }} bg="transparent">
                  <AnimatePresence mode="wait">
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <Alert
                          status="error"
                          borderRadius="md"
                          mb={4}
                          fontSize={{ base: 'xs', md: 'sm' }}
                          bg="rgba(255, 0, 0, 0.1)"
                          border="1px solid"
                          borderColor="rgba(255, 0, 0, 0.3)"
                          color="white"
                        >
                          <AlertIcon />
                          {authError}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <RegisterForm
                    onRegisterSuccess={handleRegisterSuccess}
                    onSwitchToLogin={handleSwitchToLogin}
                    onError={setAuthError}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
