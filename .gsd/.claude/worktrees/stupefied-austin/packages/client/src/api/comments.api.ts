import apiClient from './client';
import type {
  CommentDTO,
  CreateCommentRequest,
  UpdateCommentRequest,
  ApiResponse,
} from '@pm/shared';

export const commentsApi = {
  async list(projectId: string, taskId: string): Promise<CommentDTO[]> {
    const res = await apiClient.get<ApiResponse<CommentDTO[]>>(
      `/projects/${projectId}/tasks/${taskId}/comments`
    );
    return res.data.data!;
  },

  async create(projectId: string, taskId: string, data: CreateCommentRequest): Promise<CommentDTO> {
    const res = await apiClient.post<ApiResponse<CommentDTO>>(
      `/projects/${projectId}/tasks/${taskId}/comments`,
      data
    );
    return res.data.data!;
  },

  async update(
    projectId: string,
    taskId: string,
    commentId: string,
    data: UpdateCommentRequest
  ): Promise<CommentDTO> {
    const res = await apiClient.patch<ApiResponse<CommentDTO>>(
      `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      data
    );
    return res.data.data!;
  },

  async delete(projectId: string, taskId: string, commentId: string): Promise<void> {
    await apiClient.delete(
      `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`
    );
  },
};
