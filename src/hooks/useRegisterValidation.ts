/**
 * Tracks touched/submitted state and per-field errors for registration forms.
 */

import { useCallback, useMemo, useState } from 'react';
import { RegisterData } from '@/types';
import {
  RegisterFieldErrors,
  RegisterFieldKey,
  validateRegisterField,
  validateRegisterForm,
} from '@/utils/registerValidation';

const REGISTER_FIELDS: RegisterFieldKey[] = [
  'name',
  'email',
  'password',
  'birthDate',
  'grade',
];

function createTouchedState(value = false): Record<RegisterFieldKey, boolean> {
  return REGISTER_FIELDS.reduce(
    (state, field) => ({ ...state, [field]: value }),
    {} as Record<RegisterFieldKey, boolean>
  );
}

export function useRegisterValidation(formData: RegisterData) {
  const [touched, setTouched] = useState(createTouchedState());
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validateRegisterForm(formData), [formData]);

  const shouldShowError = useCallback(
    (field: RegisterFieldKey) => (touched[field] || submitted) && !!errors[field],
    [touched, submitted, errors]
  );

  const isFieldValid = useCallback(
    (field: RegisterFieldKey) =>
      (touched[field] || submitted) && !validateRegisterField(field, formData),
    [touched, submitted, formData]
  );

  const markTouched = useCallback((field: RegisterFieldKey) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback((): RegisterFieldErrors => {
    setSubmitted(true);
    setTouched(createTouchedState(true));
    return validateRegisterForm(formData);
  }, [formData]);

  const resetValidation = useCallback(() => {
    setSubmitted(false);
    setTouched(createTouchedState());
  }, []);

  return {
    errors,
    touched,
    submitted,
    shouldShowError,
    isFieldValid,
    markTouched,
    validateAll,
    resetValidation,
  };
}
