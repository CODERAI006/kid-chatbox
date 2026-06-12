/**
 * Polls in-app notifications and surfaces toasts + chime for new buddy events.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/shared/design-system';
import { notificationsApi } from '@/services/api';
import { playNotificationChime } from '@/utils/notificationSound';
import type { UserNotification } from '@/types/notification';

const POLL_MS = 30_000;
const STORAGE_KEY = 'guru_seen_notification_ids';

function loadSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>): void {
  try {
    const list = [...ids].slice(-100);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

type Options = { enabled?: boolean };

export function useInAppNotifications({ enabled = true }: Options = {}) {
  const toast = useToast();
  const checkingRef = useRef(false);
  const seenRef = useRef<Set<string>>(loadSeenIds());
  const seededRef = useRef(false);

  const notifyNew = useCallback(
    (item: UserNotification) => {
      if (seenRef.current.has(item.id)) return;
      seenRef.current.add(item.id);
      saveSeenIds(seenRef.current);

      void playNotificationChime();
      window.dispatchEvent(new CustomEvent('notifications:refresh'));
      toast({
        title: item.title,
        description: item.body || undefined,
        status: item.type === 'buddy_request' ? 'info' : 'success',
        duration: 10000,
        isClosable: true,
        position: 'top-right',
      });
    },
    [toast]
  );

  const poll = useCallback(async () => {
    if (!enabled || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const { notifications } = await notificationsApi.list({ limit: 10, unreadOnly: true });
      const buddyNotes = notifications.filter(
        (n) => n.type === 'buddy_request' || n.type === 'buddy_quiz_share'
      );
      if (!seededRef.current) {
        buddyNotes.forEach((n) => seenRef.current.add(n.id));
        saveSeenIds(seenRef.current);
        seededRef.current = true;
        return;
      }
      buddyNotes.forEach(notifyNew);
    } catch {
      /* silent when logged out or offline */
    } finally {
      checkingRef.current = false;
    }
  }, [enabled, notifyNew]);

  useEffect(() => {
    if (!enabled) return undefined;
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    const onRefresh = () => void poll();
    window.addEventListener('notifications:refresh', onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('notifications:refresh', onRefresh);
    };
  }, [enabled, poll]);
}
