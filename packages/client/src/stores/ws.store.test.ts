import { describe, it, expect, beforeEach } from 'vitest';
import { useWSStore } from './ws.store';

const mockUser1 = { id: 'user-1', displayName: 'Alice', avatarUrl: null };
const mockUser2 = { id: 'user-2', displayName: 'Bob', avatarUrl: null };

describe('useWSStore', () => {
  beforeEach(() => {
    useWSStore.setState({
      isConnected: false,
      onlineUsers: [],
    });
  });

  describe('connection', () => {
    it('starts disconnected', () => {
      expect(useWSStore.getState().isConnected).toBe(false);
    });

    it('setConnected updates connection state', () => {
      useWSStore.getState().setConnected(true);
      expect(useWSStore.getState().isConnected).toBe(true);
    });

    it('setConnected can disconnect', () => {
      useWSStore.getState().setConnected(true);
      useWSStore.getState().setConnected(false);
      expect(useWSStore.getState().isConnected).toBe(false);
    });
  });

  describe('online users', () => {
    it('starts with empty online users', () => {
      expect(useWSStore.getState().onlineUsers).toHaveLength(0);
    });

    it('setOnlineUsers replaces entire list', () => {
      useWSStore.getState().setOnlineUsers([mockUser1, mockUser2]);
      expect(useWSStore.getState().onlineUsers).toHaveLength(2);
    });

    it('addOnlineUser adds a user', () => {
      useWSStore.getState().addOnlineUser(mockUser1);
      expect(useWSStore.getState().onlineUsers).toHaveLength(1);
      expect(useWSStore.getState().onlineUsers[0].id).toBe('user-1');
    });

    it('addOnlineUser does not duplicate existing user', () => {
      useWSStore.getState().addOnlineUser(mockUser1);
      useWSStore.getState().addOnlineUser(mockUser1);
      expect(useWSStore.getState().onlineUsers).toHaveLength(1);
    });

    it('addOnlineUser adds different users', () => {
      useWSStore.getState().addOnlineUser(mockUser1);
      useWSStore.getState().addOnlineUser(mockUser2);
      expect(useWSStore.getState().onlineUsers).toHaveLength(2);
    });

    it('removeOnlineUser removes by ID', () => {
      useWSStore.getState().setOnlineUsers([mockUser1, mockUser2]);
      useWSStore.getState().removeOnlineUser('user-1');
      expect(useWSStore.getState().onlineUsers).toHaveLength(1);
      expect(useWSStore.getState().onlineUsers[0].id).toBe('user-2');
    });

    it('removeOnlineUser does nothing for non-existent user', () => {
      useWSStore.getState().setOnlineUsers([mockUser1]);
      useWSStore.getState().removeOnlineUser('user-999');
      expect(useWSStore.getState().onlineUsers).toHaveLength(1);
    });
  });
});
