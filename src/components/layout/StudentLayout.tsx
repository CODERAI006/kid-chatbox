/**
 * Student Layout Component
 * Layout with sidebar navigation for student users
 */

import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  HStack,
  Text,
  useBreakpointValue,
  useDisclosure,
  useColorModeValue,
} from '@/shared/design-system';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav, MOBILE_BOTTOM_NAV_HEIGHT } from './MobileBottomNav';
import { StudentSidebar } from './StudentSidebar';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';
import { User } from '@/types';

interface StudentLayoutProps {
  children: ReactNode;
  user?: User | null;
  showHeader?: boolean;
  showFooter?: boolean;
}

const WIDE_VIEW_PATHS = new Set(['/quiz-rankings']);

function isStudentWideView(pathname: string, hash: string): boolean {
  if (WIDE_VIEW_PATHS.has(pathname)) return true;
  if (pathname === '/quiz' && ['#history', '#library', '#scheduled'].includes(hash)) return true;
  if (pathname === '/study' && hash === '#history') return true;
  return false;
}

/**
 * Student Layout with sidebar navigation
 */
export const StudentLayout: React.FC<StudentLayoutProps> = ({
  children,
  user,
  showHeader = true,
  showFooter = true,
}) => {
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isWideView = isStudentWideView(location.pathname, location.hash);
  const [sidebarVisible, setSidebarVisible] = useState(() => !isWideView);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const hintColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    if (!isMobile) {
      setSidebarVisible(!isStudentWideView(location.pathname, location.hash));
    }
  }, [location.pathname, location.hash, isMobile]);

  return (
    <Box minHeight="100vh" bg={bgColor}>
      {showHeader && (
        <Box position="sticky" top={0} zIndex={1000}>
          <Header
            user={user}
            onMenuOpen={onOpen}
            showMenuButton={isMobile}
            showSidebarToggle={!isMobile}
            sidebarVisible={sidebarVisible}
            onSidebarToggle={() => setSidebarVisible((visible) => !visible)}
          />
        </Box>
      )}

      <HStack align="start" spacing={0}>
        {!isMobile && sidebarVisible && <StudentSidebar user={user || null} />}

        {isMobile && <StudentSidebar user={user || null} isOpen={isOpen} onClose={onClose} />}

        <Box
          flex={1}
          minH="calc(100vh - 73px)"
          py={{ base: 2, md: 4, lg: 6 }}
          pb={{
            base: `calc(${MOBILE_BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px) + 0.5rem)`,
            md: undefined,
          }}
          px={{ base: 0, md: 0 }}
          width="100%"
          overflowX="hidden"
        >
          {!isMobile && isWideView && !sidebarVisible && (
            <Text fontSize="xs" color={hintColor} mb={2} px={{ base: 4, md: 6 }}>
              Sidebar hidden for more space — use ☰ in the header to show navigation.
            </Text>
          )}
          {children}
        </Box>
      </HStack>

      {showFooter && (
        <Box display={{ base: 'none', md: 'block' }}>
          <Footer />
        </Box>
      )}

      {isMobile && <MobileBottomNav user={user} />}

      <LearningChatWidget />
    </Box>
  );
};
