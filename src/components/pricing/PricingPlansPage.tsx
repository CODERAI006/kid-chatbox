/**
 * Student pricing portal — browse and select subscription plans
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Card,
  CardBody,
  List,
  ListItem,
} from '@/shared/design-system';
import { planApi } from '@/services/api';
import { User } from '@/types';
import { formatPlanPrice } from '@/utils/planPricing';

interface CatalogPlan {
  id: string;
  name: string;
  description: string | null;
  daily_quiz_limit: number;
  daily_topic_limit: number;
  monthly_cost: number;
  hide_ai_study?: boolean;
  hide_ai_quiz?: boolean;
}

interface PricingPlansPageProps {
  user: User;
}

export const PricingPlansPage: React.FC<PricingPlansPageProps> = ({ user }) => {
  const toast = useToast();
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catalog, userPlan] = await Promise.all([
        planApi.getCatalogPlans(),
        planApi.getUserPlan(user.id),
      ]);
      setPlans(catalog.plans);
      setCurrentPlanId(userPlan.plan?.id ?? null);
    } catch (err) {
      console.error('Failed to load pricing plans:', err);
      setError('Could not load pricing plans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlanId) return;

    try {
      setSelectingId(planId);
      await planApi.selectPlan(planId);
      setCurrentPlanId(planId);
      toast({
        title: 'Plan updated',
        description: 'Your subscription plan has been changed.',
        status: 'success',
        duration: 4000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select plan';
      toast({
        title: 'Could not change plan',
        description: message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSelectingId(null);
    }
  };

  const planFeatures = (plan: CatalogPlan): string[] => {
    const features = [
      `${plan.daily_quiz_limit} quizzes per day`,
      `${plan.daily_topic_limit} study topics per day`,
    ];
    if (!plan.hide_ai_study) features.push('AI Study mode');
    if (!plan.hide_ai_quiz) features.push('AI Quiz mode');
    if (plan.hide_ai_study && plan.hide_ai_quiz) {
      features.push('Study Library & scheduled tests');
    }
    return features;
  };

  if (loading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size={{ base: 'lg', md: 'xl' }} mb={2}>
            Choose Your Plan
          </Heading>
          <Text color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>
            Pick a plan that fits your learning goals. Prices are configurable by your admin.
          </Text>
        </Box>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={5}>
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isPopular = plan.name === 'Advance';

            return (
              <Card
                key={plan.id}
                borderWidth={2}
                borderColor={isCurrent ? 'blue.400' : isPopular ? 'purple.300' : 'gray.200'}
                boxShadow={isCurrent ? 'lg' : 'md'}
                position="relative"
              >
                {isPopular && !isCurrent && (
                  <Badge
                    position="absolute"
                    top={-3}
                    right={4}
                    colorScheme="purple"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge
                    position="absolute"
                    top={-3}
                    right={4}
                    colorScheme="blue"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    Current plan
                  </Badge>
                )}
                <CardBody>
                  <VStack align="stretch" spacing={4} h="100%">
                    <Box>
                      <Heading size="md">{plan.name}</Heading>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.600" mt={2}>
                        {formatPlanPrice(plan.monthly_cost)}
                      </Text>
                      {plan.description && (
                        <Text fontSize="sm" color="gray.600" mt={2}>
                          {plan.description}
                        </Text>
                      )}
                    </Box>

                    <List spacing={2} flex={1}>
                      {planFeatures(plan).map((feature) => (
                        <ListItem key={feature} fontSize="sm">
                          <Text as="span" color="green.500" mr={2}>
                            ✓
                          </Text>
                          {feature}
                        </ListItem>
                      ))}
                    </List>

                    <Button
                      colorScheme={isCurrent ? 'gray' : 'blue'}
                      variant={isCurrent ? 'outline' : 'solid'}
                      isDisabled={isCurrent}
                      isLoading={selectingId === plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      w="100%"
                    >
                      {isCurrent ? 'Selected' : 'Select plan'}
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>

        <HStack justify="center" spacing={2} flexWrap="wrap">
          <Text fontSize="sm" color="gray.500">
            Need help choosing?
          </Text>
          <Button size="sm" variant="link" onClick={loadData}>
            Refresh plans
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
