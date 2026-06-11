/**
 * Responsive Guru AI chat panel header with active-chat green animation.
 */
import { Box, Button, Flex, HStack, IconButton, Text } from '@/shared/design-system';
import { keyframes } from '@emotion/react';
import { APP_CONSTANTS } from '@/constants/app';

const greenBar = keyframes`
  0% { background-position: 200% center; opacity: 0.6; }
  50% { opacity: 1; }
  100% { background-position: -200% center; opacity: 0.6; }
`;

const greenPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.5); }
  50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 10px 2px rgba(72, 187, 120, 0.75); }
`;

export interface GuruChatHeaderProps {
  currentTopic: string;
  isChatActive: boolean;
  panelBorder: string;
  onClose: () => void;
  onHistoryOpen: () => void;
  onNewTopic: () => void;
  onDownload?: () => void;
}

export function GuruChatHeader({
  currentTopic,
  isChatActive,
  panelBorder,
  onClose,
  onHistoryOpen,
  onNewTopic,
  onDownload,
}: GuruChatHeaderProps) {
  const ghostProps = {
    variant: 'ghost' as const,
    color: 'white',
    _hover: { bg: 'whiteAlpha.200' },
  };

  return (
    <Flex
      px={{ base: 2, md: 3 }}
      py={2}
      align="center"
      justify="space-between"
      gap={2}
      borderBottomWidth="1px"
      borderColor={panelBorder}
      bg="blue.600"
      color="white"
      flexShrink={0}
      position="relative"
      overflow="hidden"
      flexWrap="nowrap"
    >
      {isChatActive && (
        <Box
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          h="3px"
          bgGradient="linear(to-r, transparent, green.300, green.400, green.300, transparent)"
          backgroundSize="200% 100%"
          animation={`${greenBar} 2s linear infinite`}
          pointerEvents="none"
        />
      )}

      <HStack spacing={2} minW={0} flex={1} align="center">
        {isChatActive && (
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg="green.400"
            flexShrink={0}
            animation={`${greenPulse} 1.4s ease-in-out infinite`}
          />
        )}
        <Box minW={0}>
          <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }} noOfLines={1}>
            {APP_CONSTANTS.BRAND_NAME}
          </Text>
          <Text
            fontSize="xs"
            opacity={0.9}
            noOfLines={1}
            display={{ base: 'none', sm: 'block' }}
          >
            {currentTopic}
          </Text>
        </Box>
      </HStack>

      <HStack spacing={{ base: 0, sm: 1 }} flexShrink={0}>
        <Button
          size="xs"
          {...ghostProps}
          display={{ base: 'none', md: 'inline-flex' }}
          onClick={onHistoryOpen}
        >
          Saved chats
        </Button>
        <IconButton
          aria-label="Saved chats"
          size="sm"
          {...ghostProps}
          display={{ base: 'inline-flex', md: 'none' }}
          icon={<Text fontSize="sm">📁</Text>}
          onClick={onHistoryOpen}
        />
        <Button
          size="xs"
          {...ghostProps}
          display={{ base: 'none', md: 'inline-flex' }}
          onClick={onNewTopic}
        >
          New topic
        </Button>
        <IconButton
          aria-label="New topic"
          size="sm"
          {...ghostProps}
          display={{ base: 'inline-flex', md: 'none' }}
          icon={<Text fontSize="sm">➕</Text>}
          onClick={onNewTopic}
        />
        {onDownload && (
          <Button
            size="xs"
            {...ghostProps}
            display={{ base: 'none', md: 'inline-flex' }}
            onClick={onDownload}
          >
            ⬇ Export
          </Button>
        )}
        {onDownload && (
          <IconButton
            aria-label="Export PDF"
            size="sm"
            {...ghostProps}
            display={{ base: 'inline-flex', md: 'none' }}
            icon={<Text fontSize="sm">⬇</Text>}
            onClick={onDownload}
          />
        )}
        <IconButton
          aria-label="Close Guru AI"
          size="sm"
          {...ghostProps}
          icon={<Text>✕</Text>}
          onClick={onClose}
        />
      </HStack>
    </Flex>
  );
}
