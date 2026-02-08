import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProjectFindUnique = vi.fn();
const mockStatusFindMany = vi.fn();
const mockStatusFindFirst = vi.fn();
const mockStatusFindUnique = vi.fn();
const mockStatusCreate = vi.fn();
const mockStatusUpdate = vi.fn();
const mockStatusDelete = vi.fn();
const mockEmit = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    project: { findUnique: (...args: unknown[]) => mockProjectFindUnique(...args) },
    taskStatus: {
      findMany: (...args: unknown[]) => mockStatusFindMany(...args),
      findFirst: (...args: unknown[]) => mockStatusFindFirst(...args),
      findUnique: (...args: unknown[]) => mockStatusFindUnique(...args),
      create: (...args: unknown[]) => mockStatusCreate(...args),
      update: (...args: unknown[]) => mockStatusUpdate(...args),
      delete: (...args: unknown[]) => mockStatusDelete(...args),
    },
  },
}));

vi.mock('../../ws/ws.server.js', () => ({
  getIO: () => ({ to: () => ({ emit: mockEmit }) }),
}));

vi.mock('../../ws/ws.events.js', () => ({
  WS_EVENTS: {
    STATUS_CREATED: 'status:created',
    STATUS_UPDATED: 'status:updated',
    STATUS_DELETED: 'status:deleted',
  },
}));

import { StatusesService } from './statuses.service.js';

