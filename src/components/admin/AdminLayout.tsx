/**
 * Admin Layout — shell with navigation for admin pages.
 */

import { type FC, type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  HStack,
  Text,
  Heading,
  Button,
  useBreakpointValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  useDisclosure,
  useColorModeValue,
} from '@/shared/design-system';
import { FiMenu, FiChevronLeft } from 'react-icons/fi';
import { UpcomingTestsMarquee } from './UpcomingTestsMarquee';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { adminColors } from './adminTokens';
import {
  APP_NAV_ITEMS,
  ADMIN_TABLE_VIEW_PATHS,
  isNavItemActive,
  resolveAdminNavPath,
} from '@/constants/navigation';
import { SidebarNavList } from '@/components/layout/SidebarNavList';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTableView = ADMIN_TABLE_VIEW_PATHS.has(location.pathname);
  const [sidebarVisible, setSidebarVisible] = useState(() => !isTableView);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useInAppNotifications({ enabled: true });

  useEffect(() => {
    if (!isMobile) {
      setSidebarVisible(!ADMIN_TABLE_VIEW_PATHS.has(location.pathname));
    }
  }, [location.pathname, isMobile]);

  const bgColor = useColorModeValue(adminColors.pageBg.light, adminColors.pageBg.dark);
  const headerBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const headerBorder = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const sidebarBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const sidebarBorder = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const brandColor = useColorModeValue(adminColors.brand.light, adminColors.brand.dark);
  const navText = useColorModeValue('gray.600', 'gray.300');

  const sidebarContent = (
    <SidebarNavList
      items={APP_NAV_ITEMS.map((item) => {
        const path = resolveAdminNavPath(item);
        return {
          key: item.adminPath,
          label: item.label,
          icon: item.icon,
          path,
          isActive: isNavItemActive(location.pathname, location.hash, path),
        };
      })}
      onNavigate={(path) => {
        navigate(path);
        if (isMobile) onClose();
      }}
    />
  );

  return (
    <Box minH="100vh" bg={bgColor} fontFamily="body">
      <Box bg={headerBg} borderBottom="1px" borderColor={headerBorder} boxShadow="sm">
        <Box px={{ base: 4, md: 6 }} py={{ base: 3, md: 3.5 }}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              {isMobile ? (
                <IconButton
                  aria-label="Open menu"
                  icon={<FiMenu size={18} />}
                  onClick={onOpen}
                  variant="ghost"
                  size="sm"
                />
              ) : (
                <IconButton
                  aria-label={sidebarVisible ? 'Hide navigation' : 'Show navigation'}
                  icon={sidebarVisible ? <FiChevronLeft size={18} /> : <FiMenu size={18} />}
                  onClick={() => setSidebarVisible((visible) => !visible)}
                  variant="ghost"
                  size="sm"
                />
              )}
              <Box>
                <Heading size="sm" color={brandColor} fontWeight="700" letterSpacing="-0.02em">
                  Admin Portal
                </Heading>
                <Text fontSize="xs" color={navText} display={{ base: 'none', sm: 'block' }}>
                  Guru AI management
                </Text>
              </Box>
            </HStack>
            <HStack spacing={2}>
              <NotificationBell enabled />
              <Button size="sm" variant="outline" colorScheme="blue" onClick={() => navigate('/')}>
                Back to App
              </Button>
            </HStack>
          </HStack>
        </Box>
        <UpcomingTestsMarquee />
      </Box>

      <HStack align="start" spacing={0}>
        {!isMobile && sidebarVisible && (
          <Box
            w="240px"
            flexShrink={0}
            bg={sidebarBg}
            minH="calc(100vh - 73px)"
            borderRight="1px"
            borderColor={sidebarBorder}
            py={4}
          >
            {sidebarContent}
          </Box>
        )}

        {isMobile && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader fontWeight="semibold">Navigation</DrawerHeader>
              <DrawerBody px={2}>{sidebarContent}</DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        <Box flex={1} minW={0} p={{ base: 4, md: 6 }}>
          {!isMobile && isTableView && !sidebarVisible && (
            <Text fontSize="xs" color="gray.500" mb={3}>
              Sidebar hidden for table view — use the menu toggle to show navigation.
            </Text>
          )}
          {children}
        </Box>
      </HStack>

      <LearningChatWidget />
    </Box>
  );
};
