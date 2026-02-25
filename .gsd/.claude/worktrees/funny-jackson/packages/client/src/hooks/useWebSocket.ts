import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext';
import { useWSStore } from '../stores/ws.store';

// ── Event → query key invalidation map ──────────────
// Each entry maps a socket event to the query keys that should be
// invalidated when that event fires. Keys are resolved relative to
// the current projectId. The special token '{taskId}' is replaced
// with `data.taskId` at runtime (used by comment events).

type QueryKeyTemplate = (string | '{taskId}')[];

const EVENT_INVALIDATION_MAP: Record<string, QueryKeyTemplate[]> = {
  // Tasks
  'task:created':       [['tasks']],
  'task:updated':       [['tasks']],
  'task:deleted':       [['tasks']],
  'task:statusChanged': [['tasks']],
  'task:reordered':     [['tasks']],
  // Subtasks & dependencies → refresh tasks
  'subtask:created':    [['tasks']],
  'subtask:updated':    [['tasks']],
  'subtask:deleted':    [['tasks']],
  'dependency:added':   [['tasks']],
  'dependency:removed': [['tasks']],
  // Statuses
  'status:created':     [['statuses']],
  'status:updated':     [['statuses']],
  'status:deleted':     [['statuses']],
  // Widgets
  'project:widgetAdded':   [['widgets']],
  'project:widgetRemoved': [['widgets']],
  // Files
  'file:uploaded':      [['files']],
  'file:deleted':       [['files']],
  // Labels (also refresh tasks since label changes affect task display)
  'label:created':      [['labels']],
  'label:updated':      [['labels'], ['tasks']],
  'label:deleted':      [['labels'], ['tasks']],
  'label:assigned':     [['tasks']],
  'label:unassigned':   [['tasks']],
  // Comments (use taskId for comment-specific invalidation)
  'comment:created':    [['comments', '{taskId}'], ['tasks']],
  'comment:updated':    [['comments', '{taskId}']],
  'comment:deleted':    [['comments', '{taskId}'], ['tasks']],
};

export function useProjectSocket(projectId: string | null) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { addOnlineUser, removeOnlineUser } = useWSStore();

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('project:join', projectId);

    // ── Generic invalidation handlers ─────────
    const handlers: [string, (data: Record<string, unknown>) => void][] = [];

    for (const [event, keyTemplates] of Object.entries(EVENT_INVALIDATION_MAP)) {
      const handler = (data: Record<string, unknown>) => {
        if (data.projectId !== projectId) return;
        for (const template of keyTemplates) {
          const key = template.map((segment) =>
            segment === '{taskId}' ? (data.taskId as string) : segment,
          );
          // comments use [comments, taskId]; all others use [entity, projectId]
          const queryKey = key[0] === 'comments'
            ? key
            : [key[0], projectId];
          queryClient.invalidateQueries({ queryKey });
        }
      };
      socket.on(event as Parameters<typeof socket.on>[0], handler);
      handlers.push([event, handler]);
    }

    // ── Presence handlers (unique logic) ──────
    const handleUserJoined = (data: { projectId: string; user: { id: string; displayName: string; avatarUrl: string | null } }) => {
      if (data.projectId === projectId) addOnlineUser(data.user);
    };

    const handleUserLeft = (data: { projectId: string; userId: string }) => {
      if (data.projectId === projectId) removeOnlineUser(data.userId);
    };

    socket.on('presence:userJoined', handleUserJoined);
    socket.on('presence:userLeft', handleUserLeft);

    return () => {
      socket.emit('project:leave', projectId);
      for (const [event, handler] of handlers) {
        socket.off(event as Parameters<typeof socket.off>[0], handler);
      }
      socket.off('presence:userJoined', handleUserJoined);
      socket.off('presence:userLeft', handleUserLeft);
    };
  }, [socket, projectId, queryClient, addOnlineUser, removeOnlineUser]);
}
