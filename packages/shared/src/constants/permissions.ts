export const CAPABILITIES = {
  TASK_CREATE: 'task.create',
  TASK_EDIT_OWN: 'task.editOwn',
  TASK_EDIT_ANY: 'task.editAny',
  TASK_DELETE: 'task.delete',
  TASK_CHANGE_STATUS: 'task.changeStatus',

  FILE_UPLOAD: 'file.upload',
  FILE_DELETE_OWN: 'file.deleteOwn',
  FILE_DELETE_ANY: 'file.deleteAny',

  WIDGET_ADD: 'widget.add',
  WIDGET_REMOVE: 'widget.remove',
  WIDGET_MOVE: 'widget.move',
  STATUS_MANAGE: 'status.manage',

  MEMBERS_MANAGE: 'members.manage',
  PROJECT_DELETE: 'project.delete',
  PROJECT_SETTINGS: 'project.settings',
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export const ROLE_CAPABILITIES: Record<string, Record<string, boolean>> = {
  OWNER: Object.fromEntries(
    Object.values(CAPABILITIES).map((c) => [c, true])
  ),
  EDITOR: {
    [CAPABILITIES.TASK_CREATE]: true,
    [CAPABILITIES.TASK_EDIT_OWN]: true,
    [CAPABILITIES.TASK_EDIT_ANY]: true,
    [CAPABILITIES.TASK_DELETE]: true,
    [CAPABILITIES.TASK_CHANGE_STATUS]: true,
    [CAPABILITIES.FILE_UPLOAD]: true,
    [CAPABILITIES.FILE_DELETE_OWN]: true,
    [CAPABILITIES.FILE_DELETE_ANY]: false,
    [CAPABILITIES.WIDGET_ADD]: false,
    [CAPABILITIES.WIDGET_REMOVE]: false,
    [CAPABILITIES.WIDGET_MOVE]: false,
    [CAPABILITIES.STATUS_MANAGE]: false,
    [CAPABILITIES.MEMBERS_MANAGE]: false,
    [CAPABILITIES.PROJECT_DELETE]: false,
    [CAPABILITIES.PROJECT_SETTINGS]: false,
  },
  VIEWER: Object.fromEntries(
    Object.values(CAPABILITIES).map((c) => [c, false])
  ),
};
