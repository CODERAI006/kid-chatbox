/**
 * Module Access Guard Component
 * Checks if user has access to Study or Quiz modules before allowing access
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
  VStack,
  Button,
  Text,
} from '@/shared/design-system';
import { authApi } from '@/services/api';

interface ModuleAccessGuardProps {
  children: ReactNode;
  module: 'study' | 'quiz';
}

/**
 * Module Access Guard - checks if user has access to specific module
 */
export const ModuleAccessGuard: React.FC<ModuleAccessGuardProps> = ({ children, module }) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkModuleAccess();
  }, []);

  const checkModuleAccess = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated. Please login first.');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Fetch current user with roles and module access
      const { user } = await authApi.fetchCurrentUser();

      if (!user) {
        authApi.logout();
        setError('User not found. Please login again.');
        setHasAccess(false);
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      const userWithAccess = user as {
        status?: string;
        roles?: string[];
        moduleAccess?: Record<string, boolean>;
      };

      // Self-registered and Google users use status "enabled"; admin-approved users use "approved"
      const allowedStatuses = ['approved', 'enabled'];
      if (!userWithAccess.status || !allowedStatuses.includes(userWithAccess.status)) {
        setError(
          'Your account is pending approval. Please wait for admin approval before accessing this module.'
        );
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Check if user is admin (admins have access to everything)
      const isAdmin = userWithAccess.roles?.includes('admin') || false;
      if (isAdmin) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Check module access
      const moduleAccess = userWithAccess.moduleAccess || {};
      const hasModuleAccess = moduleAccess[module] === true;

      if (!hasModuleAccess) {
        setError(
          `Access denied to ${module} module. Please contact administrator to grant access.`
        );
      }

      setHasAccess(hasModuleAccess);
    } catch (err: unknown) {
      console.error('Error checking module access:', err);
      authApi.logout();
      setError('Failed to verify module access. Please login again.');
      setHasAccess(false);
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Checking access...</Text>
      </Box>
    );
  }

  if (!hasAccess) {
    return (
      <Box p={6} maxW="600px" mx="auto">
        <Alert status="warning">
          <AlertIcon />
          <VStack align="start" spacing={3}>
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>{error || `Access denied to ${module} module.`}</AlertDescription>
            <VStack spacing={2} align="start" mt={2}>
              <Text fontSize="sm" color="gray.600">
                Your account status: <strong>Pending Approval</strong>
              </Text>
              <Text fontSize="sm" color="gray.600">
                Please wait for an administrator to approve your account and grant module access.
              </Text>
            </VStack>
            <Button
              colorScheme="blue"
              size="sm"
              onClick={() => navigate('/dashboard')}
              mt={2}
            >
              Go to Dashboard
            </Button>
          </VStack>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};


