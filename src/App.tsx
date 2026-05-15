/**
 * Main App component with routing
 */

import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ModuleAccessGuard } from '@/components/ModuleAccessGuard';
import { Dashboard } from '@/components/Dashboard';
import { StudyHub } from '@/components/StudyHub';
import { QuizHub } from '@/components/QuizHub';
import { QuizRankings } from '@/components/QuizRankings';
import { StudyLibraryViewer } from '@/components/StudyLibraryViewer';
import { Profile } from '@/components/Profile';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Home } from '@/components/Home';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { UserManagement } from '@/components/admin/UserManagement';
import { PlanManagement } from '@/components/admin/PlanManagement';
import { TopicManagement } from '@/components/admin/TopicManagement';
import { QuizManagement } from '@/components/admin/QuizManagement';
import { QuizHistoryManagement } from '@/components/admin/QuizHistoryManagement';
import { StudyLibraryContentManagement } from '@/components/admin/StudyLibraryContentManagement';
import { QuizResultsAnalytics } from '@/components/admin/QuizResultsAnalytics';
import { QuizSchedulerManagement } from '@/components/admin/QuizSchedulerManagement';
import NewsFeed from '@/components/NewsFeed';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { QuizTimerProvider } from '@/contexts/QuizTimerContext';

/**
 * Theme configuration with dark mode support and responsive font sizes
 */
const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
        fontSize: { base: '14px', md: '16px' }, // Smaller base font on mobile
      },
    }),
  },
  colors: {
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923',
    },
  },
  components: {
    Button: {
      baseStyle: (props: { colorMode: string }) => ({
        _hover: {
          bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
        },
      }),
    },
    Heading: {
      baseStyle: {
        fontWeight: 'bold',
        lineHeight: 'shorter',
        letterSpacing: '-0.02em',
      },
      sizes: {
        xs: {
          fontSize: { base: '0.75rem', sm: '0.8125rem', md: '0.875rem' }, // 12px/13px/14px
          lineHeight: { base: '1.2', md: '1.3' },
        },
        sm: {
          fontSize: { base: '0.875rem', sm: '0.9375rem', md: '1rem' }, // 14px/15px/16px
          lineHeight: { base: '1.25', md: '1.35' },
        },
        md: {
          fontSize: { base: '1rem', sm: '1.0625rem', md: '1.125rem' }, // 16px/17px/18px
          lineHeight: { base: '1.3', md: '1.4' },
        },
        lg: {
          fontSize: { base: '1.125rem', sm: '1.25rem', md: '1.375rem' }, // 18px/20px/22px
          lineHeight: { base: '1.35', md: '1.4' },
        },
        xl: {
          fontSize: { base: '1.25rem', sm: '1.375rem', md: '1.5rem' }, // 20px/22px/24px
          lineHeight: { base: '1.4', md: '1.45' },
        },
        '2xl': {
          fontSize: { base: '1.5rem', sm: '1.625rem', md: '1.875rem' }, // 24px/26px/30px
          lineHeight: { base: '1.4', md: '1.5' },
        },
        '3xl': {
          fontSize: { base: '1.875rem', sm: '2rem', md: '2.25rem' }, // 30px/32px/36px
          lineHeight: { base: '1.4', md: '1.5' },
        },
        '4xl': {
          fontSize: { base: '2rem', sm: '2.25rem', md: '2.5rem', lg: '3rem' }, // 32px/36px/40px/48px
          lineHeight: { base: '1.3', md: '1.4' },
        },
      },
    },
    Text: {
      baseStyle: {
        fontSize: { base: '0.875rem', sm: '0.9375rem', md: '1rem' }, // 14px/15px/16px - optimized for readability
        lineHeight: { base: '1.5', md: '1.6' },
      },
      sizes: {
        xs: {
          fontSize: { base: '0.6875rem', sm: '0.75rem', md: '0.8125rem' }, // 11px/12px/13px
          lineHeight: { base: '1.4', md: '1.5' },
        },
        sm: {
          fontSize: { base: '0.75rem', sm: '0.8125rem', md: '0.875rem' }, // 12px/13px/14px
          lineHeight: { base: '1.45', md: '1.5' },
        },
        md: {
          fontSize: { base: '0.875rem', sm: '0.9375rem', md: '1rem' }, // 14px/15px/16px
          lineHeight: { base: '1.5', md: '1.6' },
        },
        lg: {
          fontSize: { base: '1rem', sm: '1.0625rem', md: '1.125rem' }, // 16px/17px/18px
          lineHeight: { base: '1.5', md: '1.6' },
        },
        xl: {
          fontSize: { base: '1.125rem', sm: '1.1875rem', md: '1.25rem' }, // 18px/19px/20px
          lineHeight: { base: '1.5', md: '1.6' },
        },
        '2xl': {
          fontSize: { base: '1.25rem', sm: '1.375rem', md: '1.5rem' }, // 20px/22px/24px
          lineHeight: { base: '1.4', md: '1.5' },
        },
      },
    },
    Card: {
      baseStyle: (props: { colorMode: string }) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          color: props.colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800',
          borderRadius: 'md',
          boxShadow: 'sm',
          overflow: 'hidden',
        },
      }),
    },
  },
});

