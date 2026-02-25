import { create } from 'zustand';
import type { NotificationDTO } from '@pm/shared';

interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: NotificationDTO[]) => void;
  addNotification: (notification: NotificationDTO) => void;
  setUnreadCount: (count: number) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAll: () => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  markAsRead: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.isRead;
      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),

  removeNotification: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.isRead;
      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  setLoading: (isLoading) => set({ isLoading }),
}));
