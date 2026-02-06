import apiClient from './client';
import type { ApiResponse, UserDTO as SharedUserDTO } from '@pm/shared';

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  systemRole: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  systemRole?: string;
}

export const usersApi = {
  async list(search?: string): Promise<UserDTO[]> {
    const res = await apiClient.get<{ success: boolean; data: UserDTO[] }>('/users', {
      params: search ? { search } : undefined,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<UserDTO> {
    const res = await apiClient.get<ApiResponse<UserDTO>>(`/users/${id}`);
    return res.data.data!;
  },

  async create(data: CreateUserRequest): Promise<UserDTO> {
    const res = await apiClient.post<ApiResponse<UserDTO>>('/users', data);
    return res.data.data!;
  },

  async update(id: string, data: { displayName?: string; avatarUrl?: string }): Promise<SharedUserDTO> {
    const res = await apiClient.patch<ApiResponse<SharedUserDTO>>(`/users/${id}`, data);
    return res.data.data!;
  },

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.patch(`/users/${id}/password`, { currentPassword, newPassword });
  },
};
