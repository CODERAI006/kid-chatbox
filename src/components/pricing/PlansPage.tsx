/**
 * Student plans page — view current plan, compare upgrades, UPI payment history.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Card, CardBody, HStack, Skeleton, Text, VStack,
} from '@/shared/design-system';
import { planApi, publicApi, authApi } from '@/services/api';
import { paymentApi } from '@/services/payment';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { PlanSummaryCard, type PlanInfo } from '@/components/dashboard/PlanSummaryCard';
import { PricingPlansSection } from '@/components/pricing/PricingPlansSection';
import { PaymentRequestHistory } from '@/components/pricing/PaymentRequestHistory';
import { UpgradeFlowSteps } from '@/components/pricing/UpgradeFlowSteps';
import type { PaymentConfig, PaymentRequestSummary } from '@/types/payment';
import type { User } from '@/types';

type CatalogPlan = {
  id: string;
  name: string;
  description: string | null;
  daily_quiz_limit: number;
  daily_topic_limit: number;
  monthly_cost: number;
  hide_ai_study?: boolean;
  hide_ai_quiz?: boolean;
};

export function PlansPage() {
  const userId = (authApi.getCurrentUser().user as User | null)?.id;
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([]);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [requests, setRequests] = useState<PaymentRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const load = useCallback(async (showSpinner = false) => {
    if (!userId) return;
    if (showSpinner || !loadedRef.current) setLoading(true);
    try {
      const [plan, payRes, reqRes, plansRes] = await Promise.all([
        planApi.getUserPlan(userId),
        publicApi.getPaymentConfig(),
        paymentApi.getMyRequests(),
        publicApi.getPricingPlans(),
      ]);
      setPlanInfo(plan);
      setPayment(payRes);
      setRequests(reqRes.requests);
      setCatalogPlans(plansRes.plans);
      loadedRef.current = true;
    } catch (err) {
      console.error('Failed to load plans page:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load(true);
  }, [load]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <StudentPageLayout
      icon="💎"
      title="Plans & Upgrade"
      subtitle="Compare plans, pay via UPI, and share your payment screenshot"
    >
      <VStack spacing={6} align="stretch" maxW="1100px" mx="auto" minH="320px">
        {loading && !loadedRef.current ? (
          <VStack spacing={4} align="stretch">
            <Skeleton height="180px" borderRadius="md" />
            <Skeleton height="120px" borderRadius="md" />
            <Skeleton height="200px" borderRadius="md" />
          </VStack>
        ) : (
          <>
            {planInfo && <PlanSummaryCard planInfo={planInfo} />}

            <UpgradeFlowSteps payment={payment} />

            {payment?.enabled && payment.upiId && (
              <Card bg="green.50" borderColor="green.200" borderWidth={1}>
                <CardBody py={4}>
                  <HStack flexWrap="wrap" spacing={3} align="center">
                    <Text fontWeight="semibold" color="green.800">UPI ID for payment:</Text>
                    <Badge colorScheme="green" fontSize="md" px={3} py={1} fontFamily="mono">
                      {payment.upiId}
                    </Badge>
                    {payment.payeeName && (
                      <Text fontSize="sm" color="green.700">({payment.payeeName})</Text>
                    )}
                  </HStack>
                </CardBody>
              </Card>
            )}

            {pendingCount > 0 && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                You have {pendingCount} payment{pendingCount === 1 ? '' : 's'} awaiting admin verification.
              </Alert>
            )}

            <Box>
              <Text fontWeight="semibold" mb={3} color="gray.700">Available plans</Text>
              <PricingPlansSection variant="default" showHeading={false} plans={catalogPlans} />
            </Box>

            {requests.length > 0 && (
              <PaymentRequestHistory requests={requests} onRefresh={() => load(false)} />
            )}
          </>
        )}
      </VStack>
    </StudentPageLayout>
  );
}
