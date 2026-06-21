/**
 * Three-dots overflow menu for footer and mobile bottom nav.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
} from '@/shared/design-system';
import { FiMoreHorizontal } from 'react-icons/fi';
import { FOOTER_MORE_NAV_ITEMS } from '@/constants/footerMoreNav';
import { isNavItemActive } from '@/constants/navigation';
import { useVisualViewportBottom } from '@/hooks/useVisualViewportBottom';
import {
  MOBILE_MORE_MENU_BACKDROP_Z_INDEX,
  MOBILE_MORE_MENU_Z_INDEX,
  MOBILE_SHEET_ABOVE_CHAT_BOTTOM,
} from './layoutHeights';

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

type MobileMoreSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
};

function MobileMoreSheet({ isOpen, onClose, onSelect }: MobileMoreSheetProps) {
  const visualViewportBottom = useVisualViewportBottom();
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHover = useColorModeValue('gray.50', 'gray.700');
  const muted = useColorModeValue('gray.600', 'gray.300');

  const sheetBottom = `calc(${MOBILE_SHEET_ABOVE_CHAT_BOTTOM} + ${visualViewportBottom}px)`;

  if (!isOpen) return null;

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.500"
        zIndex={MOBILE_MORE_MENU_BACKDROP_Z_INDEX}
        onClick={onClose}
        aria-hidden
      />
      <Box
        role="dialog"
        aria-label="More features"
        position="fixed"
        left={0}
        right={0}
        bottom={sheetBottom}
        zIndex={MOBILE_MORE_MENU_Z_INDEX}
        px={3}
        w="100%"
        maxW="100vw"
      >
        <Box
          bg={menuBg}
          borderRadius="2xl"
          borderWidth="1px"
          borderColor={menuBorder}
          boxShadow="2xl"
          w="100%"
          py={2}
          overflow="hidden"
        >
          <Text px={4} py={2} fontSize="xs" fontWeight="semibold" color={muted} textTransform="uppercase">
            Explore
          </Text>
          {FOOTER_MORE_NAV_ITEMS.map((item) => (
            <Box
              key={item.path}
              as="button"
              type="button"
              w="100%"
              px={4}
              py={3}
              display="flex"
              alignItems="center"
              textAlign="left"
              cursor="pointer"
              _hover={{ bg: rowHover }}
              onClick={() => onSelect(item.path)}
            >
              <HStack spacing={3}>
                <Icon as={item.icon} boxSize={5} color="blue.500" />
                <Text fontSize="md" fontWeight="medium">
                  {item.label}
                </Text>
              </HStack>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}

export function FooterMoreMenu({
  placement = 'bottom',
  size = 'default',
  theme = 'footer',
}: FooterMoreMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sheet = useDisclosure();
  const active = isMoreMenuActive(location.pathname, location.hash);

  const footerIconColor = '#90cdf4';
  const navActiveColor = useColorModeValue('blue.600', 'blue.300');
  const navInactiveColor = useColorModeValue('gray.600', 'gray.400');
  const navHoverBg = useColorModeValue('gray.50', 'gray.700');
  const menuBg = useColorModeValue('white', 'gray.800');
  const menuBorder = useColorModeValue('gray.200', 'gray.600');

  const menuPlacement = placement === 'top' ? 'top' : 'bottom-end';

  const handleSelect = (path: string) => {
    sheet.onClose();
    navigate(path);
  };

  if (theme === 'nav') {
    return (
      <>
        <Box
          as="button"
          type="button"
          flex={1}
          minW={0}
          py={2}
          px={1}
          cursor="pointer"
          aria-label="More features"
          aria-expanded={sheet.isOpen}
          onClick={sheet.onToggle}
          _hover={{ bg: navHoverBg }}
          transition="background 0.15s"
        >
          <VStack spacing={0.5} justify="center" h="100%">
            <Text fontSize="lg" lineHeight={1} fontWeight="bold" aria-hidden>
              ⋯
            </Text>
            <Text
              fontSize="2xs"
              fontWeight={active || sheet.isOpen ? 'bold' : 'medium'}
              color={active || sheet.isOpen ? navActiveColor : navInactiveColor}
              noOfLines={1}
              w="100%"
              textAlign="center"
            >
              More
            </Text>
          </VStack>
        </Box>
        <MobileMoreSheet isOpen={sheet.isOpen} onClose={sheet.onClose} onSelect={handleSelect} />
      </>
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
      <MenuList bg={menuBg} borderColor={menuBorder} minW="11rem" py={1} zIndex={MOBILE_MORE_MENU_Z_INDEX}>
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
