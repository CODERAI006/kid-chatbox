/**
 * Mobile bottom navigation — Home, AI Study, AI Quiz, and My Schedules.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  HStack,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { useStudyPlanPendingToday } from '@/hooks/useStudyPlanPendingToday';
import { getUserId, isAppAdmin } from '@/utils/userAccess';

interface MobileBottomNavProps {
  user?: User | null;
}

type NavItem = {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
  match: (pathname: string, hash: string) => boolean;
  isVisible: (ctx: NavContext) => boolean;
  isDisabled: (ctx: NavContext) => boolean;
};

type NavContext = {
  canShowAiStudy: boolean;
  canShowAiQuiz: boolean;
  hasStudyAccess: boolean;
  hasQuizAccess: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Home',
    shortLabel: 'Home',
    icon: '🏠',
    match: (pathname) => pathname === '/dashboard',
    isVisible: () => true,
    isDisabled: () => false,
  },
  {
    path: '/study#ai-study',
    label: 'AI Study',
    shortLabel: 'Study',
    icon: '🤖',
    match: (pathname, hash) => pathname === '/study' && hash === '#ai-study',
    isVisible: (ctx) => ctx.canShowAiStudy,
    isDisabled: (ctx) => !ctx.hasStudyAccess,
  },
  {
    path: '/quiz#ai-quiz',
    label: 'AI Quiz',
    shortLabel: 'Quiz',
    icon: '✨',
    match: (pathname, hash) => pathname === '/quiz' && hash === '#ai-quiz',
    isVisible: (ctx) => ctx.canShowAiQuiz,
    isDisabled: (ctx) => !ctx.hasQuizAccess,
  },
  {
    path: '/my-schedules',
    label: 'My Schedules',
    shortLabel: 'Schedule',
    icon: '📅',
    match: (pathname) => pathname === '/my-schedules',
    isVisible: () => true,
    isDisabled: () => false,
  },
];

export const MOBILE_BOTTOM_NAV_HEIGHT = '4.5rem';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [access, setAccess] = useState<{ roles?: string[]; moduleAccess?: Record<string, boolean> } | null>(null);

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const activeColor = useColorModeValue('blue.600', 'blue.300');
  const inactiveColor = useColorModeValue('gray.600', 'gray.400');
  const disabledColor = useColorModeValue('gray.400', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const schedulePendingToday = useStudyPlanPendingToday();
  const { showAiStudy, showAiQuiz } = usePlanAiFlags(getUserId(user as Record<string, unknown> | null));
  const isAdmin = isAppAdmin(user as Record<string, unknown> | null);
  const ctx: NavContext = {
    canShowAiStudy: showAiStudy || isAdmin,
    canShowAiQuiz: showAiQuiz || isAdmin,
    hasStudyAccess: isAdmin || access?.moduleAccess?.study === true,
    hasQuizAccess: isAdmin || access?.moduleAccess?.quiz === true,
  };

  useEffect(() => {
    authApi.fetchCurrentUser()
      .then(({ user: currentUser }) => setAccess(currentUser as typeof access))
      .catch(() => setAccess(null));
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => item.isVisible(ctx));

  return (
    <Box
      as="nav"
      aria-label="Mobile navigation"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={1400}
      bg={bg}
      borderTopWidth="1px"
      borderColor={borderColor}
      boxShadow="0 -2px 10px rgba(0,0,0,0.06)"
      pb="env(safe-area-inset-bottom, 0px)"
      display={{ base: 'block', md: 'none' }}
    >
      <HStack justify="space-around" align="stretch" h={MOBILE_BOTTOM_NAV_HEIGHT} px={1}>
        {visibleItems.map((item) => {
          const disabled = item.isDisabled(ctx);
          const active = !disabled && item.match(location.pathname, location.hash);

          return (
            <Box
              key={item.path}
              as="button"
              type="button"
              flex={1}
              minW={0}
              py={2}
              px={1}
              onClick={() => !disabled && navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              opacity={disabled ? 0.45 : 1}
              cursor={disabled ? 'not-allowed' : 'pointer'}
              _hover={disabled ? {} : { bg: hoverBg }}
              transition="background 0.15s"
            >
              <VStack spacing={0.5} justify="center" h="100%" position="relative">
                <Text fontSize="lg" lineHeight={1} aria-hidden>
                  {item.icon}
                </Text>
                {item.path === '/my-schedules' && schedulePendingToday && (
                  <Box
                    position="absolute"
                    top={0}
                    right="18%"
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="orange.400"
                    border="2px solid"
                    borderColor={bg}
                    title="Lesson scheduled for today"
                  />
                )}
                <Text
                  fontSize="2xs"
                  fontWeight={active ? 'bold' : 'medium'}
                  color={disabled ? disabledColor : active ? activeColor : inactiveColor}
                  noOfLines={1}
                  w="100%"
                  textAlign="center"
                >
                  {item.shortLabel}
                </Text>
              </VStack>
            </Box>
          );
        })}
      </HStack>
    </Box>
  );
};
