import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockRefreshTokenFindUnique = vi.fn();
const mockRefreshTokenCreate = vi.fn();
const mockRefreshTokenDelete = vi.fn();
const mockRefreshTokenDeleteMany = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockProjectFindMany = vi.fn();
const mockProjectCreate = vi.fn();
const mockProjectUpdate = vi.fn();
const mockProjectDelete = vi.fn();
const mockProjectCount = vi.fn();
const mockProjectPermissionFindUnique = vi.fn();
const mockProjectPermissionFindFirst = vi.fn();
const mockProjectPermissionFindMany = vi.fn();
const mockProjectPermissionCreate = vi.fn();
const mockProjectPermissionCount = vi.fn();
const mockTaskStatusFindFirst = vi.fn();
const mockTaskStatusFindMany = vi.fn();
const mockTaskStatusCreateMany = vi.fn();
const mockTaskFindUnique = vi.fn();
const mockTaskFindFirst = vi.fn();
const mockTaskFindMany = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskUpdate = vi.fn();
const mockTaskDelete = vi.fn();
const mockTaskCount = vi.fn();
const mockTaskUpdateMany = vi.fn();
const mockTaskDeleteMany = vi.fn();
const mockAuditLogCreate = vi.fn().mockResolvedValue({});
const mockTaskDependencyFindFirst = vi.fn();
const mockTaskDependencyFindUnique = vi.fn();
const mockTaskDependencyCreate = vi.fn();
const mockTaskDependencyDelete = vi.fn();
const mockActivityCreate = vi.fn().mockResolvedValue({});
const mockNotificationCreate = vi.fn().mockResolvedValue({});

vi.mock('../config/db.js', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    refreshToken: {
      findUnique: (...args: unknown[]) => mockRefreshTokenFindUnique(...args),
      create: (...args: unknown[]) => mockRefreshTokenCreate(...args),
      delete: (...args: unknown[]) => mockRefreshTokenDelete(...args),
      deleteMany: (...args: unknown[]) => mockRefreshTokenDeleteMany(...args),
    },
    project: {
      findUnique: (...args: unknown[]) => mockProjectFindUnique(...args),
      findMany: (...args: unknown[]) => mockProjectFindMany(...args),
      create: (...args: unknown[]) => mockProjectCreate(...args),
      update: (...args: unknown[]) => mockProjectUpdate(...args),
      delete: (...args: unknown[]) => mockProjectDelete(...args),
      count: (...args: unknown[]) => mockProjectCount(...args),
    },
    projectPermission: {
      findUnique: (...args: unknown[]) => mockProjectPermissionFindUnique(...args),
      findFirst: (...args: unknown[]) => mockProjectPermissionFindFirst(...args),
      findMany: (...args: unknown[]) => mockProjectPermissionFindMany(...args),
      create: (...args: unknown[]) => mockProjectPermissionCreate(...args),
      count: (...args: unknown[]) => mockProjectPermissionCount(...args),
    },
    taskStatus: {
      findFirst: (...args: unknown[]) => mockTaskStatusFindFirst(...args),
      findMany: (...args: unknown[]) => mockTaskStatusFindMany(...args),
      createMany: (...args: unknown[]) => mockTaskStatusCreateMany(...args),
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
      create: (...args: unknown[]) => mockAuditLogCreate(...args),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    activity: {
      create: (...args: unknown[]) => mockActivityCreate(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
    },
  },
}));

