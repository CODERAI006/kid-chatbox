/**
 * Live password requirement checklist for registration.
 */

import { HStack, Text, VStack } from '@/shared/design-system';
import { getPasswordChecks } from '@/utils/registerValidation';

interface PasswordRequirementsProps {
  password: string;
  variant?: 'light' | 'dark';
}

const variantStyles = {
  light: {
    passed: 'green.500',
    pending: 'gray.500',
    iconPassed: '✓',
    iconPending: '○',
  },
  dark: {
    passed: '#4ade80',
    pending: 'rgba(255, 255, 255, 0.45)',
    iconPassed: '✓',
    iconPending: '○',
  },
} as const;

export function PasswordRequirements({
  password,
  variant = 'light',
}: PasswordRequirementsProps) {
  const styles = variantStyles[variant];
  const checks = getPasswordChecks(password);

  return (
    <VStack align="stretch" spacing={1} mt={2} aria-live="polite">
      {checks.map((check) => (
        <HStack key={check.id} spacing={2}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            color={check.passed ? styles.passed : styles.pending}
            aria-hidden
          >
            {check.passed ? styles.iconPassed : styles.iconPending}
          </Text>
          <Text fontSize="xs" color={check.passed ? styles.passed : styles.pending}>
            {check.label}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
