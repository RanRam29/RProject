import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock prisma
const mockFindUnique = vi.fn();
vi.mock('../config/db.js', () => ({
  default: {
    projectPermission: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { requireProjectRole, requireCapability } from './rbac.middleware.js';

function createReq(params: Record<string, string> = {}, user?: Record<string, string>) {
  return {
    params,
    user: user || { sub: 'user-1', email: 'test@test.com', systemRole: 'SYS_ADMIN' },
    projectPermission: undefined as unknown,
    projectCapabilities: undefined as unknown,
  } as unknown as Request;
}

describe('requireProjectRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when projectId or userId missing', async () => {
    const req = createReq({});
    const next = vi.fn();

    await requireProjectRole('OWNER')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('rejects when no permission found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createReq({ projectId: 'proj-1' });
    const next = vi.fn();

    await requireProjectRole('OWNER')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'No access to this project' })
    );
  });

  it('passes when user has required role', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'perm-1',
      projectId: 'proj-1',
      userId: 'user-1',
      role: 'OWNER',
      capabilities: {},
    });
    const req = createReq({ projectId: 'proj-1' });
    const next = vi.fn();

    await requireProjectRole('OWNER', 'EDITOR')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.projectPermission).toBeDefined();
  });

  it('rejects when user role not in allowed list', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'perm-1',
      projectId: 'proj-1',
      userId: 'user-1',
      role: 'VIEWER',
      capabilities: {},
    });
    const req = createReq({ projectId: 'proj-1' });
    const next = vi.fn();

    await requireProjectRole('OWNER', 'EDITOR')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Insufficient project permissions' })
    );
  });
});

describe('requireCapability', () => {
  it('allows OWNER for any capability', () => {
    const req = {
      projectPermission: { role: 'OWNER', capabilities: {} },
    } as unknown as Request;
    const next = vi.fn();

    requireCapability('task.create')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows EDITOR for standard capabilities', () => {
    const req = {
      projectPermission: { role: 'EDITOR', capabilities: {} },
    } as unknown as Request;
    const next = vi.fn();

    requireCapability('task.create')(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects EDITOR for non-standard capabilities', () => {
    const req = {
      projectPermission: { role: 'EDITOR', capabilities: {} },
      projectCapabilities: undefined,
    } as unknown as Request;
    const next = vi.fn();

    requireCapability('members.manage')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it('rejects when no permission found', () => {
    const req = { projectPermission: undefined } as unknown as Request;
    const next = vi.fn();

    requireCapability('task.create')(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it('allows custom role with matching capability', () => {
    const req = {
      projectPermission: { role: 'CUSTOM', capabilities: {} },
      projectCapabilities: { 'task.create': true },
    } as unknown as Request;
    const next = vi.fn();

    requireCapability('task.create')(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('checks permission-level capability overrides', () => {
    const req = {
      projectPermission: { role: 'VIEWER', capabilities: { 'file.upload': true } },
      projectCapabilities: undefined,
    } as unknown as Request;
    const next = vi.fn();

    requireCapability('file.upload')(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});
