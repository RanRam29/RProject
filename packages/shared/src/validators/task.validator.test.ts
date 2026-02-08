import { describe, it, expect } from 'vitest';
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, createTaskStatusSchema } from './task.validator.js';

describe('Task Validators', () => {
  describe('createTaskSchema', () => {
    it('accepts valid task', () => {
      const result = createTaskSchema.safeParse({
        title: 'My Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('sets default priority to NONE', () => {
      const result = createTaskSchema.parse({
        title: 'My Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.priority).toBe('NONE');
    });

    it('rejects empty title', () => {
      const result = createTaskSchema.safeParse({
        title: '',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('rejects title over 500 chars', () => {
      const result = createTaskSchema.safeParse({
        title: 'a'.repeat(501),
        statusId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid statusId', () => {
      const result = createTaskSchema.safeParse({
        title: 'My Task',
        statusId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid date strings', () => {
      const result = createTaskSchema.safeParse({
        title: 'My Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: '2025-01-15',
        dueDate: '2025-01-15T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date strings', () => {
      const result = createTaskSchema.safeParse({
        title: 'My Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        dueDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all priority levels', () => {
      for (const priority of ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']) {
        const result = createTaskSchema.safeParse({
          title: 'Task',
          statusId: '550e8400-e29b-41d4-a716-446655440000',
          priority,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('description size limit', () => {
    it('accepts null description', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        description: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts small description', () => {
      const result = createTaskSchema.safeParse({
        title: 'Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        description: { type: 'doc', content: [{ type: 'paragraph', text: 'Hello' }] },
      });
      expect(result.success).toBe(true);
    });

    it('rejects description over 100KB', () => {
      const largeContent = 'x'.repeat(100_001);
      const result = createTaskSchema.safeParse({
        title: 'Task',
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        description: largeContent,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTaskSchema', () => {
    it('accepts partial update', () => {
      const result = updateTaskSchema.safeParse({ title: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts nullable assigneeId', () => {
      const result = updateTaskSchema.safeParse({ assigneeId: null });
      expect(result.success).toBe(true);
    });
  });

  describe('updateTaskStatusSchema', () => {
    it('accepts valid status update', () => {
      const result = updateTaskStatusSchema.safeParse({
        statusId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('accepts status with sortOrder', () => {
      const result = updateTaskStatusSchema.safeParse({
        statusId: '550e8400-e29b-41d4-a716-446655440000',
        sortOrder: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createTaskStatusSchema', () => {
    it('accepts valid status', () => {
      const result = createTaskStatusSchema.parse({
        name: 'In Progress',
      });
      expect(result.color).toBe('#6B7280');
      expect(result.isFinal).toBe(false);
    });

    it('accepts custom color', () => {
      const result = createTaskStatusSchema.safeParse({
        name: 'Done',
        color: '#10B981',
        isFinal: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid hex color', () => {
      const result = createTaskStatusSchema.safeParse({
        name: 'Bad',
        color: 'red',
      });
      expect(result.success).toBe(false);
    });
  });
});
