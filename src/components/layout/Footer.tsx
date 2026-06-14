/**
 * Footer component
 */
import { Box, Text, HStack, Button } from '@/shared/design-system';
import { Link as RouterLink } from 'react-router-dom';
import { APP_CONSTANTS } from '@/constants/app';
import { useStudyPlanPendingToday } from '@/hooks/useStudyPlanPendingToday';

type FooterVariant = 'full' | 'compact';

interface FooterProps {
  variant?: FooterVariant;
}

const linkStyle = { color: '#90cdf4', textDecoration: 'none' } as const;

/**
 * Footer component with app information
 */
export const Footer: React.FC<FooterProps> = ({ variant = 'full' }) => {
  const currentYear = new Date().getFullYear();
  const schedulePendingToday = useStudyPlanPendingToday();

  if (variant === 'compact') {
    return (
      <Box
        as="footer"
        bg="gray.800"
        color="white"
        h="100%"
        px={4}
        display="flex"
        alignItems="center"
        borderTopWidth="1px"
        borderColor="whiteAlpha.200"
      >
        <HStack justify="space-between" w="100%" spacing={3}>
          <Text fontSize="2xs" noOfLines={1}>
            © {currentYear} {APP_CONSTANTS.BRAND_NAME}
          </Text>
          <HStack spacing={3} flexShrink={0}>
            <RouterLink to="/" style={{ ...linkStyle, fontSize: '0.7rem' }}>
              Home
            </RouterLink>
            <RouterLink to="/#pricing" style={{ ...linkStyle, fontSize: '0.7rem' }}>
              Pricing
            </RouterLink>
            <RouterLink to="/my-schedules" style={{ ...linkStyle, fontSize: '0.7rem', position: 'relative' }}>
              Schedules
              {schedulePendingToday && (
                <Box
                  as="span"
                  position="absolute"
                  top="-2px"
                  right="-6px"
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  bg="orange.400"
                  aria-hidden
                />
              )}
            </RouterLink>
            <RouterLink to="/education-news" style={{ ...linkStyle, fontSize: '0.7rem' }}>
              News
            </RouterLink>
          </HStack>
        </HStack>
      </Box>
    );
  }

  return (
    <Box
      as="footer"
      bg="gray.800"
      color="white"
      paddingY={{ base: 4, md: 6 }}
      paddingX={{ base: 4, md: 6 }}
      marginTop="auto"
    >
      <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={{ base: 2, md: 4 }}>
        <Text fontSize={{ base: 'xs', md: 'sm' }}>
          © {currentYear} {APP_CONSTANTS.BRAND_NAME}. All rights reserved.
        </Text>
        <HStack spacing={{ base: 2, md: 4 }} alignItems="center">
          <RouterLink to="/" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', ...linkStyle }}>
            Home
          </RouterLink>
          <RouterLink to="/#pricing" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', ...linkStyle }}>
            Pricing Plans
          </RouterLink>
          <Button
            as={RouterLink}
            to="/my-schedules"
            size="sm"
            colorScheme="purple"
            variant="solid"
            fontSize="xs"
            px={4}
            position="relative"
            leftIcon={<Box as="span" aria-hidden>📅</Box>}
          >
            My Schedules
            {schedulePendingToday && (
              <Box
                position="absolute"
                top="2px"
                right="2px"
                w="8px"
                h="8px"
                borderRadius="full"
                bg="orange.400"
                border="2px solid"
                borderColor="gray.800"
                title="Study lesson scheduled for today"
              />
            )}
          </Button>
          <RouterLink to="/education-news" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', ...linkStyle }}>
            News
          </RouterLink>
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.400">
            Made with ❤️ for kids
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
};
