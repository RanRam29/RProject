import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProjectFindMany = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockProjectCreate = vi.fn();
const mockProjectUpdate = vi.fn();
const mockProjectDelete = vi.fn();
const mockProjectCount = vi.fn();
const mockTemplateFindUnique = vi.fn();
const mockTemplateCreate = vi.fn();
const mockEmit = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    project: {
      findMany: (...args: unknown[]) => mockProjectFindMany(...args),
      findUnique: (...args: unknown[]) => mockProjectFindUnique(...args),
      create: (...args: unknown[]) => mockProjectCreate(...args),
      update: (...args: unknown[]) => mockProjectUpdate(...args),
      delete: (...args: unknown[]) => mockProjectDelete(...args),
      count: (...args: unknown[]) => mockProjectCount(...args),
    },
    template: {
      findUnique: (...args: unknown[]) => mockTemplateFindUnique(...args),
      create: (...args: unknown[]) => mockTemplateCreate(...args),
    },
  },
}));

vi.mock('../../ws/ws.server.js', () => ({
  getIO: () => ({ to: () => ({ emit: mockEmit }) }),
}));

vi.mock('../../ws/ws.events.js', () => ({
  WS_EVENTS: {
    PROJECT_UPDATED: 'project:updated',
  },
}));

vi.mock('@pm/shared', () => ({
  DEFAULT_TASK_STATUSES: [
    { name: 'To Do', color: '#6B7280' },
    { name: 'In Progress', color: '#3B82F6' },
    { name: 'Done', color: '#10B981' },
  ],
}));

vi.mock('../system-defaults/system-defaults.service.js', () => ({
  systemDefaultsService: {
    getDefaultStatuses: vi.fn().mockResolvedValue([
      { name: 'To Do', color: '#6B7280', sortOrder: 0, isFinal: false },
      { name: 'In Progress', color: '#3B82F6', sortOrder: 1, isFinal: false },
      { name: 'Done', color: '#10B981', sortOrder: 2, isFinal: true },
    ]),
    getDefaultLabels: vi.fn().mockResolvedValue([]),
  },
}));

