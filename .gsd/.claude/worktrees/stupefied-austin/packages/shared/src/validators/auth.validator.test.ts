import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './auth.validator.js';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@ssword1',
        displayName: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'P@ssword1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '1234567',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'p@ssword1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without lowercase', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@SSWORD1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@ssword!',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without special character', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password over 128 chars', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@1' + 'a'.repeat(126),
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty display name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@ssword1',
        displayName: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects display name over 100 chars', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@ssword1',
        displayName: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'any',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'bad',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('accepts valid refresh token', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token' });
      expect(result.success).toBe(true);
    });

    it('rejects empty refresh token', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('accepts valid user with optional role', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'L0ng@Pass',
        displayName: 'Test User',
        systemRole: 'SYS_ADMIN',
      });
      expect(result.success).toBe(true);
    });

    it('accepts user without role', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'L0ng@Pass',
        displayName: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid system role', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'L0ng@Pass',
        displayName: 'Test User',
        systemRole: 'INVALID_ROLE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts partial update', () => {
      const result = updateUserSchema.safeParse({ displayName: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('accepts valid avatar URL', () => {
      const result = updateUserSchema.safeParse({
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null avatar URL', () => {
      const result = updateUserSchema.safeParse({ avatarUrl: null });
      expect(result.success).toBe(true);
    });

    it('rejects invalid avatar URL', () => {
      const result = updateUserSchema.safeParse({ avatarUrl: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: 'N3w@pass!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'old',
        newPassword: '1234567',
      });
      expect(result.success).toBe(false);
    });
  });
});
