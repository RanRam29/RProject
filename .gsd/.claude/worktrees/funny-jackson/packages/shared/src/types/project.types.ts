import { ProjectStatus, WidgetType } from '../enums/index.js';
import { WidgetConfig } from './template.types.js';

export interface ProjectDTO {
  id: string;
  name: string;
  description: string | null;
  configJson: ProjectConfig;
  status: ProjectStatus;
  ownerId: string;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  widgets: WidgetConfig[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface InstantiateProjectRequest {
  templateId: string;
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ProjectWidgetDTO {
  id: string;
  projectId: string;
  type: WidgetType;
  title: string;
  configJson: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
