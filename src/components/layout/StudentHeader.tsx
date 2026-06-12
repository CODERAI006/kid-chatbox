/**
 * Minimal student app header — welcome message only (no action buttons).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  HStack,
  Text,
  VStack,
  useColorModeValue,
  Progress,
} from '@/shared/design-system';
import { User } from '@/types';
import { useQuizTimer } from '@/contexts/QuizTimerContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface StudentHeaderProps {
  user?: User | null;
  onMenuOpen?: () => void;
  showMenuButton?: boolean;
  showSidebarToggle?: boolean;
  sidebarVisible?: boolean;
  onSidebarToggle?: () => void;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function pageHint(pathname: string, hash: string): string | null {
  if (pathname === '/dashboard') return null;
  if (pathname === '/study') {
    if (hash === '#ai-study') return 'AI study mode';
    if (hash === '#history') return 'Study history';
    return 'Study hub';
  }
  if (pathname === '/quiz') {
    if (hash === '#ai-quiz') return 'AI quiz mode';
    if (hash === '#history') return 'Quiz results';
    return 'Quiz hub';
  }
  if (pathname === '/past-chats') return 'Past Guru conversations';
  if (pathname === '/profile') return 'Account & settings';
  if (pathname === '/study-buddies') return 'Study Buddy';
  if (pathname === '/quiz-rankings') return 'Leaderboard';
  if (pathname === '/news') return 'Facts & Fun';
  if (pathname.startsWith('/word-of-day')) return 'Word of the day';
  if (pathname.startsWith('/study-library')) return 'Study library';
  return 'Keep learning today';
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  user,
  onMenuOpen,
  showMenuButton = false,
  showSidebarToggle = false,
  sidebarVisible = true,
  onSidebarToggle,
}) => {
  const location = useLocation();
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const accent = useColorModeValue('blue.600', 'blue.300');
  const nameColor = useColorModeValue('gray.800', 'gray.100');
  const [showStickyTimer, setShowStickyTimer] = useState(false);

  let quizTimer: ReturnType<typeof useQuizTimer> | null = null;
  try {
    quizTimer = useQuizTimer();
  } catch {
    quizTimer = null;
  }

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

  const displayName = useMemo(() => {
    const raw = user?.name?.trim() || 'there';
    const first = raw.split(/\s+/)[0];
    return first || 'there';
  }, [user?.name]);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const hint = pageHint(location.pathname, location.hash);

  const copyBuddyId = useCallback(async () => {
    if (!user?.buddyId) return;
    try {
      await navigator.clipboard.writeText(user.buddyId);
    } catch {
      // Clipboard may be unavailable
    }
  }, [user?.buddyId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress =
    quizTimer && quizTimer.totalTime > 0
      ? (quizTimer.timeRemaining / quizTimer.totalTime) * 100
      : 0;
  const isWarning = quizTimer ? quizTimer.timeRemaining <= 30 : false;
  const isCritical = quizTimer ? quizTimer.timeRemaining <= 10 : false;

  return (
    <>
      <Box
        as="header"
        bg={headerBg}
        borderBottomWidth={1}
        borderBottomColor={borderColor}
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <Box maxW="1400px" mx="auto" py={{ base: 2, md: 2.5 }} px={{ base: 4, md: 6 }} position="relative">
          <HStack align="center" justify="space-between" spacing={3} minH="32px">
            <HStack spacing={2} minW={0} zIndex={1}>
              {showMenuButton && onMenuOpen && (
                <Text
                  as="span"
                  fontSize="sm"
                  color={accent}
                  cursor="pointer"
                  flexShrink={0}
                  onClick={onMenuOpen}
                  onKeyDown={(e) => e.key === 'Enter' && onMenuOpen()}
                  role="button"
                  tabIndex={0}
                  aria-label="Open navigation menu"
                >
                  ☰
                </Text>
              )}

              {showSidebarToggle && onSidebarToggle && (
                <Text
                  as="span"
                  fontSize="xs"
                  color={accent}
                  cursor="pointer"
                  flexShrink={0}
                  onClick={onSidebarToggle}
                  onKeyDown={(e) => e.key === 'Enter' && onSidebarToggle()}
                  role="button"
                  tabIndex={0}
                  aria-label={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
                >
                  {sidebarVisible ? 'Hide nav' : 'Show nav'}
                </Text>
              )}
            </HStack>

            <VStack
              align="center"
              spacing={0}
              position="absolute"
              left="50%"
              top="50%"
              transform="translate(-50%, -50%)"
              maxW={{ base: 'calc(100% - 5rem)', md: '50%' }}
              px={2}
              textAlign="center"
              pointerEvents="none"
            >
              <Text fontSize={{ base: 'sm', md: 'md' }} color={muted} lineHeight="short" noOfLines={1}>
                {greeting},{' '}
                <Text as="span" fontWeight="semibold" color={nameColor}>
                  {displayName}
                </Text>
              </Text>
              {hint && (
                <Text fontSize="xs" color={muted} noOfLines={1}>
                  {hint}
                </Text>
              )}
            </VStack>

            <HStack spacing={2} justify="flex-end" minW={0} zIndex={1}>
            {quizTimer?.isQuizActive && location.pathname === '/quiz' && (
              <HStack
                spacing={2}
                px={2}
                py={1}
                borderRadius="md"
                bg={isCritical ? 'red.50' : isWarning ? 'orange.50' : 'blue.50'}
                borderWidth={1}
                borderColor={isCritical ? 'red.300' : isWarning ? 'orange.300' : 'blue.300'}
                flexShrink={0}
              >
                <Text fontSize="xs" fontWeight="semibold" color={isCritical ? 'red.700' : isWarning ? 'orange.700' : 'blue.700'}>
                  ⏱ {formatTime(quizTimer.timeRemaining)}
                </Text>
              </HStack>
            )}

            {user && <NotificationBell enabled />}

            {user?.buddyId && (
              <HStack
                spacing={1}
                px={2}
                py={1}
                borderRadius="md"
                bg="purple.50"
                borderWidth={1}
                borderColor="purple.200"
                flexShrink={0}
                cursor="pointer"
                onClick={() => void copyBuddyId()}
                onKeyDown={(e) => e.key === 'Enter' && void copyBuddyId()}
                role="button"
                tabIndex={0}
                aria-label={`Buddy ID ${user.buddyId}. Click to copy.`}
                title="Click to copy Buddy ID"
              >
                <Text fontSize="xs" color="purple.700" fontWeight="semibold" whiteSpace="nowrap">
                  Buddy: {user.buddyId}
                </Text>
              </HStack>
            )}
            </HStack>
          </HStack>
        </Box>
      </Box>

      {showStickyTimer && quizTimer?.isQuizActive && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bg={isCritical ? 'red.600' : isWarning ? 'orange.600' : 'blue.600'}
          color="white"
          zIndex={1001}
          py={2}
          px={4}
          boxShadow="lg"
        >
          <Box maxW="1400px" mx="auto">
            <HStack justify="space-between" align="center" spacing={4}>
              <HStack spacing={3}>
                <Text fontSize="sm" fontWeight="semibold">
                  ⏱ {formatTime(quizTimer.timeRemaining)}
                </Text>
                <Text fontSize="xs" opacity={0.9}>Quiz in progress</Text>
              </HStack>
              <Box flex={1} maxW="300px">
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
