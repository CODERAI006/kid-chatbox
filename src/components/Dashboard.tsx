/**
 * Dashboard — student home after login with animated sections and quick stats.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { DailyPuzzlesPanel } from '@/components/puzzles/DailyPuzzlesPanel';
import { PUZZLE_HOME_PREVIEW_COUNT } from '@/constants/puzzles';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { isAppAdmin } from '@/utils/userAccess';
import { type RecentStudyItem } from '@/components/dashboard/MyStudyCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import {
  SuggestedTopicsCard,
  type SuggestedTopicItem,
} from '@/components/dashboard/SuggestedTopicsCard';
import { ActionTile } from '@/components/dashboard/ActionTile';
import { type PlanInfo } from '@/components/dashboard/PlanSummaryCard';
import { YourPlanPanel } from '@/components/dashboard/YourPlanPanel';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardAnimatedSection } from '@/components/dashboard/DashboardAnimatedSection';
import { AppInstallButton } from '@/components/layout/AppInstallButton';
import { useAutoAppInstallPrompt } from '@/hooks/useAutoAppInstallPrompt';

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
  useAutoAppInstallPrompt();
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
  const showInsights =
    analytics &&
    (analytics.total_quizzes > 0 || analytics.recent_activities.length > 0);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box
        padding={{ base: 2, sm: 3, md: 4, lg: 6 }}
        maxWidth="1400px"
        margin="0 auto"
        width="100%"
        overflowX="hidden"
        boxSizing="border-box"
      >
        <VStack spacing={{ base: 4, md: 5 }} align="stretch">
          <DashboardHeader greeting={heartGreeting} grade={user.grade} />

          <AppInstallButton />
          <StudentUpcomingTestsMarquee />

          <Box
            display={{ base: 'block', lg: 'flex' }}
            gap={{ base: 4, md: 5, lg: 6 }}
            width="100%"
            flexDirection={{ base: 'column', lg: 'row' }}
            alignItems="flex-start"
          >
            <Box flex={{ base: 'none', lg: 1 }} width="100%" minW={0}>
              <VStack spacing={{ base: 4, md: 5 }} align="stretch">
                {showActionCards && (
                  <DashboardAnimatedSection>
                    <VStack align="stretch" spacing={2}>
                      <Heading size="sm" color="gray.700">
                        Quick actions
                      </Heading>
                      <SimpleGrid
                        columns={{ base: actionCardCount > 1 ? 2 : 1, sm: actionCardCount > 1 ? 2 : 1 }}
                        spacing={{ base: 2, sm: 3, md: 4 }}
                      >
                        {canShowAiStudy && (
                          <ActionTile
                            emoji="📚"
                            title={MESSAGES.STUDY_MODE_TITLE}
                            disabled={!!planInfo && planInfo.limits.remainingTopics === 0}
                            limitLabel="Limit"
                            hint={
                              planInfo && planInfo.limits.remainingTopics === 0
                                ? 'Daily topic limit reached. Try again tomorrow!'
                                : 'Learn new topics with fun lessons!'
                            }
                            onClick={goStudy}
                            delay={0.1}
                          />
                        )}
                        {canShowAiQuiz && (
                          <ActionTile
                            emoji="🎯"
                            title={MESSAGES.QUIZ_MODE_TITLE}
                            disabled={!!planInfo && planInfo.limits.remainingQuizzes === 0}
                            limitLabel="Limit"
                            hint={
                              planInfo && planInfo.limits.remainingQuizzes === 0
                                ? 'Daily quiz limit reached. Try again tomorrow!'
                                : 'Test your knowledge with quizzes!'
                            }
                            onClick={goQuiz}
                            delay={0.18}
                          />
                        )}
                      </SimpleGrid>
                    </VStack>
                  </DashboardAnimatedSection>
                )}

                <DashboardAnimatedSection delay={0.05}>
                  <VStack align="stretch" spacing={2}>
                    <Heading size="sm" color="gray.700">
                      Today&apos;s picks
                    </Heading>
                    <WordOfTheDay grade={user.grade} />
                    <DailyPuzzlesPanel
                      grade={user.grade}
                      maxCount={PUZZLE_HOME_PREVIEW_COUNT}
                      showViewAll
                    />
                  </VStack>
                </DashboardAnimatedSection>
              </VStack>
            </Box>

            <VStack
              spacing={{ base: 3, md: 4 }}
              align="stretch"
              w={{ base: '100%', lg: '340px' }}
              minW={{ base: '100%', lg: '340px' }}
              maxW={{ base: '100%', lg: '340px' }}
              flexShrink={0}
            >
              <DashboardAnimatedSection delay={0.08}>
                <VStack spacing={{ base: 3, md: 4 }} align="stretch">
                  {planInfo && !planLoading && (
                    <YourPlanPanel
                      planInfo={planInfo}
                      recentStudy={recentStudy}
                      canShowAiStudy={canShowAiStudy}
                      canStudy={planInfo.limits.remainingTopics > 0}
                      onStudyClick={goStudy}
                    />
                  )}
                  <UpcomingTestsSidebar planInfo={planInfo} />
                </VStack>
              </DashboardAnimatedSection>
            </VStack>
          </Box>

          {showInsights && (
            <DashboardAnimatedSection delay={0.1}>
              <VStack align="stretch" spacing={3}>
                <Heading size="sm" color="gray.700">
                  Your progress
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                  {analytics && (
                    <SuggestedTopicsCard
                      items={suggestedTopicItems}
                      hasQuizHistory={analytics.total_quizzes > 0}
                    />
                  )}
                  {analytics && analytics.recent_activities.length > 0 && (
                    <RecentActivityCard items={analytics.recent_activities} />
                  )}
                </SimpleGrid>
              </VStack>
            </DashboardAnimatedSection>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Card bg="green.50" borderColor="green.200" w="100%">
              <CardBody p={{ base: 3, md: 4 }}>
                <Text
                  fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}
                  color="green.700"
                  textAlign="center"
                  fontWeight="semibold"
                >
                  {MESSAGES.MOTIVATIONAL}
                </Text>
              </CardBody>
            </Card>
          </motion.div>
        </VStack>
      </Box>
    </PullToRefresh>
  );
};
