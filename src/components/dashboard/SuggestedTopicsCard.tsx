/**
 * Suggested topics — ranked, actionable improvement cards from quiz analytics.
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
import { FiBookOpen, FiTarget, FiTrendingUp } from 'react-icons/fi';
import { MESSAGES } from '@/constants/app';

export interface SuggestedTopicItem {
  name: string;
  score?: number;
  rank: number;
}

interface SuggestedTopicsCardProps {
  items: SuggestedTopicItem[];
  hasQuizHistory: boolean;
}

function scoreMeta(score?: number): {
  label: string;
  colorScheme: string;
  progress: number;
  hint: string;
} {
  if (score === undefined) {
    return {
      label: 'Review',
      colorScheme: 'orange',
      progress: 40,
      hint: 'Practice this area to build confidence',
    };
  }
  if (score < 50) {
    return {
      label: 'Needs work',
      colorScheme: 'red',
      progress: score,
      hint: 'Focus here first — your score is below 50%',
    };
  }
  if (score < 70) {
    return {
      label: 'Getting better',
      colorScheme: 'orange',
      progress: score,
      hint: 'A little more practice will help you improve',
    };
  }
  return {
    label: 'Almost there',
    colorScheme: 'yellow',
    progress: score,
    hint: 'You are close — one more review could lock it in',
  };
}

export const SuggestedTopicsCard: React.FC<SuggestedTopicsCardProps> = ({
  items,
  hasQuizHistory,
}) => {
  const navigate = useNavigate();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBg = useColorModeValue('white', 'gray.800');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const mutedBg = useColorModeValue('gray.50', 'gray.900');

  if (!hasQuizHistory) {
    return (
      <Card borderWidth="1px" borderColor={rowBorder} boxShadow="sm" w="100%">
        <CardBody p={{ base: 4, md: 5 }}>
          <HStack spacing={3} align="start">
            <Box color="blue.500" fontSize="xl" pt={0.5}>
              <FiTrendingUp />
            </Box>
            <VStack align="start" spacing={2} flex={1}>
              <Heading size="sm" color={titleColor}>
                {MESSAGES.SUGGESTED_TOPICS}
              </Heading>
              <Text fontSize="sm" color={subtitleColor}>
                Take a few quizzes and we will highlight topics that need extra practice.
              </Text>
              <Button size="sm" colorScheme="blue" onClick={() => navigate('/quiz#ai-quiz')}>
                Take a quiz to get suggestions
              </Button>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card borderWidth="1px" borderColor={rowBorder} bg={mutedBg} boxShadow="sm" w="100%">
        <CardBody p={{ base: 4, md: 5 }}>
          <Heading size="sm" color={titleColor} mb={1}>
            {MESSAGES.SUGGESTED_TOPICS}
          </Heading>
          <Text fontSize="sm" color={subtitleColor}>
            Great job — no weak areas detected right now. Keep quizzing to stay sharp.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card borderWidth="1px" borderColor={rowBorder} boxShadow="md" w="100%">
      <CardBody p={{ base: 4, md: 5 }}>
        <HStack spacing={3} align="start" mb={4}>
          <Box color="blue.500" fontSize="xl">
            <FiTarget />
          </Box>
          <Box flex={1}>
            <Heading size={{ base: 'sm', md: 'md' }} color={titleColor} lineHeight="short">
              {MESSAGES.SUGGESTED_TOPICS}
            </Heading>
            <Text fontSize={{ base: 'sm', md: 'md' }} color={subtitleColor} mt={1}>
              Start at the top — these topics had the lowest scores in your recent quizzes.
            </Text>
          </Box>
        </HStack>

        <VStack spacing={3} align="stretch">
          {items.map((item) => {
            const meta = scoreMeta(item.score);
            const isTop = item.rank === 1;
            return (
              <Box
                key={`${item.name}-${item.rank}`}
                p={{ base: 3, md: 4 }}
                borderRadius="lg"
                bg={rowBg}
                borderWidth="1px"
                borderColor={isTop ? 'blue.300' : rowBorder}
                boxShadow={isTop ? 'sm' : 'none'}
              >
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={3} mb={2}>
                  <HStack align="start" spacing={3} flex={1} minW="200px">
                    <Box
                      w={8}
                      h={8}
                      borderRadius="full"
                      bg={isTop ? 'blue.500' : 'gray.100'}
                      color={isTop ? 'white' : 'gray.600'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight="bold"
                      fontSize="sm"
                      flexShrink={0}
                    >
                      {item.rank}
                    </Box>
                    <Box flex={1} minW={0}>
                      <HStack flexWrap="wrap" gap={2} mb={1}>
                        <Text
                          fontSize={{ base: 'md', md: 'lg' }}
                          fontWeight="semibold"
                          color={titleColor}
                          wordBreak="break-word"
                        >
                          {item.name}
                        </Text>
                        <Badge colorScheme={meta.colorScheme} fontSize="xs">
                          {meta.label}
                        </Badge>
                        {isTop && (
                          <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                            Start here
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="sm" color={subtitleColor}>
                        {meta.hint}
                      </Text>
                    </Box>
                  </HStack>
                  {item.score !== undefined && (
                    <Text fontSize="2xl" fontWeight="bold" color={`${meta.colorScheme}.500`}>
                      {item.score}%
                    </Text>
                  )}
                </HStack>

                {item.score !== undefined && (
                  <Progress
                    value={meta.progress}
                    size="sm"
                    colorScheme={meta.colorScheme}
                    borderRadius="full"
                    mb={3}
                  />
                )}

                <HStack spacing={2} flexWrap="wrap">
                  <Button
                    size="sm"
                    colorScheme="blue"
                    leftIcon={<FiBookOpen />}
                    onClick={() => navigate('/study#ai-study')}
                  >
                    Study this
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    leftIcon={<FiTarget />}
                    onClick={() => navigate('/quiz#ai-quiz')}
                  >
                    Practice quiz
                  </Button>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      </CardBody>
    </Card>
  );
};
