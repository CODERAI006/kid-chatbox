/**
 * Student Sidebar Navigation — mirrors Admin Portal nav (labels, icons, styling).
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useBreakpointValue,
  useColorModeValue,
} from '@/shared/design-system';
import { FiLogOut } from 'react-icons/fi';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { adminColors } from '@/components/admin/adminTokens';
import {
  getVisibleNavItems,
  isNavItemActive,
  resolveConsumerNavPath,
} from '@/constants/navigation';
import { SidebarNavList } from '@/components/layout/SidebarNavList';
import { openAppFeedback } from '@/components/feedback/feedbackEvents';

interface StudentSidebarProps {
  user: User | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({ user, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const isMobile = useBreakpointValue({ base: true, lg: false });

  const sidebarBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const sidebarBorder = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const navText = useColorModeValue('gray.600', 'gray.300');
  const navHoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const nameColor = useColorModeValue('gray.800', 'gray.100');
  const muted = useColorModeValue('gray.500', 'gray.400');

  const copyBuddyId = useCallback(async () => {
    if (!user?.buddyId) return;
    try {
      await navigator.clipboard.writeText(user.buddyId);
    } catch {
      // Clipboard may be unavailable
    }
  }, [user?.buddyId]);

  useEffect(() => {
    authApi
      .fetchCurrentUser()
      .then(({ user: currentUser }) => {
        const profile = currentUser as { roles?: string[]; moduleAccess?: Record<string, boolean> };
        setIsAdmin(profile.roles?.includes('admin') ?? false);
        setModuleAccess(profile.moduleAccess ?? {});
      })
      .catch(() => {
        setIsAdmin(false);
        setModuleAccess({});
      });
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile && onClose) onClose();
  };

  const handleLogout = () => {
    if (!window.confirm('Log out of your account?')) return;
    authApi.logout();
    setTimeout(() => navigate('/login', { replace: true }), 0);
  };

  const navEntries = useMemo(() => {
    return getVisibleNavItems(isAdmin).map((item) => {
      const path = resolveConsumerNavPath(item, isAdmin);
      const moduleLocked =
        !isAdmin &&
        ((item.module === 'study' && moduleAccess.study !== true) ||
          (item.module === 'quiz' && moduleAccess.quiz !== true));

      return {
        key: item.adminPath,
        label: item.label,
        icon: item.icon,
        path,
        isActive: isNavItemActive(location.pathname, location.hash, path),
        isDisabled: moduleLocked,
        action: path ? undefined : item.action,
      };
    });
  }, [isAdmin, moduleAccess, location.pathname, location.hash]);

  const sidebarContent = (
    <VStack h="100%" align="stretch" spacing={0} py={4}>
      <Box flex={1} overflowY="auto">
        <SidebarNavList
          items={navEntries}
          onNavigate={handleNavigate}
          onAction={(action) => {
            if (action === 'feedback') {
              openAppFeedback({ source: 'sidebar' });
              if (isMobile && onClose) onClose();
            }
          }}
        />
      </Box>

      <Box px={2} pt={2}>
        <Divider mb={2} borderColor={sidebarBorder} />
        <Button
          w="100%"
          justifyContent="flex-start"
          leftIcon={<FiLogOut size={16} />}
          variant="ghost"
          fontWeight="medium"
          fontSize="sm"
          color={navText}
          _hover={{ bg: navHoverBg }}
          borderRadius="md"
          onClick={handleLogout}
          size={{ base: 'sm', md: 'md' }}
          h={{ base: 9, md: 10 }}
        >
          Logout
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
          <DrawerHeader borderBottomWidth="1px" borderColor={sidebarBorder} pb={4}>
            <VStack align="start" spacing={1} pr={8}>
              <Text fontWeight="semibold" fontSize="md" color={nameColor} noOfLines={2}>
                {user?.name?.trim() || 'Student'}
              </Text>
              {user?.buddyId && (
                <Text
                  fontSize="sm"
                  color="purple.600"
                  fontWeight="medium"
                  cursor="pointer"
                  onClick={() => void copyBuddyId()}
                  onKeyDown={(e) => e.key === 'Enter' && void copyBuddyId()}
                  role="button"
                  tabIndex={0}
                  aria-label={`Buddy ID ${user.buddyId}. Click to copy.`}
                  title="Click to copy Buddy ID"
                >
                  Buddy ID: {user.buddyId}
                </Text>
              )}
              {!user?.buddyId && (
                <Text fontSize="xs" color={muted}>
                  Buddy ID pending
                </Text>
              )}
            </VStack>
          </DrawerHeader>
          <DrawerBody p={0}>{sidebarContent}</DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Box
      w="240px"
      flexShrink={0}
      minH="calc(100vh - 73px)"
      position="sticky"
      top="73px"
      bg={sidebarBg}
      borderRight="1px"
      borderColor={sidebarBorder}
    >
      {sidebarContent}
    </Box>
  );
};
