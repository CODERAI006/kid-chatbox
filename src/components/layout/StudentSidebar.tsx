/**
 * Student Sidebar Navigation Component
 * Side navigation for student users with all links
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  Badge,
  Avatar,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useBreakpointValue,
} from '@/shared/design-system';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { getUserId, isAppAdmin } from '@/utils/userAccess';
import { openAppFeedback } from '@/components/feedback/feedbackEvents';

interface StudentSidebarProps {
  user: User | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/quiz', label: 'Quiz Hub', icon: '🎯' },
  { path: '/quiz-rankings', label: 'Quiz Rankings', icon: '🏆' },
  { path: '/study', label: 'Study Hub', icon: '📚' },
  { path: '/past-chats', label: 'Past Chats', icon: '💬' },
  { path: '/my-schedules', label: 'My Schedules', icon: '📅' },
  { path: '/news', label: 'Facts & Fun', icon: '💡' },
  { path: '/study-buddies', label: 'Study Buddy', icon: '👫' },
  { path: '/profile', label: 'My Profile', icon: '👤' },
];

const aiNavItems = [
  { path: '/study#ai-study', label: 'AI Study Mode', icon: '🤖', flag: 'study' as const },
  { path: '/quiz#ai-quiz', label: 'AI Quiz Mode', icon: '✨', flag: 'quiz' as const },
];

/**
 * Student Sidebar Navigation component
 */
