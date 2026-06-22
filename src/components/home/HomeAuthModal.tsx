/**
 * Auth modal for the landing page (login / register tabs).
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
} from '@/shared/design-system';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

interface HomeAuthModalProps {
  isOpen: boolean;
  activeTab: number;
  authError: string | null;
  onClose: () => void;
  onTabChange: (index: number) => void;
  onLoginSuccess: () => void;
  onRegisterSuccess: () => void;
  onSwitchToRegister: () => void;
  onSwitchToLogin: () => void;
  onError: (msg: string | null) => void;
}

const tabStyle = {
  color: 'rgba(255, 255, 255, 0.7)',
  _selected: {
    color: '#00f2ff',
    borderBottom: '2px solid #00f2ff',
    fontWeight: 'bold',
  },
  _hover: { color: '#00f2ff', opacity: 0.8 },
  fontSize: { base: 'sm' as const, md: 'lg' as const },
  px: { base: 4, md: 6 },
  transition: 'all 0.3s',
};

const AuthErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <AnimatePresence mode="wait">
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <Alert
        status="error"
        borderRadius="md"
        mb={4}
        fontSize={{ base: 'xs', md: 'sm' }}
        bg="rgba(255, 0, 0, 0.1)"
        border="1px solid"
        borderColor="rgba(255, 0, 0, 0.3)"
        color="white"
      >
        <AlertIcon />
        {message}
      </Alert>
    </motion.div>
  </AnimatePresence>
);

export const HomeAuthModal: React.FC<HomeAuthModalProps> = ({
  isOpen,
  activeTab,
  authError,
  onClose,
  onTabChange,
  onLoginSuccess,
  onRegisterSuccess,
  onSwitchToRegister,
  onSwitchToLogin,
  onError,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'lg' }} isCentered>
    <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
    <ModalContent
      bg="rgba(5, 5, 16, 0.95)"
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor="rgba(255, 255, 255, 0.1)"
      borderRadius="2xl"
      overflow="hidden"
      boxShadow="0 20px 60px rgba(0, 242, 255, 0.2)"
    >
      <ModalCloseButton
        color="white"
        onClick={onClose}
        zIndex={10}
        _hover={{ color: '#00f2ff', bg: 'rgba(0, 242, 255, 0.1)' }}
      />
      <ModalBody p={0}>
        <Tabs index={activeTab} onChange={onTabChange}>
          <Box
            bg="rgba(255, 255, 255, 0.05)"
            borderBottom="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            px={6}
            py={4}
          >
            <TabList borderBottom="none">
              <Tab {...tabStyle}>Login 👋</Tab>
              <Tab {...tabStyle}>Sign Up 🎉</Tab>
            </TabList>
          </Box>

          <TabPanels>
            <TabPanel px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }} bg="transparent">
              {authError && <AuthErrorAlert message={authError} />}
              <LoginForm
                onLoginSuccess={onLoginSuccess}
                onSwitchToRegister={onSwitchToRegister}
                onError={onError}
              />
            </TabPanel>
            <TabPanel px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }} bg="transparent">
              {authError && <AuthErrorAlert message={authError} />}
              <RegisterForm
                onRegisterSuccess={onRegisterSuccess}
                onSwitchToLogin={onSwitchToLogin}
                onError={onError}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalBody>
    </ModalContent>
  </Modal>
);
