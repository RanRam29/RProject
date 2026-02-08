import { describe, it, expect } from 'vitest';
import { CAPABILITIES, ROLE_CAPABILITIES } from './permissions.js';

describe('Permissions', () => {
  describe('CAPABILITIES', () => {
    it('defines all expected capabilities', () => {
      expect(CAPABILITIES.TASK_CREATE).toBe('task.create');
      expect(CAPABILITIES.TASK_DELETE).toBe('task.delete');
      expect(CAPABILITIES.FILE_UPLOAD).toBe('file.upload');
      expect(CAPABILITIES.MEMBERS_MANAGE).toBe('members.manage');
      expect(CAPABILITIES.PROJECT_DELETE).toBe('project.delete');
    });
  });

  describe('ROLE_CAPABILITIES', () => {
    it('OWNER has all capabilities', () => {
      const ownerCaps = ROLE_CAPABILITIES.OWNER;
      for (const cap of Object.values(CAPABILITIES)) {
        expect(ownerCaps[cap]).toBe(true);
      }
    });

    it('VIEWER has no capabilities', () => {
      const viewerCaps = ROLE_CAPABILITIES.VIEWER;
      for (const cap of Object.values(CAPABILITIES)) {
        expect(viewerCaps[cap]).toBe(false);
      }
    });

    it('EDITOR can create and edit tasks', () => {
      const editorCaps = ROLE_CAPABILITIES.EDITOR;
      expect(editorCaps[CAPABILITIES.TASK_CREATE]).toBe(true);
      expect(editorCaps[CAPABILITIES.TASK_EDIT_ANY]).toBe(true);
      expect(editorCaps[CAPABILITIES.TASK_DELETE]).toBe(true);
    });

    it('EDITOR cannot manage members or project settings', () => {
      const editorCaps = ROLE_CAPABILITIES.EDITOR;
      expect(editorCaps[CAPABILITIES.MEMBERS_MANAGE]).toBe(false);
      expect(editorCaps[CAPABILITIES.PROJECT_DELETE]).toBe(false);
      expect(editorCaps[CAPABILITIES.PROJECT_SETTINGS]).toBe(false);
    });
  });
});
