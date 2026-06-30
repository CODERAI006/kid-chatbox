/**
 * Registration component for new user signup
 */

import { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Card,
  CardBody,
  Heading,
} from '@/shared/design-system';
import { RegisterFormFields } from '@/components/auth/RegisterFormFields';
import { authApi, getErrorMessage } from '@/services/api';
import { RegisterData } from '@/types';
import { REGISTER_CONSTANTS } from '@/constants/auth';
import { useRegisterValidation } from '@/hooks/useRegisterValidation';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

const INITIAL_FORM: RegisterData = {
  email: '',
  password: '',
  name: '',
  birthDate: '',
  grade: '',
};

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterData>(INITIAL_FORM);
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const validation = useRegisterValidation(formData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card width="100%" maxWidth="500px" margin="0 auto">
      <CardBody>
        <VStack spacing={6}>
          <Heading size="lg" color="blue.600">
            Create Account 🎉
          </Heading>

          {error && (
            <Box
              padding={3}
              borderRadius="md"
              bg="red.50"
              borderWidth={1}
              borderColor="red.200"
              width="100%"
            >
              <Text fontSize="sm" color="red.700">
                {error}
              </Text>
            </Box>
          )}

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
                variant="light"
              />

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="100%"
                isLoading={loading}
                isDisabled={loading}
              >
                {REGISTER_CONSTANTS.REGISTER_BUTTON}
              </Button>
            </VStack>
          </Box>

          <Box>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Already have an account?{' '}
              <Button variant="link" colorScheme="blue" size="sm" onClick={onSwitchToLogin}>
                Login
              </Button>
            </Text>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};