import { ProjectsService } from './projects.service.js';
import { ApiError } from '../../utils/api-error.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const userId = 'user-1';
  const projectId = 'project-1';
  const templateId = 'template-1';

  const mockOwner = { id: userId, displayName: 'Test User', email: 'test@example.com' };

  const mockProject = {
    id: projectId,
    name: 'Test Project',
    description: 'A test project',
    status: 'ACTIVE',
    ownerId: userId,
    owner: mockOwner,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    _count: { tasks: 5, permissions: 2 },
  };

  const mockProjectWithStatuses = {
    ...mockProject,
    taskStatuses: [
      { id: 'status-1', name: 'To Do', color: '#6B7280', sortOrder: 0 },
      { id: 'status-2', name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
      { id: 'status-3', name: 'Done', color: '#10B981', sortOrder: 2 },
    ],
    _count: { tasks: 5, permissions: 2, widgets: 1 },
  };

  const mockTemplate = {
    id: templateId,
    name: 'Test Template',
    description: 'A test template',
    isPublic: true,
    createdById: userId,
    configJson: {
      statuses: [
        { name: 'Backlog', color: '#9CA3AF', sortOrder: 0 },
        { name: 'Active', color: '#3B82F6', sortOrder: 1 },
        { name: 'Complete', color: '#10B981', sortOrder: 2 },
      ],
      widgets: [
        { type: 'CHART', title: 'Burndown', configJson: {}, sortOrder: 0 },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectsService();
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should return paginated projects for the user', async () => {
      const projects = [mockProject];
      mockProjectFindMany.mockResolvedValue(projects);
      mockProjectCount.mockResolvedValue(1);

      const result = await service.list(userId, 1, 20);

      expect(result).toEqual({ data: projects, total: 1, page: 1, limit: 20 });
      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { permissions: { some: { userId } } },
          include: expect.objectContaining({
            owner: { select: { id: true, displayName: true, email: true } },
            _count: { select: { tasks: true, permissions: true } },
          }),
          orderBy: { updatedAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockProjectCount).toHaveBeenCalledWith({
        where: { permissions: { some: { userId } } },
      });
    });

    it('should calculate correct skip for page 2', async () => {
      mockProjectFindMany.mockResolvedValue([]);
      mockProjectCount.mockResolvedValue(0);

      await service.list(userId, 2, 10);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      mockProjectFindMany.mockResolvedValue([]);
      mockProjectCount.mockResolvedValue(0);

      const result = await service.list(userId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectFindMany.mockRejectedValue(new Error('DB error'));

      await expect(service.list(userId)).rejects.toThrow(ApiError);
      await expect(service.list(userId)).rejects.toThrow('Failed to list projects');
    });
  });

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------
  describe('getById', () => {
    it('should return the project with owner, statuses, and counts', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProjectWithStatuses);

      const result = await service.getById(projectId);

      expect(result).toEqual(mockProjectWithStatuses);
      expect(mockProjectFindUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { tasks: true, permissions: true, widgets: true } },
        },
      });
    });

    it('should throw ApiError.notFound when project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(ApiError);
      await expect(service.getById('nonexistent')).rejects.toThrow('Project not found');
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.getById(projectId)).rejects.toThrow(ApiError);
      await expect(service.getById(projectId)).rejects.toThrow('Failed to get project');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should create a project with default statuses and OWNER permission', async () => {
      const createdProject = {
        ...mockProject,
        taskStatuses: mockProjectWithStatuses.taskStatuses,
        permissions: [{ userId, role: 'OWNER' }],
      };
      mockProjectCreate.mockResolvedValue(createdProject);

      const result = await service.create(userId, 'Test Project', 'A test project');

      expect(result).toEqual(createdProject);
      expect(mockProjectCreate).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          description: 'A test project',
          ownerId: userId,
          permissions: {
            create: { userId, role: 'OWNER' },
          },
          taskStatuses: {
            create: [
              { name: 'To Do', color: '#6B7280', sortOrder: 0, isFinal: false },
              { name: 'In Progress', color: '#3B82F6', sortOrder: 1, isFinal: false },
              { name: 'Done', color: '#10B981', sortOrder: 2, isFinal: true },
            ],
          },
        },
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          permissions: true,
        },
      });
    });

    it('should set description to null when not provided', async () => {
      mockProjectCreate.mockResolvedValue(mockProject);

      await service.create(userId, 'No Desc Project');

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should set description to null when empty string is provided', async () => {
      mockProjectCreate.mockResolvedValue(mockProject);

      await service.create(userId, 'Empty Desc', '');

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectCreate.mockRejectedValue(new Error('DB error'));

      await expect(service.create(userId, 'Fail')).rejects.toThrow(ApiError);
      await expect(service.create(userId, 'Fail')).rejects.toThrow('Failed to create project');
    });
  });

  // ---------------------------------------------------------------------------
  // instantiate
  // ---------------------------------------------------------------------------
  describe('instantiate', () => {
    it('should create a project from a public template with custom statuses and widgets', async () => {
      mockTemplateFindUnique.mockResolvedValue(mockTemplate);
      const instantiatedProject = {
        ...mockProject,
        name: 'From Template',
        taskStatuses: [
          { name: 'Backlog', color: '#9CA3AF', sortOrder: 0 },
          { name: 'Active', color: '#3B82F6', sortOrder: 1 },
          { name: 'Complete', color: '#10B981', sortOrder: 2 },
        ],
        widgets: [{ type: 'CHART', title: 'Burndown', configJson: {}, sortOrder: 0 }],
        permissions: [{ userId, role: 'OWNER' }],
      };
      mockProjectCreate.mockResolvedValue(instantiatedProject);

      const result = await service.instantiate(userId, templateId, 'From Template', 'Desc');

      expect(result).toEqual(instantiatedProject);
      expect(mockTemplateFindUnique).toHaveBeenCalledWith({ where: { id: templateId } });
      expect(mockProjectCreate).toHaveBeenCalledWith({
        data: {
          name: 'From Template',
          description: 'Desc',
          ownerId: userId,
          permissions: {
            create: { userId, role: 'OWNER' },
          },
          taskStatuses: {
            create: [
              { name: 'Backlog', color: '#9CA3AF', sortOrder: 0 },
              { name: 'Active', color: '#3B82F6', sortOrder: 1 },
              { name: 'Complete', color: '#10B981', sortOrder: 2 },
            ],
          },
          widgets: {
            create: [
              { type: 'CHART', title: 'Burndown', configJson: {}, sortOrder: 0 },
            ],
          },
        },
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          widgets: { orderBy: { sortOrder: 'asc' } },
          permissions: true,
        },
      });
    });

    it('should use DEFAULT_TASK_STATUSES when template has no statuses in config', async () => {
      const templateNoStatuses = {
        ...mockTemplate,
        configJson: { widgets: [] },
      };
      mockTemplateFindUnique.mockResolvedValue(templateNoStatuses);
      mockProjectCreate.mockResolvedValue(mockProject);

      await service.instantiate(userId, templateId, 'Proj');

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskStatuses: {
              create: [
                { name: 'To Do', color: '#6B7280', sortOrder: 0 },
                { name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
                { name: 'Done', color: '#10B981', sortOrder: 2 },
              ],
            },
          }),
        }),
      );
    });

    it('should throw ApiError.notFound when template does not exist', async () => {
      mockTemplateFindUnique.mockResolvedValue(null);

      await expect(
        service.instantiate(userId, 'nonexistent', 'Proj'),
      ).rejects.toThrow(ApiError);
      await expect(
        service.instantiate(userId, 'nonexistent', 'Proj'),
      ).rejects.toThrow('Template not found');
    });

    it('should throw ApiError.forbidden when template is private and not owned by user', async () => {
      const privateTemplate = {
        ...mockTemplate,
        isPublic: false,
        createdById: 'other-user',
      };
      mockTemplateFindUnique.mockResolvedValue(privateTemplate);

      await expect(
        service.instantiate(userId, templateId, 'Proj'),
      ).rejects.toThrow(ApiError);
      await expect(
        service.instantiate(userId, templateId, 'Proj'),
      ).rejects.toThrow('No access to this template');
    });

    it('should allow access to a private template owned by the user', async () => {
      const ownedPrivateTemplate = {
        ...mockTemplate,
        isPublic: false,
        createdById: userId,
      };
      mockTemplateFindUnique.mockResolvedValue(ownedPrivateTemplate);
      mockProjectCreate.mockResolvedValue(mockProject);

      await expect(
        service.instantiate(userId, templateId, 'My Proj'),
      ).resolves.toBeDefined();
      expect(mockProjectCreate).toHaveBeenCalled();
    });

    it('should set description to null when not provided', async () => {
      mockTemplateFindUnique.mockResolvedValue(mockTemplate);
      mockProjectCreate.mockResolvedValue(mockProject);

      await service.instantiate(userId, templateId, 'Proj');

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockTemplateFindUnique.mockResolvedValue(mockTemplate);
      mockProjectCreate.mockRejectedValue(new Error('DB error'));

      await expect(
        service.instantiate(userId, templateId, 'Fail'),
      ).rejects.toThrow(ApiError);
      await expect(
        service.instantiate(userId, templateId, 'Fail'),
      ).rejects.toThrow('Failed to instantiate project from template');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should update the project name and description', async () => {
      const updatedProject = {
        ...mockProject,
        name: 'Updated Name',
        description: 'Updated Desc',
      };
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue(updatedProject);

      const result = await service.update(projectId, {
        name: 'Updated Name',
        description: 'Updated Desc',
      });

      expect(result).toEqual(updatedProject);
      expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockProjectUpdate).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { name: 'Updated Name', description: 'Updated Desc' },
        include: {
          owner: { select: { id: true, displayName: true, email: true } },
        },
      });
    });

    it('should emit a websocket event after successful update', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue(mockProject);

      const changes = { name: 'New Name' };
      await service.update(projectId, changes);

      expect(mockEmit).toHaveBeenCalledWith('project:updated', {
        projectId,
        changes,
      });
    });

    it('should only include defined fields in the update data', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue(mockProject);

      await service.update(projectId, { name: 'Only Name' });

      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Only Name' },
        }),
      );
    });

    it('should throw ApiError.notFound when project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'X' }),
      ).rejects.toThrow(ApiError);
      await expect(
        service.update('nonexistent', { name: 'X' }),
      ).rejects.toThrow('Project not found');
    });

    it('should not emit websocket event when project is not found', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'X' })).rejects.toThrow();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(projectId, { name: 'Fail' }),
      ).rejects.toThrow(ApiError);
      await expect(
        service.update(projectId, { name: 'Fail' }),
      ).rejects.toThrow('Failed to update project');
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------
  describe('updateStatus', () => {
    it('should update project status to ACTIVE', async () => {
      const updatedProject = { ...mockProject, status: 'ACTIVE' };
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue(updatedProject);

      const result = await service.updateStatus(projectId, 'ACTIVE');

      expect(result).toEqual(updatedProject);
      expect(mockProjectUpdate).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { status: 'ACTIVE' },
      });
    });

    it('should update project status to ARCHIVED', async () => {
      const updatedProject = { ...mockProject, status: 'ARCHIVED' };
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue(updatedProject);

      const result = await service.updateStatus(projectId, 'ARCHIVED');

      expect(result).toEqual(updatedProject);
      expect(mockProjectUpdate).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { status: 'ARCHIVED' },
      });
    });

    it('should throw ApiError.notFound when project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'ACTIVE'),
      ).rejects.toThrow(ApiError);
      await expect(
        service.updateStatus('nonexistent', 'ACTIVE'),
      ).rejects.toThrow('Project not found');
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectUpdate.mockRejectedValue(new Error('DB error'));

      await expect(
        service.updateStatus(projectId, 'ACTIVE'),
      ).rejects.toThrow(ApiError);
      await expect(
        service.updateStatus(projectId, 'ACTIVE'),
      ).rejects.toThrow('Failed to update project status');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should delete the project and return success message', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectDelete.mockResolvedValue(mockProject);

      const result = await service.delete(projectId);

      expect(result).toEqual({ message: 'Project deleted successfully' });
      expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockProjectDelete).toHaveBeenCalledWith({ where: { id: projectId } });
    });

    it('should throw ApiError.notFound when project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(ApiError);
      await expect(service.delete('nonexistent')).rejects.toThrow('Project not found');
    });

    it('should not call delete when project is not found', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow();
      expect(mockProjectDelete).not.toHaveBeenCalled();
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      mockProjectFindUnique.mockResolvedValue(mockProject);
      mockProjectDelete.mockRejectedValue(new Error('DB error'));

      await expect(service.delete(projectId)).rejects.toThrow(ApiError);
      await expect(service.delete(projectId)).rejects.toThrow('Failed to delete project');
    });
  });

  // ---------------------------------------------------------------------------
  // saveAsTemplate
  // ---------------------------------------------------------------------------
  describe('saveAsTemplate', () => {
    it('should save a project as a private template with statuses and widgets', async () => {
      const projectWithDetails = {
        ...mockProject,
        taskStatuses: [
          { id: 's1', name: 'To Do', color: '#6B7280', sortOrder: 0 },
          { id: 's2', name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
          { id: 's3', name: 'Done', color: '#10B981', sortOrder: 2 },
        ],
        widgets: [
          {
            id: 'w1',
            type: 'CHART',
            title: 'Burndown',
            configJson: { chartType: 'line' },
            sortOrder: 0,
          },
        ],
      };
      const createdTemplate = {
        id: 'new-template-1',
        name: 'Test Project - Template',
        description: 'Template created from project "Test Project"',
        configJson: {
          statuses: [
            { name: 'To Do', color: '#6B7280', sortOrder: 0 },
            { name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
            { name: 'Done', color: '#10B981', sortOrder: 2 },
          ],
          widgets: [
            { type: 'CHART', title: 'Burndown', configJson: { chartType: 'line' }, sortOrder: 0 },
          ],
        },
        isPublic: false,
        createdById: userId,
      };
      mockProjectFindUnique.mockResolvedValue(projectWithDetails);
      mockTemplateCreate.mockResolvedValue(createdTemplate);

      const result = await service.saveAsTemplate(projectId, userId);

      expect(result).toEqual(createdTemplate);
      expect(mockProjectFindUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: {
          taskStatuses: { orderBy: { sortOrder: 'asc' } },
          widgets: { orderBy: { sortOrder: 'asc' } },
        },
      });
      expect(mockTemplateCreate).toHaveBeenCalledWith({
        data: {
          name: 'Test Project - Template',
          description: 'Template created from project "Test Project"',
          configJson: {
            statuses: [
              { name: 'To Do', color: '#6B7280', sortOrder: 0 },
              { name: 'In Progress', color: '#3B82F6', sortOrder: 1 },
              { name: 'Done', color: '#10B981', sortOrder: 2 },
            ],
            widgets: [
              {
                type: 'CHART',
                title: 'Burndown',
                configJson: { chartType: 'line' },
                sortOrder: 0,
              },
            ],
          },
          isPublic: false,
          createdById: userId,
        },
      });
    });

    it('should handle a project with no widgets', async () => {
      const projectNoWidgets = {
        ...mockProject,
        taskStatuses: [
          { id: 's1', name: 'To Do', color: '#6B7280', sortOrder: 0 },
        ],
        widgets: [],
      };
      mockProjectFindUnique.mockResolvedValue(projectNoWidgets);
      mockTemplateCreate.mockResolvedValue({ id: 'tmpl' });

      await service.saveAsTemplate(projectId, userId);

      expect(mockTemplateCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            configJson: expect.objectContaining({
              widgets: [],
            }),
          }),
        }),
      );
    });

    it('should throw ApiError.notFound when project does not exist', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        service.saveAsTemplate('nonexistent', userId),
      ).rejects.toThrow(ApiError);
      await expect(
        service.saveAsTemplate('nonexistent', userId),
      ).rejects.toThrow('Project not found');
    });

    it('should not call template.create when project is not found', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.saveAsTemplate('nonexistent', userId)).rejects.toThrow();
      expect(mockTemplateCreate).not.toHaveBeenCalled();
    });

    it('should throw ApiError.badRequest when prisma throws an unexpected error', async () => {
      const projectWithDetails = {
        ...mockProject,
        taskStatuses: [],
        widgets: [],
      };
      mockProjectFindUnique.mockResolvedValue(projectWithDetails);
      mockTemplateCreate.mockRejectedValue(new Error('DB error'));

      await expect(
        service.saveAsTemplate(projectId, userId),
      ).rejects.toThrow(ApiError);
      await expect(
        service.saveAsTemplate(projectId, userId),
      ).rejects.toThrow('Failed to save project as template');
    });
  });
});
