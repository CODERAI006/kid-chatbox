/**
 * Desktop floating action button — opens Guru AI chat.
 */
import { Box, HStack, Text, Tooltip, useColorModeValue } from '@/shared/design-system';
import { keyframes } from '@emotion/react';
import { APP_CONSTANTS } from '@/constants/app';
import { GuruAvatar } from './GuruAvatar';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(49, 130, 206, 0.45); }
  50% { box-shadow: 0 0 0 12px rgba(49, 130, 206, 0); }
`;

export interface GuruChatFabProps {
  onClick: () => void;
}

export function GuruChatFab({ onClick }: GuruChatFabProps) {
  const bg = useColorModeValue('blue.600', 'blue.500');
  const hoverBg = useColorModeValue('blue.700', 'blue.400');
  const labelColor = useColorModeValue('white', 'white');

  return (
    <Box
      position="fixed"
      bottom={8}
      right={8}
      zIndex={1500}
      display={{ base: 'none', md: 'block' }}
    >
      <Tooltip label="Chat with Guru — ask homework questions, get study help" placement="left" hasArrow openDelay={300}>
        <Box
          as="button"
          type="button"
          aria-label={`Open ${APP_CONSTANTS.BRAND_NAME} chat`}
          onClick={onClick}
          display="flex"
          alignItems="center"
          gap={3}
          pl={2}
          pr={5}
          py={2}
          minH="72px"
          bg={bg}
          color={labelColor}
          borderRadius="full"
          border="none"
          cursor="pointer"
          boxShadow="0 8px 24px rgba(37, 99, 235, 0.35)"
          animation={`${pulse} 2.5s ease-in-out infinite`}
          transition="transform 0.15s ease, background 0.15s ease"
          _hover={{ bg: hoverBg, transform: 'scale(1.03)' }}
          _active={{ transform: 'scale(0.98)' }}
        >
          <GuruAvatar size="lg" ring />
          <HStack spacing={0} align="flex-start">
            <Box textAlign="left">
              <Text fontWeight="bold" fontSize="md" lineHeight="short">
                Ask Guru
              </Text>
              <Text fontSize="xs" opacity={0.9} lineHeight="short">
                Tap to chat
              </Text>
            </Box>
          </HStack>
        </Box>
      </Tooltip>
    </Box>
  );
}
