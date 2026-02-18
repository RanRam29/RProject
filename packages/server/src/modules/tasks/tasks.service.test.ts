import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTaskFindMany = vi.fn();
const mockTaskFindFirst = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskUpdate = vi.fn();
const mockTaskDelete = vi.fn();
const mockTaskCount = vi.fn();
const mockStatusFindFirst = vi.fn();
const mockPermFindFirst = vi.fn();
const mockDepFindFirst = vi.fn();
const mockDepFindUnique = vi.fn();
const mockDepCreate = vi.fn();
const mockDepDelete = vi.fn();
const mockEmit = vi.fn();
const mockLog = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    task: {
      findMany: (...args: unknown[]) => mockTaskFindMany(...args),
      findFirst: (...args: unknown[]) => mockTaskFindFirst(...args),
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      create: (...args: unknown[]) => mockTaskCreate(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      delete: (...args: unknown[]) => mockTaskDelete(...args),
      count: (...args: unknown[]) => mockTaskCount(...args),
    },
    taskStatus: {
      findFirst: (...args: unknown[]) => mockStatusFindFirst(...args),
    },
    projectPermission: {
      findFirst: (...args: unknown[]) => mockPermFindFirst(...args),
    },
    taskDependency: {
      findFirst: (...args: unknown[]) => mockDepFindFirst(...args),
      findUnique: (...args: unknown[]) => mockDepFindUnique(...args),
      create: (...args: unknown[]) => mockDepCreate(...args),
      delete: (...args: unknown[]) => mockDepDelete(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
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
    log: (...args: unknown[]) => {
      mockLog(...args);
      return Promise.resolve();
    },
  },
}));

