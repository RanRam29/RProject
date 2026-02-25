import { NotificationType } from '../enums/index.js';

export { NotificationType };

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
