/**
 * Student Layout Component
 * Layout with sidebar navigation for student users
 */

import { ReactNode } from 'react';
import {
  Box,
  HStack,
  useBreakpointValue,
  useDisclosure,
  useColorModeValue,
} from '@/shared/design-system';
import { Header } from './Header';
import { Footer } from './Footer';
import { StudentSidebar } from './StudentSidebar';
import { LearningChatWidget } from '@/components/learning/LearningChatWidget';
import { User } from '@/types';

interface StudentLayoutProps {
  children: ReactNode;
  user?: User | null;
  showHeader?: boolean;
  showFooter?: boolean;
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box minHeight="100vh" bg={bgColor}>
      {showHeader && (
        <Box position="sticky" top={0} zIndex={1000}>
          <Header user={user} onMenuOpen={onOpen} showMenuButton={isMobile} />
        </Box>
      )}

      <HStack align="start" spacing={0}>
        {/* Sidebar - Desktop */}
        {!isMobile && <StudentSidebar user={user || null} />}

        {/* Sidebar - Mobile Drawer */}
        {isMobile && <StudentSidebar user={user || null} isOpen={isOpen} onClose={onClose} />}

        {/* Main Content */}
        <Box flex={1} minH="calc(100vh - 73px)" py={{ base: 2, md: 4, lg: 6 }} px={{ base: 0, md: 0 }} width="100%" overflowX="hidden">
          {children}
        </Box>
      </HStack>

      {showFooter && <Footer />}

      {user ? <LearningChatWidget /> : null}
    </Box>
  );
};

