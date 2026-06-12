/**
 * Admin screen — review student feedback with charts and grade filter.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Select,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  SimpleGrid,
  useColorModeValue,
} from '@/shared/design-system';
import { adminApi } from '@/services/admin';
import { AdminStatCard } from './AdminStatCard';
import { FeedbackCharts } from './feedback/FeedbackCharts';
import { FeedbackListTable } from './feedback/FeedbackListTable';
import type { AdminFeedbackAnalytics, AdminFeedbackItem } from '@/types/feedback';

export const FeedbackManagement: React.FC = () => {
  const [grade, setGrade] = useState('all');
  const [days, setDays] = useState('30');
  const [grades, setGrades] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<AdminFeedbackAnalytics | null>(null);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardBg = useColorModeValue('white', 'gray.800');

  const gradeParam = grade === 'all' ? undefined : grade;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [gradesRes, analyticsRes, listRes] = await Promise.all([
        adminApi.getFeedbackGrades(),
        adminApi.getFeedbackAnalytics({ grade: gradeParam, days: Number(days) }),
        adminApi.getFeedbackList({ grade: gradeParam, page, limit: 15 }),
      ]);
      setGrades(gradesRes.grades);
      setAnalytics(analyticsRes);
      setItems(listRes.items);
      setTotal(listRes.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [gradeParam, days, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [grade, days]);

  if (loading && !analytics) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="purple.500" />
        <Text mt={4}>Loading student feedback…</Text>
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <HStack justify="space-between" flexWrap="wrap" gap={3}>
            <Box>
              <Heading size="lg">Student Feedback</Heading>
              <Text color="gray.600" fontSize="sm" mt={1}>
                Review ratings, feature requests, and learning ideas from students
              </Text>
            </Box>
            <HStack spacing={3} flexWrap="wrap">
              <Select
                size="sm"
                w="auto"
                minW="160px"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                aria-label="Filter by grade"
              >
                <option value="all">All grades</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
              <Select
                size="sm"
                w="auto"
                minW="140px"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                aria-label="Time range"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </Select>
            </HStack>
          </HStack>
        </motion.div>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {analytics && (
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            <AdminStatCard label="Total feedback" value={analytics.summary.total} accent="violet" icon="💬" index={0} />
            <AdminStatCard label="Avg rating" value={analytics.summary.avgRating.toFixed(1)} accent="blue" icon="⭐" index={1} />
            <AdminStatCard label="This week" value={analytics.summary.thisWeek} accent="emerald" icon="📈" index={2} />
          </SimpleGrid>
        )}

        {analytics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <FeedbackCharts analytics={analytics} showGradeChart={grade === 'all'} />
          </motion.div>
        )}

        <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
          <CardBody>
            <Heading size="sm" mb={4}>All submissions</Heading>
            {loading ? (
              <Box textAlign="center" py={6}><Spinner /></Box>
            ) : (
              <FeedbackListTable
                items={items}
                total={total}
                page={page}
                pageSize={15}
                onPageChange={setPage}
              />
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};
