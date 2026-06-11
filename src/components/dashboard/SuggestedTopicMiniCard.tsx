/**
 * Compact topic card for dashboard suggested-topics grid.
 */

import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Badge,
  Progress,
  Button,
  useColorModeValue,
} from '@/shared/design-system';
import { FiBookOpen } from 'react-icons/fi';

export interface SuggestedTopicItem {
  name: string;
  score?: number;
  rank: number;
}

interface ScoreMeta {
  label: string;
  colorScheme: string;
  progress: number;
}

interface SuggestedTopicMiniCardProps {
  item: SuggestedTopicItem;
  meta: ScoreMeta;
  compact?: boolean;
}

export function SuggestedTopicMiniCard({ item, meta, compact = false }: SuggestedTopicMiniCardProps) {
  const navigate = useNavigate();
  const titleColor = useColorModeValue('blue.700', 'blue.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBg = useColorModeValue('white', 'gray.800');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const isTop = item.rank === 1;

  return (
    <Box
      p={compact ? 3 : 4}
      borderRadius="lg"
      bg={rowBg}
      borderWidth="1px"
      borderColor={isTop ? 'blue.300' : rowBorder}
      boxShadow={isTop ? 'sm' : 'none'}
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <Box flex={1}>
        <Badge
          colorScheme={isTop ? 'blue' : 'gray'}
          fontSize="2xs"
          mb={2}
          borderRadius="full"
          px={2}
        >
          #{item.rank}
        </Badge>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={titleColor}
          noOfLines={2}
          lineHeight="short"
          mb={1}
        >
          {item.name}
        </Text>
        <Badge colorScheme={meta.colorScheme} fontSize="2xs" mb={2}>
          {meta.label}
        </Badge>
        {item.score !== undefined && (
          <>
            <Text fontSize="lg" fontWeight="bold" color={`${meta.colorScheme}.500`} mb={1}>
              {item.score}%
            </Text>
            <Progress
              value={meta.progress}
              size="xs"
              colorScheme={meta.colorScheme}
              borderRadius="full"
              mb={2}
            />
          </>
        )}
        {!compact && (
          <Text fontSize="xs" color={subtitleColor} noOfLines={2}>
            {item.score !== undefined && item.score < 50
              ? 'Focus here first — score below 50%'
              : 'A little more practice will help'}
          </Text>
        )}
      </Box>
      <Button
        size="xs"
        mt={3}
        w="full"
        colorScheme="blue"
        leftIcon={<FiBookOpen />}
        onClick={() => navigate('/study#ai-study')}
      >
        Study
      </Button>
    </Box>
  );
}
