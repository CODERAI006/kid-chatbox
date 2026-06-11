/**
 * Last 2 activities (study + quiz) at the bottom of the dashboard.
 */

import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Progress,
  Badge,
  useColorModeValue,
} from '@/shared/design-system';
import { FiActivity } from 'react-icons/fi';
import { MESSAGES } from '@/constants/app';

export interface RecentActivityItem {
  type: 'quiz' | 'study';
  title: string;
  subtitle: string;
  date: string;
  score?: number;
}

interface RecentActivityCardProps {
  items: RecentActivityItem[];
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ items }) => {
  const navigate = useNavigate();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');

  if (items.length === 0) return null;

  return (
    <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
      <CardBody p={{ base: 3, md: 4 }}>
        <HStack justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
          <HStack spacing={2}>
            <FiActivity color="var(--chakra-colors-blue-500)" />
            <Heading size={{ base: 'xs', sm: 'sm' }} color={titleColor}>
              Recent Activity
            </Heading>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            colorScheme="blue"
            onClick={() => navigate('/quiz#history')}
          >
            View all →
          </Button>
        </HStack>

        <VStack spacing={3} align="stretch">
          {items.map((item, index) => (
            <HStack
              key={`${item.type}-${item.date}-${index}`}
              justify="space-between"
              flexWrap="wrap"
              spacing={3}
              alignItems={{ base: 'start', sm: 'center' }}
              p={2}
              borderRadius="md"
              borderWidth="1px"
              borderColor={rowBorder}
            >
              <VStack align="start" spacing={0} flex={1} minW="160px">
                <HStack spacing={2}>
                  <Badge colorScheme={item.type === 'quiz' ? 'green' : 'purple'} fontSize="2xs">
                    {item.type === 'quiz' ? 'Quiz' : 'Study'}
                  </Badge>
                  <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                    {item.title}
                  </Text>
                </HStack>
                <Text fontSize="xs" color={subtitleColor} noOfLines={1}>
                  {item.subtitle} · {new Date(item.date).toLocaleDateString()}
                </Text>
              </VStack>
              {item.type === 'quiz' && item.score !== undefined && (
                <Box width={{ base: '100%', sm: '140px' }} flexShrink={0}>
                  <Progress
                    value={item.score}
                    size="sm"
                    colorScheme={item.score >= 70 ? 'green' : item.score >= 50 ? 'yellow' : 'orange'}
                    borderRadius="md"
                  />
                  <Text fontSize="xs" fontWeight="bold" mt={1}>
                    {item.score}%
                  </Text>
                </Box>
              )}
            </HStack>
          ))}
        </VStack>

        <Text fontSize="2xs" color={subtitleColor} mt={3} textAlign="center">
          {MESSAGES.RECENT_ACTIVITY_HINT}
        </Text>
      </CardBody>
    </Card>
  );
};
