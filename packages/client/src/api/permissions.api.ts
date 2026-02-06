import apiClient from './client';
import type {
  ProjectPermissionDTO,
  CustomRoleDTO,
  InviteUserRequest,
  UpdatePermissionRequest,
  CreateCustomRoleRequest,
  ApiResponse,
} from '@pm/shared';

export const permissionsApi = {
  async list(projectId: string): Promise<ProjectPermissionDTO[]> {
    const res = await apiClient.get<ApiResponse<ProjectPermissionDTO[]>>(
      `/projects/${projectId}/permissions`
    );
    return res.data.data!;
  },

  async invite(projectId: string, data: InviteUserRequest): Promise<ProjectPermissionDTO> {
    const res = await apiClient.post<ApiResponse<ProjectPermissionDTO>>(
      `/projects/${projectId}/permissions`,
      data
    );
    return res.data.data!;
  },

  async update(
    projectId: string,
    permId: string,
    data: UpdatePermissionRequest
  ): Promise<ProjectPermissionDTO> {
    const res = await apiClient.patch<ApiResponse<ProjectPermissionDTO>>(
      `/projects/${projectId}/permissions/${permId}`,
      data
    );
    return res.data.data!;
  },

  async remove(projectId: string, permId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/permissions/${permId}`);
  },

  // Custom roles
  async getCustomRoles(projectId: string): Promise<CustomRoleDTO[]> {
    const res = await apiClient.get<ApiResponse<CustomRoleDTO[]>>(
      `/projects/${projectId}/permissions/custom-roles`
    );
    return res.data.data!;
  },

  async createCustomRole(
    projectId: string,
    data: CreateCustomRoleRequest
  ): Promise<CustomRoleDTO> {
    const res = await apiClient.post<ApiResponse<CustomRoleDTO>>(
      `/projects/${projectId}/permissions/custom-roles`,
      data
    );
    return res.data.data!;
  },

  async updateCustomRole(
    projectId: string,
    roleId: string,
    data: Partial<CreateCustomRoleRequest>
  ): Promise<CustomRoleDTO> {
    const res = await apiClient.patch<ApiResponse<CustomRoleDTO>>(
      `/projects/${projectId}/permissions/custom-roles/${roleId}`,
      data
    );
    return res.data.data!;
  },

  async deleteCustomRole(projectId: string, roleId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/permissions/custom-roles/${roleId}`);
  },
};
