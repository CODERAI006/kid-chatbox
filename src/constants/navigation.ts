/**
 * Shared navigation config for admin portal and student sidebar.
 */

import type { IconType } from 'react-icons';
import {
  FiBarChart2,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiCpu,
  FiFileText,
  FiGlobe,
  FiHome,
  FiMessageCircle,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiSun,
  FiZap,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiGrid,
  FiCreditCard,
} from 'react-icons/fi';

export type NavAction = 'feedback' | 'install';

export type AppNavItem = {
  /** Stable route id (admin path or consumer path). */
  adminPath: string;
  label: string;
  icon: IconType;
  consumerPath?: string;
  module?: 'study' | 'quiz';
  action?: NavAction;
  /** Visible in student sidebar only when the user is an admin. */
  adminOnly?: boolean;
};

/** Admin portal sidebar — mirrors routes in App.tsx. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { adminPath: '/admin', label: 'Dashboard', icon: FiHome },
  { adminPath: '/admin/users', label: 'Users', icon: FiUsers },
  { adminPath: '/admin/plans', label: 'Plans', icon: FiSettings },
  { adminPath: '/admin/payment-settings', label: 'Payment Settings', icon: FiCreditCard },
  { adminPath: '/admin/payment-requests', label: 'Payment Requests', icon: FiCreditCard },
  { adminPath: '/admin/topics', label: 'Topics', icon: FiBook },
  { adminPath: '/admin/quizzes', label: 'Quizzes', icon: FiFileText },
  { adminPath: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
  { adminPath: '/admin/quiz-analytics', label: 'Quiz Analytics', icon: FiTrendingUp },
  { adminPath: '/admin/quiz-history', label: 'Quiz History', icon: FiClock },
  { adminPath: '/admin/study-library-content', label: 'Study Library', icon: FiBookOpen },
  { adminPath: '/admin/quiz-scheduler', label: 'Quiz Scheduler', icon: FiCalendar },
  { adminPath: '/admin/daily-content-batch', label: 'Daily Content Batch', icon: FiClock },
  { adminPath: '/admin/ollama-cloud', label: 'AI Settings', icon: FiCpu },
  { adminPath: '/admin/word-of-day', label: 'Word of the Day', icon: FiSun },
  { adminPath: '/admin/facts-and-fun', label: 'Facts & Fun', icon: FiZap },
  { adminPath: '/admin/puzzles', label: 'Puzzles', icon: FiGrid },
  { adminPath: '/admin/education-news', label: 'Education News', icon: FiGlobe },
  { adminPath: '/admin/site-pages', label: 'Legal Pages', icon: FiShield },
  { adminPath: '/admin/feedback', label: 'Feedback', icon: FiMessageSquare },
];

/** Student app sidebar entries (admin portal link appended when user is admin). */
const STUDENT_NAV_ITEMS: AppNavItem[] = [
  { adminPath: '/dashboard', label: 'Home', icon: FiHome, consumerPath: '/dashboard' },
  { adminPath: '/study', label: 'Study Hub', icon: FiBook, consumerPath: '/study', module: 'study' },
  { adminPath: '/quiz', label: 'Quiz Hub', icon: FiTarget, consumerPath: '/quiz', module: 'quiz' },
  { adminPath: '/puzzles', label: 'Puzzle Hub', icon: FiGrid, consumerPath: '/puzzles' },
  { adminPath: '/past-chats', label: 'Past Chats', icon: FiMessageCircle, consumerPath: '/past-chats' },
  { adminPath: '/my-schedules', label: 'My Schedules', icon: FiCalendar, consumerPath: '/my-schedules' },
  { adminPath: '/study-buddies', label: 'Study Buddies', icon: FiUsers, consumerPath: '/study-buddies', module: 'quiz' },
  { adminPath: '/education-news', label: 'Education News', icon: FiFileText, consumerPath: '/education-news' },
  { adminPath: '/news', label: 'Facts & Fun', icon: FiGlobe, consumerPath: '/news' },
  { adminPath: '/profile', label: 'Profile', icon: FiUser, consumerPath: '/profile' },
  {
    adminPath: 'action:feedback',
    label: 'Send Feedback',
    icon: FiMessageSquare,
    action: 'feedback',
  },
];

const ADMIN_PORTAL_LINK: AppNavItem = {
  adminPath: '/admin',
  label: 'Admin Portal',
  icon: FiShield,
  consumerPath: '/admin',
  adminOnly: true,
};

/** Admin routes with wide tables — sidebar starts collapsed on desktop. */
export const ADMIN_TABLE_VIEW_PATHS = new Set([
  '/admin/users',
  '/admin/topics',
  '/admin/quizzes',
  '/admin/quiz-history',
  '/admin/study-library-content',
  '/admin/quiz-scheduler',
  '/admin/daily-content-batch',
  '/admin/feedback',
  '/admin/payment-requests',
]);

export function getVisibleNavItems(isAdmin: boolean): AppNavItem[] {
  const items = STUDENT_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  if (isAdmin) {
    items.push(ADMIN_PORTAL_LINK);
  }
  return items;
}

export function resolveAdminNavPath(item: AppNavItem): string {
  return item.adminPath;
}

export function resolveConsumerNavPath(item: AppNavItem, _isAdmin: boolean): string {
  if (item.action) return '';
  return item.consumerPath ?? item.adminPath;
}

export function isNavItemActive(pathname: string, hash: string, targetPath: string): boolean {
  if (!targetPath) return false;

  const hashIndex = targetPath.indexOf('#');
  const pathPart = hashIndex >= 0 ? targetPath.slice(0, hashIndex) : targetPath;
  const expectedHash = hashIndex >= 0 ? targetPath.slice(hashIndex) : '';

  const pathMatches =
    pathname === pathPart || (pathPart !== '/' && pathname.startsWith(`${pathPart}/`));
  if (!pathMatches) return false;

  if (expectedHash) {
    return hash === expectedHash;
  }

  return true;
}
