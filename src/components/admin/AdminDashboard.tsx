/**
 * Admin Dashboard — KPI overview with professional layout and typography.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Badge,
  Button,
  Skeleton,
  useColorModeValue,
} from '@/shared/design-system';
import {
  FiUsers,
  FiUserCheck,
  FiClock,
  FiBook,
  FiFileText,
  FiTarget,
  FiTrendingUp,
  FiArrowRight,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { adminApi, AnalyticsSummary } from '@/services/admin';
import { PullToRefresh } from '../PullToRefresh';
import { AdminStatCard } from './AdminStatCard';
import { adminColors } from './adminTokens';

const MotionCard = motion(Card);

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const titleColor = useColorModeValue(adminColors.title.light, adminColors.title.dark);
  const subtitleColor = useColorModeValue(adminColors.subtitle.light, adminColors.subtitle.dark);
  const alertBg = useColorModeValue('orange.50', 'orange.900');
  const alertBorder = useColorModeValue('orange.200', 'orange.700');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAnalyticsSummary();
      setSummary(data.summary);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = summary
    ? [
        { label: 'Total Users', value: summary.totalUsers, accent: 'blue' as const, icon: <FiUsers />, route: '/admin/users' },
        { label: 'Active Users', value: summary.activeUsers, accent: 'emerald' as const, icon: <FiUserCheck />, route: '/admin/users?status=approved' },
        { label: 'Pending Approval', value: summary.pendingUsers, accent: 'amber' as const, icon: <FiClock />, route: '/admin/users?status=pending' },
        { label: 'Total Topics', value: summary.totalTopics, accent: 'violet' as const, icon: <FiBook />, route: '/admin/topics' },
        { label: 'Total Quizzes', value: summary.totalQuizzes, accent: 'cyan' as const, icon: <FiFileText />, route: '/admin/quizzes' },
        { label: 'Quiz Attempts', value: summary.totalAttempts, accent: 'indigo' as const, icon: <FiTarget />, route: '/admin/quiz-history' },
        { label: 'Avg Score', value: `${summary.avgScore.toFixed(1)}%`, accent: 'rose' as const, icon: <FiTrendingUp />, route: '/admin/analytics' },
      ]
    : [];

  if (loading) {
    return (
      <Box>
        <Skeleton height="32px" width="220px" mb={2} borderRadius="md" />
        <Skeleton height="16px" width="320px" mb={6} borderRadius="md" />
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height="108px" borderRadius="lg" />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <PullToRefresh onRefresh={loadSummary}>
      <Box maxW="1400px">
        <VStack spacing={{ base: 5, md: 8 }} align="stretch">
          <Box>
            <Heading
              size={{ base: 'lg', md: 'xl' }}
              color={titleColor}
              fontWeight="700"
              letterSpacing="-0.02em"
              mb={1}
            >
              Dashboard
            </Heading>
            <Text fontSize={{ base: 'sm', md: 'md' }} color={subtitleColor}>
              Platform overview — users, content, and learning activity at a glance.
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 3, md: 4 }}>
            {stats.map((stat, index) => (
              <AdminStatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                accent={stat.accent}
                icon={stat.icon}
                index={index}
                onClick={() => navigate(stat.route)}
              />
            ))}
          </SimpleGrid>

          {summary && summary.pendingUsers > 0 && (
            <MotionCard
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              bg={alertBg}
              borderWidth="1px"
              borderColor={alertBorder}
              boxShadow="sm"
              cursor="pointer"
              onClick={() => navigate('/admin/users?status=pending')}
              _hover={{ boxShadow: 'md' }}
            >
              <CardBody p={{ base: 4, md: 5 }}>
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Text fontWeight="semibold" color={titleColor}>
                        Action required
                      </Text>
                      <Badge colorScheme="orange" borderRadius="full" px={2}>
                        {summary.pendingUsers}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color={subtitleColor}>
                      {summary.pendingUsers} user{summary.pendingUsers > 1 ? 's' : ''} awaiting approval.
                      Review in User Management.
                    </Text>
                  </VStack>
                  <Button
                    size="sm"
                    colorScheme="orange"
                    rightIcon={<FiArrowRight />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/admin/users?status=pending');
                    }}
                  >
                    Review
                  </Button>
                </HStack>
              </CardBody>
            </MotionCard>
          )}

          <Box>
            <Text fontSize="xs" fontWeight="semibold" letterSpacing="0.06em" textTransform="uppercase" color={subtitleColor} mb={3}>
              Quick links
            </Text>
            <HStack flexWrap="wrap" gap={2}>
              {[
                { label: 'Analytics', route: '/admin/analytics' },
                { label: 'Quiz Scheduler', route: '/admin/quiz-scheduler' },
                { label: 'Study Library', route: '/admin/study-library-content' },
                { label: 'Plans', route: '/admin/plans' },
              ].map((link) => (
                <Button
                  key={link.route}
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  fontWeight="medium"
                  onClick={() => navigate(link.route)}
                >
                  {link.label}
                </Button>
              ))}
            </HStack>
          </Box>
        </VStack>
      </Box>
    </PullToRefresh>
  );
};
