import type { TaskPriority } from '@pm/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface PendingTask {
  title: string;
  statusId: string;
  statusName: string;
  priority?: TaskPriority;
  dueDate?: string;
}
