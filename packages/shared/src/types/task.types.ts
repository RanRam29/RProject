import type { TaskLabelDTO } from './label.types.js';
import type { CommentDTO } from './comment.types.js';
import type { TaskPriority } from '../enums/task-priority.enum.js';

/** JSON-safe value type for rich-text document content */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface TaskDTO {
  id: string;
  projectId: string;
  title: string;
  description: JsonValue | null;
  statusId: string;
  assigneeId: string | null;
  creatorId: string;
  parentTaskId: string | null;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  subtasks?: TaskDTO[];
  blockedBy?: TaskDependencyDTO[];
  blocking?: TaskDependencyDTO[];
  labels?: TaskLabelDTO[];
  comments?: CommentDTO[];
}

export interface TaskDependencyDTO {
  id: string;
  blockedTaskId: string;
  blockingTaskId: string;
}

export interface TaskStatusDTO {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
  isFinal: boolean;
}

export interface CreateTaskRequest {
  title: string;
  description?: JsonValue;
  statusId: string;
  assigneeId?: string;
  parentTaskId?: string;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: JsonValue;
  assigneeId?: string | null;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface UpdateTaskStatusRequest {
  statusId: string;
  sortOrder?: number;
}

export interface CreateTaskStatusRequest {
  name: string;
  color?: string;
  sortOrder?: number;
  isFinal?: boolean;
}

export interface CreateDependencyRequest {
  blockingTaskId: string;
}
