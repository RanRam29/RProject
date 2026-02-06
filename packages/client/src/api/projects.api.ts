import apiClient from './client';
import type {
  ProjectDTO,
  CreateProjectRequest,
  InstantiateProjectRequest,
  UpdateProjectRequest,
  ProjectWidgetDTO,
  ApiResponse,
  PaginatedResponse,
} from '@pm/shared';

export const projectsApi = {
  async list(page = 1, limit = 20): Promise<PaginatedResponse<ProjectDTO>> {
    const res = await apiClient.get<PaginatedResponse<ProjectDTO>>('/projects', {
      params: { page, limit },
    });
    return res.data;
  },

  async get(id: string): Promise<ProjectDTO> {
    const res = await apiClient.get<ApiResponse<ProjectDTO>>(`/projects/${id}`);
    return res.data.data!;
  },

  async create(data: CreateProjectRequest): Promise<ProjectDTO> {
    const res = await apiClient.post<ApiResponse<ProjectDTO>>('/projects', data);
    return res.data.data!;
  },

  async instantiate(data: InstantiateProjectRequest): Promise<ProjectDTO> {
    const res = await apiClient.post<ApiResponse<ProjectDTO>>('/projects/instantiate', data);
    return res.data.data!;
  },

  async update(id: string, data: UpdateProjectRequest): Promise<ProjectDTO> {
    const res = await apiClient.patch<ApiResponse<ProjectDTO>>(`/projects/${id}`, data);
    return res.data.data!;
  },

  async updateStatus(id: string, status: string): Promise<ProjectDTO> {
    const res = await apiClient.patch<ApiResponse<ProjectDTO>>(`/projects/${id}/status`, { status });
    return res.data.data!;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  async saveAsTemplate(id: string): Promise<void> {
    await apiClient.post(`/projects/${id}/save-as-template`);
  },

  // Widgets
  async getWidgets(projectId: string): Promise<ProjectWidgetDTO[]> {
    const res = await apiClient.get<ApiResponse<ProjectWidgetDTO[]>>(
      `/projects/${projectId}/widgets`
    );
    return res.data.data!;
  },

  async addWidget(
    projectId: string,
    data: { type: string; title: string; positionX?: number; positionY?: number; width?: number; height?: number }
  ): Promise<ProjectWidgetDTO> {
    const res = await apiClient.post<ApiResponse<ProjectWidgetDTO>>(
      `/projects/${projectId}/widgets`,
      data
    );
    return res.data.data!;
  },

  async updateWidget(
    projectId: string,
    widgetId: string,
    data: Partial<ProjectWidgetDTO>
  ): Promise<ProjectWidgetDTO> {
    const res = await apiClient.patch<ApiResponse<ProjectWidgetDTO>>(
      `/projects/${projectId}/widgets/${widgetId}`,
      data
    );
    return res.data.data!;
  },

  async deleteWidget(projectId: string, widgetId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/widgets/${widgetId}`);
  },
};
