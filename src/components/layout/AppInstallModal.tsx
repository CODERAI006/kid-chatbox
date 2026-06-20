/**
 * Install popup — primary Install button triggers native PWA install when supported.
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
  HStack,
  Image,
  List,
  ListItem,
  useDisclosure,
  useToast,
} from '@/shared/design-system';
import { FiDownload } from 'react-icons/fi';
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

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    try {
      if (hasNativePrompt) {
        const outcome = await promptInstall();
        if (outcome === 'accepted') {
          toast({
            title: 'App installed',
            description: 'Guru AI is on your home screen.',
            status: 'success',
            duration: 4000,
            isClosable: true,
          });
          onClose();
        }
        return;
      }

      if (platform === 'ios') {
        toast({
          title: 'Add to Home Screen',
          description: 'Tap Share (↑) in Safari, then choose Add to Home Screen.',
          status: 'info',
          duration: 6000,
          isClosable: true,
        });
        return;
      }

      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        toast({
          title: 'Install from browser menu',
          description: 'Open menu (⋮) → Install app or Add to Home screen.',
          status: 'info',
          duration: 6000,
          isClosable: true,
        });
      }
    } finally {
      setIsInstalling(false);
    }
  }, [hasNativePrompt, onClose, platform, promptInstall, toast]);

  const isIos = platform === 'ios';
  const installLabel = isIos ? 'Add to Home Screen' : 'Install App';
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
          <HStack spacing={3} mb={4} p={3} bg="purple.50" borderRadius="lg">
            <Image src="/icon-192.png" alt="Guru AI app icon" boxSize="48px" borderRadius="xl" />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="sm">
                Guru AI
              </Text>
              <Text fontSize="xs" color="gray.600">
                Home screen icon with one-tap access
              </Text>
            </VStack>
          </HStack>
          {isIos ? (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Tap the button below, then complete these steps in Safari:
              </Text>
              <List spacing={2} fontSize="sm" pl={4} styleType="decimal">
                <ListItem>
                  Tap <strong>Share</strong> (square with arrow up).
                </ListItem>
                <ListItem>
                  Tap <strong>Add to Home Screen</strong>.
                </ListItem>
                <ListItem>
                  Tap <strong>Add</strong> in the top-right corner.
                </ListItem>
              </List>
            </VStack>
          ) : hasNativePrompt ? (
            <Text fontSize="sm" color="gray.600">
              Tap Install App to add Guru AI to your device. You get a full-screen app without the
              browser bar.
            </Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Tap Install App, or use your browser menu:
              </Text>
              <List spacing={2} fontSize="sm" pl={4} styleType="decimal">
                <ListItem>Open the browser menu (⋮).</ListItem>
                <ListItem>
                  Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </ListItem>
                <ListItem>Confirm to add Guru AI to your home screen.</ListItem>
              </List>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter gap={2} flexDirection={{ base: 'column', sm: 'row' }}>
          <Button variant="ghost" onClick={onClose} w={{ base: '100%', sm: 'auto' }}>
            Not now
          </Button>
          <Button
            colorScheme="purple"
            leftIcon={<FiDownload />}
            flex={1}
            w={{ base: '100%', sm: 'auto' }}
            onClick={() => void handleInstall()}
            isLoading={isInstalling}
            loadingText="Installing…"
          >
            {installLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
