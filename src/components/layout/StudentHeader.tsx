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
  Heading,
  IconButton,
  useColorModeValue,
  Progress,
} from '@/shared/design-system';
import { FiMenu, FiChevronLeft } from 'react-icons/fi';
import { adminColors } from '@/components/admin/adminTokens';
import { APP_CONSTANTS } from '@/constants/app';
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
    if (hash === '#rankings') return 'Leaderboard';
    return 'Quiz hub';
  }
  if (pathname === '/past-chats') return 'Past Guru conversations';
  if (pathname === '/profile') return 'Account & settings';
  if (pathname === '/study-buddies') return 'Study Buddy';
  if (pathname === '/news') return 'Facts & Fun';
  if (pathname === '/daily-words') return 'Words of the day';
  if (pathname === '/expressions') return 'Daily expressions';
  if (pathname === '/education-news') return 'Education News';
  if (pathname.startsWith('/education-news/read')) return 'Reading story';
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
  const headerBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const borderColor = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const brandColor = useColorModeValue(adminColors.brand.light, adminColors.brand.dark);
  const muted = useColorModeValue('gray.500', 'gray.400');
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
            <HStack spacing={3} minW={0} zIndex={1} flex={{ base: 1, lg: 'none' }}>
              {showMenuButton && onMenuOpen && (
                <IconButton
                  aria-label="Open menu"
                  icon={<FiMenu size={18} />}
                  onClick={onMenuOpen}
                  variant="ghost"
                  size="sm"
                  flexShrink={0}
                />
              )}

              {showSidebarToggle && onSidebarToggle && (
                <IconButton
                  aria-label={sidebarVisible ? 'Hide navigation' : 'Show navigation'}
                  icon={sidebarVisible ? <FiChevronLeft size={18} /> : <FiMenu size={18} />}
                  onClick={onSidebarToggle}
                  variant="ghost"
                  size="sm"
                  flexShrink={0}
                />
              )}

              <Box minW={0} display={{ base: showMenuButton ? 'none' : 'block', sm: 'block' }}>
                <Heading size="sm" color={brandColor} fontWeight="700" letterSpacing="-0.02em" noOfLines={1}>
                  {APP_CONSTANTS.BRAND_NAME}
                </Heading>
                <Text fontSize="xs" color={muted} display={{ base: 'none', sm: 'block' }} noOfLines={1}>
                  Learning portal
                </Text>
              </Box>
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
                display={{ base: 'none', lg: 'flex' }}
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
