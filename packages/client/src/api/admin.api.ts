import apiClient from './client';
import type { ApiResponse } from '@pm/shared';

export interface AdminStatsDTO {
  users: number;
  projects: number;
  tasks: number;
}

export interface AdminLogDTO {
  id: string;
  action: string;
  actorId: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AdminLogParams {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  projectId?: string;
}

export const adminApi = {
  async getStats(): Promise<AdminStatsDTO> {
    const res = await apiClient.get<ApiResponse<AdminStatsDTO>>('/admin/stats');
    
    if (!res?.data?.data) {
      throw new Error('Invalid admin stats response');
    }
    
    return res.data.data;
  },

  async getLogs(params: AdminLogParams = {}): Promise<{ data: AdminLogDTO[]; total: number; page: number; limit: number }> {
    const res = await apiClient.get<{ success: boolean; data: AdminLogDTO[]; total: number; page: number; limit: number }>(
      '/admin/logs',
      { params }
    );
    return { data: res.data.data, total: res.data.total, page: res.data.page, limit: res.data.limit };
  },
};