/**
 * Root application component with routing
 */
export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user: currentUser } = authApi.getCurrentUser();
    if (currentUser) {
      setUser(currentUser as User);
    }
    setLoading(false);

    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent<User>) => {
      setUser(event.detail);
    };

    // Listen for logout events
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('userLoggedOut', handleLogout as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('userLoggedOut', handleLogout as EventListener);
    };
  }, []);

  const handleAuthSuccess = () => {
    const { user: currentUser } = authApi.getCurrentUser();
    setUser(currentUser as User);
  };

  if (loading) {
    return null;
  }

  return (
    <ChakraProvider theme={theme}>
      <QuizTimerProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Home onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/?auth=login" replace />
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/?auth=register" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <StudentLayout user={user}>
                  {user && <Dashboard user={user} />}
                </StudentLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/study"
            element={
              <AuthGuard>
                <ModuleAccessGuard module="study">
                  <StudentLayout user={user}>
                    <StudyHub />
                  </StudentLayout>
                </ModuleAccessGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/quiz"
            element={
              <AuthGuard>
                <ModuleAccessGuard module="quiz">
                  <StudentLayout user={user}>
                    <QuizHub />
                  </StudentLayout>
                </ModuleAccessGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <StudentLayout user={user}>
                  {user && <Profile user={user} />}
                </StudentLayout>
              </AuthGuard>
            }
          />
          <Route
            path="/quiz-rankings"
            element={
              <AuthGuard>
                <ModuleAccessGuard module="quiz">
                  <StudentLayout user={user}>
                    <QuizRankings />
                  </StudentLayout>
                </ModuleAccessGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/study-library/:id"
            element={
              <AuthGuard>
                <ModuleAccessGuard module="study">
                  <StudentLayout user={user}>
                    <StudyLibraryViewer />
                  </StudentLayout>
                </ModuleAccessGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/news"
            element={
              user ? (
                <StudentLayout user={user}>
                  <NewsFeed />
                </StudentLayout>
              ) : (
                <NewsFeed />
              )
            }
          />
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminGuard>
                <AdminLayout>
                  <UserManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/plans"
            element={
              <AdminGuard>
                <AdminLayout>
                  <PlanManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/topics"
            element={
              <AdminGuard>
                <AdminLayout>
                  <TopicManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <AdminGuard>
                <AdminLayout>
                  <QuizManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminGuard>
                <AdminLayout>
                  <AnalyticsDashboard />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/quiz-analytics"
            element={
              <AdminGuard>
                <AdminLayout>
                  <QuizResultsAnalytics />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/quiz-history"
            element={
              <AdminGuard>
                <AdminLayout>
                  <QuizHistoryManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/study-library-content"
            element={
              <AdminGuard>
                <AdminLayout>
                  <StudyLibraryContentManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
          <Route
            path="/admin/quiz-scheduler"
            element={
              <AdminGuard>
                <AdminLayout>
                  <QuizSchedulerManagement />
                </AdminLayout>
              </AdminGuard>
            }
          />
        </Routes>
        </BrowserRouter>
      </QuizTimerProvider>
    </ChakraProvider>
  );
};

