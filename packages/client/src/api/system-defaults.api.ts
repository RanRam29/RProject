import apiClient from './client';
import type { SystemDefaultsDTO, ApiResponse } from '@pm/shared';

export const systemDefaultsApi = {
  async get(): Promise<SystemDefaultsDTO> {
    const res = await apiClient.get<ApiResponse<SystemDefaultsDTO>>('/system-defaults');
    return res.data.data!;
  },

  async update(data: SystemDefaultsDTO): Promise<SystemDefaultsDTO> {
    const res = await apiClient.put<ApiResponse<SystemDefaultsDTO>>('/system-defaults', data);
    return res.data.data!;
  },
};
