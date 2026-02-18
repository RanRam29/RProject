import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '../config/env';
import { useAuthStore } from '../stores/auth.store';
import { useWSStore } from '../stores/ws.store';
import type { ServerToClientEvents, ClientToServerEvents } from '@pm/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setConnected = useWSStore((s) => s.setConnected);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((prev) => {
        if (prev) {
          prev.disconnect();
          setConnected(false);
        }
        return null;
      });
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const s = io(env.WS_URL, {
      path: '/ws',
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    }) as TypedSocket;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, setConnected]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
