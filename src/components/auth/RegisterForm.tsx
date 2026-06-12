/**
 * Registration form component for modal usage
 */

import { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Radio,
  RadioGroup,
  Stack,
  Select,
} from '@/shared/design-system';
import { authApi, getErrorMessage } from '@/services/api';
import { RegisterData } from '@/types';
import { LANGUAGES } from '@/constants/quiz';
import { Language } from '@/types/quiz';
import { REGISTER_CONSTANTS, GRADES, isValidGrade } from '@/constants/auth';
import { RegistrationAgePreview } from '@/components/auth/RegistrationAgePreview';
import { deriveRegistrationAgeFields } from '@/utils/birthDate';
import { QUIZ_CONSTANTS } from '@/constants/quiz';

interface RegisterFormProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
  onError?: (error: string) => void;
}

/**
 * Registration form component
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegisterSuccess,
  onSwitchToLogin,
  onError,
}) => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    name: '',
    birthDate: '',
    grade: '',
    preferredLanguage: undefined,
  });
  const maxBirthDate = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (onError) onError('');

    const { age } = deriveRegistrationAgeFields(formData.birthDate);
    if (
      age == null ||
      age < QUIZ_CONSTANTS.MIN_AGE ||
      age > QUIZ_CONSTANTS.MAX_AGE
    ) {
      if (onError) onError(REGISTER_CONSTANTS.AGE_OUT_OF_RANGE);
      return;
    }

    if (!isValidGrade(formData.grade)) {
      if (onError) onError(REGISTER_CONSTANTS.GRADE_REQUIRED);
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
          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
              {REGISTER_CONSTANTS.NAME_LABEL} *
            </Text>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={REGISTER_CONSTANTS.NAME_PLACEHOLDER}
              size="lg"
              required
              borderRadius="lg"
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _placeholder={{ color: 'rgba(255, 255, 255, 0.5)' }}
              _hover={{ borderColor: 'rgba(0, 242, 255, 0.5)' }}
              _focus={{ borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' }}
            />
          </Box>

          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
              {REGISTER_CONSTANTS.EMAIL_LABEL} *
            </Text>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={REGISTER_CONSTANTS.EMAIL_PLACEHOLDER}
              size="lg"
              required
              autoComplete="email"
              borderRadius="lg"
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _placeholder={{ color: 'rgba(255, 255, 255, 0.5)' }}
              _hover={{ borderColor: 'rgba(0, 242, 255, 0.5)' }}
              _focus={{ borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' }}
            />
          </Box>

          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
              {REGISTER_CONSTANTS.PASSWORD_LABEL} *
            </Text>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={REGISTER_CONSTANTS.PASSWORD_PLACEHOLDER}
              size="lg"
              required
              minLength={6}
              autoComplete="new-password"
              borderRadius="lg"
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _placeholder={{ color: 'rgba(255, 255, 255, 0.5)' }}
              _hover={{ borderColor: 'rgba(0, 242, 255, 0.5)' }}
              _focus={{ borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' }}
            />
          </Box>

          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
              {REGISTER_CONSTANTS.BIRTH_DATE_LABEL} *
            </Text>
            <Input
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              max={maxBirthDate}
              size="lg"
              required
              borderRadius="lg"
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              colorScheme="dark"
              sx={{ colorScheme: 'dark' }}
              _hover={{ borderColor: 'rgba(0, 242, 255, 0.5)' }}
              _focus={{ borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' }}
            />
            <Text fontSize="xs" color="rgba(255, 255, 255, 0.55)" marginTop={1}>
              {REGISTER_CONSTANTS.BIRTH_DATE_HINT}
            </Text>
            <RegistrationAgePreview
              birthDate={formData.birthDate}
              hintColor="rgba(255, 255, 255, 0.5)"
              valueColor="#00f2ff"
            />
          </Box>

          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
              {REGISTER_CONSTANTS.GRADE_LABEL} *
            </Text>
            <Select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              placeholder={REGISTER_CONSTANTS.GRADE_PLACEHOLDER}
              size="lg"
              required
              borderRadius="lg"
              bg="rgba(255, 255, 255, 0.05)"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="white"
              _hover={{ borderColor: 'rgba(0, 242, 255, 0.5)' }}
              _focus={{ borderColor: '#00f2ff', boxShadow: '0 0 0 1px rgba(0, 242, 255, 0.3)' }}
            >
              {GRADES.map((grade) => (
                <option key={grade} value={grade} style={{ background: '#050510', color: 'white' }}>
                  {grade}
                </option>
              ))}
            </Select>
          </Box>

          <Box width="100%">
            <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="rgba(255, 255, 255, 0.8)">
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
                  <Radio
                    key={lang}
                    value={lang}
                    size="md"
                    colorScheme="cyan"
                    color="#00f2ff"
                    borderColor="rgba(255, 255, 255, 0.3)"
                    _checked={{ bg: '#00f2ff', borderColor: '#00f2ff', color: '#00f2ff' }}
                  >
                    <Text as="span" color="rgba(255, 255, 255, 0.8)" ml={2}>
                      {lang}
                    </Text>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </Box>

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
            _hover={{ bg: '#00d9e6', transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0, 242, 255, 0.3)' }}
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

