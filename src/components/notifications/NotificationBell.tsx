/**
 * Header notification bell with unread badge and dropdown inbox.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { notificationsApi } from '@/services/api';
import type { UserNotification } from '@/types/notification';

const POLL_MS = 30_000;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

interface NotificationBellProps {
  enabled?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ enabled = true }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const muted = useColorModeValue('gray.600', 'gray.300');
  const itemBg = useColorModeValue('gray.50', 'gray.700');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await notificationsApi.list({ limit: 15 });
      setItems(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onRefresh = () => void refresh();
    window.addEventListener('notifications:refresh', onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('notifications:refresh', onRefresh);
    };
  }, [enabled, refresh]);

  const openItem = async (item: UserNotification) => {
    if (!item.isRead) {
      try {
        await notificationsApi.markRead(item.id);
      } catch {
        /* ignore */
      }
    }
    await refresh();
    if (item.linkPath) navigate(item.linkPath);
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      await refresh();
    } catch {
      /* ignore */
    }
  };

  if (!enabled) return null;

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        size="sm"
        variant="ghost"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        position="relative"
        px={2}
        minW="auto"
      >
        <Text fontSize="lg" lineHeight={1} aria-hidden>
          🔔
        </Text>
        {unreadCount > 0 && (
          <Badge
            colorScheme="red"
            borderRadius="full"
            position="absolute"
            top="-2px"
            right="-2px"
            fontSize="2xs"
            minW="18px"
            textAlign="center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </MenuButton>
      <MenuList maxW="320px" p={2}>
        <HStack justify="space-between" px={2} pb={2}>
          <Text fontWeight="semibold" fontSize="sm">
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Button size="xs" variant="link" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </HStack>
        {items.length === 0 ? (
          <Text fontSize="sm" color={muted} px={2} py={3}>
            No notifications yet
          </Text>
        ) : (
          <VStack align="stretch" spacing={1} maxH="360px" overflowY="auto">
            {items.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => void openItem(item)}
                bg={item.isRead ? undefined : itemBg}
                borderRadius="md"
                py={2}
                whiteSpace="normal"
              >
                <Box w="full">
                  <Text fontSize="sm" fontWeight={item.isRead ? 'normal' : 'semibold'} noOfLines={2}>
                    {item.title}
                  </Text>
                  {item.body && (
                    <Text fontSize="xs" color={muted} noOfLines={2} mt={0.5}>
                      {item.body}
                    </Text>
                  )}
                  <Text fontSize="2xs" color={muted} mt={1}>
                    {formatWhen(item.createdAt)}
                  </Text>
                </Box>
              </MenuItem>
            ))}
          </VStack>
        )}
      </MenuList>
    </Menu>
  );
};
