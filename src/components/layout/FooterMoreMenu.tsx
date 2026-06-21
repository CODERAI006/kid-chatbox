/**
 * Three-dots overflow menu for footer and mobile bottom nav.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { FiMoreHorizontal } from 'react-icons/fi';
import { FOOTER_MORE_NAV_ITEMS } from '@/constants/footerMoreNav';
import { isNavItemActive } from '@/constants/navigation';

type FooterMoreMenuProps = {
  /** Opens upward (mobile bottom nav) or downward (footer). */
  placement?: 'top' | 'bottom';
  size?: 'compact' | 'default';
  /** Footer dark bar vs mobile bottom nav styling. */
  theme?: 'footer' | 'nav';
};

function isMoreMenuActive(pathname: string, hash: string): boolean {
  return FOOTER_MORE_NAV_ITEMS.some((item) => isNavItemActive(pathname, hash, item.path));
}

export function FooterMoreMenu({
  placement = 'bottom',
  size = 'default',
  theme = 'footer',
}: FooterMoreMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = isMoreMenuActive(location.pathname, location.hash);

  const footerIconColor = '#90cdf4';
  const navActiveColor = useColorModeValue('blue.600', 'blue.300');
  const navInactiveColor = useColorModeValue('gray.600', 'gray.400');
  const navHoverBg = useColorModeValue('gray.50', 'gray.700');
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');

  const menuPlacement = placement === 'top' ? 'top' : 'bottom-end';

  const handleSelect = (path: string) => {
    navigate(path);
  };

  if (theme === 'nav') {
    return (
      <Menu placement={menuPlacement} isLazy>
        <MenuButton
          as={Box}
          flex={1}
          minW={0}
          py={2}
          px={1}
          cursor="pointer"
          aria-label="More features"
          _hover={{ bg: navHoverBg }}
          transition="background 0.15s"
        >
          <VStack spacing={0.5} justify="center" h="100%">
            <Text fontSize="lg" lineHeight={1} fontWeight="bold" aria-hidden>
              ⋯
            </Text>
            <Text
              fontSize="2xs"
              fontWeight={active ? 'bold' : 'medium'}
              color={active ? navActiveColor : navInactiveColor}
              noOfLines={1}
              w="100%"
              textAlign="center"
            >
              More
            </Text>
          </VStack>
        </MenuButton>
        <MenuList
          bg={menuBg}
          borderColor={menuBorder}
          minW="11rem"
          py={1}
          zIndex={1500}
          mb={placement === 'top' ? 2 : 0}
        >
          {FOOTER_MORE_NAV_ITEMS.map((item) => (
            <MenuItem
              key={item.path}
              icon={<Icon as={item.icon} boxSize={4} />}
              fontSize="sm"
              onClick={() => handleSelect(item.path)}
            >
              {item.label}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    );
  }

  const iconSize = size === 'compact' ? 'xs' : 'sm';

  return (
    <Menu placement={menuPlacement} isLazy>
      <IconButton
        as={MenuButton}
        aria-label="More features"
        icon={<FiMoreHorizontal />}
        variant="ghost"
        size={iconSize}
        minW={size === 'compact' ? '1.5rem' : '2rem'}
        h={size === 'compact' ? '1.5rem' : '2rem'}
        color={footerIconColor}
        _hover={{ bg: 'whiteAlpha.200', color: 'white' }}
        _active={{ bg: 'whiteAlpha.300' }}
      />
      <MenuList bg={menuBg} borderColor={menuBorder} minW="11rem" py={1} zIndex={1500}>
        {FOOTER_MORE_NAV_ITEMS.map((item) => (
          <MenuItem
            key={item.path}
            icon={<Icon as={item.icon} boxSize={4} />}
            fontSize="sm"
            onClick={() => handleSelect(item.path)}
          >
            {item.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
