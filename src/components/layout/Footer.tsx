/**
 * Footer component
 */

import { Box, Text, HStack } from '@/shared/design-system';
import { Link as RouterLink } from 'react-router-dom';
import { APP_CONSTANTS } from '@/constants/app';

/**
 * Footer component with app information
 */
export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

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
        <HStack spacing={{ base: 2, md: 4 }}>
          <RouterLink to="/" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#90cdf4' }}>
            Home
          </RouterLink>
          <RouterLink to="/#pricing" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#90cdf4' }}>
            Pricing Plans
          </RouterLink>
          <RouterLink to="/my-schedules" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#90cdf4' }}>
            My Schedules
          </RouterLink>
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.400">
            Made with ❤️ for kids
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
};

