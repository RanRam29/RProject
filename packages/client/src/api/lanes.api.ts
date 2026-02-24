import apiClient from './client';
import type { LaneDTO, CreateLaneRequest, UpdateLaneRequest, ApiResponse } from '@pm/shared';

export const lanesApi = {
  async list(projectId: string): Promise<LaneDTO[]> {
    const res = await apiClient.get<ApiResponse<LaneDTO[]>>(
      `/projects/${projectId}/lanes`,
    );
    return res.data.data!;
  },

  async create(projectId: string, data: CreateLaneRequest): Promise<LaneDTO> {
    const res = await apiClient.post<ApiResponse<LaneDTO>>(
      `/projects/${projectId}/lanes`,
      data,
    );
    return res.data.data!;
  },

  async update(
    projectId: string,
    laneId: string,
    data: UpdateLaneRequest,
  ): Promise<LaneDTO> {
    const res = await apiClient.patch<ApiResponse<LaneDTO>>(
      `/projects/${projectId}/lanes/${laneId}`,
      data,
    );
    return res.data.data!;
  },

  async delete(projectId: string, laneId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/lanes/${laneId}`);
  },
};
