import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { useSocket } from '../contexts/SocketContext';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import type { NotificationDTO } from '@pm/shared';

export function useNotifications() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useUIStore((s) => s.addToast);

  const { data: notificationsData, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1, 50),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'] as const,
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const notifications: NotificationDTO[] = notificationsData?.data ?? [];
  const unreadCount = unreadData ?? notifications.filter((n) => !n.isRead).length; // fallback to derived count
  const isLoading = isFetching && notifications.length === 0;

  // Listen for real-time notifications — optimistically prepend, then sync
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (payload: { notification: NotificationDTO }) => {
      addToast({ type: 'info', message: payload.notification.title });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, addToast, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    queryClient.setQueryData<{ data: NotificationDTO[]; pagination: unknown }>(
      ['notifications'],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
          ),
        };
      },
    );
    try {
      await notificationsApi.markAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  }, [queryClient]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    queryClient.setQueryData<{ data: NotificationDTO[]; pagination: unknown }>(
      ['notifications'],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt ?? new Date().toISOString(),
          })),
        };
      },
    );
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  }, [queryClient]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    queryClient.setQueryData<{ data: NotificationDTO[]; pagination: unknown }>(
      ['notifications'],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((n) => n.id !== notificationId),
        };
      },
    );
    try {
      await notificationsApi.delete(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  }, [queryClient]);

  const deleteAllNotifications = useCallback(async () => {
    // Optimistic update
    queryClient.setQueryData<{ data: NotificationDTO[]; pagination: unknown }>(
      ['notifications'],
      (old) => {
        if (!old) return old;
        return { ...old, data: [] };
      },
    );
    try {
      await notificationsApi.deleteAll();
    } catch {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [queryClient]);

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
