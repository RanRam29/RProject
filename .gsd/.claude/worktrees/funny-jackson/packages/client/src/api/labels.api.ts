import apiClient from './client';
import type {
  LabelDTO,
  TaskLabelDTO,
  CreateLabelRequest,
  UpdateLabelRequest,
  ApiResponse,
} from '@pm/shared';

export const labelsApi = {
  async list(projectId: string): Promise<LabelDTO[]> {
    const res = await apiClient.get<ApiResponse<LabelDTO[]>>(
      `/projects/${projectId}/labels`
    );
    return res.data.data!;
  },

  async create(projectId: string, data: CreateLabelRequest): Promise<LabelDTO> {
    const res = await apiClient.post<ApiResponse<LabelDTO>>(
      `/projects/${projectId}/labels`,
      data
    );
    return res.data.data!;
  },

  async update(projectId: string, labelId: string, data: UpdateLabelRequest): Promise<LabelDTO> {
    const res = await apiClient.patch<ApiResponse<LabelDTO>>(
      `/projects/${projectId}/labels/${labelId}`,
      data
    );
    return res.data.data!;
  },

  async delete(projectId: string, labelId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/labels/${labelId}`);
  },

  async assignToTask(projectId: string, taskId: string, labelId: string): Promise<TaskLabelDTO> {
    const res = await apiClient.post<ApiResponse<TaskLabelDTO>>(
      `/projects/${projectId}/labels/tasks/${taskId}/assign/${labelId}`
    );
    return res.data.data!;
  },

  async removeFromTask(projectId: string, taskId: string, labelId: string): Promise<void> {
    await apiClient.delete(
      `/projects/${projectId}/labels/tasks/${taskId}/assign/${labelId}`
    );
  },
};
