/**
 * Registration form component for modal usage
 */

import { useState } from 'react';
import { Box, VStack, HStack, Text, Button } from '@/shared/design-system';
import { RegisterFormFields } from '@/components/auth/RegisterFormFields';
import { authApi, getErrorMessage } from '@/services/api';
import { RegisterData } from '@/types';
import { REGISTER_CONSTANTS } from '@/constants/auth';
import { useRegisterValidation } from '@/hooks/useRegisterValidation';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
  onError?: (error: string) => void;
}

const INITIAL_FORM: RegisterData = {
  email: '',
  password: '',
  name: '',
  birthDate: '',
  grade: '',
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegisterSuccess,
  onSwitchToLogin,
  onError,
}) => {
  const [formData, setFormData] = useState<RegisterData>(INITIAL_FORM);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const validation = useRegisterValidation(formData);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (onError) onError('');

    const fieldErrors = validation.validateAll();
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      await authApi.register(formData);
      onRegisterSuccess();
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Registration failed. Please try again.';
      if (onError) onError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={5} align="stretch">
      <Box as="form" width="100%" onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <RegisterFormFields
            formData={formData}
            onChange={setFormData}
            errors={validation.errors}
            shouldShowError={validation.shouldShowError}
            isFieldValid={validation.isFieldValid}
            markTouched={validation.markTouched}
            maxBirthDate={maxBirthDate}
            variant="dark"
          />

          <Button
            type="submit"
            bg="#00f2ff"
            color="black"
            size="lg"
            width="100%"
            isLoading={loading}
            isDisabled={loading}
            borderRadius="lg"
            fontWeight="bold"
            fontSize="md"
            _hover={{
              bg: '#00d9e6',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(0, 242, 255, 0.3)',
            }}
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
            transition="all 0.2s"
          >
            {REGISTER_CONSTANTS.REGISTER_BUTTON}
          </Button>
        </VStack>
      </Box>

      <HStack spacing={2} justifyContent="center" pt={2}>
        <Text fontSize="sm" color="rgba(255, 255, 255, 0.6)">
          {REGISTER_CONSTANTS.HAVE_ACCOUNT_TEXT}
        </Text>
        <Button
          variant="link"
          color="#00f2ff"
          size="sm"
          onClick={onSwitchToLogin}
          fontWeight="semibold"
          _hover={{ color: '#00d9e6', textDecoration: 'underline' }}
        >
          {REGISTER_CONSTANTS.SIGN_IN_LINK}
        </Button>
      </HStack>
    </VStack>
  );
};
