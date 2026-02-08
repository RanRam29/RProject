export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_COMMENTED'
  | 'PROJECT_INVITED'
  | 'PERMISSION_CHANGED'
  | 'MENTION';

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  projectId: string | null;
  taskId: string | null;
  actorId: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
