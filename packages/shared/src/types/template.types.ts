import { WidgetType } from '../enums';

export interface TemplateDTO {
  id: string;
  name: string;
  description: string | null;
  configJson: TemplateConfig;
  isPublic: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateConfig {
  widgets: WidgetConfig[];
  taskStatuses: TaskStatusConfig[];
  defaultPermissions: Record<string, Record<string, boolean>>;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
}

export interface TaskStatusConfig {
  name: string;
  color: string;
  sortOrder: number;
  isFinal: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  configJson: TemplateConfig;
  isPublic?: boolean;
}
