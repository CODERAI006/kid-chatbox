/**
 * Admin Layout Component
 * Layout wrapper for admin pages with navigation
 */

import { ReactNode } from 'react';
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
import { motion } from 'framer-motion';
import { UpcomingTestsMarquee } from './UpcomingTestsMarquee';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/plans', label: 'Plans', icon: '💳' },
  { path: '/admin/topics', label: 'Topics', icon: '📚' },
  { path: '/admin/quizzes', label: 'Quizzes', icon: '📝' },
  { path: '/admin/quiz-history', label: 'Quiz History', icon: '📋' },
  { path: '/admin/study-library-content', label: 'Study Library', icon: '📖' },
  { path: '/admin/quiz-scheduler', label: 'Quiz Scheduler', icon: '⏰' },
  { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

/**
 * Admin Layout component
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const headerBg = useColorModeValue('white', 'gray.800');
  const headerBorder = useColorModeValue('gray.200', 'gray.700');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const sidebarBorder = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('blue.600', 'blue.400');

  const sidebarContent = (
    <VStack align="stretch" spacing={2}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <motion.div
            key={item.path}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              w="100%"
              justifyContent="flex-start"
              leftIcon={<Text>{item.icon}</Text>}
              variant={isActive ? 'solid' : 'ghost'}
              colorScheme={isActive ? 'blue' : 'gray'}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  onClose();
                }
              }}
              size={{ base: 'sm', md: 'md' }}
            >
              {item.label}
            </Button>
          </motion.div>
        );
      })}
    </VStack>
  );

  return (
    <Box minH="100vh" bg={bgColor}>
      <Box bg={headerBg} borderBottom="1px" borderColor={headerBorder}>
        <Box px={{ base: 4, md: 6 }} py={{ base: 3, md: 4 }}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              {isMobile && (
                <IconButton
                  aria-label="Open menu"
                  icon={<Text>☰</Text>}
                  onClick={onOpen}
                  variant="ghost"
                  size="sm"
                />
              )}
              <Heading size={{ base: 'sm', md: 'md' }} color={headingColor}>
                Admin Portal
              </Heading>
            </HStack>
            <Button size={{ base: 'xs', md: 'sm' }} variant="ghost" onClick={() => navigate('/')}>
              <Text display={{ base: 'none', sm: 'block' }}>Back to App</Text>
              <Text display={{ base: 'block', sm: 'none' }}>Back</Text>
            </Button>
          </HStack>
        </Box>
        <UpcomingTestsMarquee />
      </Box>

      <HStack align="start" spacing={0}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Box
            w="250px"
            bg={sidebarBg}
            minH="calc(100vh - 73px)"
            borderRight="1px"
            borderColor={sidebarBorder}
            p={4}
          >
            {sidebarContent}
          </Box>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader>Admin Navigation</DrawerHeader>
              <DrawerBody p={0}>{sidebarContent}</DrawerBody>
            </DrawerContent>
          </Drawer>
        )}

        <Box flex={1} p={{ base: 4, md: 6 }}>
          {children}
        </Box>
      </HStack>

      <LearningChatWidget />
    </Box>
  );
};

