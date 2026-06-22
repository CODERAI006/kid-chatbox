/**
 * Sticky landing navigation with section anchors and auth CTAs.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  HStack,
  Text,
  Button,
  Container,
  useBreakpointValue,
} from '@/shared/design-system';
import { APP_CONSTANTS } from '@/constants/app';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Daily', href: '#daily' },
  { label: 'Pricing', href: '#pricing' },
] as const;

interface HomeNavProps {
  onLogin: () => void;
  onGetStarted: () => void;
}

export const HomeNav: React.FC<HomeNavProps> = ({ onLogin, onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);
  const showLinks = useBreakpointValue({ base: false, md: true });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      as="nav"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={100}
      transition="all 0.3s ease"
      bg={scrolled ? 'rgba(5, 5, 20, 0.85)' : 'transparent'}
      backdropFilter={scrolled ? 'blur(16px)' : 'none'}
      borderBottom={scrolled ? '1px solid' : '1px solid transparent'}
      borderColor="whiteAlpha.100"
      py={scrolled ? 2 : 3}
    >
      <Container maxW="7xl" px={{ base: 3, md: 6 }}>
        <HStack justify="space-between" spacing={4}>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Text
              fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="extrabold"
              bgGradient="linear(to-r, purple.300, cyan.300)"
              bgClip="text"
              cursor="pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {APP_CONSTANTS.BRAND_NAME}
            </Text>
          </motion.div>

          {showLinks && (
            <HStack spacing={6} flex={1} justify="center">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Text
                    as="button"
                    fontSize="sm"
                    color="whiteAlpha.800"
                    fontWeight="medium"
                    _hover={{ color: 'cyan.300' }}
                    onClick={() => scrollTo(link.href)}
                  >
                    {link.label}
                  </Text>
                </motion.div>
              ))}
            </HStack>
          )}

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.100', color: 'cyan.300' }}
              onClick={onLogin}
              display={{ base: 'none', sm: 'inline-flex' }}
            >
              Login
            </Button>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="sm"
                colorScheme="purple"
                borderRadius="full"
                px={5}
                fontWeight="bold"
                onClick={onGetStarted}
              >
                Get Started
              </Button>
            </motion.div>
          </HStack>
        </HStack>
      </Container>

      <AnimatePresence>
        {!scrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: -1,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.3), transparent)',
            }}
          />
        )}
      </AnimatePresence>
    </Box>
  );
};
