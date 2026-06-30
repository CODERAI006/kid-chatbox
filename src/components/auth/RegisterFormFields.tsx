/**
 * Shared registration form fields with per-field validation UI.
 */

import {
  FormControl,
  Input,
  Select,
  Text,
  VStack,
} from '@/shared/design-system';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { RegistrationAgePreview } from '@/components/auth/RegistrationAgePreview';
import { REGISTER_CONSTANTS, GRADES } from '@/constants/auth';
import { RegisterData } from '@/types';
import { RegisterFieldKey } from '@/utils/registerValidation';

type RegisterVariant = 'light' | 'dark';

interface RegisterFormFieldsProps {
  formData: RegisterData;
  onChange: (data: RegisterData) => void;
  errors: Partial<Record<RegisterFieldKey, string>>;
  shouldShowError: (field: RegisterFieldKey) => boolean;
  isFieldValid: (field: RegisterFieldKey) => boolean;
  markTouched: (field: RegisterFieldKey) => void;
  maxBirthDate: string;
  variant?: RegisterVariant;
}

const darkInputProps = {
  borderRadius: 'lg' as const,
  bg: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  _placeholder: { color: 'rgba(255, 255, 255, 0.5)' },
  _hover: { borderColor: 'rgba(0, 242, 255, 0.5)' },
  _focus: { borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' },
};

function getBorderColor(
  variant: RegisterVariant,
  showError: boolean,
  showValid: boolean
): string | undefined {
  if (showError) {
    return variant === 'dark' ? '#f87171' : 'red.400';
  }
  if (showValid) {
    return variant === 'dark' ? '#4ade80' : 'green.400';
  }
  return undefined;
}

function FieldError({
  message,
  variant,
}: {
  message: string;
  variant: RegisterVariant;
}) {
  return (
    <Text
      fontSize="xs"
      mt={1}
      color={variant === 'dark' ? '#fca5a5' : 'red.500'}
      role="alert"
    >
      {message}
    </Text>
  );
}

function FieldLabel({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: RegisterVariant;
}) {
  return (
    <Text
      fontSize="sm"
      fontWeight="semibold"
      marginBottom={2}
      color={variant === 'dark' ? 'rgba(255, 255, 255, 0.8)' : undefined}
    >
      {children}
    </Text>
  );
}

export function RegisterFormFields({
  formData,
  onChange,
  errors,
  shouldShowError,
  isFieldValid,
  markTouched,
  maxBirthDate,
  variant = 'light',
}: RegisterFormFieldsProps) {
  const isDark = variant === 'dark';
  const hintColor = isDark ? 'rgba(255, 255, 255, 0.55)' : 'gray.500';
  const ageHintColor = isDark ? 'rgba(255, 255, 255, 0.5)' : undefined;
  const ageValueColor = isDark ? '#00f2ff' : undefined;

  const fieldProps = (field: RegisterFieldKey) => {
    const invalid = shouldShowError(field);
    const valid = isFieldValid(field);
    const borderColor = getBorderColor(variant, invalid, valid);

    return {
      size: 'lg' as const,
      ...(isDark ? darkInputProps : {}),
      ...(borderColor ? { borderColor } : {}),
      'aria-invalid': invalid,
      'aria-describedby': invalid ? `${field}-error` : undefined,
    };
  };

  const updateField = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => {
    onChange({ ...formData, [key]: value });
  };

  return (
    <VStack spacing={4}>
      <FormControl isRequired isInvalid={shouldShowError('name')}>
        <FieldLabel variant={variant}>{REGISTER_CONSTANTS.NAME_LABEL} *</FieldLabel>
        <Input
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          onBlur={() => markTouched('name')}
          placeholder={REGISTER_CONSTANTS.NAME_PLACEHOLDER}
          autoComplete="name"
          {...fieldProps('name')}
        />
        {shouldShowError('name') && errors.name && (
          <FieldError message={errors.name} variant={variant} />
        )}
      </FormControl>

      <FormControl isRequired isInvalid={shouldShowError('email')}>
        <FieldLabel variant={variant}>{REGISTER_CONSTANTS.EMAIL_LABEL} *</FieldLabel>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          onBlur={() => markTouched('email')}
          placeholder={REGISTER_CONSTANTS.EMAIL_PLACEHOLDER}
          autoComplete="email"
          {...fieldProps('email')}
        />
        {shouldShowError('email') && errors.email && (
          <FieldError message={errors.email} variant={variant} />
        )}
      </FormControl>

      <FormControl isRequired isInvalid={shouldShowError('password')}>
        <FieldLabel variant={variant}>{REGISTER_CONSTANTS.PASSWORD_LABEL} *</FieldLabel>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          onBlur={() => markTouched('password')}
          placeholder={REGISTER_CONSTANTS.PASSWORD_PLACEHOLDER}
          autoComplete="new-password"
          {...fieldProps('password')}
        />
        <PasswordRequirements password={formData.password} variant={variant} />
        {shouldShowError('password') && errors.password && (
          <FieldError message={errors.password} variant={variant} />
        )}
      </FormControl>

      <FormControl isRequired isInvalid={shouldShowError('birthDate')}>
        <FieldLabel variant={variant}>{REGISTER_CONSTANTS.BIRTH_DATE_LABEL} *</FieldLabel>
        <Input
          type="date"
          value={formData.birthDate}
          onChange={(e) => updateField('birthDate', e.target.value)}
          onBlur={() => markTouched('birthDate')}
          max={maxBirthDate}
          colorScheme={isDark ? 'dark' : undefined}
          sx={isDark ? { colorScheme: 'dark' } : undefined}
          {...fieldProps('birthDate')}
        />
        <Text fontSize="xs" color={hintColor} marginTop={1}>
          {REGISTER_CONSTANTS.BIRTH_DATE_HINT}
        </Text>
        <RegistrationAgePreview
          birthDate={formData.birthDate}
          hintColor={ageHintColor}
          valueColor={ageValueColor}
        />
        {shouldShowError('birthDate') && errors.birthDate && (
          <FieldError message={errors.birthDate} variant={variant} />
        )}
      </FormControl>

      <FormControl isRequired isInvalid={shouldShowError('grade')}>
        <FieldLabel variant={variant}>{REGISTER_CONSTANTS.GRADE_LABEL} *</FieldLabel>
        <Select
          value={formData.grade}
          onChange={(e) => updateField('grade', e.target.value)}
          onBlur={() => markTouched('grade')}
          placeholder={REGISTER_CONSTANTS.GRADE_PLACEHOLDER}
          {...fieldProps('grade')}
        >
          {GRADES.map((grade) => (
            <option
              key={grade}
              value={grade}
              style={isDark ? { background: '#050510', color: 'white' } : undefined}
            >
              {grade}
            </option>
          ))}
        </Select>
        {shouldShowError('grade') && errors.grade && (
          <FieldError message={errors.grade} variant={variant} />
        )}
      </FormControl>
    </VStack>
  );
}
