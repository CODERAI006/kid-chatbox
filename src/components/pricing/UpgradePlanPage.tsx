/**
 * Student upgrade flow — pay via UPI and upload payment screenshot.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert, AlertIcon, Box, Button, Card, CardBody, FormControl, FormLabel, Heading,
  Image, Input, Skeleton, Text, VStack, useToast, Link, Badge, HStack,
} from '@/shared/design-system';
import { publicApi, authApi } from '@/services/api';
import { paymentApi } from '@/services/payment';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { formatPlanPrice } from '@/utils/planPricing';
import type { PaymentConfig } from '@/types/payment';

function assetUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const base = import.meta.env.DEV
    ? `http://${window.location.hostname}:3001`
    : window.location.origin;
  return `${base}${path}`;
}

export function UpgradePlanPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = params.get('planId') || '';
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState<{
    id: string; name: string; monthly_cost: number; description: string | null;
  } | null>(null);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const { user } = authApi.getCurrentUser();
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!planId) {
      navigate('/plans', { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      if (!loadedRef.current) setLoading(true);
      try {
        const [plansRes, payRes] = await Promise.all([
          publicApi.getPricingPlans(),
          publicApi.getPaymentConfig(),
        ]);
        if (cancelled) return;

        const found = plansRes.plans.find((p) => p.id === planId);
        if (!found || found.monthly_cost <= 0) {
          toast({ title: 'Invalid plan', status: 'error', duration: 4000 });
          navigate('/plans', { replace: true });
          return;
        }
        setPlan(found);
        setPayment(payRes);
        loadedRef.current = true;
      } catch (err) {
        if (!cancelled) {
          toast({ title: 'Failed to load', description: String(err), status: 'error', duration: 5000 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [planId, navigate, toast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = useCallback(async () => {
    if (!plan || !screenshot) {
      toast({ title: 'Please upload payment screenshot', status: 'warning', duration: 3000 });
      return;
    }
    if (!payment?.enabled) {
      toast({ title: 'Payments not configured', status: 'error', duration: 4000 });
      return;
    }
    setSubmitting(true);
    try {
      const res = await paymentApi.submitProof(plan.id, screenshot, transactionRef || undefined);
      toast({ title: res.message, status: 'success', duration: 6000 });
      navigate('/plans', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Submission failed', description: msg, status: 'error', duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  }, [plan, screenshot, payment, transactionRef, toast, navigate]);

  const whatsappLink = payment?.phoneNumber
    ? `https://wa.me/${payment.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi, I have paid for ${plan?.name || 'plan'} (${formatPlanPrice(plan?.monthly_cost || 0)}). Please find my screenshot attached.`
      )}`
    : null;

  return (
    <StudentPageLayout icon="💳" title="Upgrade Plan" subtitle="Step 2–3: Pay via UPI and upload screenshot">
      <VStack spacing={6} align="stretch" maxW="520px" mx="auto" minH="400px">
        <Button variant="link" alignSelf="start" size="sm" onClick={() => navigate('/plans')}>
          ← Back to plans
        </Button>
        <HStack spacing={2} flexWrap="wrap">
          <Badge colorScheme="green">Step 2: Pay UPI</Badge>
          <Badge colorScheme="purple">Step 3: Upload screenshot</Badge>
        </HStack>

        {loading && !plan ? (
          <VStack spacing={4} align="stretch">
            <Skeleton height="100px" borderRadius="md" />
            <Skeleton height="200px" borderRadius="md" />
          </VStack>
        ) : plan && payment ? (
          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Badge colorScheme="purple" mb={2}>Selected plan</Badge>
                  <Heading size="md">{plan.name}</Heading>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600" mt={1}>
                    {formatPlanPrice(plan.monthly_cost)}
                  </Text>
                  {plan.description && <Text fontSize="sm" color="gray.600" mt={1}>{plan.description}</Text>}
                </Box>

                {!payment.enabled ? (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    Online payments are not set up yet. Please contact your admin to upgrade.
                  </Alert>
                ) : (
                  <>
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      {payment.instructions || 'Pay via UPI, then upload your payment screenshot below.'}
                    </Alert>

                    <Box bg="gray.50" p={4} borderRadius="md">
                      {payment.payeeName && <Text fontWeight="semibold">{payment.payeeName}</Text>}
                      {payment.upiId && (
                        <HStack mt={1} flexWrap="wrap">
                          <Text>
                            UPI: <Text as="span" fontFamily="mono" fontWeight="bold">{payment.upiId}</Text>
                          </Text>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              void navigator.clipboard.writeText(payment.upiId);
                              toast({ title: 'UPI ID copied', status: 'success', duration: 2000 });
                            }}
                          >
                            Copy
                          </Button>
                        </HStack>
                      )}
                      {payment.phoneNumber && (
                        <Text mt={1} fontSize="sm">
                          Or send screenshot to: <strong>{payment.phoneNumber}</strong>
                          {whatsappLink && (
                            <> — <Link href={whatsappLink} color="green.600" isExternal>Open WhatsApp</Link></>
                          )}
                        </Text>
                      )}
                      {payment.qrImageUrl && (
                        <Image
                          src={assetUrl(payment.qrImageUrl)}
                          alt="UPI QR"
                          maxW="180px"
                          mt={3}
                          mx="auto"
                          borderRadius="md"
                        />
                      )}
                    </Box>

                    <FormControl>
                      <FormLabel>UTR / transaction reference (optional)</FormLabel>
                      <Input
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="12-digit UPI reference"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Payment screenshot</FormLabel>
                      <Input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} p={1} />
                      {preview && (
                        <Image src={preview} alt="Preview" maxH="200px" mt={2} borderRadius="md" objectFit="contain" />
                      )}
                    </FormControl>

                    <Button colorScheme="green" size="lg" onClick={handleSubmit} isLoading={submitting}>
                      Submit payment proof
                    </Button>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Your plan will be activated after admin verifies your payment.
                    </Text>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        ) : null}
      </VStack>
    </StudentPageLayout>
  );
}
