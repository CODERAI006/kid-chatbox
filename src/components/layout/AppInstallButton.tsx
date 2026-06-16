/**
 * PWA install CTA — native Android prompt when available; iOS / fallback opens instructions modal.
 */

import { useCallback, useState } from 'react';
import { Box, Button, HStack, Image, Text, useToast } from '@/shared/design-system';
import { FiDownload } from 'react-icons/fi';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { openAppInstall } from '@/components/layout/appInstallEvents';

type AppInstallButtonProps = {
  variant?: 'banner' | 'outline';
};

export const AppInstallButton: React.FC<AppInstallButtonProps> = ({ variant = 'banner' }) => {
  const { canInstall, platform, hasNativePrompt, promptInstall } = usePwaInstall();
  const toast = useToast();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleClick = useCallback(async () => {
    if (platform === 'android' && hasNativePrompt) {
      setIsInstalling(true);
      try {
        const outcome = await promptInstall();
        if (outcome === 'accepted') {
          toast({
            title: 'App installed',
            description: 'Guru AI is on your home screen.',
            status: 'success',
            duration: 4000,
            isClosable: true,
          });
        }
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    openAppInstall();
  }, [hasNativePrompt, platform, promptInstall, toast]);

  if (!canInstall) return null;

  const label = platform === 'ios' ? 'Add to Home Screen' : 'Install App';
  const hint =
    platform === 'ios'
      ? 'Tap to see how to add the Guru AI icon to your home screen.'
      : hasNativePrompt
        ? 'Install for quick access without the browser bar.'
        : 'Tap for steps to add Guru AI to your home screen.';

  if (variant === 'outline') {
    return (
      <Button
        leftIcon={<FiDownload />}
        size={{ base: 'md', md: 'lg' }}
        variant="outline"
        borderColor="white"
        color="white"
        px={{ base: 6, md: 8 }}
        py={{ base: 4, md: 6 }}
        fontSize={{ base: 'sm', md: 'lg' }}
        fontWeight="bold"
        borderRadius="full"
        bg="rgba(255, 255, 255, 0.1)"
        backdropFilter="blur(10px)"
        onClick={() => void handleClick()}
        isLoading={isInstalling}
        loadingText="Installing…"
        _hover={{ bg: 'rgba(255, 255, 255, 0.2)', transform: 'translateY(-2px)' }}
      >
        {label}
      </Button>
    );
  }

  return (
    <Box
      w="100%"
      p={{ base: 3, md: 4 }}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="purple.200"
      bg="purple.50"
      _dark={{ bg: 'whiteAlpha.100', borderColor: 'purple.700' }}
    >
      <HStack spacing={{ base: 3, md: 4 }} align="center">
        <Image
          src="/icon-192.png"
          alt=""
          boxSize={{ base: '44px', md: '52px' }}
          borderRadius="xl"
          flexShrink={0}
          aria-hidden
        />
        <Box flex={1} minW={0}>
          <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }} color="purple.700" _dark={{ color: 'purple.200' }}>
            {label}
          </Text>
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" _dark={{ color: 'gray.300' }} noOfLines={2}>
            {hint}
          </Text>
        </Box>
        <Button
          colorScheme="purple"
          size={{ base: 'sm', md: 'md' }}
          leftIcon={<FiDownload />}
          flexShrink={0}
          onClick={() => void handleClick()}
          isLoading={isInstalling}
          loadingText="…"
        >
          {platform === 'ios' ? 'How to' : 'Install'}
        </Button>
      </HStack>
    </Box>
  );
};
