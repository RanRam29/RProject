import { ProjectRole } from '../enums/index.js';

export interface ProjectPermissionDTO {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  customRoleId: string | null;
  capabilities: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface CustomRoleDTO {
  id: string;
  name: string;
  description: string | null;
  capabilities: Record<string, boolean>;
  projectId: string;
  createdAt: string;
}

export interface InviteUserRequest {
  userId: string;
  role: ProjectRole;
  customRoleId?: string;
}

export interface UpdatePermissionRequest {
  role: ProjectRole;
  customRoleId?: string;
  capabilities?: Record<string, boolean>;
}

export interface CreateCustomRoleRequest {
  name: string;
  description?: string;
  capabilities: Record<string, boolean>;
}
