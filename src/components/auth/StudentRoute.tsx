/**
 * Authenticated student route with optional mandatory profile enforcement.
 */

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProfileCompleteGuard } from '@/components/auth/ProfileCompleteGuard';

interface StudentRouteProps {
  children: ReactNode;
  requireCompleteProfile?: boolean;
}

export const StudentRoute: React.FC<StudentRouteProps> = ({
  children,
  requireCompleteProfile = true,
}) => (
  <AuthGuard>
    {requireCompleteProfile ? (
      <ProfileCompleteGuard>{children}</ProfileCompleteGuard>
    ) : (
      children
    )}
  </AuthGuard>
);
