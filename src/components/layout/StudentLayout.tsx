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
import { StudentHeader } from './StudentHeader';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { TabletFooterBar } from './TabletFooterBar';
import { COMPACT_FOOTER_HEIGHT, MOBILE_BOTTOM_NAV_HEIGHT } from './layoutHeights';
import { StudentSidebar } from './StudentSidebar';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';
import { AppFeedbackModal } from '@/components/feedback/AppFeedbackModal';
import { AppInstallModal } from '@/components/layout/AppInstallModal';
import { useStudyPlanNotifications } from '@/hooks/useStudyPlanNotifications';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { User } from '@/types';

interface StudentLayoutProps {
  children: ReactNode;
  user?: User | null;
  showHeader?: boolean;
  showFooter?: boolean;
}

const WIDE_VIEW_PATHS = new Set(['/past-chats', '/my-schedules']);

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
  const isCompactLayout = useBreakpointValue({ base: true, lg: false });
  const tabletFooterBreakpoint = useBreakpointValue({ base: false, md: true, lg: false });
  const fullFooterBreakpoint = useBreakpointValue({ base: false, lg: true });
  const showTabletFooter = showFooter && tabletFooterBreakpoint;
  const showFullFooter = showFooter && fullFooterBreakpoint;
  const isWideView = isStudentWideView(location.pathname, location.hash);
  const [sidebarVisible, setSidebarVisible] = useState(() => !isWideView);
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const hintColor = useColorModeValue('gray.500', 'gray.400');

  useStudyPlanNotifications({ enabled: Boolean(user) });
  useInAppNotifications({ enabled: Boolean(user) });

  useEffect(() => {
    if (!isCompactLayout) {
      setSidebarVisible(!isStudentWideView(location.pathname, location.hash));
    }
  }, [location.pathname, location.hash, isCompactLayout]);

  return (
    <Box minHeight="100vh" bg={bgColor}>
      {showHeader && (
        <Box position="sticky" top={0} zIndex={1000}>
          <StudentHeader
            user={user}
            onMenuOpen={onOpen}
            showMenuButton={isCompactLayout}
            showSidebarToggle={!isCompactLayout}
            sidebarVisible={sidebarVisible}
            onSidebarToggle={() => setSidebarVisible((visible) => !visible)}
          />
        </Box>
      )}

      <HStack align="start" spacing={0}>
        {!isCompactLayout && sidebarVisible && <StudentSidebar user={user || null} />}

        {isCompactLayout && <StudentSidebar user={user || null} isOpen={isOpen} onClose={onClose} />}

        <Box
          flex={1}
          minH="calc(100vh - 73px)"
          py={{ base: 2, md: 4, lg: 6 }}
          pb={{
            base: `calc(${MOBILE_BOTTOM_NAV_HEIGHT} + env(safe-area-inset-bottom, 0px) + 0.5rem)`,
            md: `calc(${MOBILE_BOTTOM_NAV_HEIGHT} + ${COMPACT_FOOTER_HEIGHT} + env(safe-area-inset-bottom, 0px) + 0.5rem)`,
            lg: undefined,
          }}
          px={{ base: 0, md: 0 }}
          width="100%"
          overflowX="hidden"
        >
          {!isCompactLayout && isWideView && !sidebarVisible && (
            <Text fontSize="xs" color={hintColor} mb={2} px={{ base: 4, md: 6 }}>
              Sidebar hidden for table view — use the menu toggle to show navigation.
            </Text>
          )}
          {children}
        </Box>
      </HStack>

      {showFullFooter && <Footer />}

      {showTabletFooter && <TabletFooterBar />}

      {isCompactLayout && <MobileBottomNav user={user} />}

      <LearningChatWidget />
      <AppFeedbackModal />
      <AppInstallModal />
    </Box>
  );
};
