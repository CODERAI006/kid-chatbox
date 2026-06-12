/**
 * Authentication guard component to protect routes
 */

import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, VStack, Text } from '@/shared/design-system';
import { authApi } from '@/services/api';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Protects routes by validating the session with the server (not just localStorage).
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const user = await authApi.validateSession();
      if (cancelled) return;

      if (user) {
        setIsAuthenticated(true);
        return;
      }

      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bg="gray.50"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Loading...</Text>
        </VStack>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
