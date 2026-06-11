/**
 * Mandatory age + language check for AI Quiz and Study modes.
 * Shows missing fields in red; hides when profile is complete.
 */

import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, VStack, Text, Link, Spinner } from '@/shared/design-system';
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
        const validAge = Number.isFinite(a) && a! > 0 ? a! : null;
        setAge(validAge);
        setLanguage(lang);
        onReadyChange?.(Boolean(validAge && lang), validAge ?? undefined, lang ?? undefined);
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

  if (age && language) return null;

  return (
    <Box
      borderWidth={2}
      borderColor="red.400"
      borderRadius="xl"
      bg="red.50"
      px={4}
      py={3}
    >
      <VStack align="stretch" spacing={2}>
        <Text fontSize="sm" fontWeight="bold" color="red.600">
          Mandatory profile settings — required for Quiz &amp; Study
        </Text>
        <VStack align="stretch" spacing={1}>
          {!age && (
            <Text fontSize="sm" fontWeight="semibold" color="red.600">
              Age: Not set (mandatory)
            </Text>
          )}
          {!language && (
            <Text fontSize="sm" fontWeight="semibold" color="red.600">
              Language: Not set (mandatory)
            </Text>
          )}
        </VStack>
        <Text fontSize="sm" color="red.700">
          Set these in{' '}
          <Link as={RouterLink} to="/profile" color="red.700" fontWeight="bold" textDecoration="underline">
            Profile
          </Link>{' '}
          before starting.
        </Text>
      </VStack>
    </Box>
  );
}
