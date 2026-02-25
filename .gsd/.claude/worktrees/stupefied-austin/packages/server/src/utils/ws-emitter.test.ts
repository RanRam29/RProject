import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEmit = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit }));
const mockGetIO = vi.fn(() => ({ to: mockTo }));

vi.mock('../ws/ws.server.js', () => ({
  getIO: () => mockGetIO(),
}));

vi.mock('./logger.js', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { emitToProject, emitToUser } from './ws-emitter.js';
import logger from './logger.js';

describe('ws-emitter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitToProject', () => {
    it('emits event to project room', () => {
      emitToProject('proj-1', 'task:created', { taskId: 't-1' });

      expect(mockTo).toHaveBeenCalledWith('proj-1');
      expect(mockEmit).toHaveBeenCalledWith('task:created', { taskId: 't-1' });
    });

    it('logs warning instead of throwing when socket not initialized', () => {
      mockGetIO.mockImplementationOnce(() => { throw new Error('Socket.IO not initialized'); });

      // Should not throw
      emitToProject('proj-1', 'task:created', {});

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to emit "task:created"'),
      );
    });
  });

  describe('emitToUser', () => {
    it('emits event to user-scoped room', () => {
      emitToUser('user-42', 'notification:new', { id: 'n-1' });

      expect(mockTo).toHaveBeenCalledWith('user:user-42');
      expect(mockEmit).toHaveBeenCalledWith('notification:new', { id: 'n-1' });
    });

    it('logs warning instead of throwing when socket not initialized', () => {
      mockGetIO.mockImplementationOnce(() => { throw new Error('Socket.IO not initialized'); });

      emitToUser('user-42', 'notification:new', {});

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to emit "notification:new"'),
      );
    });
  });
});
