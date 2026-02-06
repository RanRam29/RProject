import apiClient from './client';
import type { TemplateDTO, CreateTemplateRequest, ApiResponse } from '@pm/shared';

export const templatesApi = {
  async list(): Promise<TemplateDTO[]> {
    const res = await apiClient.get<ApiResponse<TemplateDTO[]>>('/templates');
    return res.data.data!;
  },

  async get(id: string): Promise<TemplateDTO> {
    const res = await apiClient.get<ApiResponse<TemplateDTO>>(`/templates/${id}`);
    return res.data.data!;
  },

  async create(data: CreateTemplateRequest): Promise<TemplateDTO> {
    const res = await apiClient.post<ApiResponse<TemplateDTO>>('/templates', data);
    return res.data.data!;
  },

  async update(id: string, data: Partial<CreateTemplateRequest>): Promise<TemplateDTO> {
    const res = await apiClient.patch<ApiResponse<TemplateDTO>>(`/templates/${id}`, data);
    return res.data.data!;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`);
  },
};
