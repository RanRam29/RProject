import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext';
import { useWSStore } from '../stores/ws.store';

export function useProjectSocket(projectId: string | null) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { addOnlineUser, removeOnlineUser } = useWSStore();

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('project:join', projectId);

    const handleTaskCreated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleTaskUpdated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleTaskDeleted = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleTaskStatusChanged = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleTaskReordered = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleStatusCreated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      }
    };

    const handleStatusUpdated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      }
    };

    const handleStatusDeleted = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      }
    };

    const handleWidgetAdded = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['widgets', projectId] });
      }
    };

    const handleWidgetRemoved = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['widgets', projectId] });
      }
    };

    const handleFileUploaded = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      }
    };

    const handleFileDeleted = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      }
    };

    const handleUserJoined = (data: { projectId: string; user: { id: string; displayName: string; avatarUrl: string | null } }) => {
      if (data.projectId === projectId) addOnlineUser(data.user);
    };

    const handleUserLeft = (data: { projectId: string; userId: string }) => {
      if (data.projectId === projectId) removeOnlineUser(data.userId);
    };

    const handleSubtaskCreated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleSubtaskUpdated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleSubtaskDeleted = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleDependencyAdded = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleDependencyRemoved = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleLabelCreated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      }
    };

    const handleLabelUpdated = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleLabelDeleted = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleLabelAssigned = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleLabelUnassigned = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleCommentCreated = (data: { projectId: string; taskId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['comments', data.taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    const handleCommentUpdated = (data: { projectId: string; taskId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['comments', data.taskId] });
      }
    };

    const handleCommentDeleted = (data: { projectId: string; taskId: string }) => {
      if (data.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['comments', data.taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:statusChanged', handleTaskStatusChanged);
    socket.on('task:reordered', handleTaskReordered);
    socket.on('status:created', handleStatusCreated);
    socket.on('status:updated', handleStatusUpdated);
    socket.on('status:deleted', handleStatusDeleted);
    socket.on('project:widgetAdded', handleWidgetAdded);
    socket.on('project:widgetRemoved', handleWidgetRemoved);
    socket.on('file:uploaded', handleFileUploaded);
    socket.on('file:deleted', handleFileDeleted);
    socket.on('presence:userJoined', handleUserJoined);
    socket.on('presence:userLeft', handleUserLeft);
    socket.on('subtask:created', handleSubtaskCreated);
    socket.on('subtask:updated', handleSubtaskUpdated);
    socket.on('subtask:deleted', handleSubtaskDeleted);
    socket.on('dependency:added', handleDependencyAdded);
    socket.on('dependency:removed', handleDependencyRemoved);
    socket.on('label:created', handleLabelCreated);
    socket.on('label:updated', handleLabelUpdated);
    socket.on('label:deleted', handleLabelDeleted);
    socket.on('label:assigned', handleLabelAssigned);
    socket.on('label:unassigned', handleLabelUnassigned);
    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.emit('project:leave', projectId);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:statusChanged', handleTaskStatusChanged);
      socket.off('task:reordered', handleTaskReordered);
      socket.off('status:created', handleStatusCreated);
      socket.off('status:updated', handleStatusUpdated);
      socket.off('status:deleted', handleStatusDeleted);
      socket.off('project:widgetAdded', handleWidgetAdded);
      socket.off('project:widgetRemoved', handleWidgetRemoved);
      socket.off('file:uploaded', handleFileUploaded);
      socket.off('file:deleted', handleFileDeleted);
      socket.off('presence:userJoined', handleUserJoined);
      socket.off('presence:userLeft', handleUserLeft);
      socket.off('subtask:created', handleSubtaskCreated);
      socket.off('subtask:updated', handleSubtaskUpdated);
      socket.off('subtask:deleted', handleSubtaskDeleted);
      socket.off('dependency:added', handleDependencyAdded);
      socket.off('dependency:removed', handleDependencyRemoved);
      socket.off('label:created', handleLabelCreated);
      socket.off('label:updated', handleLabelUpdated);
      socket.off('label:deleted', handleLabelDeleted);
      socket.off('label:assigned', handleLabelAssigned);
      socket.off('label:unassigned', handleLabelUnassigned);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [socket, projectId, queryClient, addOnlineUser, removeOnlineUser]);
}
