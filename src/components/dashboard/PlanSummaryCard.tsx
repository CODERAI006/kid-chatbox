import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Progress,
  Badge,
  Button,
} from '@/shared/design-system';
import { useNavigate } from 'react-router-dom';
import { formatPlanPrice } from '@/utils/planPricing';

export interface PlanInfo {
  plan: {
    id: string;
    name: string;
    description: string | null;
    daily_quiz_limit: number;
    daily_topic_limit: number;
    monthly_cost: number;
    status: string;
    plan_end_date?: string | null;
    is_plan_active?: boolean;
    days_remaining?: number | null;
  };
  usage: {
    quizCount: number;
    topicCount: number;
    date: string;
  };
  limits: {
    dailyQuizLimit: number;
    dailyTopicLimit: number;
    remainingQuizzes: number;
    remainingTopics: number;
  };
  planActive?: boolean;
  planEndDate?: string | null;
  daysRemaining?: number | null;
}

function LimitRow({
  label,
  remaining,
  total,
  used,
}: {
  label: string;
  remaining: number;
  total: number;
  used: number;
}) {
  return (
    <Box>
      <HStack justifyContent="space-between" mb={1} flexWrap="wrap">
        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.700">
          {label}
        </Text>
        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="bold" color={remaining === 0 ? 'red.600' : 'green.600'}>
          {remaining} left
        </Text>
      </HStack>
      <Progress
        value={(used / total) * 100}
        colorScheme={remaining === 0 ? 'red' : remaining <= total * 0.3 ? 'orange' : 'green'}
        size={{ base: 'xs', md: 'sm' }}
        borderRadius="md"
      />
    </Box>
  );
}

export const PlanSummaryCard: React.FC<{ planInfo: PlanInfo }> = ({ planInfo }) => {
  const navigate = useNavigate();
  return (
  <Box w="100%" alignSelf="start">
    <Card bgGradient="linear(to-br, blue.50, purple.50)" borderWidth={2} borderColor="blue.200" boxShadow="lg" width="100%">
      <CardBody p={{ base: 3, sm: 3.5, md: 4, lg: 5 }}>
        <VStack spacing={{ base: 2.5, sm: 3, md: 3.5, lg: 4 }} align="stretch">
          <VStack align="start" spacing={1}>
            <HStack spacing={2} flexWrap="wrap" alignItems="center" w="100%">
              <Heading size={{ base: 'xs', sm: 'sm', md: 'md' }} color="blue.700" noOfLines={1}>
                Your Plan
              </Heading>
              {typeof planInfo.plan.monthly_cost === 'number' && planInfo.plan.monthly_cost > 0 ? (
                <Badge colorScheme="green" fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}>
                  {formatPlanPrice(planInfo.plan.monthly_cost)}
                </Badge>
              ) : (
                <Badge colorScheme="blue" fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}>
                  Free
                </Badge>
              )}
            </HStack>
            <Text fontSize={{ base: 'xs', sm: 'sm', md: 'lg' }} fontWeight="bold" color="blue.800" noOfLines={2}>
              {planInfo.plan.name}
            </Text>
            {planInfo.planEndDate && (
              <HStack spacing={2} flexWrap="wrap">
                <Badge
                  colorScheme={planInfo.planActive === false ? 'red' : 'purple'}
                  fontSize={{ base: '2xs', sm: 'xs' }}
                >
                  {planInfo.planActive === false
                    ? `Expired ${new Date(planInfo.planEndDate).toLocaleDateString()}`
                    : `Active until ${new Date(planInfo.planEndDate).toLocaleDateString()}`}
                </Badge>
                {planInfo.daysRemaining != null && planInfo.planActive !== false && (
                  <Text fontSize={{ base: '2xs', sm: 'xs' }} color="gray.600">
                    {planInfo.daysRemaining} day{planInfo.daysRemaining === 1 ? '' : 's'} left
                  </Text>
                )}
              </HStack>
            )}
          </VStack>
          <VStack spacing={{ base: 2, md: 3 }} align="stretch" width="100%">
            <LimitRow
              label={`📝 Quiz: ${planInfo.usage.quizCount}/${planInfo.limits.dailyQuizLimit}`}
              remaining={planInfo.limits.remainingQuizzes}
              total={planInfo.limits.dailyQuizLimit}
              used={planInfo.usage.quizCount}
            />
            <LimitRow
              label={`📚 Topic: ${planInfo.usage.topicCount}/${planInfo.limits.dailyTopicLimit}`}
              remaining={planInfo.limits.remainingTopics}
              total={planInfo.limits.dailyTopicLimit}
              used={planInfo.usage.topicCount}
            />
          </VStack>
          <Button
            size="sm"
            colorScheme="purple"
            variant="outline"
            onClick={() => navigate('/plans')}
          >
            View plans & upgrade
          </Button>
        </VStack>
      </CardBody>
    </Card>
  </Box>
  );
};
