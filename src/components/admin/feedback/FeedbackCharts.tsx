/**
 * Recharts visualizations for admin feedback analytics.
 */

import { FC } from 'react';
import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  useColorModeValue,
} from '@/shared/design-system';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AdminFeedbackAnalytics } from '@/types/feedback';
import { wishLabel, ratingEmoji } from './feedbackLabels';

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

interface FeedbackChartsProps {
  analytics: AdminFeedbackAnalytics;
  showGradeChart: boolean;
}

export const FeedbackCharts: FC<FeedbackChartsProps> = ({ analytics, showGradeChart }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const muted = useColorModeValue('gray.600', 'gray.400');

  const ratingData = [1, 2, 3, 4, 5].map((r) => {
    const hit = analytics.ratingDistribution.find((d) => d.rating === r);
    return { rating: `${ratingEmoji(r)} ${r}`, count: hit?.count ?? 0 };
  });

  const wishData = analytics.featureWishes.map((w) => ({
    name: wishLabel(w.wish).slice(0, 18),
    count: w.count,
  }));

  const timelineData = analytics.overTime.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    submissions: d.count,
    avgRating: d.avgRating,
  }));

  const sourceData = analytics.bySource.map((s) => ({
    name: s.source === 'quiz_results' ? 'After Quiz' : s.source === 'sidebar' ? 'Side Nav' : 'General',
    value: s.count,
  }));

  const gradeData = analytics.byGrade.map((g) => ({
    grade: g.grade.length > 14 ? `${g.grade.slice(0, 12)}…` : g.grade,
    count: g.count,
    avgRating: g.avgRating,
  }));

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card bg={cardBg} borderRadius="xl" boxShadow="sm">
      <CardHeader pb={0}>
        <Heading size="sm">{title}</Heading>
      </CardHeader>
      <CardBody>
        {children}
      </CardBody>
    </Card>
  );

  if (analytics.summary.total === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color={muted}>No feedback in this period for the selected grade.</Text>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
      <ChartCard title="Rating distribution">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ratingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Responses" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top feature requests">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={wishData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} name="Votes" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Submissions over time">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" domain={[1, 5]} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="submissions" stroke="#7C3AED" strokeWidth={2} name="Count" />
            <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke="#10B981" strokeWidth={2} name="Avg rating" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Feedback source">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {sourceData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {showGradeChart && gradeData.length > 0 && (
        <Box gridColumn={{ lg: '1 / -1' }}>
          <ChartCard title="Feedback by grade">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[1, 5]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#6366F1" name="Count" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgRating" fill="#F59E0B" name="Avg rating" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>
      )}
    </SimpleGrid>
  );
};
