import { TaskPriority } from '../enums/task-priority.enum.js';

export interface PriorityConfig {
  label: string;
  color: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  [TaskPriority.URGENT]: { label: 'Urgent', color: '#EF4444' },
  [TaskPriority.HIGH]: { label: 'High', color: '#F97316' },
  [TaskPriority.MEDIUM]: { label: 'Medium', color: '#EAB308' },
  [TaskPriority.LOW]: { label: 'Low', color: '#6B7280' },
  [TaskPriority.NONE]: { label: 'None', color: 'transparent' },
};
