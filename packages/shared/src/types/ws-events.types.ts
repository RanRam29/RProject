import { ProjectDTO, ProjectWidgetDTO } from './project.types';
import { TaskDTO, TaskStatusDTO } from './task.types';
import { FileDTO } from './file.types';
import { UserPresenceDTO } from './user.types';
import { LabelDTO } from './label.types';
import { CommentDTO } from './comment.types';

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
}

export interface ServerToClientEvents {
  'project:updated': (data: {
    projectId: string;
    changes: Partial<ProjectDTO>;
  }) => void;
  'project:widgetAdded': (data: {
    projectId: string;
    widget: ProjectWidgetDTO;
  }) => void;
  'project:widgetRemoved': (data: {
    projectId: string;
    widgetId: string;
  }) => void;
  'project:widgetMoved': (data: {
    projectId: string;
    widgetId: string;
    x: number;
    y: number;
  }) => void;

  'task:created': (data: { projectId: string; task: TaskDTO }) => void;
  'task:updated': (data: {
    projectId: string;
    taskId: string;
    changes: Partial<TaskDTO>;
  }) => void;
  'task:deleted': (data: { projectId: string; taskId: string }) => void;
  'task:statusChanged': (data: {
    projectId: string;
    taskId: string;
    oldStatusId: string;
    newStatusId: string;
  }) => void;
  'task:reordered': (data: {
    projectId: string;
    statusId: string;
    taskIds: string[];
  }) => void;

  'status:created': (data: {
    projectId: string;
    status: TaskStatusDTO;
  }) => void;
  'status:updated': (data: {
    projectId: string;
    statusId: string;
    changes: Partial<TaskStatusDTO>;
  }) => void;
  'status:deleted': (data: {
    projectId: string;
    statusId: string;
  }) => void;

  'file:uploaded': (data: { projectId: string; file: FileDTO }) => void;
  'file:deleted': (data: { projectId: string; fileId: string }) => void;

  'subtask:created': (data: { projectId: string; taskId: string; subtask: TaskDTO }) => void;
  'subtask:updated': (data: { projectId: string; taskId: string; subtaskId: string; changes: Partial<TaskDTO> }) => void;
  'subtask:deleted': (data: { projectId: string; taskId: string; subtaskId: string }) => void;

  'dependency:added': (data: { projectId: string; taskId: string; dependencyTaskId: string; type: string }) => void;
  'dependency:removed': (data: { projectId: string; taskId: string; dependencyTaskId: string }) => void;

  'label:created': (data: { projectId: string; label: LabelDTO }) => void;
  'label:updated': (data: { projectId: string; labelId: string; changes: Partial<LabelDTO> }) => void;
  'label:deleted': (data: { projectId: string; labelId: string }) => void;
  'label:assigned': (data: { projectId: string; taskId: string; labelId: string }) => void;
  'label:unassigned': (data: { projectId: string; taskId: string; labelId: string }) => void;

  'comment:created': (data: { projectId: string; taskId: string; comment: CommentDTO }) => void;
  'comment:updated': (data: { projectId: string; taskId: string; commentId: string; changes: Partial<CommentDTO> }) => void;
  'comment:deleted': (data: { projectId: string; taskId: string; commentId: string }) => void;

  'presence:userJoined': (data: {
    projectId: string;
    user: UserPresenceDTO;
  }) => void;
  'presence:userLeft': (data: {
    projectId: string;
    userId: string;
  }) => void;
  'presence:cursors': (data: {
    projectId: string;
    cursors: CursorPosition[];
  }) => void;
}

export interface ClientToServerEvents {
  'project:join': (projectId: string) => void;
  'project:leave': (projectId: string) => void;
  'presence:cursorMove': (data: {
    projectId: string;
    x: number;
    y: number;
  }) => void;
}
