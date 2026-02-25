import apiClient from './client';
import type {
  TaskDTO,
  TaskStatusDTO,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateTaskStatusRequest,
  CreateDependencyRequest,
  TaskDependencyDTO,
  ApiResponse,
  UpdateTaskTimelineRequest,
  UpdateTaskTimelineResponse,
} from '@pm/shared';

export const tasksApi = {
  // Task Statuses
  async getStatuses(projectId: string): Promise<TaskStatusDTO[]> {
    const res = await apiClient.get<ApiResponse<TaskStatusDTO[]>>(
      `/projects/${projectId}/statuses`
    );
    return res.data.data!;
  },

  async createStatus(projectId: string, data: CreateTaskStatusRequest): Promise<TaskStatusDTO> {
    const res = await apiClient.post<ApiResponse<TaskStatusDTO>>(
      `/projects/${projectId}/statuses`,
      data
    );
    return res.data.data!;
  },

  async updateStatus(
    projectId: string,
    statusId: string,
    data: Partial<CreateTaskStatusRequest>
  ): Promise<TaskStatusDTO> {
    const res = await apiClient.patch<ApiResponse<TaskStatusDTO>>(
      `/projects/${projectId}/statuses/${statusId}`,
      data
    );
    return res.data.data!;
  },

  async deleteStatus(projectId: string, statusId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/statuses/${statusId}`);
  },

  // Tasks
  async list(projectId: string, params?: Record<string, string>): Promise<TaskDTO[]> {
    const res = await apiClient.get<ApiResponse<TaskDTO[]>>(
      `/projects/${projectId}/tasks`,
      { params }
    );
    return res.data.data!;
  },

  async get(projectId: string, taskId: string): Promise<TaskDTO> {
    const res = await apiClient.get<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks/${taskId}`
    );
    return res.data.data!;
  },

  async create(projectId: string, data: CreateTaskRequest): Promise<TaskDTO> {
    const res = await apiClient.post<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks`,
      data
    );
    return res.data.data!;
  },

  async update(projectId: string, taskId: string, data: UpdateTaskRequest): Promise<TaskDTO> {
    const res = await apiClient.patch<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks/${taskId}`,
      data
    );
    return res.data.data!;
  },

  async updateTaskStatus(
    projectId: string,
    taskId: string,
    statusId: string,
    sortOrder?: number
  ): Promise<TaskDTO> {
    const res = await apiClient.patch<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks/${taskId}/status`,
      { statusId, sortOrder }
    );
    return res.data.data!;
  },

  async reorder(
    projectId: string,
    taskId: string,
    sortOrder: number
  ): Promise<TaskDTO> {
    const res = await apiClient.patch<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks/${taskId}/reorder`,
      { sortOrder }
    );
    return res.data.data!;
  },

  async delete(projectId: string, taskId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
  },

  // Subtasks
  async createSubtask(
    projectId: string,
    taskId: string,
    data: CreateTaskRequest
  ): Promise<TaskDTO> {
    const res = await apiClient.post<ApiResponse<TaskDTO>>(
      `/projects/${projectId}/tasks/${taskId}/subtasks`,
      data
    );
    return res.data.data!;
  },

  // Bulk Operations
  async bulkOperation(
    projectId: string,
    data: {
      taskIds: string[];
      operation: 'move' | 'assign' | 'delete' | 'setPriority';
      statusId?: string;
      assigneeId?: string | null;
      priority?: string;
    }
  ): Promise<{ count: number; operation: string }> {
    const res = await apiClient.post<ApiResponse<{ count: number; operation: string }>>(
      `/projects/${projectId}/tasks/bulk`,
      data
    );
    return res.data.data!;
  },

  // Gantt timeline
  async updateTimeline(
    projectId: string,
    taskId: string,
    data: UpdateTaskTimelineRequest,
  ): Promise<UpdateTaskTimelineResponse> {
    const res = await apiClient.patch<ApiResponse<UpdateTaskTimelineResponse>>(
      `/projects/${projectId}/tasks/${taskId}/timeline`,
      data,
    );
    return res.data.data!;
  },

  // Dependencies
  async addDependency(
    projectId: string,
    taskId: string,
    data: CreateDependencyRequest
  ): Promise<TaskDependencyDTO> {
    const res = await apiClient.post<ApiResponse<TaskDependencyDTO>>(
      `/projects/${projectId}/tasks/${taskId}/dependencies`,
      data
    );
    return res.data.data!;
  },

  async removeDependency(
    projectId: string,
    taskId: string,
    depId: string
  ): Promise<void> {
    await apiClient.delete(
      `/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`
    );
  },
};
