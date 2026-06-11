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
  Heading,
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
import { APP_CONSTANTS } from '@/constants/app';

interface ProfileProps {
  user: User;
}

function formatDisplayDate(value?: string | null): string {
  if (!value) return 'Not set';
  try {
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
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(
    (initialUser.preferredLanguage as Language) || 'English'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const applyUser = (latestUser: User) => {
    setUser(latestUser);
    setPhone(latestUser.phone || '');
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
    setLoading(true);

    try {
      const result = await profileApi.updateProfile({
        phone: phone.trim() || undefined,
        preferredLanguage: preferredLanguage,
      });

      setUser(result.user);
      setPhone(result.user.phone || '');
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
      <Box padding={{ base: 4, md: 6 }} maxWidth="600px" margin="0 auto">
        <VStack spacing={{ base: 4, md: 6 }} align="stretch">
          <Heading size={{ base: 'md', md: 'lg' }} color="blue.600">
            My Profile 👤
          </Heading>

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
              <Text fontWeight="medium">Name, date of birth, and age</Text>
              <Text mt={1} color="gray.600">
                These details are managed by your administrator. To request changes, email{' '}
                <Link href={`mailto:${ADMIN_EMAIL}`} color="blue.600" fontWeight="semibold">
                  {ADMIN_EMAIL}
                </Link>
                .
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
                    <FormLabel>Date of birth</FormLabel>
                    <Input
                      type="text"
                      value={formatDisplayDate(user.birthDate)}
                      isDisabled
                      bg="gray.100"
                      size="lg"
                    />
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

                  <FormControl>
                    <FormLabel>Mobile number</FormLabel>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      size="lg"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    <Text fontSize="xs" color="gray.500" marginTop={1}>
                      You can update your mobile number here
                    </Text>
                  </FormControl>

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
      </Box>
    </PullToRefresh>
  );
};
