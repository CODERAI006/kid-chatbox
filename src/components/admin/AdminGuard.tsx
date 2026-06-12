/**
 * Admin Guard Component
 * Protects admin routes - checks if user has admin role
 */

import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
} from '@/shared/design-system';
import { authApi } from '@/services/api';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Admin Guard - checks if user has admin permissions
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated. Please login first.');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Fetch current user with roles using API service
      const { user } = await authApi.fetchCurrentUser();

      if (!user) {
        authApi.logout();
        setError('User not found. Please login again.');
        setIsAdmin(false);
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      // Check if user has admin role
      const userWithRoles = user as { roles?: string[] };
      const hasAdminRole = userWithRoles?.roles?.includes('admin') || false;

      console.log('User roles:', userWithRoles?.roles);
      console.log('Has admin role:', hasAdminRole);

      if (!hasAdminRole) {
        setError(
          `Access denied. Admin privileges required. Your roles: ${userWithRoles?.roles?.join(', ') || 'none'}`
        );
      }

      setIsAdmin(hasAdminRole);
    } catch (err: unknown) {
      console.error('Error checking admin access:', err);
      authApi.logout();
      setError('Failed to verify admin access. Please login again.');
      setIsAdmin(false);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Box mt={4}>Checking admin access...</Box>
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <Box p={6} maxW="600px" mx="auto">
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>{error || 'Admin privileges required.'}</AlertDescription>
            <Button
              colorScheme="blue"
              size="sm"
              onClick={() => navigate('/login')}
              mt={2}
            >
              Go to Login
            </Button>
          </VStack>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

