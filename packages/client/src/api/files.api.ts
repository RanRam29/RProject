import apiClient from './client';
import type { FileDTO, UploadUrlResponse, RegisterFileRequest, ApiResponse } from '@pm/shared';

export const filesApi = {
  async list(projectId: string): Promise<FileDTO[]> {
    const res = await apiClient.get<ApiResponse<FileDTO[]>>(
      `/projects/${projectId}/files`
    );
    return res.data.data!;
  },

  async getUploadUrl(
    projectId: string,
    fileName: string,
    mimeType: string
  ): Promise<UploadUrlResponse> {
    const res = await apiClient.post<ApiResponse<UploadUrlResponse>>(
      `/projects/${projectId}/files/upload-url`,
      { fileName, mimeType }
    );
    return res.data.data!;
  },

  async registerFile(
    projectId: string,
    data: RegisterFileRequest
  ): Promise<FileDTO> {
    const res = await apiClient.post<ApiResponse<FileDTO>>(
      `/projects/${projectId}/files`,
      data
    );
    return res.data.data!;
  },

  async getDownloadUrl(projectId: string, fileId: string): Promise<string> {
    const res = await apiClient.get<ApiResponse<{ downloadUrl: string }>>(
      `/projects/${projectId}/files/${fileId}/download-url`
    );
    return res.data.data!.downloadUrl;
  },

  async delete(projectId: string, fileId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
  },
};
