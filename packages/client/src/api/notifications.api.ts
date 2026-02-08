import apiClient from './client';
import type { NotificationDTO } from '@pm/shared';

interface PaginatedNotifications {
  data: NotificationDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationsApi = {
  async list(page = 1, limit = 20, unreadOnly = false): Promise<PaginatedNotifications> {
    const res = await apiClient.get<{ success: boolean; data: NotificationDTO[]; pagination: PaginatedNotifications['pagination'] }>(
      '/notifications',
      { params: { page, limit, unreadOnly } },
    );
    return { data: res.data.data, pagination: res.data.pagination };
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ success: boolean; data: { count: number } }>(
      '/notifications/unread-count',
    );
    return res.data.data.count;
  },

  async markAsRead(notificationId: string): Promise<NotificationDTO> {
    const res = await apiClient.patch<{ success: boolean; data: NotificationDTO }>(
      `/notifications/${notificationId}/read`,
    );
    return res.data.data;
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const res = await apiClient.patch<{ success: boolean; data: { count: number } }>(
      '/notifications/read-all',
    );
    return res.data.data;
  },

  async delete(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  async deleteAll(): Promise<{ count: number }> {
    const res = await apiClient.delete<{ success: boolean; data: { count: number } }>(
      '/notifications/all',
    );
    return res.data.data;
  },
};
