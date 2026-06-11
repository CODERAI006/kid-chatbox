/**
 * Responsive Guru AI chat panel header with active-chat green animation.
 */
import { Box, Flex, HStack, IconButton, Text } from '@/shared/design-system';
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

function firstName(name?: string): string {
  const raw = name?.trim() || 'there';
  const first = raw.split(/\s+/)[0];
  return first || 'there';
}

export interface GuruChatHeaderProps {
  userName?: string;
  isChatActive: boolean;
  panelBorder: string;
  onClose: () => void;
  onHistoryOpen: () => void;
  onNewTopic: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function GuruChatHeader({
  userName,
  isChatActive,
  panelBorder,
  onClose,
  onHistoryOpen,
  onNewTopic,
  onDownload,
  onShare,
}: GuruChatHeaderProps) {
  const displayName = firstName(userName);

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

      <Flex w="100%" align="center" justify="space-between" gap={2}>
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
          </Box>
        </HStack>

        <Box flex={1} minW={0} textAlign="right" px={{ base: 1, sm: 2 }}>
          <Text fontSize="xs" opacity={0.95} noOfLines={1}>
            Welcome,{' '}
            <Text as="span" fontWeight="semibold">
              {displayName}
            </Text>
          </Text>
        </Box>

        <HStack spacing={{ base: 0, sm: 1 }} flexShrink={0}>
          {onShare && (
            <IconButton
              aria-label="Share chat"
              size="sm"
              {...ghostProps}
              icon={<Text fontSize="sm">🔗</Text>}
              onClick={onShare}
            />
          )}
          <IconButton
            aria-label="Saved chats"
            size="sm"
            {...ghostProps}
            icon={<Text fontSize="sm">📁</Text>}
            onClick={onHistoryOpen}
          />
          <IconButton
            aria-label="New topic"
            size="sm"
            {...ghostProps}
            icon={<Text fontSize="sm">➕</Text>}
            onClick={onNewTopic}
          />
          {onDownload && (
            <IconButton
              aria-label="Export PDF"
              size="sm"
              {...ghostProps}
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
    </Flex>
  );
}
