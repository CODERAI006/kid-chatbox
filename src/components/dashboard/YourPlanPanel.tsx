/**
 * Sidebar stack: plan limits, recent study, and schedules (dashboard home only).
 */

import type { FC } from 'react';
import { VStack } from '@/shared/design-system';
import { PlanSummaryCard, type PlanInfo } from '@/components/dashboard/PlanSummaryCard';
import { MyStudyCard, type RecentStudyItem } from '@/components/dashboard/MyStudyCard';
import { MyScheduleCard } from '@/components/dashboard/MyScheduleCard';
interface YourPlanPanelProps {
  planInfo: PlanInfo;
  recentStudy: RecentStudyItem[];
  canShowAiStudy: boolean;
  canStudy: boolean;
  onStudyClick: () => void;
}

export const YourPlanPanel: FC<YourPlanPanelProps> = ({
  planInfo,
  recentStudy,
  canShowAiStudy,
  canStudy,
  onStudyClick,
}) => (
  <VStack spacing={{ base: 3, md: 4 }} align="stretch" w="100%">
    <PlanSummaryCard planInfo={planInfo} />
    {canShowAiStudy && (
      <MyStudyCard
        sessions={recentStudy}
        remainingTopics={planInfo.limits.remainingTopics}
        canStudy={canStudy}
        onStudyClick={onStudyClick}
      />
    )}
    <MyScheduleCard />
  </VStack>
);
