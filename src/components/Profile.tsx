/**
 * Profile component - User profile management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Card,
  CardBody,
  Select,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  Spinner,
  Link,
} from '@/shared/design-system';
import { User } from '@/types';
import { LANGUAGES } from '@/constants/quiz';
import { Language } from '@/types/quiz';
import { profileApi } from '@/services/api';
import { PullToRefresh } from './PullToRefresh';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { APP_CONSTANTS } from '@/constants/app';
import { PhoneCountryInput } from '@/components/profile/PhoneCountryInput';
import { DEFAULT_PHONE_COUNTRY } from '@/constants/phoneCountries';
import { splitStoredPhone, validateLocalPhone } from '@/utils/phoneInput';

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

/**
 * Profile management component
 */
export const Profile: React.FC<ProfileProps> = ({ user: initialUser }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>(initialUser);
  const initialPhone = splitStoredPhone(initialUser.phone, initialUser.phoneCountry);
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.countryCode);
  const [phone, setPhone] = useState(initialPhone.localPhone);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(
    (initialUser.preferredLanguage as Language) || 'English'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const applyUser = (latestUser: User) => {
    const parsed = splitStoredPhone(latestUser.phone, latestUser.phoneCountry);
    setUser(latestUser);
    setPhoneCountry(latestUser.phoneCountry || parsed.countryCode);
    setPhone(parsed.localPhone);
    setPreferredLanguage((latestUser.preferredLanguage as Language) || 'English');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
        preferredLanguage: preferredLanguage,
      });

      applyUser(result.user);
      setSuccess(true);
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: result.user }));
      setTimeout(() => setSuccess(false), 3000);
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
        subtitle="Update your details and learning preferences"
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
              Profile updated successfully!
            </Alert>
          )}

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

          <Card>
            <CardBody>
              <Box as="form" onSubmit={handleSubmit}>
                <VStack spacing={5} align="stretch">
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={user.email} isDisabled bg="gray.100" size="lg" />
                    <Text fontSize="xs" color="gray.500" marginTop={1}>
                      Email cannot be changed
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input type="text" value={user.name || ''} isDisabled bg="gray.100" size="lg" />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Buddy ID</FormLabel>
                    <Input
                      type="text"
                      value={user.buddyId || 'Generating…'}
                      isDisabled
                      bg="gray.100"
                      size="lg"
                    />
                    <Text fontSize="xs" color="gray.500" marginTop={1}>
                      Share this ID so friends can send you a study buddy request
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Date of birth</FormLabel>
                    <Input
                      type="text"
                      value={formatDisplayDate(user.birthDate)}
                      isDisabled
                      bg="gray.100"
                      size="lg"
                    />
                    <Text fontSize="xs" color="gray.500" marginTop={1}>
                      Contact your administrator to update date of birth
                    </Text>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Age</FormLabel>
                    <Input
                      type="text"
                      value={user.age != null ? String(user.age) : 'Not set'}
                      isDisabled
                      bg="gray.100"
                      size="lg"
                    />
                  </FormControl>

                  <PhoneCountryInput
                    countryCode={phoneCountry}
                    phone={phone}
                    onCountryChange={setPhoneCountry}
                    onPhoneChange={setPhone}
                    autoDetectCountry={!loadingProfile && !user.phone}
                    hasSavedCountry={Boolean(user.phone)}
                  />

                  <FormControl isRequired>
                    <FormLabel>Preferred Language</FormLabel>
                    <Select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                      size="lg"
                      required
                    >
                      {Object.values(LANGUAGES).map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </Select>
                    <Text fontSize="xs" color="gray.500" marginTop={1}>
                      This language will be used for all quizzes and lessons
                    </Text>
                  </FormControl>

                  <Text fontSize="xs" color="gray.500">
                    Member since {formatDisplayDate(user.createdAt)}
                  </Text>

                  <HStack
                    spacing={4}
                    justifyContent="flex-end"
                    marginTop={4}
                    flexWrap="wrap"
                    w="100%"
                  >
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                      isDisabled={loading}
                      size={{ base: 'sm', md: 'md' }}
                      w={{ base: '100%', sm: 'auto' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      isLoading={loading}
                      isDisabled={loading}
                      size={{ base: 'sm', md: 'md' }}
                      w={{ base: '100%', sm: 'auto' }}
                    >
                      Save Changes
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
