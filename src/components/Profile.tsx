/**
 * Profile component - User profile management and mandatory onboarding fields.
 */

import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Spinner,
  Link,
} from '@/shared/design-system';
import { User } from '@/types';
import { Language } from '@/types/quiz';
import { profileApi } from '@/services/api';
import { PullToRefresh } from './PullToRefresh';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { APP_CONSTANTS } from '@/constants/app';
import { PhoneCountryInput } from '@/components/profile/PhoneCountryInput';
import {
  EditableBirthDateField,
  EditableGradeField,
  EditableLanguageField,
  EditableLanguageSelectField,
  ReadOnlyBirthDateField,
  ReadOnlyGradeField,
  ReadOnlyAgeField,
  MandatoryProfileFormValues,
  getMissingFieldLabels,
} from '@/components/profile/ProfileMandatoryFields';
import { DEFAULT_PHONE_COUNTRY } from '@/constants/phoneCountries';
import { splitStoredPhone, validateLocalPhone } from '@/utils/phoneInput';
import { resolveProfileAge, deriveRegistrationAgeFields } from '@/utils/birthDate';
import { isProfileComplete } from '@/utils/profileComplete';
import { isValidGrade, REGISTER_CONSTANTS } from '@/constants/auth';
import { QUIZ_CONSTANTS } from '@/constants/quiz';

interface ProfileProps {
  user: User;
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return 'Not set';
  try {
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const [y, m, d] = match[1].split('-').map(Number);
      const local = new Date(y, m - 1, d);
      return local.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Not set';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Not set';
  }
}

const ADMIN_EMAIL = APP_CONSTANTS.ADMIN_SUPPORT_EMAIL;

