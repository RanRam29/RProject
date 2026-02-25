export const DEFAULT_TASK_STATUSES = [
  { name: 'To Do', color: '#6B7280', sortOrder: 0, isFinal: false },
  { name: 'In Progress', color: '#3B82F6', sortOrder: 1, isFinal: false },
  { name: 'Done', color: '#10B981', sortOrder: 2, isFinal: true },
];

export const DEFAULT_WIDGET_SIZE = {
  width: 400,
  height: 300,
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};
