/**
 * My Study — quick access and recent study topics on the dashboard.
 */

import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Link,
  useColorModeValue,
} from '@/shared/design-system';
import { FiBookOpen, FiClock, FiExternalLink } from 'react-icons/fi';

export interface RecentStudyItem {
  id: string;
  subject: string;
  topic: string;
  lesson_title: string;
  timestamp: string;
}

interface MyStudyCardProps {
  sessions: RecentStudyItem[];
  remainingTopics?: number;
  canStudy: boolean;
  onStudyClick: () => void;
}

export const MyStudyCard: React.FC<MyStudyCardProps> = ({
  sessions,
  remainingTopics,
  canStudy,
  onStudyClick,
}) => {
  const navigate = useNavigate();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHoverBg = useColorModeValue('blue.50', 'gray.700');

  const goHistory = () => navigate('/study#history');

  return (
    <Card borderWidth="1px" borderColor={rowBorder} boxShadow="md" w="100%">
      <CardBody p={{ base: 4, md: 5 }}>
        <HStack spacing={3} align="start" mb={4} justify="space-between" flexWrap="wrap" gap={2}>
          <HStack spacing={3} align="start" flex={1} minW="200px">
            <Box color="blue.500" fontSize="xl">
              <FiBookOpen />
            </Box>
            <Box flex={1}>
              <Heading size={{ base: 'sm', md: 'md' }} color={titleColor}>
                My Study
              </Heading>
              <Text fontSize="sm" color={subtitleColor} mt={1}>
                {sessions.length > 0
                  ? 'Tap a lesson to open your study history.'
                  : 'Start your first AI lesson — topics adapt to your grade.'}
              </Text>
            </Box>
          </HStack>
          <Link
            as={RouterLink}
            to="/study#history"
            fontSize="sm"
            fontWeight="semibold"
            color="blue.500"
            display="inline-flex"
            alignItems="center"
            gap={1}
            _hover={{ textDecoration: 'underline' }}
          >
            View history
            <FiExternalLink size={14} />
          </Link>
        </HStack>

        {sessions.length > 0 ? (
          <VStack spacing={2} align="stretch" mb={4}>
            {sessions.slice(0, 3).map((s) => (
              <Box
                key={s.id}
                as="button"
                type="button"
                p={3}
                borderRadius="md"
                borderWidth="1px"
                borderColor={rowBorder}
                w="100%"
                textAlign="left"
                cursor="pointer"
                bg="transparent"
                onClick={goHistory}
                _hover={{ bg: rowHoverBg }}
                transition="background 0.15s"
              >
                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Box flex={1} minW="140px">
                    <Text fontWeight="semibold" fontSize="sm" noOfLines={1} color={titleColor}>
                      {s.lesson_title || s.topic}
                    </Text>
                    <Text fontSize="xs" color={subtitleColor} noOfLines={1}>
                      {s.subject} · {s.topic}
                    </Text>
                  </Box>
                  <Badge colorScheme="purple" fontSize="2xs" display="flex" alignItems="center" gap={1}>
                    <FiClock />
                    {new Date(s.timestamp).toLocaleDateString()}
                  </Badge>
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color={subtitleColor} mb={4}>
            No lessons yet.{' '}
            <Link
              as={RouterLink}
              to="/study#ai-study"
              color="blue.500"
              fontWeight="semibold"
              _hover={{ textDecoration: 'underline' }}
            >
              Start AI Study →
            </Link>
          </Text>
        )}

        <HStack spacing={2} flexWrap="wrap" w="100%">
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<FiBookOpen />}
            onClick={onStudyClick}
            isDisabled={!canStudy}
            flex={{ base: '1 1 100%', sm: '0 0 auto' }}
          >
            {canStudy ? 'Start AI Study' : 'Daily limit reached'}
          </Button>
          {typeof remainingTopics === 'number' && (
            <Text fontSize="xs" color={subtitleColor} alignSelf="center">
              {remainingTopics} topic{remainingTopics === 1 ? '' : 's'} left today
            </Text>
          )}
          <Button
            as={RouterLink}
            to="/study#history"
            size="sm"
            variant="outline"
            colorScheme="blue"
            flex={{ base: '1 1 100%', sm: '0 0 auto' }}
            ml={{ base: 0, sm: 'auto' }}
          >
            All study history →
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};
