/**
 * Visual guide for UPI upgrade flow.
 */

import { Box, Card, CardBody, HStack, Text, VStack } from '@/shared/design-system';
import type { PaymentConfig } from '@/types/payment';

const STEPS = [
  { n: 1, title: 'Choose a plan', desc: 'Pick the plan that fits your learning goals.' },
  { n: 2, title: 'Pay via UPI', desc: 'Send payment to the UPI ID shown below or scan the QR code.' },
  { n: 3, title: 'Upload screenshot', desc: 'Share your payment screenshot so admin can verify.' },
  { n: 4, title: 'Get activated', desc: 'Admin verifies and your plan is upgraded automatically.' },
];

interface UpgradeFlowStepsProps {
  payment: PaymentConfig | null;
}

export function UpgradeFlowSteps({ payment }: UpgradeFlowStepsProps) {
  if (!payment?.enabled) {
    return (
      <Card>
        <CardBody>
          <Text fontSize="sm" color="gray.600">
            Online upgrades are not available yet. Please contact your admin to change your plan.
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <Text fontWeight="semibold" mb={3} color="gray.700">How to upgrade</Text>
        <VStack spacing={3} align="stretch">
          {STEPS.map((step) => (
            <HStack key={step.n} align="start" spacing={3}>
              <Box
                bg="purple.500"
                color="white"
                borderRadius="full"
                w={7}
                h={7}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="bold"
                flexShrink={0}
              >
                {step.n}
              </Box>
              <Box>
                <Text fontWeight="semibold" fontSize="sm">{step.title}</Text>
                <Text fontSize="xs" color="gray.600">{step.desc}</Text>
              </Box>
            </HStack>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
}
