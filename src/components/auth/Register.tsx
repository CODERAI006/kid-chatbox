/**
 * Registration component for new user signup
 */

import { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Input,
  Button,
  Card,
  CardBody,
  Heading,
  Radio,
  RadioGroup,
  Stack,
  Select,
} from '@/shared/design-system';
import { authApi, getErrorMessage } from '@/services/api';
import { RegisterData } from '@/types';
import { LANGUAGES } from '@/constants/quiz';
import { Language } from '@/types/quiz';
import { GRADES, REGISTER_CONSTANTS, isValidGrade } from '@/constants/auth';
import { RegistrationAgePreview } from '@/components/auth/RegistrationAgePreview';
import { deriveRegistrationAgeFields } from '@/utils/birthDate';
import { QUIZ_CONSTANTS } from '@/constants/quiz';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

/**
 * Registration form component
 */
export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    name: '',
    birthDate: '',
    grade: '',
    preferredLanguage: undefined,
  });
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { age } = deriveRegistrationAgeFields(formData.birthDate);
    if (
      age == null ||
      age < QUIZ_CONSTANTS.MIN_AGE ||
      age > QUIZ_CONSTANTS.MAX_AGE
    ) {
      setError(REGISTER_CONSTANTS.AGE_OUT_OF_RANGE);
      return;
    }

    if (!isValidGrade(formData.grade)) {
      setError(REGISTER_CONSTANTS.GRADE_REQUIRED);
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
              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  Name *
                </Text>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  size="lg"
                  required
                />
              </Box>

              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  Email *
                </Text>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  size="lg"
                  required
                  autoComplete="email"
                />
              </Box>

              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  Password *
                </Text>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password"
                  size="lg"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </Box>

              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  Date of Birth *
                </Text>
                <Input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  max={maxBirthDate}
                  size="lg"
                  required
                />
                <Text fontSize="xs" color="gray.500" marginTop={1}>
                  {REGISTER_CONSTANTS.BIRTH_DATE_HINT}
                </Text>
                <RegistrationAgePreview birthDate={formData.birthDate} />
              </Box>

              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  {REGISTER_CONSTANTS.GRADE_LABEL} *
                </Text>
                <Select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder={REGISTER_CONSTANTS.GRADE_PLACEHOLDER}
                  size="lg"
                  required
                >
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box width="100%">
                <Text fontSize="sm" fontWeight="semibold" marginBottom={2}>
                  Preferred Language (optional)
                </Text>
                <RadioGroup
                  value={formData.preferredLanguage || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, preferredLanguage: value as Language })
                  }
                >
                  <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                    {Object.values(LANGUAGES).map((lang) => (
                      <Radio key={lang} value={lang} size="md">
                        {lang}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="100%"
                isLoading={loading}
                isDisabled={loading}
              >
                Create Account
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

