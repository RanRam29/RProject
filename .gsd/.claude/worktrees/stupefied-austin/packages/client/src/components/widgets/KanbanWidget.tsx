import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { permissionsApi } from '../../api/permissions.api';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { BulkActionToolbar } from '../kanban/BulkActionToolbar';
import { TaskDetailModal } from '../task/TaskDetailModal';
import { FilterBar } from '../filter/FilterBar';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useUIStore } from '../../stores/ui.store';
import type { WidgetProps } from './widget.types';
import type { TaskDTO } from '@pm/shared';

export function KanbanWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [createStatusId, setCreateStatusId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
    staleTime: 60_000,
  });

  const members = permissions.map((p) => ({
    id: p.userId,
    displayName: p.user?.displayName || p.user?.email || 'Unknown',
  }));

  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } = useTaskFilters(tasks);

  const moveTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      statusId,
      sortOrder,
    }: {
      taskId: string;
      statusId: string;
      sortOrder: number;
    }) => tasksApi.updateTaskStatus(projectId, taskId, statusId, sortOrder),

    onMutate: async ({ taskId, statusId, sortOrder }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

      const previousTasks = queryClient.getQueryData<TaskDTO[]>(['tasks', projectId]);

      queryClient.setQueryData<TaskDTO[]>(['tasks', projectId], (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, statusId, sortOrder } : t
        ) || []
      );

      return { previousTasks };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks);
      }
      addToast({ type: 'error', message: 'Failed to move task. Changes reverted.' });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (data: {
      taskIds: string[];
      operation: 'move' | 'assign' | 'delete' | 'setPriority';
      statusId?: string;
      assigneeId?: string | null;
      priority?: string;
    }) => tasksApi.bulkOperation(projectId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedTaskIds(new Set());
      setSelectionMode(false);
      addToast({ type: 'success', message: `Bulk ${result.operation}: ${result.count} task(s) updated` });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Bulk operation failed' });
    },
  });

  const handleTaskStatusChange = useCallback(
    (taskId: string, newStatusId: string, sortOrder: number) => {
      moveTaskMutation.mutate({ taskId, statusId: newStatusId, sortOrder });
    },
    [moveTaskMutation]
  );

  const handleTaskClick = useCallback((task: TaskDTO) => {
    if (selectionMode) return;
    setSelectedTask(task);
  }, [selectionMode]);

  const handleAddTask = useCallback(
    (statusId: string) => {
      setCreateStatusId(statusId);
    },
    []
  );

  const handleTaskSelectionChange = useCallback((taskId: string, isSelected: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleBulkMove = useCallback((statusId: string) => {
    bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'move', statusId });
  }, [selectedTaskIds, bulkMutation]);

  const handleBulkAssign = useCallback((assigneeId: string | null) => {
    bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'assign', assigneeId });
  }, [selectedTaskIds, bulkMutation]);

  const handleBulkSetPriority = useCallback((priority: string) => {
    bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'setPriority', priority });
  }, [selectedTaskIds, bulkMutation]);

  const handleBulkDelete = useCallback(() => {
    bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'delete' });
  }, [selectedTaskIds, bulkMutation]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <FilterBar
            projectId={projectId}
            filters={filters}
            activeCount={activeCount}
            onFilterChange={updateFilter}
            onClear={clearFilters}
          />
        </div>
        <button
          onClick={() => {
            if (selectionMode) {
              handleClearSelection();
            } else {
              setSelectionMode(true);
            }
          }}
          style={{
            background: selectionMode ? 'var(--color-accent)' : 'none',
            border: selectionMode ? 'none' : '1px solid var(--color-border)',
            color: selectionMode ? '#fff' : 'var(--color-text-secondary)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={selectionMode ? 'Exit selection mode' : 'Enter selection mode for bulk operations'}
        >
          {selectionMode ? 'Exit Select' : 'Select'}
        </button>
      </div>

      {selectionMode && selectedTaskIds.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedTaskIds.size}
          statuses={statuses}
          members={members}
          onMove={handleBulkMove}
          onAssign={handleBulkAssign}
          onSetPriority={handleBulkSetPriority}
          onDelete={handleBulkDelete}
          onClearSelection={handleClearSelection}
        />
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <KanbanBoard
          statuses={statuses}
          tasks={filteredTasks}
          projectId={projectId}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          selectedTaskIds={selectedTaskIds}
          onTaskSelectionChange={handleTaskSelectionChange}
          selectionMode={selectionMode}
        />
      </div>

      {/* Task Edit Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        mode="edit"
      />

      {/* Task Create Modal */}
      <TaskDetailModal
        isOpen={!!createStatusId}
        onClose={() => setCreateStatusId(null)}
        projectId={projectId}
        defaultStatusId={createStatusId || undefined}
        mode="create"
      />
    </div>
  );
}
