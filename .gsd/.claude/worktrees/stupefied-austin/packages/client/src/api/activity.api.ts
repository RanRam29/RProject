import apiClient from './client';

export interface ActivityLogDTO {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

export const activityApi = {
  async list(projectId: string, page = 1, limit = 30): Promise<ActivityLogDTO[]> {
    const res = await apiClient.get<{ success: boolean; data: ActivityLogDTO[] }>(
      `/projects/${projectId}/activity`,
      { params: { page, limit } }
    );
    return res.data.data;
  },

  async listUserActivity(limit = 15): Promise<ActivityLogDTO[]> {
    const res = await apiClient.get<{ success: boolean; data: ActivityLogDTO[] }>(
      '/users/me/activity',
      { params: { limit } }
    );
    return res.data.data;
  },
};