export const StudentSidebar: React.FC<StudentSidebarProps> = ({ user, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userWithAccess, setUserWithAccess] = useState<{
    roles?: string[];
    moduleAccess?: Record<string, boolean>;
    status?: string;
  } | null>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    loadUserAccess();
  }, []);

  const loadUserAccess = async () => {
    try {
      const { user: currentUser } = await authApi.fetchCurrentUser();
      setUserWithAccess(currentUser as typeof userWithAccess);
    } catch (error) {
      console.error('Failed to load user access:', error);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 0);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isAdmin = userWithAccess?.roles?.includes('admin') || false;
  const { showAiStudy, showAiQuiz } = usePlanAiFlags(getUserId(user as Record<string, unknown> | null));
  const canShowAiStudy = showAiStudy || isAppAdmin(user as Record<string, unknown> | null);
  const canShowAiQuiz = showAiQuiz || isAppAdmin(user as Record<string, unknown> | null);
  const hasStudyAccess =
    isAdmin || userWithAccess?.moduleAccess?.study === true || false;
  const hasQuizAccess =
    isAdmin || userWithAccess?.moduleAccess?.quiz === true || false;

  const renderNavItem = (item: (typeof navItems)[0]) => {
    const isActive =
      location.pathname === item.path ||
      (item.path === '/study' && location.pathname.startsWith('/study')) ||
      (item.path === '/quiz' && location.pathname.startsWith('/quiz'));
    const isDisabled =
      (item.path === '/study' && !hasStudyAccess) ||
      (item.path === '/quiz' && !hasQuizAccess);

    return (
      <Button
        key={item.path}
        w="100%"
        justifyContent="flex-start"
        leftIcon={<Text fontSize={{ base: 'md', md: 'lg' }}>{item.icon}</Text>}
        variant={isActive ? 'solid' : 'ghost'}
        colorScheme={isActive ? 'blue' : 'gray'}
        onClick={() => !isDisabled && handleNavigate(item.path)}
        isDisabled={isDisabled}
        opacity={isDisabled ? 0.5 : 1}
        position="relative"
        _hover={!isDisabled ? { bg: isActive ? 'blue.600' : 'gray.100' } : {}}
        transition="all 0.2s"
      >
        <HStack justify="space-between" w="100%">
          <Text fontWeight={isActive ? 'bold' : 'normal'}>{item.label}</Text>
          {isDisabled && (
            <Badge colorScheme="orange" fontSize="xs" ml={2}>
              Locked
            </Badge>
          )}
        </HStack>
      </Button>
    );
  };

  const sidebarContent = (
    <VStack
      h="100%"
      align="stretch"
      spacing={4}
      p={4}
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Box>
        <Box
          as="button"
          type="button"
          w="100%"
          textAlign="left"
          p={2}
          mb={2}
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: 'gray.50' }}
          onClick={() => handleNavigate('/profile')}
        >
          <HStack spacing={3}>
            <Avatar size="md" name={user?.name || 'User'} />
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                {user?.name || 'Student'}
              </Text>
              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                {user?.email || ''}
              </Text>
              <Text fontSize="xs" color="blue.600" fontWeight="medium" mt={1}>
                View profile →
              </Text>
              {userWithAccess?.status === 'pending' && (
                <Badge colorScheme="orange" size="sm" mt={1}>
                  Pending
                </Badge>
              )}
            </VStack>
          </HStack>
        </Box>
        <Divider />
      </Box>

      {/* Navigation Items */}
      <VStack align="stretch" spacing={2} flex={1} overflowY="auto">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" px={2} textTransform="uppercase">
          Navigation
        </Text>
        {navItems.map((item) => renderNavItem(item))}

        {(canShowAiStudy || canShowAiQuiz) && (
          <>
            <Text fontSize="xs" fontWeight="bold" color="gray.500" px={2} pt={2} textTransform="uppercase">
              AI Modes
            </Text>
            {aiNavItems.map((item) => {
              if (item.flag === 'study' && !canShowAiStudy) return null;
              if (item.flag === 'quiz' && !canShowAiQuiz) return null;
              const [basePath, hash = ''] = item.path.split('#');
              const isActive =
                location.pathname === basePath &&
                (hash ? location.hash === `#${hash}` : !location.hash);
              return (
                <Button
                  key={item.path}
                  w="100%"
                  justifyContent="flex-start"
                  leftIcon={<Text fontSize={{ base: 'md', md: 'lg' }}>{item.icon}</Text>}
                  variant={isActive ? 'solid' : 'ghost'}
                  colorScheme={isActive ? 'purple' : 'gray'}
                  onClick={() => handleNavigate(item.path)}
                  size={{ base: 'sm', md: 'md' }}
                >
                  <Text fontWeight={isActive ? 'bold' : 'normal'}>{item.label}</Text>
                </Button>
              );
            })}
          </>
        )}
      </VStack>

      {/* Admin Link (if admin) */}
      {isAdmin && (
        <>
          <Divider />
          <Button
            w="100%"
            justifyContent="flex-start"
            leftIcon={<Text fontSize="lg">⚙️</Text>}
            variant="ghost"
            colorScheme="purple"
            onClick={() => handleNavigate('/admin')}
          >
            Admin Portal
          </Button>
        </>
      )}

      <Box>
        <Divider mb={4} />
        <Button
          w="100%"
          justifyContent="flex-start"
          leftIcon={<Text fontSize={{ base: 'md', md: 'lg' }}>💡</Text>}
          variant="ghost"
          colorScheme="purple"
          onClick={() => {
            openAppFeedback({ source: 'sidebar' });
            if (isMobile && onClose) onClose();
          }}
          size={{ base: 'sm', md: 'md' }}
          mb={2}
        >
          <Text fontWeight="medium">App Feedback</Text>
        </Button>
        <Button
          w="100%"
          justifyContent="flex-start"
          variant="ghost"
          colorScheme="red"
          leftIcon={<Text fontSize={{ base: 'md', md: 'lg' }}>🚪</Text>}
          onClick={() => {
            if (window.confirm('Log out of your account?')) {
              handleLogout();
            }
          }}
          size={{ base: 'sm', md: 'md' }}
        >
          <Text fontWeight="medium">Logout</Text>
        </Button>
      </Box>
    </VStack>
  );

  if (isMobile) {
    return (
      <Drawer isOpen={isOpen || false} placement="left" onClose={onClose || (() => {})}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Navigation</DrawerHeader>
          <DrawerBody p={0}>{sidebarContent}</DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Box
      w="250px"
      minH="calc(100vh - 73px)"
      position="sticky"
      top="73px"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
    >
      {sidebarContent}
    </Box>
  );
};

