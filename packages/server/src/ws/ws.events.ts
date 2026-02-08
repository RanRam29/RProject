export const WS_EVENTS = {
  // Client -> Server
  PROJECT_JOIN: 'project:join',
  PROJECT_LEAVE: 'project:leave',
  CURSOR_MOVE: 'presence:cursorMove',

  // Server -> Client
  PROJECT_UPDATED: 'project:updated',
  WIDGET_ADDED: 'project:widgetAdded',
  WIDGET_REMOVED: 'project:widgetRemoved',
  WIDGET_MOVED: 'project:widgetMoved',

  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_STATUS_CHANGED: 'task:statusChanged',
  TASK_REORDERED: 'task:reordered',

  STATUS_CREATED: 'status:created',
  STATUS_UPDATED: 'status:updated',
  STATUS_DELETED: 'status:deleted',

  FILE_UPLOADED: 'file:uploaded',
  FILE_DELETED: 'file:deleted',

  SUBTASK_CREATED: 'subtask:created',
  SUBTASK_UPDATED: 'subtask:updated',
  SUBTASK_DELETED: 'subtask:deleted',

  DEPENDENCY_ADDED: 'dependency:added',
  DEPENDENCY_REMOVED: 'dependency:removed',

  LABEL_CREATED: 'label:created',
  LABEL_UPDATED: 'label:updated',
  LABEL_DELETED: 'label:deleted',
  LABEL_ASSIGNED: 'label:assigned',
  LABEL_UNASSIGNED: 'label:unassigned',

  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',

  NOTIFICATION_NEW: 'notification:new',

  USER_JOINED: 'presence:userJoined',
  USER_LEFT: 'presence:userLeft',
  CURSORS: 'presence:cursors',

  // Client -> Server (typing)
  TYPING_START: 'presence:typingStart',
  TYPING_STOP: 'presence:typingStop',
  // Server -> Client (typing)
  USER_TYPING: 'presence:userTyping',
} as const;
