import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock fns for each prisma method used
const mockPermFindMany = vi.fn();
const mockPermFindFirst = vi.fn();
const mockPermFindUnique = vi.fn();
const mockPermCreate = vi.fn();
const mockPermUpdate = vi.fn();
const mockPermDelete = vi.fn();
const mockPermCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockProjectFindUnique = vi.fn();
const mockCustomRoleFindMany = vi.fn();
const mockCustomRoleFindFirst = vi.fn();
const mockCustomRoleFindUnique = vi.fn();
const mockCustomRoleCreate = vi.fn();
const mockCustomRoleUpdate = vi.fn();
const mockCustomRoleDelete = vi.fn();

vi.mock('../../config/db.js', () => ({
  default: {
    projectPermission: {
      findMany: (...args: unknown[]) => mockPermFindMany(...args),
      findFirst: (...args: unknown[]) => mockPermFindFirst(...args),
      findUnique: (...args: unknown[]) => mockPermFindUnique(...args),
      create: (...args: unknown[]) => mockPermCreate(...args),
      update: (...args: unknown[]) => mockPermUpdate(...args),
      delete: (...args: unknown[]) => mockPermDelete(...args),
      count: (...args: unknown[]) => mockPermCount(...args),
    },
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    project: { findUnique: (...args: unknown[]) => mockProjectFindUnique(...args) },
    customRole: {
      findMany: (...args: unknown[]) => mockCustomRoleFindMany(...args),
      findFirst: (...args: unknown[]) => mockCustomRoleFindFirst(...args),
      findUnique: (...args: unknown[]) => mockCustomRoleFindUnique(...args),
      create: (...args: unknown[]) => mockCustomRoleCreate(...args),
      update: (...args: unknown[]) => mockCustomRoleUpdate(...args),
      delete: (...args: unknown[]) => mockCustomRoleDelete(...args),
    },
  },
}));

