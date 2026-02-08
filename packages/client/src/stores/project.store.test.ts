import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './project.store';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({ activeProjectId: null });
  });

  it('starts with null activeProjectId', () => {
    expect(useProjectStore.getState().activeProjectId).toBeNull();
  });

  it('setActiveProjectId sets the project ID', () => {
    useProjectStore.getState().setActiveProjectId('proj-123');
    expect(useProjectStore.getState().activeProjectId).toBe('proj-123');
  });

  it('setActiveProjectId can clear to null', () => {
    useProjectStore.getState().setActiveProjectId('proj-123');
    useProjectStore.getState().setActiveProjectId(null);
    expect(useProjectStore.getState().activeProjectId).toBeNull();
  });

  it('setActiveProjectId replaces previous value', () => {
    useProjectStore.getState().setActiveProjectId('proj-1');
    useProjectStore.getState().setActiveProjectId('proj-2');
    expect(useProjectStore.getState().activeProjectId).toBe('proj-2');
  });
});
