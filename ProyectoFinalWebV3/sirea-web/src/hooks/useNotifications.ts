import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  subscribeToNotifications
} from '../services/notifications';
import type { Notification, NotificationType } from '../types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => Promise<void>) | null = null;

    const loadNotifications = async () => {
      if (!user) {
        if (mounted) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const { data, error } = await getNotifications(user.id, { limit: 50 });
      if (!mounted) return;
      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    };

    loadNotifications();

    if (user) {
      subscribeToNotifications(user.id, async () => {
        const { data, error } = await getNotifications(user.id, { limit: 50 });
        if (!mounted) return;
        if (!error && data) {
          setNotifications(data);
        }
      }).then((unsub) => {
        unsubscribe = unsub;
      });
    }

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((notification) => notification.type === filter);
  }, [filter, notifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    const { error } = await markAsRead(notificationId);
    if (!error) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    }
    return error;
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return null;
    const { error } = await markAllAsRead(user.id);
    if (!error) {
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    }
    return error;
  };

  return {
    notifications: visibleNotifications,
    unreadCount,
    loading,
    filter,
    setFilter,
    markNotificationAsRead,
    markAllNotificationsAsRead
  };
}