import { PermissionsService } from './permissions.service.js';
import { ApiError } from '../../utils/api-error.js';

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionsService();
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------
  describe('list', () => {
    it('should return permissions for a project', async () => {
      const projectId = 'proj-1';
      const mockPermissions = [
        {
          id: 'perm-1',
          projectId,
          userId: 'user-1',
          role: 'OWNER',
          customRoleId: null,
          user: { id: 'user-1', displayName: 'Alice', email: 'alice@test.com', systemRole: 'USER' },
          customRole: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'perm-2',
          projectId,
          userId: 'user-2',
          role: 'MEMBER',
          customRoleId: null,
          user: { id: 'user-2', displayName: 'Bob', email: 'bob@test.com', systemRole: 'USER' },
          customRole: null,
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPermFindMany.mockResolvedValue(mockPermissions);

      const result = await service.list(projectId);

      expect(result).toEqual(mockPermissions);
      expect(mockPermFindMany).toHaveBeenCalledWith({
        where: { projectId },
        include: {
          user: {
            select: { id: true, displayName: true, email: true, systemRole: true },
          },
          customRole: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return an empty array when project has no permissions', async () => {
      mockPermFindMany.mockResolvedValue([]);

      const result = await service.list('proj-empty');

      expect(result).toEqual([]);
    });

    it('should throw ApiError.badRequest when an unexpected error occurs', async () => {
      mockPermFindMany.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.list('proj-1')).rejects.toThrow(ApiError);
      await expect(service.list('proj-1')).rejects.toThrow('Failed to list permissions');
    });
  });

  // ---------------------------------------------------------------------------
  // invite
  // ---------------------------------------------------------------------------
  describe('invite', () => {
    const projectId = 'proj-1';
    const userId = 'user-1';
    const role = 'MEMBER';

    it('should invite a user with a standard role', async () => {
      const createdPermission = {
        id: 'perm-new',
        projectId,
        userId,
        role: 'MEMBER',
        customRoleId: null,
        user: { id: userId, displayName: 'Alice', email: 'alice@test.com' },
        customRole: null,
      };

      mockUserFindUnique.mockResolvedValue({ id: userId, displayName: 'Alice' });
      mockProjectFindUnique.mockResolvedValue({ id: projectId, name: 'Test Project' });
      mockPermFindFirst.mockResolvedValue(null);
      mockPermCreate.mockResolvedValue(createdPermission);

      const result = await service.invite(projectId, userId, role);

      expect(result).toEqual(createdPermission);
      expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockPermFindFirst).toHaveBeenCalledWith({ where: { projectId, userId } });
      expect(mockPermCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          userId,
          role: 'MEMBER',
          customRoleId: null,
        },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
          customRole: true,
        },
      });
    });

    it('should invite a user with a CUSTOM role and customRoleId', async () => {
      const customRoleId = 'cr-1';
      const createdPermission = {
        id: 'perm-new',
        projectId,
        userId,
        role: 'CUSTOM',
        customRoleId,
        user: { id: userId, displayName: 'Alice', email: 'alice@test.com' },
        customRole: { id: customRoleId, name: 'Reviewer' },
      };

      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockPermFindFirst.mockResolvedValue(null);
      mockCustomRoleFindFirst.mockResolvedValue({ id: customRoleId, projectId, name: 'Reviewer' });
      mockPermCreate.mockResolvedValue(createdPermission);

      const result = await service.invite(projectId, userId, 'CUSTOM', customRoleId);

      expect(result).toEqual(createdPermission);
      expect(mockCustomRoleFindFirst).toHaveBeenCalledWith({
        where: { id: customRoleId, projectId },
      });
      expect(mockPermCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'CUSTOM',
            customRoleId,
          }),
        }),
      );
    });

    it('should throw 404 when user is not found', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(service.invite(projectId, 'nonexistent', role)).rejects.toThrow(ApiError);
      await expect(service.invite(projectId, 'nonexistent', role)).rejects.toThrow('User not found');

      try {
        await service.invite(projectId, 'nonexistent', role);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should throw 404 when project is not found', async () => {
      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.invite('bad-proj', userId, role)).rejects.toThrow('Project not found');

      try {
        await service.invite('bad-proj', userId, role);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should throw 409 when user already has a permission in the project', async () => {
      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockPermFindFirst.mockResolvedValue({ id: 'existing-perm', projectId, userId });

      await expect(service.invite(projectId, userId, role)).rejects.toThrow(
        'User already has a permission in this project',
      );

      try {
        await service.invite(projectId, userId, role);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(409);
      }
    });

    it('should throw 400 when custom role is not found in the project', async () => {
      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockPermFindFirst.mockResolvedValue(null);
      mockCustomRoleFindFirst.mockResolvedValue(null);

      await expect(
        service.invite(projectId, userId, 'CUSTOM', 'invalid-cr-id'),
      ).rejects.toThrow('Custom role not found in this project');

      try {
        await service.invite(projectId, userId, 'CUSTOM', 'invalid-cr-id');
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('should set customRoleId to null for non-CUSTOM roles even when customRoleId is passed', async () => {
      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockPermFindFirst.mockResolvedValue(null);
      mockPermCreate.mockResolvedValue({
        id: 'perm-new',
        projectId,
        userId,
        role: 'MEMBER',
        customRoleId: null,
      });

      await service.invite(projectId, userId, 'MEMBER', 'cr-1');

      expect(mockPermCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'MEMBER',
            customRoleId: null,
          }),
        }),
      );
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.invite(projectId, userId, role)).rejects.toThrow('Failed to invite user');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    const permId = 'perm-1';
    const projectId = 'proj-1';

    it('should update a permission role', async () => {
      const existingPerm = { id: permId, projectId, userId: 'user-1', role: 'MEMBER', customRoleId: null };
      const updatedPerm = {
        ...existingPerm,
        role: 'ADMIN',
        user: { id: 'user-1', displayName: 'Alice', email: 'alice@test.com' },
        customRole: null,
      };

      mockPermFindUnique.mockResolvedValue(existingPerm);
      mockPermUpdate.mockResolvedValue(updatedPerm);

      const result = await service.update(permId, 'ADMIN');

      expect(result).toEqual(updatedPerm);
      expect(mockPermUpdate).toHaveBeenCalledWith({
        where: { id: permId },
        data: {
          role: 'ADMIN',
          customRoleId: null,
        },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
          customRole: true,
        },
      });
    });

    it('should update a permission to CUSTOM role with customRoleId', async () => {
      const existingPerm = { id: permId, projectId, userId: 'user-1', role: 'MEMBER', customRoleId: null };
      const customRoleId = 'cr-1';

      mockPermFindUnique.mockResolvedValue(existingPerm);
      mockCustomRoleFindFirst.mockResolvedValue({ id: customRoleId, projectId, name: 'Reviewer' });
      mockPermUpdate.mockResolvedValue({
        ...existingPerm,
        role: 'CUSTOM',
        customRoleId,
      });

      await service.update(permId, 'CUSTOM', customRoleId);

      expect(mockCustomRoleFindFirst).toHaveBeenCalledWith({
        where: { id: customRoleId, projectId },
      });
      expect(mockPermUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'CUSTOM',
            customRoleId,
          }),
        }),
      );
    });

    it('should update a permission with capabilities', async () => {
      const existingPerm = { id: permId, projectId, userId: 'user-1', role: 'MEMBER', customRoleId: null };
      const capabilities = ['read', 'write'];

      mockPermFindUnique.mockResolvedValue(existingPerm);
      mockPermUpdate.mockResolvedValue({ ...existingPerm, capabilities });

      await service.update(permId, 'MEMBER', undefined, capabilities);

      expect(mockPermUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'MEMBER',
            customRoleId: null,
            capabilities,
          }),
        }),
      );
    });

    it('should throw 404 when permission is not found', async () => {
      mockPermFindUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 'ADMIN')).rejects.toThrow('Permission not found');

      try {
        await service.update('nonexistent', 'ADMIN');
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should prevent demoting the last OWNER', async () => {
      const ownerPerm = { id: permId, projectId, userId: 'user-1', role: 'OWNER', customRoleId: null };

      mockPermFindUnique.mockResolvedValue(ownerPerm);
      mockPermCount.mockResolvedValue(1);

      await expect(service.update(permId, 'MEMBER')).rejects.toThrow(
        'Cannot change role: project must have at least one owner',
      );

      try {
        await service.update(permId, 'MEMBER');
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('should allow demoting an OWNER when there are multiple owners', async () => {
      const ownerPerm = { id: permId, projectId, userId: 'user-1', role: 'OWNER', customRoleId: null };

      mockPermFindUnique.mockResolvedValue(ownerPerm);
      mockPermCount.mockResolvedValue(2);
      mockPermUpdate.mockResolvedValue({ ...ownerPerm, role: 'MEMBER' });

      const result = await service.update(permId, 'MEMBER');

      expect(result.role).toBe('MEMBER');
      expect(mockPermCount).toHaveBeenCalledWith({
        where: { projectId, role: 'OWNER' },
      });
    });

    it('should not check owner count when OWNER stays OWNER', async () => {
      const ownerPerm = { id: permId, projectId, userId: 'user-1', role: 'OWNER', customRoleId: null };

      mockPermFindUnique.mockResolvedValue(ownerPerm);
      mockPermUpdate.mockResolvedValue(ownerPerm);

      await service.update(permId, 'OWNER');

      expect(mockPermCount).not.toHaveBeenCalled();
    });

    it('should throw 400 when custom role is not found in the project', async () => {
      const existingPerm = { id: permId, projectId, userId: 'user-1', role: 'MEMBER', customRoleId: null };

      mockPermFindUnique.mockResolvedValue(existingPerm);
      mockCustomRoleFindFirst.mockResolvedValue(null);

      await expect(service.update(permId, 'CUSTOM', 'bad-cr-id')).rejects.toThrow(
        'Custom role not found in this project',
      );
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockPermFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.update(permId, 'ADMIN')).rejects.toThrow('Failed to update permission');
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe('remove', () => {
    const permId = 'perm-1';
    const projectId = 'proj-1';

    it('should remove a permission successfully', async () => {
      const permission = { id: permId, projectId, userId: 'user-1', role: 'MEMBER' };

      mockPermFindUnique.mockResolvedValue(permission);
      mockPermDelete.mockResolvedValue(permission);

      const result = await service.remove(permId);

      expect(result).toEqual({ message: 'Permission removed successfully' });
      expect(mockPermDelete).toHaveBeenCalledWith({ where: { id: permId } });
    });

    it('should throw 404 when permission is not found', async () => {
      mockPermFindUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow('Permission not found');

      try {
        await service.remove('nonexistent');
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should prevent removing the last OWNER', async () => {
      const ownerPerm = { id: permId, projectId, userId: 'user-1', role: 'OWNER' };

      mockPermFindUnique.mockResolvedValue(ownerPerm);
      mockPermCount.mockResolvedValue(1);

      await expect(service.remove(permId)).rejects.toThrow(
        'Cannot remove the last owner from the project',
      );

      try {
        await service.remove(permId);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(400);
      }

      expect(mockPermDelete).not.toHaveBeenCalled();
    });

    it('should allow removing an OWNER when there are multiple owners', async () => {
      const ownerPerm = { id: permId, projectId, userId: 'user-1', role: 'OWNER' };

      mockPermFindUnique.mockResolvedValue(ownerPerm);
      mockPermCount.mockResolvedValue(2);
      mockPermDelete.mockResolvedValue(ownerPerm);

      const result = await service.remove(permId);

      expect(result).toEqual({ message: 'Permission removed successfully' });
      expect(mockPermDelete).toHaveBeenCalledWith({ where: { id: permId } });
    });

    it('should not check owner count for non-OWNER roles', async () => {
      const memberPerm = { id: permId, projectId, userId: 'user-1', role: 'MEMBER' };

      mockPermFindUnique.mockResolvedValue(memberPerm);
      mockPermDelete.mockResolvedValue(memberPerm);

      await service.remove(permId);

      expect(mockPermCount).not.toHaveBeenCalled();
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockPermFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(permId)).rejects.toThrow('Failed to remove permission');
    });
  });

  // ---------------------------------------------------------------------------
  // listCustomRoles
  // ---------------------------------------------------------------------------
  describe('listCustomRoles', () => {
    const projectId = 'proj-1';

    it('should return custom roles with permission counts', async () => {
      const mockRoles = [
        {
          id: 'cr-1',
          projectId,
          name: 'Designer',
          description: 'Design team role',
          capabilities: ['read', 'comment'],
          _count: { permissions: 3 },
        },
        {
          id: 'cr-2',
          projectId,
          name: 'Reviewer',
          description: null,
          capabilities: ['read'],
          _count: { permissions: 0 },
        },
      ];

      mockCustomRoleFindMany.mockResolvedValue(mockRoles);

      const result = await service.listCustomRoles(projectId);

      expect(result).toEqual(mockRoles);
      expect(mockCustomRoleFindMany).toHaveBeenCalledWith({
        where: { projectId },
        include: {
          _count: {
            select: { permissions: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return an empty array when no custom roles exist', async () => {
      mockCustomRoleFindMany.mockResolvedValue([]);

      const result = await service.listCustomRoles(projectId);

      expect(result).toEqual([]);
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockCustomRoleFindMany.mockRejectedValue(new Error('DB error'));

      await expect(service.listCustomRoles(projectId)).rejects.toThrow('Failed to list custom roles');
    });
  });

  // ---------------------------------------------------------------------------
  // createCustomRole
  // ---------------------------------------------------------------------------
  describe('createCustomRole', () => {
    const projectId = 'proj-1';
    const roleData = { name: 'Reviewer', description: 'Code reviewer', capabilities: ['read', 'comment'] };

    it('should create a custom role successfully', async () => {
      const createdRole = {
        id: 'cr-new',
        projectId,
        name: roleData.name,
        description: roleData.description,
        capabilities: roleData.capabilities,
      };

      mockProjectFindUnique.mockResolvedValue({ id: projectId, name: 'Test Project' });
      mockCustomRoleFindFirst.mockResolvedValue(null);
      mockCustomRoleCreate.mockResolvedValue(createdRole);

      const result = await service.createCustomRole(projectId, roleData);

      expect(result).toEqual(createdRole);
      expect(mockProjectFindUnique).toHaveBeenCalledWith({ where: { id: projectId } });
      expect(mockCustomRoleFindFirst).toHaveBeenCalledWith({
        where: { projectId, name: roleData.name },
      });
      expect(mockCustomRoleCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: roleData.name,
          description: roleData.description,
          capabilities: roleData.capabilities,
        },
      });
    });

    it('should create a custom role with null description when not provided', async () => {
      const dataNoDesc = { name: 'Tester', capabilities: ['read'] };

      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockCustomRoleFindFirst.mockResolvedValue(null);
      mockCustomRoleCreate.mockResolvedValue({
        id: 'cr-new',
        projectId,
        name: 'Tester',
        description: null,
        capabilities: ['read'],
      });

      await service.createCustomRole(projectId, dataNoDesc);

      expect(mockCustomRoleCreate).toHaveBeenCalledWith({
        data: {
          projectId,
          name: 'Tester',
          description: null,
          capabilities: ['read'],
        },
      });
    });

    it('should throw 404 when project is not found', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(service.createCustomRole('bad-proj', roleData)).rejects.toThrow('Project not found');

      try {
        await service.createCustomRole('bad-proj', roleData);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should throw 409 when custom role name already exists in the project', async () => {
      mockProjectFindUnique.mockResolvedValue({ id: projectId });
      mockCustomRoleFindFirst.mockResolvedValue({ id: 'cr-existing', projectId, name: roleData.name });

      await expect(service.createCustomRole(projectId, roleData)).rejects.toThrow(
        `Custom role "${roleData.name}" already exists in this project`,
      );

      try {
        await service.createCustomRole(projectId, roleData);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(409);
      }
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockProjectFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.createCustomRole(projectId, roleData)).rejects.toThrow(
        'Failed to create custom role',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateCustomRole
  // ---------------------------------------------------------------------------
  describe('updateCustomRole', () => {
    const roleId = 'cr-1';
    const projectId = 'proj-1';

    it('should update a custom role name, description, and capabilities', async () => {
      const existingRole = { id: roleId, projectId, name: 'Reviewer', description: 'Old desc', capabilities: ['read'] };
      const updateData = { name: 'Senior Reviewer', description: 'Updated desc', capabilities: ['read', 'write'] };
      const updatedRole = { ...existingRole, ...updateData };

      mockCustomRoleFindUnique.mockResolvedValue(existingRole);
      mockCustomRoleFindFirst.mockResolvedValue(null); // no duplicate
      mockCustomRoleUpdate.mockResolvedValue(updatedRole);

      const result = await service.updateCustomRole(roleId, updateData);

      expect(result).toEqual(updatedRole);
      expect(mockCustomRoleFindFirst).toHaveBeenCalledWith({
        where: {
          projectId,
          name: 'Senior Reviewer',
          id: { not: roleId },
        },
      });
      expect(mockCustomRoleUpdate).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          name: 'Senior Reviewer',
          description: 'Updated desc',
          capabilities: ['read', 'write'],
        },
      });
    });

    it('should skip duplicate name check when the name is unchanged', async () => {
      const existingRole = { id: roleId, projectId, name: 'Reviewer', description: 'desc', capabilities: ['read'] };
      const updateData = { name: 'Reviewer', description: 'New description' };

      mockCustomRoleFindUnique.mockResolvedValue(existingRole);
      mockCustomRoleUpdate.mockResolvedValue({ ...existingRole, ...updateData });

      await service.updateCustomRole(roleId, updateData);

      // The duplicate check findFirst should NOT be called since name is the same
      expect(mockCustomRoleFindFirst).not.toHaveBeenCalled();
    });

    it('should skip duplicate name check when name is not provided', async () => {
      const existingRole = { id: roleId, projectId, name: 'Reviewer', description: 'desc', capabilities: ['read'] };
      const updateData = { description: 'Updated description' };

      mockCustomRoleFindUnique.mockResolvedValue(existingRole);
      mockCustomRoleUpdate.mockResolvedValue({ ...existingRole, ...updateData });

      await service.updateCustomRole(roleId, updateData);

      expect(mockCustomRoleFindFirst).not.toHaveBeenCalled();
    });

    it('should throw 404 when custom role is not found', async () => {
      mockCustomRoleFindUnique.mockResolvedValue(null);

      await expect(service.updateCustomRole('nonexistent', { name: 'Test' })).rejects.toThrow(
        'Custom role not found',
      );

      try {
        await service.updateCustomRole('nonexistent', { name: 'Test' });
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should throw 409 when renaming to an existing name in the same project', async () => {
      const existingRole = { id: roleId, projectId, name: 'Reviewer', description: null, capabilities: [] };

      mockCustomRoleFindUnique.mockResolvedValue(existingRole);
      mockCustomRoleFindFirst.mockResolvedValue({ id: 'cr-other', projectId, name: 'Designer' });

      await expect(
        service.updateCustomRole(roleId, { name: 'Designer' }),
      ).rejects.toThrow('Custom role "Designer" already exists in this project');

      try {
        await service.updateCustomRole(roleId, { name: 'Designer' });
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(409);
      }
    });

    it('should only include provided fields in the update data', async () => {
      const existingRole = { id: roleId, projectId, name: 'Reviewer', description: 'desc', capabilities: ['read'] };

      mockCustomRoleFindUnique.mockResolvedValue(existingRole);
      mockCustomRoleUpdate.mockResolvedValue({ ...existingRole, capabilities: ['read', 'write'] });

      await service.updateCustomRole(roleId, { capabilities: ['read', 'write'] });

      expect(mockCustomRoleUpdate).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          capabilities: ['read', 'write'],
        },
      });
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockCustomRoleFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.updateCustomRole(roleId, { name: 'Test' })).rejects.toThrow(
        'Failed to update custom role',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deleteCustomRole
  // ---------------------------------------------------------------------------
  describe('deleteCustomRole', () => {
    const roleId = 'cr-1';
    const projectId = 'proj-1';

    it('should delete a custom role that is not in use', async () => {
      const role = {
        id: roleId,
        projectId,
        name: 'Reviewer',
        _count: { permissions: 0 },
      };

      mockCustomRoleFindUnique.mockResolvedValue(role);
      mockCustomRoleDelete.mockResolvedValue(role);

      const result = await service.deleteCustomRole(roleId);

      expect(result).toEqual({ message: 'Custom role deleted successfully' });
      expect(mockCustomRoleFindUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        include: {
          _count: {
            select: { permissions: true },
          },
        },
      });
      expect(mockCustomRoleDelete).toHaveBeenCalledWith({ where: { id: roleId } });
    });

    it('should throw 404 when custom role is not found', async () => {
      mockCustomRoleFindUnique.mockResolvedValue(null);

      await expect(service.deleteCustomRole('nonexistent')).rejects.toThrow('Custom role not found');

      try {
        await service.deleteCustomRole('nonexistent');
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(404);
      }
    });

    it('should prevent deleting a custom role that is in use', async () => {
      const role = {
        id: roleId,
        projectId,
        name: 'Designer',
        _count: { permissions: 3 },
      };

      mockCustomRoleFindUnique.mockResolvedValue(role);

      await expect(service.deleteCustomRole(roleId)).rejects.toThrow(
        'Cannot delete custom role "Designer" because 3 permission(s) are using it. Update those permissions first.',
      );

      try {
        await service.deleteCustomRole(roleId);
      } catch (error) {
        expect((error as ApiError).statusCode).toBe(400);
      }

      expect(mockCustomRoleDelete).not.toHaveBeenCalled();
    });

    it('should prevent deleting a custom role with exactly 1 permission using it', async () => {
      const role = {
        id: roleId,
        projectId,
        name: 'Tester',
        _count: { permissions: 1 },
      };

      mockCustomRoleFindUnique.mockResolvedValue(role);

      await expect(service.deleteCustomRole(roleId)).rejects.toThrow(
        'Cannot delete custom role "Tester" because 1 permission(s) are using it. Update those permissions first.',
      );

      expect(mockCustomRoleDelete).not.toHaveBeenCalled();
    });

    it('should throw ApiError.badRequest on unexpected errors', async () => {
      mockCustomRoleFindUnique.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteCustomRole(roleId)).rejects.toThrow('Failed to delete custom role');
    });
  });
});
