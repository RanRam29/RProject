import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportTasksToCSV, exportTasksToJSON } from './export';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

beforeEach(() => {
  vi.restoreAllMocks();

  const mockAnchor = document.createElement('a');
  mockAnchor.click = vi.fn();

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
  vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const statuses: TaskStatusDTO[] = [
  {
    id: 'status-1',
    projectId: 'proj-1',
    name: 'To Do',
    color: '#6B7280',
    sortOrder: 0,
    isFinal: false,
  },
  {
    id: 'status-2',
    projectId: 'proj-1',
    name: 'Done',
    color: '#10B981',
    sortOrder: 1,
    isFinal: true,
  },
];

const tasks: TaskDTO[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Simple Task',
    description: null,
    statusId: 'status-1',
    assigneeId: null,
    parentTaskId: null,
    priority: 'MEDIUM',
    sortOrder: 0,
    startDate: null,
    dueDate: '2025-06-15T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Task with "quotes", and commas',
    description: 'desc',
    statusId: 'status-2',
    assigneeId: 'user-1',
    parentTaskId: null,
    priority: 'HIGH',
    sortOrder: 1,
    startDate: '2025-01-10T00:00:00Z',
    dueDate: null,
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-06T00:00:00Z',
  },
] as TaskDTO[];

describe('exportTasksToCSV', () => {
  it('creates a CSV file download', () => {
    exportTasksToCSV(tasks, statuses);

    expect(URL.createObjectURL).toHaveBeenCalled();
    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
  });

  it('handles empty task list', () => {
    exportTasksToCSV([], statuses);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('exportTasksToJSON', () => {
  it('creates a JSON file download', () => {
    exportTasksToJSON(tasks, statuses);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles empty task list', () => {
    exportTasksToJSON([], statuses);
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
