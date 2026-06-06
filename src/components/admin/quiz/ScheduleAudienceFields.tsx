/**
 * Plan selection with select-all helper for scheduled tests.
 */

import React from 'react';
import {
  FormControl, FormLabel, CheckboxGroup, Checkbox, VStack, HStack, Button, Text,
} from '@/shared/design-system';

interface ScheduleAudienceFieldsProps {
  plans: Array<{ id: string; name: string }>;
  planIds: string[];
  onPlanIdsChange: (planIds: string[]) => void;
}

export const ScheduleAudienceFields: React.FC<ScheduleAudienceFieldsProps> = ({
  plans,
  planIds,
  onPlanIdsChange,
}) => (
  <FormControl isRequired>
    <HStack justify="space-between" mb={1}>
      <FormLabel mb={0}>Who can take this test?</FormLabel>
      <HStack spacing={1}>
        <Button size="xs" variant="link" colorScheme="blue" onClick={() => onPlanIdsChange(plans.map((p) => p.id))}>
          All plans
        </Button>
        <Button size="xs" variant="link" onClick={() => onPlanIdsChange([])}>Clear</Button>
      </HStack>
    </HStack>
    <Text fontSize="xs" color="gray.500" mb={2}>
      Students on the selected plans will see this test when it opens.
    </Text>
    {plans.length === 0 ? (
      <Text fontSize="sm" color="orange.500">No active plans found. Create a plan under Admin → Plans first.</Text>
    ) : (
      <CheckboxGroup value={planIds} onChange={(values) => onPlanIdsChange(values as string[])}>
        <VStack align="start" spacing={2}>
          {plans.map((plan) => (
            <Checkbox key={plan.id} value={plan.id}>{plan.name}</Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
    )}
  </FormControl>
);