describe('StatusesService', () => {
  let service: StatusesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StatusesService();
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should return statuses with task counts ordered by sortOrder for a valid project', async () => {
      const projectId = 'project-1';
      mockProjectFindUnique.mockResolvedValue({ id: projectId, name: 'Test Project' });

      const statuses = [
        { id: 'status-1', name: 'To Do', sortOrder: 0, projectId, _count: { tasks: 3 } },
        { id: 'status-2', name: 'In Progress', sortOrder: 1, projectId, _count: { tasks: 1 } },
        { id: 'status-3', name: 'Done', sortOrder: 2, projectId, _count: { tasks: 5 } },
      ];
      mockStatusFindMany.mockResolvedValue(statuses);

      const result = await service.list(projectId);

      expect(result).toEqual(statuses);
      expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockStatusFindMany).toHaveBeenCalledWith({
        where: { projectId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should return an empty array when project has no statuses', async () => {
      const projectId = 'project-empty';
      mockProjectFindUnique.mockResolvedValue({ id: projectId, name: 'Empty Project' });
      mockStatusFindMany.mockResolvedValue([]);

      const result = await service.list(projectId);

      expect(result).toEqual([]);
    });

    it('should throw a 404 ApiError when the project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.list('nonexistent-project')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Project not found',
        statusCode: 404,
      });
    });

    it('should wrap unexpected errors as a 400 badRequest ApiError', async () => {
      mockProjectFindUnique.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.list('project-1')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Failed to list task statuses',
        statusCode: 400,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const projectId = 'project-1';
    const project = { id: projectId, name: 'Test Project' };

    it('should create a status with provided sortOrder and default color', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst.mockResolvedValue(null); // no duplicate

      const createdStatus = {
        id: 'status-new',
        name: 'Review',
        color: '#6B7280',
        sortOrder: 2,
        projectId,
      };
      mockStatusCreate.mockResolvedValue(createdStatus);

      const result = await service.create(projectId, { name: 'Review', sortOrder: 2 });

      expect(result).toEqual(createdStatus);
      expect(mockStatusCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: 'Review',
          color: '#6B7280',
          sortOrder: 2,
        },
      });
      expect(mockEmit).toHaveBeenCalledWith('status:created', { projectId, status: createdStatus });
    });

    it('should create a status with a custom color', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst.mockResolvedValue(null);

      const createdStatus = {
        id: 'status-new',
        name: 'Blocked',
        color: '#EF4444',
        sortOrder: 0,
        projectId,
      };
      mockStatusCreate.mockResolvedValue(createdStatus);

      const result = await service.create(projectId, {
        name: 'Blocked',
        color: '#EF4444',
        sortOrder: 0,
      });

      expect(result).toEqual(createdStatus);
      expect(mockStatusCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: 'Blocked',
          color: '#EF4444',
          sortOrder: 0,
        },
      });
    });

    it('should auto-assign sortOrder as lastStatus.sortOrder + 1 when not provided', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      // First findFirst call: duplicate check -> no duplicate
      // Second findFirst call: last status lookup
      mockStatusFindFirst
        .mockResolvedValueOnce(null) // no duplicate name
        .mockResolvedValueOnce({ id: 'status-last', sortOrder: 4, projectId }); // last status

      const createdStatus = {
        id: 'status-new',
        name: 'QA',
        color: '#6B7280',
        sortOrder: 5,
        projectId,
      };
      mockStatusCreate.mockResolvedValue(createdStatus);

      const result = await service.create(projectId, { name: 'QA' });

      expect(result).toEqual(createdStatus);
      expect(mockStatusCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: 'QA',
          color: '#6B7280',
          sortOrder: 5,
        },
      });
    });

    it('should auto-assign sortOrder as 0 when no statuses exist and sortOrder is not provided', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(null); // no existing statuses

      const createdStatus = {
        id: 'status-first',
        name: 'To Do',
        color: '#6B7280',
        sortOrder: 0,
        projectId,
      };
      mockStatusCreate.mockResolvedValue(createdStatus);

      const result = await service.create(projectId, { name: 'To Do' });

      expect(result).toEqual(createdStatus);
      expect(mockStatusCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: 'To Do',
          color: '#6B7280',
          sortOrder: 0,
        },
      });
    });

    it('should throw a 409 conflict ApiError when a status with the same name already exists', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst.mockResolvedValue({
        id: 'status-existing',
        name: 'To Do',
        projectId,
      });

      await expect(
        service.create(projectId, { name: 'To Do' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Status "To Do" already exists in this project',
        statusCode: 409,
      });

      expect(mockStatusCreate).not.toHaveBeenCalled();
    });

    it('should throw a 404 ApiError when the project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent-project', { name: 'To Do' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Project not found',
        statusCode: 404,
      });

      expect(mockStatusCreate).not.toHaveBeenCalled();
    });

    it('should emit a websocket STATUS_CREATED event after successful creation', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst.mockResolvedValue(null);

      const createdStatus = {
        id: 'status-ws',
        name: 'Testing',
        color: '#6B7280',
        sortOrder: 0,
        projectId,
      };
      mockStatusCreate.mockResolvedValue(createdStatus);

      await service.create(projectId, { name: 'Testing', sortOrder: 0 });

      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith('status:created', {
        projectId,
        status: createdStatus,
      });
    });

    it('should wrap unexpected errors as a 400 badRequest ApiError', async () => {
      mockProjectFindUnique.mockResolvedValue(project);
      mockStatusFindFirst.mockRejectedValue(new Error('Unexpected DB error'));

      await expect(
        service.create(projectId, { name: 'Broken' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Failed to create task status',
        statusCode: 400,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    const existingStatus = {
      id: 'status-1',
      name: 'To Do',
      color: '#6B7280',
      sortOrder: 0,
      projectId: 'project-1',
    };

    it('should update the status name successfully', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);
      mockStatusFindFirst.mockResolvedValue(null); // no duplicate

      const updatedStatus = { ...existingStatus, name: 'Backlog' };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      const result = await service.update('status-1', { name: 'Backlog' });

      expect(result).toEqual(updatedStatus);
      expect(mockStatusUpdate).toHaveBeenCalledWith({
        where: { id: 'status-1' },
        data: { name: 'Backlog' },
      });
    });

    it('should update the status color without checking for duplicate names', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);

      const updatedStatus = { ...existingStatus, color: '#10B981' };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      const result = await service.update('status-1', { color: '#10B981' });

      expect(result).toEqual(updatedStatus);
      // findFirst should not be called when name is not being changed
      expect(mockStatusFindFirst).not.toHaveBeenCalled();
      expect(mockStatusUpdate).toHaveBeenCalledWith({
        where: { id: 'status-1' },
        data: { color: '#10B981' },
      });
    });

    it('should update the status sortOrder', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);

      const updatedStatus = { ...existingStatus, sortOrder: 3 };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      const result = await service.update('status-1', { sortOrder: 3 });

      expect(result).toEqual(updatedStatus);
      expect(mockStatusUpdate).toHaveBeenCalledWith({
        where: { id: 'status-1' },
        data: { sortOrder: 3 },
      });
    });

    it('should update multiple fields at once', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);
      mockStatusFindFirst.mockResolvedValue(null);

      const updatedStatus = { ...existingStatus, name: 'Active', color: '#3B82F6', sortOrder: 1 };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      const result = await service.update('status-1', {
        name: 'Active',
        color: '#3B82F6',
        sortOrder: 1,
      });

      expect(result).toEqual(updatedStatus);
      expect(mockStatusUpdate).toHaveBeenCalledWith({
        where: { id: 'status-1' },
        data: { name: 'Active', color: '#3B82F6', sortOrder: 1 },
      });
    });

    it('should skip duplicate check when the name is the same as current', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);

      const updatedStatus = { ...existingStatus };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      await service.update('status-1', { name: 'To Do' }); // same name

      // The duplicate check should not run when name hasn't actually changed
      expect(mockStatusFindFirst).not.toHaveBeenCalled();
    });

    it('should throw a 409 conflict ApiError when renaming to a duplicate name', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);
      mockStatusFindFirst.mockResolvedValue({
        id: 'status-other',
        name: 'In Progress',
        projectId: 'project-1',
      });

      await expect(
        service.update('status-1', { name: 'In Progress' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Status "In Progress" already exists in this project',
        statusCode: 409,
      });

      expect(mockStatusUpdate).not.toHaveBeenCalled();
    });

    it('should check duplicates excluding the current status id', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);
      mockStatusFindFirst.mockResolvedValue(null);

      mockStatusUpdate.mockResolvedValue({ ...existingStatus, name: 'Renamed' });

      await service.update('status-1', { name: 'Renamed' });

      expect(mockStatusFindFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          name: 'Renamed',
          id: { not: 'status-1' },
        },
      });
    });

    it('should throw a 404 ApiError when the status does not exist', async () => {
      mockStatusFindUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-status', { name: 'Whatever' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Task status not found',
        statusCode: 404,
      });

      expect(mockStatusUpdate).not.toHaveBeenCalled();
    });

    it('should emit a websocket STATUS_UPDATED event after successful update', async () => {
      mockStatusFindUnique.mockResolvedValue(existingStatus);
      mockStatusFindFirst.mockResolvedValue(null);

      const updatedStatus = { ...existingStatus, name: 'Updated' };
      mockStatusUpdate.mockResolvedValue(updatedStatus);

      const changes = { name: 'Updated' };
      await service.update('status-1', changes);

      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith('status:updated', {
        projectId: 'project-1',
        statusId: 'status-1',
        changes,
      });
    });

    it('should wrap unexpected errors as a 400 badRequest ApiError', async () => {
      mockStatusFindUnique.mockRejectedValue(new Error('DB crash'));

      await expect(
        service.update('status-1', { name: 'Fail' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Failed to update task status',
        statusCode: 400,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    const deletableStatus = {
      id: 'status-1',
      name: 'To Do',
      color: '#6B7280',
      sortOrder: 0,
      projectId: 'project-1',
      _count: { tasks: 0 },
    };

    it('should delete a status that has no tasks', async () => {
      mockStatusFindUnique.mockResolvedValue(deletableStatus);
      mockStatusDelete.mockResolvedValue(deletableStatus);

      const result = await service.delete('status-1');

      expect(result).toEqual({ message: 'Task status deleted successfully' });
      expect(mockStatusDelete).toHaveBeenCalledWith({ where: { id: 'status-1' } });
    });

    it('should look up the status with task count included', async () => {
      mockStatusFindUnique.mockResolvedValue(deletableStatus);
      mockStatusDelete.mockResolvedValue(deletableStatus);

      await service.delete('status-1');

      expect(mockStatusFindUnique).toHaveBeenCalledWith({
        where: { id: 'status-1' },
        include: { _count: { select: { tasks: true } } },
      });
    });

    it('should throw a 400 ApiError when the status has tasks assigned to it', async () => {
      const statusWithTasks = {
        ...deletableStatus,
        name: 'In Progress',
        _count: { tasks: 3 },
      };
      mockStatusFindUnique.mockResolvedValue(statusWithTasks);

      await expect(service.delete('status-1')).rejects.toMatchObject({
        name: 'ApiError',
        message:
          'Cannot delete status "In Progress" because 3 task(s) are using it. Move or delete those tasks first.',
        statusCode: 400,
      });

      expect(mockStatusDelete).not.toHaveBeenCalled();
    });

    it('should throw a 400 ApiError when the status has exactly 1 task assigned', async () => {
      const statusWithOneTask = {
        ...deletableStatus,
        name: 'Review',
        _count: { tasks: 1 },
      };
      mockStatusFindUnique.mockResolvedValue(statusWithOneTask);

      await expect(service.delete('status-1')).rejects.toMatchObject({
        name: 'ApiError',
        message:
          'Cannot delete status "Review" because 1 task(s) are using it. Move or delete those tasks first.',
        statusCode: 400,
      });

      expect(mockStatusDelete).not.toHaveBeenCalled();
    });

    it('should throw a 404 ApiError when the status does not exist', async () => {
      mockStatusFindUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent-status')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Task status not found',
        statusCode: 404,
      });

      expect(mockStatusDelete).not.toHaveBeenCalled();
    });

    it('should emit a websocket STATUS_DELETED event after successful deletion', async () => {
      mockStatusFindUnique.mockResolvedValue(deletableStatus);
      mockStatusDelete.mockResolvedValue(deletableStatus);

      await service.delete('status-1');

      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith('status:deleted', {
        projectId: 'project-1',
        statusId: 'status-1',
      });
    });

    it('should wrap unexpected errors as a 400 badRequest ApiError', async () => {
      mockStatusFindUnique.mockRejectedValue(new Error('DB gone'));

      await expect(service.delete('status-1')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Failed to delete task status',
        statusCode: 400,
      });
    });
  });
});
