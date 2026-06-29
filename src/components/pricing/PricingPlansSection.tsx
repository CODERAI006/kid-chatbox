/**
 * View-only pricing plans — shown on landing page and footer links.
 * Paid plans: students can upgrade via UPI + screenshot (admin activates).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  List,
  ListItem,
  Button,
} from '@/shared/design-system';
import { publicApi, authApi } from '@/services/api';
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

interface PricingPlansSectionProps {
  variant?: 'landing' | 'default';
  showHeading?: boolean;
}

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

export const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({
  variant = 'default',
  showHeading = true,
}) => {
  const isLanding = variant === 'landing';
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = Boolean(authApi.getCurrentUser().user);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await publicApi.getPricingPlans();
      setPlans(response.plans);
    } catch (err) {
      console.error('Failed to load pricing plans:', err);
      setError('Could not load pricing plans right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color={isLanding ? 'cyan.300' : 'blue.500'} />
      </Box>
    );
  }

  return (
    <Box id="pricing" scrollMarginTop="80px">
      <VStack spacing={6} align="stretch">
        {showHeading && (
          <Box textAlign="center">
            <Heading
              size={{ base: 'lg', md: 'xl' }}
              mb={2}
              color={isLanding ? 'white' : undefined}
              textShadow={isLanding ? '0 0 20px rgba(0, 242, 255, 0.4)' : undefined}
            >
              Pricing Plans
            </Heading>
            <Text color={isLanding ? 'whiteAlpha.800' : 'gray.600'} fontSize={{ base: 'sm', md: 'md' }}>
              Compare plans and upgrade via UPI. Upload your payment screenshot — we activate after verification.
            </Text>
          </Box>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={5}>
          {plans.map((plan) => {
            const isPopular = plan.name === 'Advance';

            return (
              <Card
                key={plan.id}
                borderWidth={2}
                borderColor={isPopular ? 'purple.300' : isLanding ? 'whiteAlpha.300' : 'gray.200'}
                bg={isLanding ? 'rgba(255, 255, 255, 0.08)' : 'white'}
                backdropFilter={isLanding ? 'blur(12px)' : undefined}
                boxShadow="lg"
                position="relative"
              >
                {isPopular && (
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
                <CardBody>
                  <VStack align="stretch" spacing={4} h="100%">
                    <Box>
                      <Heading size="md" color={isLanding ? 'white' : undefined}>
                        {plan.name}
                      </Heading>
                      <Text
                        fontSize="2xl"
                        fontWeight="bold"
                        color={isLanding ? 'cyan.300' : 'blue.600'}
                        mt={2}
                      >
                        {formatPlanPrice(plan.monthly_cost)}
                      </Text>
                      {plan.description && (
                        <Text fontSize="sm" color={isLanding ? 'whiteAlpha.700' : 'gray.600'} mt={2}>
                          {plan.description}
                        </Text>
                      )}
                    </Box>

                    <List spacing={2} flex={1}>
                      {planFeatures(plan).map((feature) => (
                        <ListItem key={feature} fontSize="sm" color={isLanding ? 'whiteAlpha.900' : undefined}>
                          <Text as="span" color="green.400" mr={2}>
                            ✓
                          </Text>
                          {feature}
                        </ListItem>
                      ))}
                    </List>

                    {plan.monthly_cost > 0 && (
                      <Button
                        size="sm"
                        colorScheme={isPopular ? 'purple' : 'blue'}
                        variant={isLanding ? 'solid' : 'outline'}
                        onClick={() => {
                          if (!isLoggedIn) {
                            navigate('/login');
                            return;
                          }
                          navigate(`/upgrade-plan?planId=${plan.id}`);
                        }}
                      >
                        {isLoggedIn ? 'Upgrade' : 'Sign in to upgrade'}
                      </Button>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};