vi.mock('../notifications/notifications.service.js', () => ({
  notificationsService: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { tasksService } from './tasks.service.js';
import { ApiError } from '../../utils/api-error.js';

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

describe('TasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------
  describe('list', () => {
    it('should return paginated tasks with defaults', async () => {
      const tasks = [makeTask()];
      mockTaskFindMany.mockResolvedValue(tasks);
      mockTaskCount.mockResolvedValue(1);

      const result = await tasksService.list(PROJECT_ID);

      expect(result).toEqual({ data: tasks, total: 1, page: 1, limit: 50 });
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID },
          skip: 0,
          take: 50,
        }),
      );
      expect(mockTaskCount).toHaveBeenCalledWith({ where: { projectId: PROJECT_ID } });
    });

    it('should respect custom page and limit', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { page: 3, limit: 10 });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should apply statusId filter', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { statusId: STATUS_ID });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID, statusId: STATUS_ID },
        }),
      );
    });

    it('should apply assigneeId filter', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { assigneeId: ASSIGNEE_ID });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID, assigneeId: ASSIGNEE_ID },
        }),
      );
    });

    it('should apply priority filter', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { priority: 'HIGH' });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID, priority: 'HIGH' },
        }),
      );
    });

    it('should apply search filter on title', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { search: 'bug' });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: PROJECT_ID,
            OR: [
              { title: { contains: 'bug', mode: 'insensitive' } },
              { description: { string_contains: 'bug' } },
            ],
          },
        }),
      );
    });

    it('should apply parentTaskId filter (including null)', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, { parentTaskId: null });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: PROJECT_ID, parentTaskId: null },
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      await tasksService.list(PROJECT_ID, {
        statusId: STATUS_ID,
        assigneeId: ASSIGNEE_ID,
        priority: 'URGENT',
        search: 'fix',
      });

      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            projectId: PROJECT_ID,
            statusId: STATUS_ID,
            assigneeId: ASSIGNEE_ID,
            priority: 'URGENT',
            OR: [
              { title: { contains: 'fix', mode: 'insensitive' } },
              { description: { string_contains: 'fix' } },
            ],
          },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // getById
  // -------------------------------------------------------------------------
  describe('getById', () => {
    it('should return the task with all relations', async () => {
      const task = makeTask();
      mockTaskFindUnique.mockResolvedValue(task);

      const result = await tasksService.getById(TASK_ID);

      expect(result).toEqual(task);
      expect(mockTaskFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TASK_ID },
          include: expect.objectContaining({
            status: true,
            project: expect.any(Object),
            assignee: expect.any(Object),
            creator: expect.any(Object),
            subtasks: expect.any(Object),
            blockedBy: expect.any(Object),
            blocking: expect.any(Object),
            labels: expect.any(Object),
            comments: expect.any(Object),
          }),
        }),
      );
    });

    it('should throw ApiError 404 when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(tasksService.getById('nonexistent')).rejects.toThrow(ApiError);
      await expect(tasksService.getById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should create a task successfully', async () => {
      const created = makeTask();
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue(null); // no existing task for sortOrder
      mockTaskCreate.mockResolvedValue(created);

      const result = await tasksService.create(PROJECT_ID, USER_ID, {
        title: 'Test task',
        statusId: STATUS_ID,
      });

      expect(result).toEqual(created);
      expect(mockStatusFindFirst).toHaveBeenCalledWith({
        where: { id: STATUS_ID, projectId: PROJECT_ID },
      });
      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: PROJECT_ID,
            creatorId: USER_ID,
            title: 'Test task',
            statusId: STATUS_ID,
            sortOrder: 0,
          }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('task:created', {
        projectId: PROJECT_ID,
        task: created,
      });
      expect(mockLog).toHaveBeenCalledWith(
        PROJECT_ID,
        USER_ID,
        'task.created',
        expect.objectContaining({ taskId: TASK_ID }),
      );
    });

    it('should auto-calculate sortOrder from last task in status', async () => {
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue({ sortOrder: 5 }); // last task has sortOrder=5
      mockTaskCreate.mockResolvedValue(makeTask({ sortOrder: 6 }));

      await tasksService.create(PROJECT_ID, USER_ID, {
        title: 'New task',
        statusId: STATUS_ID,
      });

      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 6 }),
        }),
      );
    });

    it('should use provided sortOrder when given', async () => {
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockTaskCreate.mockResolvedValue(makeTask({ sortOrder: 3 }));

      await tasksService.create(PROJECT_ID, USER_ID, {
        title: 'Task',
        statusId: STATUS_ID,
        sortOrder: 3,
      });

      expect(mockTaskCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 3 }),
        }),
      );
      // Should NOT call findFirst to determine sortOrder
      expect(mockTaskFindFirst).not.toHaveBeenCalled();
    });

    it('should validate assignee membership when assigneeId provided', async () => {
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockPermFindFirst.mockResolvedValue({ id: 'perm-1' });
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskCreate.mockResolvedValue(makeTask({ assigneeId: ASSIGNEE_ID }));

      await tasksService.create(PROJECT_ID, USER_ID, {
        title: 'Task',
        statusId: STATUS_ID,
        assigneeId: ASSIGNEE_ID,
      });

      expect(mockPermFindFirst).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID, userId: ASSIGNEE_ID },
      });
    });

    it('should throw when status does not belong to project', async () => {
      mockStatusFindFirst.mockResolvedValue(null);

      await expect(
        tasksService.create(PROJECT_ID, USER_ID, {
          title: 'Task',
          statusId: 'invalid-status',
        }),
      ).rejects.toThrow(ApiError);

      await expect(
        tasksService.create(PROJECT_ID, USER_ID, {
          title: 'Task',
          statusId: 'invalid-status',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid status for this project',
      });
    });

    it('should throw when assignee is not a project member', async () => {
      mockStatusFindFirst.mockResolvedValue({ id: STATUS_ID, projectId: PROJECT_ID });
      mockPermFindFirst.mockResolvedValue(null); // no permission

      await expect(
        tasksService.create(PROJECT_ID, USER_ID, {
          title: 'Task',
          statusId: STATUS_ID,
          assigneeId: 'non-member',
        }),
      ).rejects.toThrow(ApiError);

      await expect(
        tasksService.create(PROJECT_ID, USER_ID, {
          title: 'Task',
          statusId: STATUS_ID,
          assigneeId: 'non-member',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Assignee is not a member of this project',
      });
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should update a task successfully', async () => {
      const task = makeTask();
      const updated = { ...task, title: 'Updated' };
      mockTaskFindUnique.mockResolvedValue(task);
      mockTaskUpdate.mockResolvedValue(updated);

      const result = await tasksService.update(TASK_ID, USER_ID, { title: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TASK_ID },
          data: expect.objectContaining({ title: 'Updated' }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('task:updated', {
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        changes: { title: 'Updated' },
      });
    });

    it('should validate assignee membership when changing assignee', async () => {
      const task = makeTask();
      mockTaskFindUnique.mockResolvedValue(task);
      mockPermFindFirst.mockResolvedValue({ id: 'perm-1' });
      mockTaskUpdate.mockResolvedValue({ ...task, assigneeId: ASSIGNEE_ID });

      await tasksService.update(TASK_ID, USER_ID, { assigneeId: ASSIGNEE_ID });

      expect(mockPermFindFirst).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID, userId: ASSIGNEE_ID },
      });
    });

    it('should skip assignee validation when setting assignee to null', async () => {
      const task = makeTask({ assigneeId: ASSIGNEE_ID });
      mockTaskFindUnique.mockResolvedValue(task);
      mockTaskUpdate.mockResolvedValue({ ...task, assigneeId: null });

      await tasksService.update(TASK_ID, USER_ID, { assigneeId: null });

      expect(mockPermFindFirst).not.toHaveBeenCalled();
    });

    it('should throw when assignee is not a project member', async () => {
      mockTaskFindUnique.mockResolvedValue(makeTask());
      mockPermFindFirst.mockResolvedValue(null);

      await expect(
        tasksService.update(TASK_ID, USER_ID, { assigneeId: 'non-member' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Assignee is not a member of this project',
      });
    });

    it('should throw when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(
        tasksService.update('nonexistent', USER_ID, { title: 'Foo' }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus
  // -------------------------------------------------------------------------
  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const task = makeTask({ statusId: 'old-status' });
      const newStatusId = 'new-status';
      const updated = { ...task, statusId: newStatusId };
      mockTaskFindUnique.mockResolvedValue(task);
      mockStatusFindFirst.mockResolvedValue({ id: newStatusId, projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue(null); // no existing tasks in new status
      mockTaskUpdate.mockResolvedValue(updated);

      const result = await tasksService.updateStatus(TASK_ID, newStatusId);

      expect(result).toEqual(updated);
      expect(mockStatusFindFirst).toHaveBeenCalledWith({
        where: { id: newStatusId, projectId: PROJECT_ID },
      });
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TASK_ID },
          data: { statusId: newStatusId, sortOrder: 0 },
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('task:statusChanged', {
        projectId: PROJECT_ID,
        taskId: TASK_ID,
        oldStatusId: 'old-status',
        newStatusId,
      });
    });

    it('should use provided sortOrder', async () => {
      const task = makeTask();
      mockTaskFindUnique.mockResolvedValue(task);
      mockStatusFindFirst.mockResolvedValue({ id: 'new-status', projectId: PROJECT_ID });
      mockTaskUpdate.mockResolvedValue({ ...task, statusId: 'new-status', sortOrder: 5 });

      await tasksService.updateStatus(TASK_ID, 'new-status', 5);

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { statusId: 'new-status', sortOrder: 5 },
        }),
      );
      // Should NOT call findFirst to compute sortOrder
      expect(mockTaskFindFirst).not.toHaveBeenCalled();
    });

    it('should auto-calculate sortOrder from last task in new status', async () => {
      const task = makeTask();
      mockTaskFindUnique.mockResolvedValue(task);
      mockStatusFindFirst.mockResolvedValue({ id: 'new-status', projectId: PROJECT_ID });
      mockTaskFindFirst.mockResolvedValue({ sortOrder: 10 }); // last task in new status
      mockTaskUpdate.mockResolvedValue({ ...task, statusId: 'new-status', sortOrder: 11 });

      await tasksService.updateStatus(TASK_ID, 'new-status');

      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { statusId: 'new-status', sortOrder: 11 },
        }),
      );
    });

    it('should throw when status is invalid for project', async () => {
      mockTaskFindUnique.mockResolvedValue(makeTask());
      mockStatusFindFirst.mockResolvedValue(null);

      await expect(
        tasksService.updateStatus(TASK_ID, 'invalid-status'),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid status for this project',
      });
    });

    it('should throw when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(
        tasksService.updateStatus('nonexistent', STATUS_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
    });
  });

  // -------------------------------------------------------------------------
  // reorder
  // -------------------------------------------------------------------------
  describe('reorder', () => {
    it('should reorder a task successfully', async () => {
      const task = makeTask();
      const updated = { ...task, sortOrder: 3 };
      mockTaskFindUnique.mockResolvedValue(task);
      mockTaskUpdate.mockResolvedValue(updated);

      const result = await tasksService.reorder(TASK_ID, 3);

      expect(result).toEqual(updated);
      expect(mockTaskUpdate).toHaveBeenCalledWith({
        where: { id: TASK_ID },
        data: { sortOrder: 3 },
      });
      expect(mockEmit).toHaveBeenCalledWith('task:reordered', {
        projectId: PROJECT_ID,
        statusId: STATUS_ID,
        taskIds: [TASK_ID],
      });
    });

    it('should throw when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(tasksService.reorder('nonexistent', 0)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should delete a task successfully', async () => {
      const task = makeTask();
      mockTaskFindUnique.mockResolvedValue(task);
      mockTaskDelete.mockResolvedValue(task);

      const result = await tasksService.delete(TASK_ID);

      expect(result).toEqual({ message: 'Task deleted successfully' });
      expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: TASK_ID } });
      expect(mockEmit).toHaveBeenCalledWith('task:deleted', {
        projectId: PROJECT_ID,
        taskId: TASK_ID,
      });
    });

    it('should throw when task not found', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(tasksService.delete('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
    });
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

      const result = await tasksService.createSubtask('parent-1', USER_ID, {
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

      await tasksService.createSubtask('parent-1', USER_ID, {
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

      await tasksService.createSubtask('parent-1', USER_ID, {
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
        tasksService.createSubtask('nonexistent', USER_ID, {
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
        tasksService.createSubtask('parent-1', USER_ID, {
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
        tasksService.createSubtask('parent-1', USER_ID, {
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

  // -------------------------------------------------------------------------
  // addDependency
  // -------------------------------------------------------------------------
  describe('addDependency', () => {
    const BLOCKED_TASK_ID = 'task-blocked';
    const BLOCKING_TASK_ID = 'task-blocking';

    it('should add a dependency successfully', async () => {
      const blockedTask = makeTask({ id: BLOCKED_TASK_ID, projectId: PROJECT_ID });
      const blockingTask = makeTask({ id: BLOCKING_TASK_ID, projectId: PROJECT_ID });
      const dep = {
        id: 'dep-1',
        blockedTaskId: BLOCKED_TASK_ID,
        blockingTaskId: BLOCKING_TASK_ID,
        blockedTask: { id: BLOCKED_TASK_ID, title: 'Blocked' },
        blockingTask: { id: BLOCKING_TASK_ID, title: 'Blocking' },
      };

      // findUnique is called twice via Promise.all
      mockTaskFindUnique
        .mockResolvedValueOnce(blockedTask)
        .mockResolvedValueOnce(blockingTask);
      mockDepFindFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(null); // no reverse
      mockDepCreate.mockResolvedValue(dep);

      const result = await tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID);

      expect(result).toEqual(dep);
      expect(mockDepCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            blockedTaskId: BLOCKED_TASK_ID,
            blockingTaskId: BLOCKING_TASK_ID,
          },
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith('dependency:added', {
        projectId: PROJECT_ID,
        taskId: BLOCKED_TASK_ID,
        dependencyTaskId: BLOCKING_TASK_ID,
        type: 'blockedBy',
      });
    });

    it('should throw when blocked task not found', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(null) // blocked task missing
        .mockResolvedValueOnce(makeTask({ id: BLOCKING_TASK_ID }));

      await expect(
        tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Blocked task not found',
      });
    });

    it('should throw when blocking task not found', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: BLOCKED_TASK_ID }))
        .mockResolvedValueOnce(null); // blocking task missing

      await expect(
        tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Blocking task not found',
      });
    });

    it('should throw on self-dependency', async () => {
      const task = makeTask({ id: TASK_ID });
      mockTaskFindUnique
        .mockResolvedValueOnce(task)
        .mockResolvedValueOnce(task);

      await expect(
        tasksService.addDependency(TASK_ID, TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'A task cannot depend on itself',
      });
    });

    it('should throw on cross-project dependency', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: BLOCKED_TASK_ID, projectId: 'project-A' }))
        .mockResolvedValueOnce(makeTask({ id: BLOCKING_TASK_ID, projectId: 'project-B' }));

      await expect(
        tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Dependencies must be within the same project',
      });
    });

    it('should throw on duplicate dependency', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: BLOCKED_TASK_ID }))
        .mockResolvedValueOnce(makeTask({ id: BLOCKING_TASK_ID }));
      mockDepFindFirst.mockResolvedValueOnce({ id: 'existing-dep' }); // duplicate found

      await expect(
        tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'This dependency already exists',
      });
    });

    it('should throw on circular dependency (reverse exists)', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(makeTask({ id: BLOCKED_TASK_ID }))
        .mockResolvedValueOnce(makeTask({ id: BLOCKING_TASK_ID }));
      mockDepFindFirst
        .mockResolvedValueOnce(null) // no direct duplicate
        .mockResolvedValueOnce({ id: 'reverse-dep' }); // reverse exists

      await expect(
        tasksService.addDependency(BLOCKED_TASK_ID, BLOCKING_TASK_ID),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot create dependency: would create a circular dependency',
      });
    });
  });

  // -------------------------------------------------------------------------
  // removeDependency
  // -------------------------------------------------------------------------
  describe('removeDependency', () => {
    it('should remove a dependency successfully', async () => {
      const dep = {
        id: 'dep-1',
        blockedTaskId: 'task-blocked',
        blockingTaskId: 'task-blocking',
        blockedTask: { projectId: PROJECT_ID },
      };
      mockDepFindUnique.mockResolvedValue(dep);
      mockDepDelete.mockResolvedValue(dep);

      const result = await tasksService.removeDependency('dep-1');

      expect(result).toEqual({ message: 'Dependency removed successfully' });
      expect(mockDepDelete).toHaveBeenCalledWith({ where: { id: 'dep-1' } });
      expect(mockEmit).toHaveBeenCalledWith('dependency:removed', {
        projectId: PROJECT_ID,
        taskId: 'task-blocked',
        dependencyTaskId: 'task-blocking',
      });
    });

    it('should throw when dependency not found', async () => {
      mockDepFindUnique.mockResolvedValue(null);

      await expect(
        tasksService.removeDependency('nonexistent'),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Dependency not found',
      });
    });
  });
});
