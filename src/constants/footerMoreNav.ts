/**
 * Secondary navigation items shown in footer / mobile "More" overflow menu.
 */
import type { IconType } from 'react-icons';
import {
  FiBook,
  FiGlobe,
  FiGrid,
  FiMessageCircle,
  FiTarget,
  FiUser,
  FiUsers,
} from 'react-icons/fi';

export type FooterMoreNavItem = {
  path: string;
  label: string;
  icon: IconType;
};

export const FOOTER_MORE_NAV_ITEMS: FooterMoreNavItem[] = [
  { path: '/puzzles', label: 'Puzzle Hub', icon: FiGrid },
  { path: '/past-chats', label: 'Past Chats', icon: FiMessageCircle },
  { path: '/study', label: 'Study Hub', icon: FiBook },
  { path: '/quiz', label: 'Quiz Hub', icon: FiTarget },
  { path: '/study-buddies', label: 'Study Buddies', icon: FiUsers },
  { path: '/news', label: 'Facts & Fun', icon: FiGlobe },
  { path: '/profile', label: 'Profile', icon: FiUser },
];
