import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTaskFindFirst = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockTaskCreate = vi.fn();
const mockStatusFindFirst = vi.fn();
const mockPermFindFirst = vi.fn();
const mockEmit = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    task: {
      findFirst: (...args: unknown[]) => mockTaskFindFirst(...args),
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      create: (...args: unknown[]) => mockTaskCreate(...args),
    },
    taskStatus: {
      findFirst: (...args: unknown[]) => mockStatusFindFirst(...args),
    },
    projectPermission: {
      findFirst: (...args: unknown[]) => mockPermFindFirst(...args),
    },
  },
}));

vi.mock('../../ws/ws.server.js', () => ({
  getIO: () => ({ to: () => ({ emit: mockEmit }) }),
}));

vi.mock('../../ws/ws.events.js', () => ({
  WS_EVENTS: {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_DELETED: 'task:deleted',
    TASK_STATUS_CHANGED: 'task:statusChanged',
    TASK_REORDERED: 'task:reordered',
    SUBTASK_CREATED: 'subtask:created',
    DEPENDENCY_ADDED: 'dependency:added',
    DEPENDENCY_REMOVED: 'dependency:removed',
  },
}));

vi.mock('../activity/activity.service.js', () => ({
  activityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../notifications/notifications.service.js', () => ({
  notificationsService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { subtasksService } from './subtasks.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const USER_ID = 'user-1';
const TASK_ID = 'task-1';
const STATUS_ID = 'status-1';
const ASSIGNEE_ID = 'user-2';

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    creatorId: USER_ID,
    title: 'Test task',
    description: null,
    statusId: STATUS_ID,
    assigneeId: null,
    priority: 'NONE',
    sortOrder: 0,
    parentTaskId: null,
    startDate: null,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubtasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createSubtask
  // -------------------------------------------------------------------------
  describe('createSubtask', () => {
    it('should create a subtask successfully', async () => {
      const parentTask = makeTask({ id: 'parent-1' });
      const subtask = makeTask({
        id: 'subtask-1',
        parentTaskId: 'parent-1',
        sortOrder: 0,
      });
      mockTaskFindUnique.mockResolvedValue(parentTask);
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue(null); // no existing subtasks
      mockTaskCreate.mockResolvedValue(subtask);

      const result = await subtasksService.createSubtask('parent-1', USER_ID, {
        title: 'Subtask',
        statusId: STATUS_ID,
      });

      expect(result).toEqual(subtask);
      expect(mockTaskFindUnique).toHaveBeenCalledWith({ where: { id: 'parent-1' } });
      expect(mockStatusFindFirst).toHaveBeenCalledWith({
        where: { id: STATUS_ID, projectId: PROJECT_ID },
      });
      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: PROJECT_ID,
            parentTaskId: 'parent-1',
            creatorId: USER_ID,
            title: 'Subtask',
            statusId: STATUS_ID,
            sortOrder: 0,
          }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('subtask:created', {
        projectId: PROJECT_ID,
        taskId: 'parent-1',
        subtask,
      });
    });

    it('should compute sortOrder from existing subtasks', async () => {
      const parentTask = makeTask({ id: 'parent-1' });
      mockTaskFindUnique.mockResolvedValue(parentTask);
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue({ sortOrder: 4 }); // last subtask
      mockTaskCreate.mockResolvedValue(
        makeTask({ id: 'subtask-1', parentTaskId: 'parent-1', sortOrder: 5 }),
      );

      await subtasksService.createSubtask('parent-1', USER_ID, {
        title: 'Subtask',
        statusId: STATUS_ID,
      });

      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 5 }),
        }),
      );
    });

    it('should validate assignee membership when assigneeId provided', async () => {
      const parentTask = makeTask({ id: 'parent-1' });
      mockTaskFindUnique.mockResolvedValue(parentTask);
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockPermFindFirst.mockResolvedValue({ id: 'perm-1' });
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskCreate.mockResolvedValue(
        makeTask({ id: 'subtask-1', parentTaskId: 'parent-1', assigneeId: ASSIGNEE_ID }),
      );

      await subtasksService.createSubtask('parent-1', USER_ID, {
        title: 'Subtask',
        statusId: STATUS_ID,
        assigneeId: ASSIGNEE_ID,
      });

      expect(mockPermFindFirst).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID, userId: ASSIGNEE_ID },
      });
    });

    it('should throw when parent task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(
        subtasksService.createSubtask('nonexistent', USER_ID, {
          title: 'Sub',
          statusId: STATUS_ID,
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Parent task not found',
      });
    });

    it('should throw when status is invalid for the parent project', async () => {
      mockTaskFindUnique.mockResolvedValue(makeTask({ id: 'parent-1' }));
      mockStatusFindFirst.mockResolvedValue(null);

      await expect(
        subtasksService.createSubtask('parent-1', USER_ID, {
          title: 'Sub',
          statusId: 'bad-status',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid status for this project',
      });
    });

    it('should throw when subtask assignee is not a project member', async () => {
      mockTaskFindUnique.mockResolvedValue(makeTask({ id: 'parent-1' }));
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockPermFindFirst.mockResolvedValue(null);

      await expect(
        subtasksService.createSubtask('parent-1', USER_ID, {
          title: 'Sub',
          statusId: STATUS_ID,
          assigneeId: 'non-member',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Assignee is not a member of this project',
      });
    });
  });
});
