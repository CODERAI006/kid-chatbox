/**
 * Read-only age / learning-group preview derived from date of birth at registration.
 */

import { Text, VStack } from '@/shared/design-system';
import { REGISTER_CONSTANTS } from '@/constants/auth';
import { AGE_GROUP_LABELS } from '@/constants/topics';
import { deriveRegistrationAgeFields } from '@/utils/birthDate';
import { QUIZ_CONSTANTS } from '@/constants/quiz';

interface RegistrationAgePreviewProps {
  birthDate: string;
  hintColor?: string;
  valueColor?: string;
}

export function RegistrationAgePreview({
  birthDate,
  hintColor = 'gray.500',
  valueColor = 'blue.600',
}: RegistrationAgePreviewProps) {
  if (!birthDate) return null;

  const { age, ageGroup } = deriveRegistrationAgeFields(birthDate);
  const ageGroupLabel = ageGroup ? (AGE_GROUP_LABELS[ageGroup] ?? ageGroup) : null;
  const outOfRange =
    age != null &&
    (age < QUIZ_CONSTANTS.MIN_AGE || age > QUIZ_CONSTANTS.MAX_AGE);

  if (age == null || outOfRange) {
    return (
      <Text fontSize="xs" color="red.500" marginTop={1}>
        {REGISTER_CONSTANTS.AGE_OUT_OF_RANGE}
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={1} marginTop={1}>
      <Text fontSize="xs" color={valueColor} fontWeight="semibold">
        Age: {age} · Learning group: {ageGroupLabel}
      </Text>
      <Text fontSize="xs" color={hintColor}>
        {REGISTER_CONSTANTS.AGE_AUTO_LABEL}
      </Text>
    </VStack>
  );
}
