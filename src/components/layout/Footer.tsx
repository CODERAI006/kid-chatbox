/**
 * Footer component
 */
import { Box, Text, HStack, Button } from '@/shared/design-system';
import { Link as RouterLink } from 'react-router-dom';
import { APP_CONSTANTS } from '@/constants/app';
import { useStudyPlanPendingToday } from '@/hooks/useStudyPlanPendingToday';

/**
 * Footer component with app information
 */
export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const schedulePendingToday = useStudyPlanPendingToday();

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
          <RouterLink to="/" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#90cdf4' }}>
            Home
          </RouterLink>
          <RouterLink to="/#pricing" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', color: '#90cdf4' }}>
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
          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.400">
            Made with ❤️ for kids
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
};
