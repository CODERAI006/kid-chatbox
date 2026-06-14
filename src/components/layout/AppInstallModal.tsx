/**
 * Mobile app install modal — native Android prompt or iOS / manual install steps.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Text,
  VStack,
  List,
  ListItem,
  useDisclosure,
  useToast,
} from '@/shared/design-system';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { APP_INSTALL_OPEN_EVENT } from './appInstallEvents';

export const AppInstallModal: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { platform, hasNativePrompt, promptInstall } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    window.addEventListener(APP_INSTALL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(APP_INSTALL_OPEN_EVENT, onOpen);
  }, [onOpen]);

  const handleNativeInstall = useCallback(async () => {
    setIsInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast({ title: 'App installed', status: 'success', duration: 3000, isClosable: true });
        onClose();
      }
    } finally {
      setIsInstalling(false);
    }
  }, [onClose, promptInstall, toast]);

  const isIos = platform === 'ios';
  const title = isIos ? 'Install on iPhone / iPad' : 'Install Guru AI';

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="2xl" mx={4}>
        <ModalHeader>
          <Text fontSize="lg" fontWeight="bold">
            📲 {title}
          </Text>
          <Text fontSize="sm" fontWeight="normal" color="gray.600">
            Add Guru AI to your home screen for quick access
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={2}>
          {isIos ? (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Safari does not show a one-tap install button. Follow these steps:
              </Text>
              <List spacing={2} fontSize="sm" pl={4} styleType="decimal">
                <ListItem>Tap the <strong>Share</strong> button in Safari (square with arrow up).</ListItem>
                <ListItem>Scroll and tap <strong>Add to Home Screen</strong>.</ListItem>
                <ListItem>Tap <strong>Add</strong> in the top-right corner.</ListItem>
              </List>
            </VStack>
          ) : hasNativePrompt ? (
            <Text fontSize="sm" color="gray.600">
              Install the app on your device for a full-screen experience without the browser bar.
            </Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Use your browser menu to install this app:
              </Text>
              <List spacing={2} fontSize="sm" pl={4} styleType="decimal">
                <ListItem>Open the browser menu (⋮).</ListItem>
                <ListItem>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</ListItem>
                <ListItem>Confirm to add Guru AI to your home screen.</ListItem>
              </List>
            </VStack>
          )}
        </ModalBody>
        {!isIos && hasNativePrompt && (
          <ModalFooter>
            <Button
              colorScheme="purple"
              w="100%"
              onClick={() => void handleNativeInstall()}
              isLoading={isInstalling}
              loadingText="Installing…"
            >
              Install now
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};
