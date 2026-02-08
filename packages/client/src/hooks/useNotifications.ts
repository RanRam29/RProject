import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { useNotificationStore } from '../stores/notification.store';
import { useSocket } from '../contexts/SocketContext';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import type { NotificationDTO } from '@pm/shared';

export function useNotifications() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);
  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    addNotification,
    setUnreadCount,
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead,
    removeNotification,
    clearAll,
    setLoading,
  } = useNotificationStore();

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1, 50),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 10_000,
    refetchInterval: 60_000,
  });

  // Sync query data to store
  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData.data);
    }
  }, [notificationsData, setNotifications]);

  useEffect(() => {
    if (unreadCountData !== undefined) {
      setUnreadCount(unreadCountData);
    }
  }, [unreadCountData, setUnreadCount]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: NotificationDTO }) => {
      addNotification(data.notification);
      addToast({ type: 'info', message: data.notification.title });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, addNotification, addToast, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    storeMarkAsRead(notificationId);
    try {
      await notificationsApi.markAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [storeMarkAsRead, queryClient]);

  const markAllAsRead = useCallback(async () => {
    storeMarkAllAsRead();
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [storeMarkAllAsRead, queryClient]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    removeNotification(notificationId);
    try {
      await notificationsApi.delete(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [removeNotification, queryClient]);

  const deleteAllNotifications = useCallback(async () => {
    setLoading(true);
    clearAll();
    try {
      await notificationsApi.deleteAll();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } finally {
      setLoading(false);
    }
  }, [clearAll, setLoading, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
}
