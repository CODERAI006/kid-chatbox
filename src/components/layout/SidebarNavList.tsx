/**
 * Shared vertical nav list for admin and student sidebars.
 */

import type { IconType } from 'react-icons';
import { VStack, Box, Button, Tooltip, useColorModeValue } from '@/shared/design-system';
import { adminColors } from '@/components/admin/adminTokens';
import type { NavAction } from '@/constants/navigation';

export type SidebarNavEntry = {
  key: string;
  label: string;
  icon: IconType;
  path: string;
  isActive: boolean;
  isDisabled?: boolean;
  action?: NavAction;
};

interface SidebarNavListProps {
  items: SidebarNavEntry[];
  onNavigate: (path: string) => void;
  onAction?: (action: NavAction) => void;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({
  items,
  onNavigate,
  onAction,
}) => {
  const navText = useColorModeValue('gray.600', 'gray.300');
  const navActiveBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const navActiveColor = useColorModeValue('blue.700', 'blue.200');
  const navHoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const navDisabledColor = useColorModeValue('gray.400', 'gray.500');

  return (
    <VStack align="stretch" spacing={0.5} px={2}>
      {items.map((item) => {
        const Icon = item.icon;
        const handleClick = () => {
          if (item.isDisabled) return;
          if (item.action) {
            onAction?.(item.action);
            return;
          }
          if (item.path) onNavigate(item.path);
        };

        const button = (
          <Button
            w="100%"
            justifyContent="flex-start"
            leftIcon={<Icon size={16} />}
            variant="ghost"
            fontWeight={item.isActive ? 'semibold' : 'medium'}
            fontSize="sm"
            color={item.isDisabled ? navDisabledColor : item.isActive ? navActiveColor : navText}
            bg={item.isActive ? navActiveBg : 'transparent'}
            _hover={{ bg: item.isDisabled ? 'transparent' : item.isActive ? navActiveBg : navHoverBg }}
            borderRadius="md"
            onClick={handleClick}
            isDisabled={item.isDisabled}
            aria-current={item.isActive ? 'page' : undefined}
            size={{ base: 'sm', md: 'md' }}
            h={{ base: 9, md: 10 }}
            borderLeftWidth={item.isActive ? '3px' : '3px'}
            borderLeftColor={item.isActive ? adminColors.brand.light : 'transparent'}
          >
            {item.label}
          </Button>
        );

        if (item.isDisabled) {
          return (
            <Tooltip key={item.key} label="Upgrade your plan to unlock this module" hasArrow>
              <Box as="span" display="block" w="100%">
                {button}
              </Box>
            </Tooltip>
          );
        }

        return (
          <Box key={item.key} w="100%">
            {button}
          </Box>
        );
      })}
    </VStack>
  );
};
