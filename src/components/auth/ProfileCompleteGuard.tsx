/**
 * Redirects users with incomplete mandatory profile fields to /profile.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Spinner, VStack, Text } from '@/shared/design-system';
import { authApi } from '@/services/api';
import { isProfileComplete } from '@/utils/profileComplete';
import { User } from '@/types';

interface ProfileCompleteGuardProps {
  children: ReactNode;
}

export const ProfileCompleteGuard: React.FC<ProfileCompleteGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const validated = await authApi.validateSession();
      if (cancelled) return;
      setUser(validated);
    };

    void loadUser();

    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<User>).detail;
      if (detail) setUser(detail);
    };

    window.addEventListener('userProfileUpdated', onProfileUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('userProfileUpdated', onProfileUpdated);
    };
  }, [location.pathname]);

  const onProfilePage = location.pathname === '/profile';
  const complete = isProfileComplete(user ?? null);
  const shouldRedirect = user !== undefined && user !== null && !complete && !onProfilePage;

  useEffect(() => {
    if (shouldRedirect) {
      navigate('/profile', {
        replace: true,
        state: { profileIncomplete: true },
      });
    }
  }, [shouldRedirect, navigate]);

  if (user === undefined) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text fontSize="sm">Checking profile...</Text>
        </VStack>
      </Box>
    );
  }

  if (shouldRedirect) {
    return null;
  }

  return <>{children}</>;
};
