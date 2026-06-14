export type UserNotificationType = 'buddy_request' | 'buddy_quiz_share' | 'user_login' | string;

export interface UserNotification {
  id: string;
  type: UserNotificationType;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: UserNotification[];
  unreadCount: number;
}
