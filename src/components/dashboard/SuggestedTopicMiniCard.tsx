/**
 * Compact topic row — matches RecentActivityCard row density.
 */

import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  Badge,
  Progress,
  HStack,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';

export interface SuggestedTopicItem {
  name: string;
  score?: number;
  rank: number;
}

function scoreColorScheme(score?: number): string {
  if (score === undefined) return 'orange';
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'orange';
}

interface SuggestedTopicRowProps {
  item: SuggestedTopicItem;
  onSelect?: () => void;
  isExpanded?: boolean;
}

export function SuggestedTopicRow({ item, onSelect, isExpanded }: SuggestedTopicRowProps) {
  const navigate = useNavigate();
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHoverBg = useColorModeValue('blue.50', 'whiteAlpha.50');
  const scheme = scoreColorScheme(item.score);

  return (
    <HStack
      justify="space-between"
      flexWrap="wrap"
      spacing={3}
      alignItems={{ base: 'start', sm: 'center' }}
      p={2}
      borderRadius="md"
      borderWidth="1px"
      borderColor={rowBorder}
      cursor="pointer"
      transition="background 0.15s"
      _hover={{ bg: rowHoverBg }}
      onClick={onSelect ?? (() => navigate('/study#ai-study'))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (onSelect ?? (() => navigate('/study#ai-study')))();
      }}
      aria-expanded={isExpanded}
      aria-label={`Study ${item.name}`}
    >
      <VStack align="start" spacing={0} flex={1} minW="120px">
        <HStack spacing={2}>
          <Badge colorScheme={item.rank === 1 ? 'blue' : 'gray'} fontSize="2xs">
            #{item.rank}
          </Badge>
          <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
            {item.name}
          </Text>
        </HStack>
        {item.score === undefined && (
          <Text fontSize="xs" color={subtitleColor} noOfLines={1}>
            Tap to review
          </Text>
        )}
      </VStack>
      {item.score !== undefined && (
        <Box width={{ base: '100%', sm: '100px' }} flexShrink={0}>
          <Progress value={item.score} size="sm" colorScheme={scheme} borderRadius="md" />
          <Text fontSize="xs" fontWeight="bold" mt={1} color={subtitleColor}>
            {item.score}%
          </Text>
        </Box>
      )}
      {onSelect && (
        <Text fontSize="xs" color="blue.400" aria-hidden>
          {isExpanded ? '▲' : '▼'}
        </Text>
      )}
    </HStack>
  );
}
