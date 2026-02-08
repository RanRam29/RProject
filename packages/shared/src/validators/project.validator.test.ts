import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  addWidgetSchema,
} from './project.validator.js';

describe('Project Validators', () => {
  describe('createProjectSchema', () => {
    it('accepts valid project', () => {
      const result = createProjectSchema.safeParse({ name: 'My Project' });
      expect(result.success).toBe(true);
    });

    it('accepts project with description', () => {
      const result = createProjectSchema.safeParse({
        name: 'My Project',
        description: 'A description',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createProjectSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects name over 200 chars', () => {
      const result = createProjectSchema.safeParse({ name: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('rejects description over 2000 chars', () => {
      const result = createProjectSchema.safeParse({
        name: 'Valid',
        description: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProjectSchema', () => {
    it('accepts partial update', () => {
      const result = updateProjectSchema.safeParse({ name: 'Updated' });
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = updateProjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('updateProjectStatusSchema', () => {
    it('accepts valid statuses', () => {
      for (const status of ['ACTIVE', 'ARCHIVED', 'COMPLETED']) {
        const result = updateProjectStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid status', () => {
      const result = updateProjectStatusSchema.safeParse({ status: 'DELETED' });
      expect(result.success).toBe(false);
    });
  });

  describe('addWidgetSchema', () => {
    it('accepts valid widget with defaults', () => {
      const result = addWidgetSchema.parse({
        type: 'TASK_LIST',
        title: 'My Tasks',
      });
      expect(result.positionX).toBe(0);
      expect(result.positionY).toBe(0);
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });

    it('accepts all widget types', () => {
      const types = ['TASK_LIST', 'KANBAN', 'TIMELINE', 'FILES', 'AI_ASSISTANT', 'DEPENDENCY_GRAPH', 'ACTIVITY_FEED'];
      for (const type of types) {
        const result = addWidgetSchema.safeParse({ type, title: 'Widget' });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid widget type', () => {
      const result = addWidgetSchema.safeParse({ type: 'CHART', title: 'Bad' });
      expect(result.success).toBe(false);
    });

    it('rejects dimensions below minimum', () => {
      const result = addWidgetSchema.safeParse({
        type: 'TASK_LIST',
        title: 'Widget',
        width: 50,
        height: 50,
      });
      expect(result.success).toBe(false);
    });
  });
});
