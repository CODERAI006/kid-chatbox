/**
 * Admin Layout — shell with navigation for admin pages.
 */

import { type FC, type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  VStack,
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
import {
  FiGrid,
  FiUsers,
  FiCreditCard,
  FiBook,
  FiFileText,
  FiClipboard,
  FiBookOpen,
  FiClock,
  FiBarChart2,
  FiCloud,
  FiSun,
  FiMenu,
  FiChevronLeft,
} from 'react-icons/fi';
import { UpcomingTestsMarquee } from './UpcomingTestsMarquee';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';
import { adminColors } from './adminTokens';

interface AdminLayoutProps {
  children: ReactNode;
}

const TABLE_VIEW_PATHS = new Set([
  '/admin/users',
  '/admin/plans',
  '/admin/topics',
  '/admin/quizzes',
  '/admin/quiz-history',
  '/admin/study-library-content',
  '/admin/quiz-scheduler',
  '/admin/analytics',
  '/admin/word-of-day',
]);

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/users', label: 'Users', icon: FiUsers },
  { path: '/admin/plans', label: 'Plans', icon: FiCreditCard },
  { path: '/admin/topics', label: 'Topics', icon: FiBook },
  { path: '/admin/quizzes', label: 'Quizzes', icon: FiFileText },
  { path: '/admin/quiz-history', label: 'Quiz History', icon: FiClipboard },
  { path: '/admin/study-library-content', label: 'Study Library', icon: FiBookOpen },
  { path: '/admin/quiz-scheduler', label: 'Quiz Scheduler', icon: FiClock },
  { path: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
  { path: '/admin/ollama-cloud', label: 'Ollama Cloud', icon: FiCloud },
  { path: '/admin/word-of-day', label: 'Word of Day', icon: FiSun },
];

export const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTableView = TABLE_VIEW_PATHS.has(location.pathname);
  const [sidebarVisible, setSidebarVisible] = useState(() => !isTableView);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!isMobile) {
      setSidebarVisible(!TABLE_VIEW_PATHS.has(location.pathname));
    }
  }, [location.pathname, isMobile]);

  const bgColor = useColorModeValue(adminColors.pageBg.light, adminColors.pageBg.dark);
  const headerBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const headerBorder = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const sidebarBg = useColorModeValue(adminColors.surface.light, adminColors.surface.dark);
  const sidebarBorder = useColorModeValue(adminColors.border.light, adminColors.border.dark);
  const brandColor = useColorModeValue(adminColors.brand.light, adminColors.brand.dark);
  const navText = useColorModeValue('gray.600', 'gray.300');
  const navActiveBg = useColorModeValue(adminColors.brandMuted.light, 'blue.900');
  const navHoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const sidebarContent = (
    <VStack align="stretch" spacing={1} px={2}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Button
            key={item.path}
            w="100%"
            justifyContent="flex-start"
            leftIcon={<Icon size={16} />}
            variant="ghost"
            fontWeight={isActive ? 'semibold' : 'medium'}
            fontSize="sm"
            color={isActive ? brandColor : navText}
            bg={isActive ? navActiveBg : 'transparent'}
            _hover={{ bg: isActive ? navActiveBg : navHoverBg }}
            borderRadius="md"
            onClick={() => {
              navigate(item.path);
              if (isMobile) onClose();
            }}
            size={{ base: 'sm', md: 'md' }}
            h={{ base: 9, md: 10 }}
          >
            {item.label}
          </Button>
        );
      })}
    </VStack>
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
            <Button size="sm" variant="outline" colorScheme="blue" onClick={() => navigate('/')}>
              Back to App
            </Button>
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