vi.mock('../config/env.js', () => ({
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
vi.mock('../ws/ws.server.js', () => ({
  getIO: () => ({
    to: () => ({
      emit: vi.fn(),
    }),
  }),
  evictUserFromProject: vi.fn(),
}));

// Mock activity service
vi.mock('./activity/activity.service.js', () => ({
  activityService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock notifications service
vi.mock('./notifications/notifications.service.js', () => ({
  notificationsService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

import jwt from 'jsonwebtoken';
import createApp from '../app.js';

// ── HTTP helper (inline supertest replacement) ───────────────────────────────
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

  const chain = {
    set(key: string, value: string) {
      _headers[key] = value;
      return chain;
    },
    send(body: unknown) {
      _body = body;
      return chain;
    },
    then(
      resolve: (value: { status: number; body: unknown }) => void,
      reject: (err: unknown) => void,
    ) {
      const http = require('http');
      const addr = server.listen(0).address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;

      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: _headers,
      };

      const req = http.request(
        options,
        (res: {
          statusCode: number;
          on: (event: string, cb: (data?: Buffer) => void) => void;
        }) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            server.close();
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        },
      );

      req.on('error', (err: unknown) => {
        server.close();
        reject(err);
      });

      if (_body) {
        req.write(JSON.stringify(_body));
      }
      req.end();
    },
  };

  return chain;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const JWT_SECRET = 'test-secret-key-for-integration-tests';

function makeToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      sub: 'user-owner',
      email: 'owner@example.com',
      systemRole: 'PROJECT_CREATOR',
      jti: 'test-jti',
      ...overrides,
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

const ownerToken = makeToken({ sub: 'user-owner', email: 'owner@example.com', systemRole: 'PROJECT_CREATOR' });
const editorToken = makeToken({ sub: 'user-editor', email: 'editor@example.com', systemRole: 'VIEWER_ONLY' });
const viewerToken = makeToken({ sub: 'user-viewer', email: 'viewer@example.com', systemRole: 'VIEWER_ONLY' });
const adminToken = makeToken({ sub: 'user-admin', email: 'admin@example.com', systemRole: 'SYS_ADMIN' });
const nonMemberToken = makeToken({ sub: 'user-nonmember', email: 'nonmember@example.com', systemRole: 'VIEWER_ONLY' });

function mockProjectPermission(userId: string, role: string) {
  mockProjectPermissionFindUnique.mockImplementation((args: { where: { projectId_userId: { userId: string } } }) => {
    if (args?.where?.projectId_userId?.userId === userId) {
      return Promise.resolve({
        id: `perm-${userId}`,
        projectId: 'project-1',
        userId,
        role,
        capabilities: {},
        customRole: null,
      });
    }
    return Promise.resolve(null);
  });
}

function mockMultiplePermissions(permissions: Array<{ userId: string; role: string }>) {
  mockProjectPermissionFindUnique.mockImplementation((args: { where: { projectId_userId: { userId: string } } }) => {
    const match = permissions.find(p => p.userId === args?.where?.projectId_userId?.userId);
    if (match) {
      return Promise.resolve({
        id: `perm-${match.userId}`,
        projectId: 'project-1',
        userId: match.userId,
        role: match.role,
        capabilities: {},
        customRole: null,
      });
    }
    return Promise.resolve(null);
  });
}

// ── RBAC Integration Tests ─────────────────────────────────────────────────
describe('RBAC Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshTokenCreate.mockResolvedValue({});
  });

  describe('Project Creation - System Role Enforcement', () => {
    it('allows PROJECT_CREATOR to create a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProjectCreate.mockResolvedValue(mockProject);
      mockTaskStatusCreateMany.mockResolvedValue({ count: 4 });
      mockProjectPermissionCreate.mockResolvedValue({});
      mockTaskStatusFindMany.mockResolvedValue([]);
      mockProjectPermissionFindMany.mockResolvedValue([]);
      mockProjectFindUnique.mockResolvedValue(mockProject);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post('/api/v1/projects')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Test Project', description: 'A test project' }),
      );

      expect(res.status).toBe(201);
    });

    it('allows SYS_ADMIN to create a project', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Admin Project',
        description: 'Admin created',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProjectCreate.mockResolvedValue(mockProject);
      mockTaskStatusCreateMany.mockResolvedValue({ count: 4 });
      mockProjectPermissionCreate.mockResolvedValue({});
      mockTaskStatusFindMany.mockResolvedValue([]);
      mockProjectPermissionFindMany.mockResolvedValue([]);
      mockProjectFindUnique.mockResolvedValue(mockProject);

      const app = createApp();
      const res = await request(app).then(r =>
        r.post('/api/v1/projects')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Admin Project', description: 'Admin created' }),
      );

      expect(res.status).toBe(201);
    });

    it('blocks VIEWER_ONLY from creating a project', async () => {
      const app = createApp();
      const res = await request(app).then(r =>
        r.post('/api/v1/projects')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ name: 'Blocked Project', description: 'Should fail' }),
      );

      expect(res.status).toBe(403);
    });

    it('returns 401 without auth token for project creation', async () => {
      const app = createApp();
      const res = await request(app).then(r =>
        r.post('/api/v1/projects')
          .set('Origin', 'http://localhost:5173')
          .send({ name: 'No Auth', description: 'Should fail' }),
      );

      expect(res.status).toBe(401);
    });
  });

  describe('Project Access - Project Role Enforcement', () => {
    it('allows OWNER to read project details', async () => {
      mockProjectPermission('user-owner', 'OWNER');
      mockProjectFindUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.get('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${ownerToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('allows EDITOR to read project details', async () => {
      mockProjectPermission('user-editor', 'EDITOR');
      mockProjectFindUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.get('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('allows VIEWER to read project details', async () => {
      mockProjectPermission('user-viewer', 'VIEWER');
      mockProjectFindUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.get('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${viewerToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('blocks non-member from reading project details', async () => {
      mockProjectPermission('nobody', 'OWNER'); // no match for user-nonmember
      mockProjectPermissionFindUnique.mockResolvedValue(null);

      const app = createApp();
      const res = await request(app).then(r =>
        r.get('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${nonMemberToken}`),
      );

      expect(res.status).toBe(403);
    });

    it('allows only OWNER to update project', async () => {
      // OWNER can update
      mockProjectPermission('user-owner', 'OWNER');
      mockProjectUpdate.mockResolvedValue({
        id: 'project-1',
        name: 'Updated',
        description: 'Updated desc',
        status: 'ACTIVE',
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ name: 'Updated' }),
      );

      expect(res.status).toBe(200);
    });

    it('blocks EDITOR from updating project', async () => {
      mockProjectPermission('user-editor', 'EDITOR');

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ name: 'Hacked' }),
      );

      expect(res.status).toBe(403);
    });

    it('blocks VIEWER from updating project', async () => {
      mockProjectPermission('user-viewer', 'VIEWER');

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ name: 'Hacked' }),
      );

      expect(res.status).toBe(403);
    });

    it('allows only OWNER to delete project', async () => {
      mockProjectPermission('user-owner', 'OWNER');
      mockProjectDelete.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${ownerToken}`),
      );

      expect(res.status).toBe(200);
    });

    it('blocks EDITOR from deleting project', async () => {
      mockProjectPermission('user-editor', 'EDITOR');

      const app = createApp();
      const res = await request(app).then(r =>
        r.delete('/api/v1/projects/project-1')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`),
      );

      expect(res.status).toBe(403);
    });
  });

  describe('Task RBAC - Role-Based Access on Task Endpoints', () => {
    // UUID constants for task RBAC tests
    const RBAC_UUID = {
      STATUS_1: '00000000-0000-4000-a000-000000000101',
      STATUS_2: '00000000-0000-4000-a000-000000000102',
    };

    const mockTaskData = {
      id: 'task-1',
      title: 'Test Task',
      description: null,
      projectId: 'project-1',
      statusId: RBAC_UUID.STATUS_1,
      assigneeId: null,
      creatorId: 'user-owner',
      priority: 'NONE',
      sortOrder: 0,
      startDate: null,
      dueDate: null,
      parentTaskId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: { id: RBAC_UUID.STATUS_1, name: 'To Do', color: '#cccccc', sortOrder: 0, projectId: 'project-1' },
      assignee: null,
      creator: { id: 'user-owner', displayName: 'Owner', email: 'owner@example.com' },
    };

    describe('GET /tasks (list)', () => {
      it('allows VIEWER to list tasks', async () => {
        mockProjectPermission('user-viewer', 'VIEWER');
        mockTaskFindMany.mockResolvedValue([mockTaskData]);
        mockTaskCount.mockResolvedValue(1);

        const app = createApp();
        const res = await request(app).then(r =>
          r.get('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${viewerToken}`),
        );

        expect(res.status).toBe(200);
      });

      it('blocks non-member from listing tasks', async () => {
        mockProjectPermissionFindUnique.mockResolvedValue(null);

        const app = createApp();
        const res = await request(app).then(r =>
          r.get('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${nonMemberToken}`),
        );

        expect(res.status).toBe(403);
      });
    });

    describe('POST /tasks (create)', () => {
      it('allows OWNER to create a task', async () => {
        mockProjectPermission('user-owner', 'OWNER');
        mockTaskStatusFindFirst.mockResolvedValue({
          id: RBAC_UUID.STATUS_1,
          name: 'To Do',
          projectId: 'project-1',
        });
        mockProjectPermissionFindFirst.mockResolvedValue(null);
        mockTaskFindFirst.mockResolvedValue(null);
        mockTaskCreate.mockResolvedValue(mockTaskData);
        mockUserFindUnique.mockResolvedValue({ id: 'user-owner', displayName: 'Owner' });

        const app = createApp();
        const res = await request(app).then(r =>
          r.post('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: 'Test Task', statusId: RBAC_UUID.STATUS_1 }),
        );

        expect(res.status).toBe(201);
      });

      it('allows EDITOR to create a task', async () => {
        mockProjectPermission('user-editor', 'EDITOR');
        mockTaskStatusFindFirst.mockResolvedValue({
          id: RBAC_UUID.STATUS_1,
          name: 'To Do',
          projectId: 'project-1',
        });
        mockProjectPermissionFindFirst.mockResolvedValue(null);
        mockTaskFindFirst.mockResolvedValue(null);
        mockTaskCreate.mockResolvedValue({
          ...mockTaskData,
          creatorId: 'user-editor',
          creator: { id: 'user-editor', displayName: 'Editor', email: 'editor@example.com' },
        });
        mockUserFindUnique.mockResolvedValue({ id: 'user-editor', displayName: 'Editor' });

        const app = createApp();
        const res = await request(app).then(r =>
          r.post('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${editorToken}`)
            .send({ title: 'Editor Task', statusId: RBAC_UUID.STATUS_1 }),
        );

        expect(res.status).toBe(201);
      });

      it('blocks VIEWER from creating a task', async () => {
        mockProjectPermission('user-viewer', 'VIEWER');

        const app = createApp();
        const res = await request(app).then(r =>
          r.post('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ title: 'Viewer Task', statusId: RBAC_UUID.STATUS_1 }),
        );

        expect(res.status).toBe(403);
      });

      it('blocks non-member from creating a task', async () => {
        mockProjectPermissionFindUnique.mockResolvedValue(null);

        const app = createApp();
        const res = await request(app).then(r =>
          r.post('/api/v1/projects/project-1/tasks')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${nonMemberToken}`)
            .send({ title: 'Non-member Task', statusId: RBAC_UUID.STATUS_1 }),
        );

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /tasks/:taskId (update)', () => {
      it('allows EDITOR to update a task', async () => {
        mockProjectPermission('user-editor', 'EDITOR');
        mockTaskFindUnique.mockResolvedValue(mockTaskData);
        mockTaskUpdate.mockResolvedValue({ ...mockTaskData, title: 'Updated' });

        const app = createApp();
        const res = await request(app).then(r =>
          r.patch('/api/v1/projects/project-1/tasks/task-1')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${editorToken}`)
            .send({ title: 'Updated' }),
        );

        expect(res.status).toBe(200);
      });

      it('blocks VIEWER from updating a task', async () => {
        mockProjectPermission('user-viewer', 'VIEWER');

        const app = createApp();
        const res = await request(app).then(r =>
          r.patch('/api/v1/projects/project-1/tasks/task-1')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ title: 'Should Fail' }),
        );

        expect(res.status).toBe(403);
      });
    });

    describe('PATCH /tasks/:taskId/status (move)', () => {
      it('allows EDITOR to change task status', async () => {
        mockProjectPermission('user-editor', 'EDITOR');
        mockTaskFindUnique.mockResolvedValue(mockTaskData);
        mockTaskStatusFindFirst.mockResolvedValue({
          id: RBAC_UUID.STATUS_2,
          name: 'In Progress',
          projectId: 'project-1',
        });
        mockTaskFindFirst.mockResolvedValue(null);
        mockTaskUpdate.mockResolvedValue({
          ...mockTaskData,
          statusId: RBAC_UUID.STATUS_2,
          status: { id: RBAC_UUID.STATUS_2, name: 'In Progress', color: '#3b82f6', sortOrder: 1, projectId: 'project-1' },
        });

        const app = createApp();
        const res = await request(app).then(r =>
          r.patch('/api/v1/projects/project-1/tasks/task-1/status')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${editorToken}`)
            .send({ statusId: RBAC_UUID.STATUS_2 }),
        );

        expect(res.status).toBe(200);
      });

      it('blocks VIEWER from changing task status', async () => {
        mockProjectPermission('user-viewer', 'VIEWER');

        const app = createApp();
        const res = await request(app).then(r =>
          r.patch('/api/v1/projects/project-1/tasks/task-1/status')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ statusId: RBAC_UUID.STATUS_2 }),
        );

        expect(res.status).toBe(403);
      });
    });

    describe('DELETE /tasks/:taskId', () => {
      it('allows OWNER to delete a task', async () => {
        mockProjectPermission('user-owner', 'OWNER');
        mockTaskFindUnique.mockResolvedValue(mockTaskData);
        mockTaskDelete.mockResolvedValue(mockTaskData);

        const app = createApp();
        const res = await request(app).then(r =>
          r.delete('/api/v1/projects/project-1/tasks/task-1')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${ownerToken}`),
        );

        expect(res.status).toBe(200);
      });

      it('allows EDITOR to delete a task', async () => {
        mockProjectPermission('user-editor', 'EDITOR');
        mockTaskFindUnique.mockResolvedValue(mockTaskData);
        mockTaskDelete.mockResolvedValue(mockTaskData);

        const app = createApp();
        const res = await request(app).then(r =>
          r.delete('/api/v1/projects/project-1/tasks/task-1')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${editorToken}`),
        );

        expect(res.status).toBe(200);
      });

      it('blocks VIEWER from deleting a task', async () => {
        mockProjectPermission('user-viewer', 'VIEWER');

        const app = createApp();
        const res = await request(app).then(r =>
          r.delete('/api/v1/projects/project-1/tasks/task-1')
            .set('Origin', 'http://localhost:5173')
            .set('Authorization', `Bearer ${viewerToken}`),
        );

        expect(res.status).toBe(403);
      });
    });
  });

  describe('Project Status & Archive - Owner Only', () => {
    it('allows OWNER to archive a project', async () => {
      mockProjectPermission('user-owner', 'OWNER');
      mockProjectUpdate.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        status: 'ARCHIVED',
      });

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch('/api/v1/projects/project-1/status')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ status: 'ARCHIVED' }),
      );

      expect(res.status).toBe(200);
    });

    it('blocks EDITOR from archiving a project', async () => {
      mockProjectPermission('user-editor', 'EDITOR');

      const app = createApp();
      const res = await request(app).then(r =>
        r.patch('/api/v1/projects/project-1/status')
          .set('Origin', 'http://localhost:5173')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ status: 'ARCHIVED' }),
      );

      expect(res.status).toBe(403);
    });
  });
});
