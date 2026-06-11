/**
 * Dashboard component - Main landing page after login
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
} from '@/shared/design-system';
import { analyticsApi, planApi, studyApi } from '@/services/api';
import { AnalyticsData, User } from '@/types';
import { MESSAGES } from '@/constants/app';
import { getDashboardHeartGreeting } from '@/utils/dashboardGreeting';
import { UpcomingTestsSidebar } from './UpcomingTestsSidebar';
import { StudentUpcomingTestsMarquee } from '@/components/layout/StudentUpcomingTestsMarquee';
import { PullToRefresh } from './PullToRefresh';
import { WordOfTheDay } from './WordOfTheDay';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { isAppAdmin } from '@/utils/userAccess';
import { SuggestedTopicsCard, type SuggestedTopicItem } from '@/components/dashboard/SuggestedTopicsCard';
import { MyStudyCard, type RecentStudyItem } from '@/components/dashboard/MyStudyCard';
import { MyScheduleCard } from '@/components/dashboard/MyScheduleCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { ActionTile } from '@/components/dashboard/ActionTile';
import { PlanSummaryCard, type PlanInfo } from '@/components/dashboard/PlanSummaryCard';

interface DashboardProps {
  user: User;
}

const emptyAnalytics: AnalyticsData = {
  total_quizzes: 0,
  per_subject_accuracy: {},
  per_subtopic_accuracy: {},
  time_spent_studying: 0,
  improvement_trend: [],
  last_three_scores: [],
  recent_activities: [],
  strengths: [],
  weaknesses: [],
  recommended_topics: [],
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const { showAiStudy, showAiQuiz, loading: aiFlagsLoading } = usePlanAiFlags(user.id);
  const isAdmin = isAppAdmin(user as unknown as Record<string, unknown>);
  const canShowAiStudy = showAiStudy || isAdmin;
  const canShowAiQuiz = showAiQuiz || isAdmin;
  const actionCardCount = (canShowAiStudy ? 1 : 0) + (canShowAiQuiz ? 1 : 0);
  const showActionCards = !aiFlagsLoading && actionCardCount > 0;
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [recentStudy, setRecentStudy] = useState<RecentStudyItem[]>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await analyticsApi.getAnalytics(user.id));
    } catch {
      setAnalytics(emptyAnalytics);
    }
  }, [user.id]);

  const loadStudyPreview = useCallback(async () => {
    try {
      const res = await studyApi.getStudyHistory(user.id);
      if (res.success && Array.isArray(res.sessions)) {
        setRecentStudy(
          res.sessions.slice(0, 3).map((s) => ({
            id: String(s.id),
            subject: s.subject,
            topic: s.topic,
            lesson_title: s.lesson_title,
            timestamp: s.timestamp,
          }))
        );
      }
    } catch {
      setRecentStudy([]);
    }
  }, [user.id]);

  const loadPlanInfo = useCallback(async () => {
    try {
      setPlanLoading(true);
      setPlanInfo(await planApi.getUserPlan(user.id));
    } catch (error) {
      console.error('Failed to load plan info:', error);
      setPlanInfo({
        plan: {
          id: 'freemium',
          name: 'Freemium Plan',
          description: 'Free plan with basic limits',
          daily_quiz_limit: 1,
          daily_topic_limit: 1,
          monthly_cost: 0,
          status: 'active',
        },
        usage: { quizCount: 0, topicCount: 0, date: new Date().toISOString().split('T')[0] },
        limits: { dailyQuizLimit: 1, dailyTopicLimit: 1, remainingQuizzes: 1, remainingTopics: 1 },
      });
    } finally {
      setPlanLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadAnalytics();
    loadPlanInfo();
    loadStudyPreview();
  }, [loadAnalytics, loadPlanInfo, loadStudyPreview]);

  const suggestedTopicItems = useMemo((): SuggestedTopicItem[] => {
    if (!analytics) return [];
    if (analytics.recommended_topics.length > 0) {
      return analytics.recommended_topics.map((name, index) => ({
        name,
        score: analytics.per_subtopic_accuracy[name],
        rank: index + 1,
      }));
    }
    return analytics.weaknesses.map((name, index) => ({
      name,
      score: analytics.per_subject_accuracy[name],
      rank: index + 1,
    }));
  }, [analytics]);

  const handleRefresh = async () => {
    await Promise.all([loadAnalytics(), loadPlanInfo(), loadStudyPreview()]);
  };

  const goStudy = () => {
    if (planInfo?.limits.remainingTopics === 0) return;
    navigate('/study#ai-study');
  };

  const goQuiz = () => {
    if (planInfo?.limits.remainingQuizzes === 0) return;
    navigate('/quiz#ai-quiz');
  };

  const heartGreeting = useMemo(() => getDashboardHeartGreeting(user.name), [user.name]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box padding={{ base: 2, sm: 3, md: 4, lg: 6 }} maxWidth="1400px" margin="0 auto" width="100%" overflowX="hidden" boxSizing="border-box">
        <VStack spacing={{ base: 4, md: 5 }} align="stretch">
          <VStack align={{ base: 'center', md: 'start' }} spacing={{ base: 1, md: 2 }}>
            <Heading size={{ base: 'md', sm: 'lg', md: 'xl', lg: '2xl' }} color="blue.600" lineHeight="shorter" textAlign={{ base: 'center', md: 'left' }}>
              {heartGreeting}
            </Heading>
          </VStack>

          <StudentUpcomingTestsMarquee />

          <Box display={{ base: 'block', lg: 'flex' }} gap={{ base: 4, md: 5, lg: 6 }} width="100%" flexDirection={{ base: 'column', lg: 'row' }}>
            <Box flex={{ base: 'none', lg: 1 }} width={{ base: '100%', lg: 'auto' }} minW={{ base: '100%', lg: 0 }}>
              <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                {showActionCards && (
                  <SimpleGrid columns={{ base: actionCardCount > 1 ? 2 : 1, sm: actionCardCount > 1 ? 2 : 1 }} spacing={{ base: 2, sm: 3, md: 4, lg: 5 }}>
                    {canShowAiStudy && (
                      <ActionTile
                        emoji="📚"
                        title={MESSAGES.STUDY_MODE_TITLE}
                        disabled={!!planInfo && planInfo.limits.remainingTopics === 0}
                        limitLabel="Limit"
                        hint={planInfo && planInfo.limits.remainingTopics === 0 ? 'Daily topic limit reached. Try again tomorrow!' : 'Learn new topics with fun lessons!'}
                        onClick={goStudy}
                      />
                    )}
                    {canShowAiQuiz && (
                      <ActionTile
                        emoji="🎯"
                        title={MESSAGES.QUIZ_MODE_TITLE}
                        disabled={!!planInfo && planInfo.limits.remainingQuizzes === 0}
                        limitLabel="Limit"
                        hint={planInfo && planInfo.limits.remainingQuizzes === 0 ? 'Daily quiz limit reached. Try again tomorrow!' : 'Test your knowledge with quizzes!'}
                        onClick={goQuiz}
                      />
                    )}
                  </SimpleGrid>
                )}

                <Box display={{ base: 'block', lg: 'none' }} w="100%">
                  <WordOfTheDay grade={user.grade} variant="dashboard" />
                </Box>

                {canShowAiStudy && (
                  <MyStudyCard
                    sessions={recentStudy}
                    remainingTopics={planInfo?.limits.remainingTopics}
                    canStudy={!planInfo || planInfo.limits.remainingTopics > 0}
                    onStudyClick={goStudy}
                  />
                )}

                <MyScheduleCard />

                {analytics && (
                  <SuggestedTopicsCard items={suggestedTopicItems} hasQuizHistory={analytics.total_quizzes > 0} />
                )}
              </VStack>
            </Box>

            <VStack spacing={{ base: 3, md: 4, lg: 5 }} align="stretch" w={{ base: '100%', lg: '350px' }} minW={{ base: '100%', lg: '350px' }} maxW={{ base: '100%', lg: '350px' }} order={{ base: -1, lg: 0 }} flexShrink={0}>
              {planInfo && !planLoading && <PlanSummaryCard planInfo={planInfo} />}
              <Box display={{ base: 'none', lg: 'block' }} w="100%">
                <WordOfTheDay grade={user.grade} variant="dashboard" />
              </Box>
              <UpcomingTestsSidebar planInfo={planInfo} />
            </VStack>
          </Box>

          {analytics && analytics.recent_activities.length > 0 && (
            <RecentActivityCard items={analytics.recent_activities} />
          )}

          <Card bg="green.50" borderColor="green.200" w="100%">
            <CardBody p={{ base: 3, md: 4 }}>
              <Text fontSize={{ base: 'xs', sm: 'sm', md: 'md' }} color="green.700" textAlign="center" fontWeight="semibold" px={{ base: 2, md: 0 }}>
                {MESSAGES.MOTIVATIONAL}
              </Text>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </PullToRefresh>
  );
};
