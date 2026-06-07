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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  { path: '/news', label: 'Education News', icon: '📰' },
  { path: '/profile', label: 'My Profile', icon: '👤' },
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
      {/* User Info Section */}
      <Box>
        <HStack spacing={3} mb={4}>
          <Avatar size="md" name={user?.name || 'User'} />
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
              {user?.name || 'Student'}
            </Text>
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {user?.email || ''}
            </Text>
            {userWithAccess?.status === 'pending' && (
              <Badge colorScheme="orange" size="sm" mt={1}>
                Pending
              </Badge>
            )}
          </VStack>
        </HStack>
        <Divider />
      </Box>

      {/* Navigation Items */}
      <VStack align="stretch" spacing={2} flex={1} overflowY="auto">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" px={2} textTransform="uppercase">
          Navigation
        </Text>
        {navItems.map((item) => renderNavItem(item))}
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

      {/* Logout */}
      <Box>
        <Divider mb={4} />
        <Menu>
          <MenuButton
            as={Button}
            w="100%"
            variant="ghost"
            colorScheme="red"
            leftIcon={<Text>🚪</Text>}
          >
            Logout
          </MenuButton>
          <MenuList>
            <MenuItem onClick={handleLogout} color="red.600">
              Confirm Logout
            </MenuItem>
          </MenuList>
        </Menu>
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