export const Profile: React.FC<ProfileProps> = ({ user: initialUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User>(initialUser);
  const initialPhone = splitStoredPhone(initialUser.phone, initialUser.phoneCountry);
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.countryCode);
  const [phone, setPhone] = useState(initialPhone.localPhone);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(
    (initialUser.preferredLanguage as Language) || 'English'
  );
  const [mandatoryFields, setMandatoryFields] = useState<MandatoryProfileFormValues>({
    birthDate: initialUser.birthDate?.slice(0, 10) || '',
    grade: initialUser.grade || '',
    preferredLanguage: (initialUser.preferredLanguage as Language) || 'English',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const profileComplete = useMemo(() => isProfileComplete(user), [user]);
  const missingBirthDate = !user.birthDate && !resolveProfileAge(user);
  const missingGrade = !isValidGrade(user.grade);
  const missingLanguage = !user.preferredLanguage;
  const missingFieldLabels = getMissingFieldLabels({
    missingBirthDate,
    missingGrade,
    missingLanguage,
  });
  const showMandatorySection = missingBirthDate || missingGrade || missingLanguage;
  const missingFieldsMessage =
    missingFieldLabels.length > 0
      ? `Please add your ${missingFieldLabels.join(', ')} below, then save.`
      : '';
  const redirectedForIncomplete = Boolean(
    (location.state as { profileIncomplete?: boolean } | null)?.profileIncomplete
  );

  const applyUser = (latestUser: User) => {
    const parsed = splitStoredPhone(latestUser.phone, latestUser.phoneCountry);
    setUser(latestUser);
    setPhoneCountry(latestUser.phoneCountry || parsed.countryCode);
    setPhone(parsed.localPhone);
    setPreferredLanguage((latestUser.preferredLanguage as Language) || 'English');
    setMandatoryFields({
      birthDate: latestUser.birthDate?.slice(0, 10) || '',
      grade: latestUser.grade || '',
      preferredLanguage: (latestUser.preferredLanguage as Language) || 'English',
    });
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { user: latestUser } = await profileApi.getProfile();
        applyUser(latestUser);
      } catch (err) {
        console.error('Failed to load profile:', err);
        applyUser(initialUser);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [initialUser]);

  const validateMandatoryFields = (): string | null => {
    if (missingBirthDate) {
      const { age } = deriveRegistrationAgeFields(mandatoryFields.birthDate);
      if (
        age == null ||
        age < QUIZ_CONSTANTS.MIN_AGE ||
        age > QUIZ_CONSTANTS.MAX_AGE
      ) {
        return REGISTER_CONSTANTS.AGE_OUT_OF_RANGE;
      }
    }
    if (missingGrade && !isValidGrade(mandatoryFields.grade)) {
      return REGISTER_CONSTANTS.GRADE_REQUIRED;
    }
    if (missingLanguage && !mandatoryFields.preferredLanguage) {
      return 'Please select your preferred language.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const mandatoryError = validateMandatoryFields();
    if (mandatoryError) {
      setError(mandatoryError);
      return;
    }

    const phoneError = validateLocalPhone(phone.trim());
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setLoading(true);

    try {
      const result = await profileApi.updateProfile({
        phone: phone.trim() || null,
        phoneCountry: phoneCountry || DEFAULT_PHONE_COUNTRY,
        preferredLanguage: missingLanguage
          ? mandatoryFields.preferredLanguage
          : preferredLanguage,
        birthDate: missingBirthDate ? mandatoryFields.birthDate : undefined,
        grade: missingGrade ? mandatoryFields.grade : undefined,
      });

      applyUser(result.user);
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: result.user }));
      setSuccess(true);

      if (isProfileComplete(result.user)) {
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    const { user: latestUser } = await profileApi.getProfile();
    applyUser(latestUser);
  };

  const displayAge = resolveProfileAge(user);

  if (loadingProfile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Box padding={6} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize={{ base: 'sm', md: 'lg' }}>Loading profile...</Text>
          </VStack>
        </Box>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <StudentPageLayout
        icon="👤"
        title="My Profile"
        subtitle={
          profileComplete
            ? 'Update your details and learning preferences'
            : 'Complete your profile to start learning'
        }
        maxW="600px"
      >
        <VStack spacing={{ base: 4, md: 6 }} align="stretch">
          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {success && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              {profileComplete
                ? 'Profile updated successfully!'
                : 'Details saved. Finish the required fields below to continue.'}
            </Alert>
          )}

          {showMandatorySection && (
            <Alert status="warning" borderRadius="md" fontSize="sm">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">
                  {redirectedForIncomplete
                    ? 'Please complete your profile before using the app.'
                    : 'A few details are still required after Google sign-in.'}
                </Text>
                <Text mt={1}>{missingFieldsMessage}</Text>
              </Box>
            </Alert>
          )}

          {!showMandatorySection && (
            <Alert status="info" borderRadius="md" fontSize="sm">
              <AlertIcon />
              <Box>
                <Text fontWeight="medium">Name, date of birth, and age are managed by your administrator</Text>
                <Text mt={1} color="gray.600">
                  To request changes, email{' '}
                  <Link href={`mailto:${ADMIN_EMAIL}`} color="blue.600" fontWeight="semibold">
                    {ADMIN_EMAIL}
                  </Link>
                  . You can update mobile number and language below.
                </Text>
              </Box>
            </Alert>
          )}

          <Card>
            <CardBody>
              <Box as="form" onSubmit={handleSubmit}>
                <VStack spacing={5} align="stretch">
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={user.email} isDisabled bg="gray.100" size="lg" />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input type="text" value={user.name || ''} isDisabled bg="gray.100" size="lg" />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Buddy ID</FormLabel>
                    <Input type="text" value={user.buddyId || 'Generating…'} isDisabled bg="gray.100" size="lg" />
                  </FormControl>

                  {missingBirthDate ? (
                    <EditableBirthDateField
                      value={mandatoryFields.birthDate}
                      onChange={(birthDate) =>
                        setMandatoryFields({ ...mandatoryFields, birthDate })
                      }
                    />
                  ) : (
                    <ReadOnlyBirthDateField displayValue={formatDisplayDate(user.birthDate)} />
                  )}

                  {missingGrade ? (
                    <EditableGradeField
                      value={mandatoryFields.grade}
                      onChange={(grade) => setMandatoryFields({ ...mandatoryFields, grade })}
                    />
                  ) : (
                    user.grade && <ReadOnlyGradeField grade={user.grade} />
                  )}

                  {!missingBirthDate && (
                    <ReadOnlyAgeField age={displayAge} hasBirthDate={Boolean(user.birthDate)} />
                  )}

                  <PhoneCountryInput
                    countryCode={phoneCountry}
                    phone={phone}
                    onCountryChange={setPhoneCountry}
                    onPhoneChange={setPhone}
                    autoDetectCountry={!loadingProfile && !user.phone}
                    hasSavedCountry={Boolean(user.phone)}
                  />

                  {missingLanguage ? (
                    <EditableLanguageField
                      value={mandatoryFields.preferredLanguage}
                      onChange={(preferredLanguage) =>
                        setMandatoryFields({ ...mandatoryFields, preferredLanguage })
                      }
                    />
                  ) : (
                    <EditableLanguageSelectField
                      value={preferredLanguage}
                      onChange={setPreferredLanguage}
                    />
                  )}

                  <Text fontSize="xs" color="gray.500">
                    Member since {formatDisplayDate(user.createdAt)}
                  </Text>

                  <HStack spacing={4} justifyContent="flex-end" marginTop={4} flexWrap="wrap" w="100%">
                    {!showMandatorySection && (
                      <Button
                        variant="outline"
                        onClick={() => navigate('/dashboard')}
                        isDisabled={loading}
                        size={{ base: 'sm', md: 'md' }}
                        w={{ base: '100%', sm: 'auto' }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={loading}
                      isDisabled={loading}
                      size={{ base: 'sm', md: 'md' }}
                      w={{ base: '100%', sm: 'auto' }}
                    >
                      {showMandatorySection ? 'Save and continue' : 'Save Changes'}
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            </CardBody>
          </Card>
        </VStack>
      </StudentPageLayout>
    </PullToRefresh>
  );
};
