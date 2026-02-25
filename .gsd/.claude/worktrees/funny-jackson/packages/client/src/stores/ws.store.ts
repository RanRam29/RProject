import { create } from 'zustand';
import type { UserPresenceDTO } from '@pm/shared';

interface WSState {
  isConnected: boolean;
  onlineUsers: UserPresenceDTO[];
  setConnected: (connected: boolean) => void;
  setOnlineUsers: (users: UserPresenceDTO[]) => void;
  addOnlineUser: (user: UserPresenceDTO) => void;
  removeOnlineUser: (userId: string) => void;
}

export const useWSStore = create<WSState>((set) => ({
  isConnected: false,
  onlineUsers: [],

  setConnected: (isConnected) => set({ isConnected }),

  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.some((u) => u.id === user.id)
        ? state.onlineUsers
        : [...state.onlineUsers, user],
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    })),
}));
