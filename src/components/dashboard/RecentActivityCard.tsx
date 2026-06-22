/**
 * Recent activity — collapsible card with expandable session rows.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  Progress,
  Badge,
  Collapse,
  useColorModeValue,
} from '@/shared/design-system';
import { FiActivity } from 'react-icons/fi';
import { MESSAGES } from '@/constants/app';
import { CollapsibleDashboardCard } from './CollapsibleDashboardCard';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function activitySummary(items: RecentActivityItem[]): string {
  const latest = items[0];
  const label = latest.type === 'quiz' ? 'Quiz' : 'Study';
  const score = latest.type === 'quiz' && latest.score !== undefined ? ` · ${latest.score}%` : '';
  const more = items.length > 1 ? ` · +${items.length - 1} more` : '';
  return `Latest: ${label} — ${latest.title}${score}${more}`;
}

function ActivityDetailPanel({ item }: { item: RecentActivityItem }) {
  const navigate = useNavigate();
  const muted = useColorModeValue('gray.600', 'gray.400');
  const isQuiz = item.type === 'quiz';

  return (
    <Box pl={2} pr={1} pb={2} pt={1} borderLeftWidth="2px" borderColor="blue.300" ml={2}>
      <VStack align="start" spacing={1} mb={2}>
        <Text fontSize="xs" color={muted}>
          {formatDate(item.date)} · {item.subtitle}
        </Text>
        {isQuiz && item.score !== undefined && (
          <Text fontSize="xs" color={muted}>
            {item.score >= 70
              ? 'Great job! Keep practicing to stay sharp.'
              : item.score >= 50
                ? 'Good effort — review this topic to improve.'
                : 'This topic needs more practice. Try a study session.'}
          </Text>
        )}
        {!isQuiz && (
          <Text fontSize="xs" color={muted}>
            Continue where you left off or explore related lessons.
          </Text>
        )}
      </VStack>
      <Button
        size="xs"
        colorScheme="blue"
        onClick={() => navigate(isQuiz ? '/quiz#history' : '/study#history')}
      >
        {isQuiz ? 'View quiz history' : 'View study history'} →
      </Button>
    </Box>
  );
}

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const [open, setOpen] = useState(false);
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHoverBg = useColorModeValue('blue.50', 'whiteAlpha.50');

  return (
    <Box>
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
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${item.type} session: ${item.title}`}
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
            {item.subtitle} · {formatDate(item.date)}
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
        <Text fontSize="xs" color="blue.400" aria-hidden>
          {open ? '▲' : '▼'}
        </Text>
      </HStack>
      <Collapse in={open} animateOpacity>
        <ActivityDetailPanel item={item} />
      </Collapse>
    </Box>
  );
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ items }) => {
  const navigate = useNavigate();
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');

  if (items.length === 0) return null;

  return (
    <CollapsibleDashboardCard
      title="Recent Activity"
      icon={<FiActivity color="var(--chakra-colors-blue-500)" />}
      summary={activitySummary(items)}
      count={items.length}
      headerAction={
        <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => navigate('/quiz#history')}>
          All
        </Button>
      }
    >
      <VStack spacing={3} align="stretch">
        <Text fontSize="2xs" color={subtitleColor}>
          Tap a session to see details.
        </Text>
        {items.map((item, index) => (
          <ActivityRow key={`${item.type}-${item.date}-${index}`} item={item} />
        ))}
        <Text fontSize="2xs" color={subtitleColor} textAlign="center">
          {MESSAGES.RECENT_ACTIVITY_HINT}
        </Text>
      </VStack>
    </CollapsibleDashboardCard>
  );
};
