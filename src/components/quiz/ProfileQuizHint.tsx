/**
 * Shows whether the student's profile has age + language set before AI quiz generation.
 */

import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Link, Spinner, Box } from '@/shared/design-system';
import { profileApi } from '@/services/api';

export function ProfileQuizHint({
  onReadyChange,
}: {
  onReadyChange?: (ready: boolean, age?: number, language?: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [age, setAge] = useState<number | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { user } = await profileApi.getProfile();
        if (cancelled) return;
        const a = user?.age != null ? Number(user.age) : null;
        const lang = user?.preferredLanguage?.trim() || null;
        setAge(Number.isFinite(a) && a! > 0 ? a! : null);
        setLanguage(lang);
        onReadyChange?.(Boolean(a && a > 0 && lang), a ?? undefined, lang ?? undefined);
      } catch {
        if (!cancelled) {
          setAge(null);
          setLanguage(null);
          onReadyChange?.(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();

    const onFocus = () => {
      void loadProfile();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [onReadyChange]);

  if (loading) {
    return (
      <Box py={2} textAlign="center">
        <Spinner size="sm" />
        <Box as="span" ml={2} fontSize="sm" color="gray.600">
          Loading your profile…
        </Box>
      </Box>
    );
  }

  if (!age || !language) {
    return (
      <Alert status="warning" borderRadius="xl">
        <AlertIcon />
        <Box flex="1">
          <AlertTitle fontSize="sm">Profile required</AlertTitle>
          <AlertDescription fontSize="sm">
            Set your age and preferred language in{' '}
            <Link as={RouterLink} to="/profile" color="blue.600" fontWeight="semibold">
              Profile
            </Link>{' '}
            before generating a quiz. Questions are tailored to your age.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Alert status="info" borderRadius="xl" variant="subtle">
      <AlertIcon />
      <AlertDescription fontSize="sm">
        Using age <strong>{age}</strong> and language <strong>{language}</strong> from your profile.{' '}
        <Link as={RouterLink} to="/profile" color="blue.600" fontWeight="semibold">
          Update profile
        </Link>
      </AlertDescription>
    </Alert>
  );
}
