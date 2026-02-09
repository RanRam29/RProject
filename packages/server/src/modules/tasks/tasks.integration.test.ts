import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockProjectPermissionFindUnique = vi.fn();
const mockProjectPermissionFindFirst = vi.fn();
const mockTaskStatusFindFirst = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockTaskFindFirst = vi.fn();
const mockTaskFindMany = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskUpdate = vi.fn();
const mockTaskDelete = vi.fn();
const mockTaskCount = vi.fn();
const mockTaskUpdateMany = vi.fn();
const mockTaskDeleteMany = vi.fn();
const mockTaskDependencyFindFirst = vi.fn();
const mockTaskDependencyFindUnique = vi.fn();
const mockTaskDependencyCreate = vi.fn();
const mockTaskDependencyDelete = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    projectPermission: {
      findUnique: (...args: unknown[]) => mockProjectPermissionFindUnique(...args),
      findFirst: (...args: unknown[]) => mockProjectPermissionFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    taskStatus: {
      findFirst: (...args: unknown[]) => mockTaskStatusFindFirst(...args),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    task: {
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
      findFirst: (...args: unknown[]) => mockTaskFindFirst(...args),
      findMany: (...args: unknown[]) => mockTaskFindMany(...args),
      create: (...args: unknown[]) => mockTaskCreate(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      delete: (...args: unknown[]) => mockTaskDelete(...args),
      count: (...args: unknown[]) => mockTaskCount(...args),
      updateMany: (...args: unknown[]) => mockTaskUpdateMany(...args),
      deleteMany: (...args: unknown[]) => mockTaskDeleteMany(...args),
    },
    taskDependency: {
      findFirst: (...args: unknown[]) => mockTaskDependencyFindFirst(...args),
      findUnique: (...args: unknown[]) => mockTaskDependencyFindUnique(...args),
      create: (...args: unknown[]) => mockTaskDependencyCreate(...args),
      delete: (...args: unknown[]) => mockTaskDependencyDelete(...args),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-integration-tests',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CLIENT_URL: 'http://localhost:5173',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    AWS_REGION: '',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    S3_BUCKET_NAME: '',
  },
  default: {
    JWT_SECRET: 'test-secret-key-for-integration-tests',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    CLIENT_URL: 'http://localhost:5173',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    AWS_REGION: '',
    AWS_ACCESS_KEY_ID: '',
    AWS_SECRET_ACCESS_KEY: '',
    S3_BUCKET_NAME: '',
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

// Mock WS server
vi.mock('../../ws/ws.server.js', () => ({
  getIO: () => ({
    to: () => ({
      emit: vi.fn(),
    }),
  }),
  evictUserFromProject: vi.fn(),
}));

// Mock activity service
vi.mock('../activity/activity.service.js', () => ({
  activityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock notifications service
vi.mock('../notifications/notifications.service.js', () => ({
  notificationsService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

import jwt from 'jsonwebtoken';
import createApp from '../../app.js';

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function request(app: ReturnType<typeof createApp>) {
  const http = await import('http');
  const server = http.createServer(app);

  return {
    post: (path: string) => makeRequest(server, 'POST', path),
    get: (path: string) => makeRequest(server, 'GET', path),
    patch: (path: string) => makeRequest(server, 'PATCH', path),
    delete: (path: string) => makeRequest(server, 'DELETE', path),
    _server: server,
  };
}

function makeRequest(
  server: ReturnType<typeof import('http').createServer>,
  method: string,
  path: string,
) {
  let _body: unknown = undefined;
  let _headers: Record<string, string> = { 'content-type': 'application/json' };

  const chain: {
    set(key: string, value: string): typeof chain;
    send(body: unknown): typeof chain;
    then<T = { status: number; body: unknown }, R = never>(
      resolve?: ((value: { status: number; body: unknown }) => T | PromiseLike<T>) | null,
      reject?: ((err: unknown) => R | PromiseLike<R>) | null,
    ): Promise<T | R>;
  } = {
    set(key: string, value: string) {
      _headers[key] = value;
      return chain;
    },
    send(body: unknown) {
      _body = body;
      return chain;
    },
    then(resolve?, reject?) {
      return new Promise<{ status: number; body: unknown }>((res, rej) => {
        const http = require('http');
        const addr = server.listen(0).address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const req = http.request(
          { hostname: '127.0.0.1', port, path, method, headers: _headers },
          (response: {
            statusCode: number;
            on: (event: string, cb: (data?: Buffer) => void) => void;
          }) => {
            let data = '';
            response.on('data', (chunk?: Buffer) => { if (chunk) data += chunk.toString(); });
            response.on('end', () => {
              server.close();
              try {
                res({ status: response.statusCode, body: JSON.parse(data) });
              } catch {
                res({ status: response.statusCode, body: data });
              }
            });
          },
        );

        req.on('error', (err: unknown) => { server.close(); rej(err); });
        if (_body) req.write(JSON.stringify(_body));
        req.end();
      }).then(resolve, reject);
    },
  };

  return chain;
}

// ── Test UUIDs ───────────────────────────────────────────────────────────────
const UUID = {
  PROJECT:      '00000000-0000-4000-a000-000000000001',
  USER_EDITOR:  '00000000-0000-4000-a000-000000000010',
  USER_MEMBER:  '00000000-0000-4000-a000-000000000011',
  USER_NONMEM:  '00000000-0000-4000-a000-000000000012',
  STATUS_TODO:  '00000000-0000-4000-a000-000000000020',
  STATUS_IP:    '00000000-0000-4000-a000-000000000021',
  STATUS_DONE:  '00000000-0000-4000-a000-000000000022',
  TASK_1:       '00000000-0000-4000-a000-000000000030',
  TASK_2:       '00000000-0000-4000-a000-000000000031',
  TASK_PARENT:  '00000000-0000-4000-a000-000000000032',
  TASK_SUB:     '00000000-0000-4000-a000-000000000033',
  PERM_EDITOR:  '00000000-0000-4000-a000-000000000040',
  DEP_1:        '00000000-0000-4000-a000-000000000050',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const JWT_SECRET = 'test-secret-key-for-integration-tests';

function makeToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      sub: UUID.USER_EDITOR,
      email: 'editor@example.com',
      systemRole: 'PROJECT_CREATOR',
      jti: 'test-jti',
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

const editorToken = makeToken();

function setupEditorPermission() {
  mockProjectPermissionFindUnique.mockResolvedValue({
    id: UUID.PERM_EDITOR,
    projectId: UUID.PROJECT,
    userId: UUID.USER_EDITOR,
    role: 'EDITOR',
    capabilities: {},
    customRole: null,
  });
}

const baseTask = {
  id: UUID.TASK_1,
  title: 'Test Task',
  description: null,
  projectId: UUID.PROJECT,
  statusId: UUID.STATUS_TODO,
  assigneeId: null,
  creatorId: UUID.USER_EDITOR,
  priority: 'NONE',
  sortOrder: 0,
  startDate: null,
  dueDate: null,
  parentTaskId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: { id: UUID.STATUS_TODO, name: 'To Do', color: '#cccccc', sortOrder: 0, projectId: UUID.PROJECT },
  assignee: null,
  creator: { id: UUID.USER_EDITOR, displayName: 'Editor', email: 'editor@example.com' },
};

// ── Task Lifecycle Integration Tests ──────────────────────────────────────────
describe('Task Lifecycle Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEditorPermission();
  });

  describe('Task Creation', () => {
    it('creates a task with required fields', async () => {
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_TODO,
        name: 'To Do',
        projectId: UUID.PROJECT,
      });
      mockProjectPermissionFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskCreate.mockResolvedValue(baseTask);
      mockUserFindUnique.mockResolvedValue({ id: UUID.USER_EDITOR, displayName: 'Editor' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Test Task', statusId: UUID.STATUS_TODO }),
      );

      expect(res.status).toBe(201);
      const body = res.body as { success: boolean; data: { title: string } };
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Test Task');
    });

    it('creates a task with all optional fields', async () => {
      const fullTask = {
        ...baseTask,
        assigneeId: UUID.USER_EDITOR,
        priority: 'HIGH',
        description: '{"type":"doc","content":[]}',
        assignee: { id: UUID.USER_EDITOR, displayName: 'Editor', email: 'editor@example.com' },
      };
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_TODO,
        name: 'To Do',
        projectId: UUID.PROJECT,
      });
      mockProjectPermissionFindFirst.mockResolvedValue({
        id: UUID.PERM_EDITOR,
        projectId: UUID.PROJECT,
        userId: UUID.USER_EDITOR,
      });
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskCreate.mockResolvedValue(fullTask);
      mockUserFindUnique.mockResolvedValue({ id: UUID.USER_EDITOR, displayName: 'Editor' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            title: 'Full Task',
            statusId: UUID.STATUS_TODO,
            assigneeId: UUID.USER_EDITOR,
            priority: 'HIGH',
            description: '{"type":"doc","content":[]}',
            dueDate: '2026-03-01T00:00:00.000Z',
          }),
      );

      expect(res.status).toBe(201);
    });

    it('returns 400 for missing title', async () => {
      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ statusId: UUID.STATUS_TODO }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing statusId', async () => {
      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'No Status' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid status ID (not in project)', async () => {
      mockTaskStatusFindFirst.mockResolvedValue(null);
      mockProjectPermissionFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Bad Status', statusId: UUID.STATUS_IP }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 for assignee not in project', async () => {
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_TODO,
        name: 'To Do',
        projectId: UUID.PROJECT,
      });
      mockProjectPermissionFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            title: 'Bad Assignee',
            statusId: UUID.STATUS_TODO,
            assigneeId: UUID.USER_NONMEM,
          }),
      );

      expect(res.status).toBe(400);
    });

    it('auto-calculates sort order from existing tasks', async () => {
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_TODO,
        name: 'To Do',
        projectId: UUID.PROJECT,
      });
      mockProjectPermissionFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue({ sortOrder: 5 });
      mockTaskCreate.mockResolvedValue({ ...baseTask, sortOrder: 6 });
      mockUserFindUnique.mockResolvedValue({ id: UUID.USER_EDITOR, displayName: 'Editor' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Ordered Task', statusId: UUID.STATUS_TODO }),
      );

      expect(res.status).toBe(201);
      expect(mockTaskCreate).toHaveBeenCalled();
      const createArgs = mockTaskCreate.mock.calls[0][0];
      expect(createArgs.data.sortOrder).toBe(6);
    });
  });

  describe('Task Update', () => {
    it('updates task title', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskUpdate.mockResolvedValue({ ...baseTask, title: 'Updated Title' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Updated Title' }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { title: string } };
      expect(body.data.title).toBe('Updated Title');
    });

    it('updates task priority', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskUpdate.mockResolvedValue({ ...baseTask, priority: 'HIGH' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ priority: 'HIGH' }),
      );

      expect(res.status).toBe(200);
    });

    it('assigns task to a project member', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockProjectPermissionFindFirst.mockResolvedValue({
        id: UUID.PERM_EDITOR,
        projectId: UUID.PROJECT,
        userId: UUID.USER_MEMBER,
      });
      mockTaskUpdate.mockResolvedValue({
        ...baseTask,
        assigneeId: UUID.USER_MEMBER,
        assignee: { id: UUID.USER_MEMBER, displayName: 'Member', email: 'member@example.com' },
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ assigneeId: UUID.USER_MEMBER }),
      );

      expect(res.status).toBe(200);
    });

    it('rejects assignment to non-member', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockProjectPermissionFindFirst.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ assigneeId: UUID.USER_NONMEM }),
      );

      expect(res.status).toBe(400);
    });
  });

  describe('Task Status Change (Kanban Move)', () => {
    it('moves task to a different status column', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_IP,
        name: 'In Progress',
        projectId: UUID.PROJECT,
      });
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskUpdate.mockResolvedValue({
        ...baseTask,
        statusId: UUID.STATUS_IP,
        status: { id: UUID.STATUS_IP, name: 'In Progress', color: '#3b82f6', sortOrder: 1, projectId: UUID.PROJECT },
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/status`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ statusId: UUID.STATUS_IP }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { statusId: string } };
      expect(body.data.statusId).toBe(UUID.STATUS_IP);
    });

    it('rejects moving to invalid status', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskStatusFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/status`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ statusId: UUID.STATUS_DONE }),
      );

      expect(res.status).toBe(400);
    });

    it('moves task with explicit sort order', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_DONE,
        name: 'Done',
        projectId: UUID.PROJECT,
      });
      mockTaskUpdate.mockResolvedValue({
        ...baseTask,
        statusId: UUID.STATUS_DONE,
        sortOrder: 3,
        status: { id: UUID.STATUS_DONE, name: 'Done', color: '#22c55e', sortOrder: 2, projectId: UUID.PROJECT },
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/status`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ statusId: UUID.STATUS_DONE, sortOrder: 3 }),
      );

      expect(res.status).toBe(200);
    });
  });

  describe('Task Reorder', () => {
    it('reorders task within status column', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskUpdate.mockResolvedValue({ ...baseTask, sortOrder: 2 });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/reorder`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ sortOrder: 2 }),
      );

      expect(res.status).toBe(200);
    });
  });

  describe('Task Deletion', () => {
    it('deletes a task successfully', async () => {
      mockTaskFindUnique.mockResolvedValue(baseTask);
      mockTaskDelete.mockResolvedValue(baseTask);

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { message: string } };
      expect(body.data.message).toBe('Task deleted successfully');
    });

    it('returns 404 for non-existent task', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_2}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Task List & Filtering', () => {
    it('lists tasks for a project', async () => {
      mockTaskFindMany.mockResolvedValue([baseTask]);
      mockTaskCount.mockResolvedValue(1);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: unknown[]; pagination: { total: number } };
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it('lists tasks with status filter', async () => {
      mockTaskFindMany.mockResolvedValue([baseTask]);
      mockTaskCount.mockResolvedValue(1);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get(`/api/v1/projects/${UUID.PROJECT}/tasks?statusId=${UUID.STATUS_TODO}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('returns empty list for project with no tasks', async () => {
      mockTaskFindMany.mockResolvedValue([]);
      mockTaskCount.mockResolvedValue(0);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get(`/api/v1/projects/${UUID.PROJECT}/tasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
      const body = res.body as { data: unknown[] };
      expect(body.data).toHaveLength(0);
    });
  });

  describe('Task Get By ID', () => {
    it('returns task details', async () => {
      const detailedTask = {
        ...baseTask,
        project: { id: UUID.PROJECT, name: 'Test Project' },
        parentTask: null,
        subtasks: [],
        blockedBy: [],
        blocking: [],
        labels: [],
        comments: [],
      };
      mockTaskFindUnique.mockResolvedValue(detailedTask);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { id: string; title: string } };
      expect(body.data.id).toBe(UUID.TASK_1);
      expect(body.data.title).toBe('Test Task');
    });

    it('returns 404 for non-existent task', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_2}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Subtask Creation', () => {
    it('creates a subtask under a parent task', async () => {
      const parentTask = { ...baseTask, id: UUID.TASK_PARENT };
      const subtask = {
        ...baseTask,
        id: UUID.TASK_SUB,
        parentTaskId: UUID.TASK_PARENT,
        parentTask: { id: UUID.TASK_PARENT, title: 'Parent Task' },
      };

      mockTaskFindUnique.mockResolvedValue(parentTask);
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_TODO,
        name: 'To Do',
        projectId: UUID.PROJECT,
      });
      mockProjectPermissionFindFirst.mockResolvedValue(null);
      mockTaskFindFirst.mockResolvedValue(null);
      mockTaskCreate.mockResolvedValue(subtask);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_PARENT}/subtasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Subtask', statusId: UUID.STATUS_TODO }),
      );

      expect(res.status).toBe(201);
    });

    it('returns 404 for subtask on non-existent parent', async () => {
      mockTaskFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_2}/subtasks`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: 'Orphan Subtask', statusId: UUID.STATUS_TODO }),
      );

      // createTaskSchema validation runs first - statusId is valid UUID, title is provided
      // but the service returns 404 when parent task not found
      expect(res.status).toBe(404);
    });
  });

  describe('Task Dependencies', () => {
    const task1 = { ...baseTask, id: UUID.TASK_1, projectId: UUID.PROJECT };
    const task2 = { ...baseTask, id: UUID.TASK_2, projectId: UUID.PROJECT };

    it('adds a dependency between two tasks', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);
      mockTaskDependencyFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockTaskDependencyCreate.mockResolvedValue({
        id: UUID.DEP_1,
        blockedTaskId: UUID.TASK_1,
        blockingTaskId: UUID.TASK_2,
        blockedTask: { id: UUID.TASK_1, title: 'Task 1' },
        blockingTask: { id: UUID.TASK_2, title: 'Task 2' },
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/dependencies`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ blockingTaskId: UUID.TASK_2 }),
      );

      expect(res.status).toBe(201);
    });

    it('rejects self-dependency', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task1);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/dependencies`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ blockingTaskId: UUID.TASK_1 }),
      );

      expect(res.status).toBe(400);
    });

    it('rejects circular dependency', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);
      mockTaskDependencyFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'dep-reverse' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/dependencies`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ blockingTaskId: UUID.TASK_2 }),
      );

      expect(res.status).toBe(400);
    });

    it('rejects duplicate dependency', async () => {
      mockTaskFindUnique
        .mockResolvedValueOnce(task1)
        .mockResolvedValueOnce(task2);
      mockTaskDependencyFindFirst.mockResolvedValueOnce({ id: 'dep-existing' });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/${UUID.TASK_1}/dependencies`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ blockingTaskId: UUID.TASK_2 }),
      );

      expect(res.status).toBe(409);
    });

    it('removes a dependency', async () => {
      mockTaskDependencyFindUnique.mockResolvedValue({
        id: UUID.DEP_1,
        blockedTaskId: UUID.TASK_1,
        blockingTaskId: UUID.TASK_2,
        blockedTask: { projectId: UUID.PROJECT },
      });
      mockTaskDependencyDelete.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete(`/api/v1/projects/${UUID.PROJECT}/tasks/dependencies/${UUID.DEP_1}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('returns 404 for removing non-existent dependency', async () => {
      mockTaskDependencyFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete(`/api/v1/projects/${UUID.PROJECT}/tasks/dependencies/${UUID.TASK_2}`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Bulk Operations', () => {
    it('bulk moves tasks to a new status', async () => {
      mockTaskFindMany.mockResolvedValue([
        { id: UUID.TASK_1, title: 'Task 1' },
        { id: UUID.TASK_2, title: 'Task 2' },
      ]);
      mockTaskStatusFindFirst.mockResolvedValue({
        id: UUID.STATUS_DONE,
        name: 'Done',
        projectId: UUID.PROJECT,
      });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/bulk`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            taskIds: [UUID.TASK_1, UUID.TASK_2],
            operation: 'move',
            statusId: UUID.STATUS_DONE,
          }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { data: { count: number; operation: string } };
      expect(body.data.count).toBe(2);
      expect(body.data.operation).toBe('move');
    });

    it('bulk deletes tasks', async () => {
      mockTaskFindMany.mockResolvedValue([
        { id: UUID.TASK_1, title: 'Task 1' },
        { id: UUID.TASK_2, title: 'Task 2' },
      ]);
      mockTaskDeleteMany.mockResolvedValue({ count: 2 });

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/bulk`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            taskIds: [UUID.TASK_1, UUID.TASK_2],
            operation: 'delete',
          }),
      );

      expect(res.status).toBe(200);
      const body = res.body as { data: { count: number } };
      expect(body.data.count).toBe(2);
    });

    it('rejects bulk operation with mismatched task count', async () => {
      mockTaskFindMany.mockResolvedValue([
        { id: UUID.TASK_1, title: 'Task 1' },
      ]);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post(`/api/v1/projects/${UUID.PROJECT}/tasks/bulk`)
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            taskIds: [UUID.TASK_1, UUID.TASK_2],
            operation: 'delete',
          }),
      );

      expect(res.status).toBe(400);
    });
  });
});
