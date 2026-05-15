/**
 * Header component with navigation and user info
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Box,
  HStack,
  Text,
  Button,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Tooltip,
  useColorMode,
  useColorModeValue,
  Progress,
} from '@/shared/design-system';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { useFontSize } from '@/contexts/FontSizeContext';
import { useQuizTimer } from '@/contexts/QuizTimerContext';

interface HeaderProps {
  user?: User | null;
  onMenuOpen?: () => void;
  showMenuButton?: boolean;
}

/**
 * Header component with navigation and user menu
 */
export const Header: React.FC<HeaderProps> = ({ user, onMenuOpen, showMenuButton = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();
  const { colorMode, toggleColorMode } = useColorMode();
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const fontControlBg = useColorModeValue('gray.100', 'gray.700');
  const [showStickyTimer, setShowStickyTimer] = useState(false);
  
  // Try to get quiz timer context (may not be available)
  let quizTimer: ReturnType<typeof useQuizTimer> | null = null;
  try {
    quizTimer = useQuizTimer();
  } catch {
    // Context not available, timer won't show
  }

  // Show sticky timer when scrolling during quiz
  useEffect(() => {
    const handleScroll = () => {
      if (quizTimer?.isQuizActive && location.pathname === '/quiz') {
        setShowStickyTimer(window.scrollY > 100);
      } else {
        setShowStickyTimer(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [quizTimer?.isQuizActive, location.pathname]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = quizTimer && quizTimer.totalTime > 0
    ? (quizTimer.timeRemaining / quizTimer.totalTime) * 100
    : 0;
  
  const isWarning = quizTimer ? quizTimer.timeRemaining <= 30 : false;
  const isCritical = quizTimer ? quizTimer.timeRemaining <= 10 : false;

  const handleLogout = () => {
    authApi.logout();
    // Use setTimeout to ensure state update is processed before navigation
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 0);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const canGoBack = location.key !== 'default' && window.history.length > 1;
  const isHomePage = location.pathname === '/dashboard';

  return (
    <>
      <Box
        as="header"
        bg={headerBg}
        boxShadow="sm"
        borderBottomWidth={1}
        borderBottomColor={borderColor}
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <Box maxWidth="1400px" margin="0 auto">
          <Box paddingY={{ base: 2, md: 3 }} paddingX={{ base: 4, md: 6 }}>
            <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={{ base: 2, md: 4 }}>
            {/* Left: Menu Button (Mobile) */}
            {showMenuButton && onMenuOpen && (
              <IconButton
                aria-label="Open menu"
                icon={<Text fontSize={{ base: 'lg', md: 'xl' }}>☰</Text>}
                onClick={onMenuOpen}
                variant="ghost"
                size={{ base: 'sm', md: 'md' }}
                flexShrink={0}
              />
            )}

            {/* Quiz Timer in Header (when quiz is active) */}
            {quizTimer?.isQuizActive && location.pathname === '/quiz' && (
              <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
                <Box
                  paddingX={3}
                  paddingY={1.5}
                  borderRadius="md"
                  bg={isCritical ? 'red.50' : isWarning ? 'orange.50' : 'blue.50'}
                  borderWidth={2}
                  borderColor={isCritical ? 'red.400' : isWarning ? 'orange.400' : 'blue.400'}
                >
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="bold" color={isCritical ? 'red.700' : isWarning ? 'orange.700' : 'blue.700'}>
                      ⏱️ {formatTime(quizTimer.timeRemaining)}
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            )}

          {/* Right: Navigation and Controls */}
          <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap" ml="auto">
          {/* Navigation Buttons */}
          {canGoBack && !isHomePage && (
            <Button
              variant="ghost"
              size={{ base: 'xs', md: 'sm' }}
              onClick={handleGoBack}
              leftIcon={<Text>←</Text>}
            >
              <Text display={{ base: 'none', sm: 'block' }}>Back</Text>
            </Button>
          )}
          {!isHomePage && (
            <Button
              variant="ghost"
              size={{ base: 'xs', md: 'sm' }}
              onClick={handleGoHome}
              leftIcon={<Text>🏠</Text>}
            >
              <Text display={{ base: 'none', sm: 'block' }}>Home</Text>
            </Button>
          )}

          {/* Font Controls, Dark Mode Toggle, User Menu, and Logout */}
          {/* Dark Mode Toggle */}
          <Tooltip label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton
              aria-label="Toggle dark mode"
              icon={<Text fontSize="md">{colorMode === 'dark' ? '☀️' : '🌙'}</Text>}
              size="sm"
              variant="ghost"
              onClick={toggleColorMode}
            />
          </Tooltip>

          {/* Font Size Controls */}
          <HStack spacing={1} bg={fontControlBg} borderRadius="md" padding={1} display={{ base: 'none', sm: 'flex' }}>
            <Tooltip label="Decrease font size">
              <IconButton
                aria-label="Decrease font size"
                icon={<Text fontSize="sm">A-</Text>}
                size="sm"
                variant="ghost"
                onClick={decreaseFontSize}
                isDisabled={fontSize <= 12}
              />
            </Tooltip>
            <Text fontSize="xs" px={2} minW="40px" textAlign="center" fontWeight="bold">
              {fontSize}px
            </Text>
            <Tooltip label="Increase font size">
              <IconButton
                aria-label="Increase font size"
                icon={<Text fontSize="sm">A+</Text>}
                size="sm"
                variant="ghost"
                onClick={increaseFontSize}
                isDisabled={fontSize >= 24}
              />
            </Tooltip>
            <Tooltip label="Reset font size">
              <IconButton
                aria-label="Reset font size"
                icon={<Text fontSize="xs">↺</Text>}
                size="sm"
                variant="ghost"
                onClick={resetFontSize}
              />
            </Tooltip>
          </HStack>

          {user ? (
            <>
              <Menu>
                <MenuButton
                  as={Button}
                  variant="ghost"
                  size={{ base: 'xs', md: 'sm' }}
                  leftIcon={<Avatar size="xs" name={user.name} />}
                >
                  <Text display={{ base: 'none', md: 'block' }}>{user.name}</Text>
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={handleGoHome}>Dashboard</MenuItem>
                  <MenuItem onClick={() => navigate('/study')}>AI Study Mode</MenuItem>
                  <MenuItem onClick={() => navigate('/quiz')}>AI Quiz Mode</MenuItem>
                  <MenuItem onClick={() => navigate('/quiz-rankings')}>Quiz Rankings 🏆</MenuItem>
                  <MenuItem onClick={() => navigate('/study#history')}>Study History</MenuItem>
                  <MenuItem onClick={() => navigate('/quiz#history')}>Quiz History</MenuItem>
                  <MenuItem onClick={() => navigate('/profile')}>My Profile</MenuItem>
                </MenuList>
              </Menu>
              <Button
                colorScheme="red"
                variant="outline"
                size={{ base: 'xs', md: 'sm' }}
                onClick={handleLogout}
              >
                <Text display={{ base: 'none', sm: 'block' }}>Logout</Text>
                <Text display={{ base: 'block', sm: 'none' }}>🚪</Text>
              </Button>
            </>
          ) : (
            <Button size={{ base: 'xs', md: 'sm' }} colorScheme="blue" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </HStack>
        </HStack>
        </Box>
      </Box>
      </Box>

      {/* Sticky Timer Bar (appears when scrolling during quiz) */}
      {showStickyTimer && quizTimer?.isQuizActive && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bg={isCritical ? 'red.600' : isWarning ? 'orange.600' : 'blue.600'}
          color="white"
          zIndex={1001}
          paddingY={2}
          paddingX={4}
          boxShadow="lg"
        >
          <Box maxWidth="1400px" margin="0 auto">
            <HStack justifyContent="space-between" alignItems="center" spacing={4}>
              <HStack spacing={3}>
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold">
                  ⏱️ {formatTime(quizTimer.timeRemaining)}
                </Text>
                <Text fontSize={{ base: 'xs', md: 'sm' }} opacity={0.9}>
                  Quiz in progress
                </Text>
              </HStack>
              <Box flex={1} maxWidth="300px">
                <Progress
                  value={progress}
                  colorScheme={isCritical ? 'red' : isWarning ? 'orange' : 'blue'}
                  size="sm"
                  bg="whiteAlpha.300"
                  borderRadius="full"
                />
              </Box>
            </HStack>
          </Box>
        </Box>
      )}
    </>
  );
};

