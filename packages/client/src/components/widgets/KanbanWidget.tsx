import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { KanbanBoard } from '../kanban/KanbanBoard';
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

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

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

  const handleTaskStatusChange = useCallback(
    (taskId: string, newStatusId: string, sortOrder: number) => {
      moveTaskMutation.mutate({ taskId, statusId: newStatusId, sortOrder });
    },
    [moveTaskMutation]
  );

  const handleTaskClick = useCallback((task: TaskDTO) => {
    setSelectedTask(task);
  }, []);

  const handleAddTask = useCallback(
    (statusId: string) => {
      setCreateStatusId(statusId);
    },
    []
  );

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      <FilterBar
        projectId={projectId}
        filters={filters}
        activeCount={activeCount}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <KanbanBoard
          statuses={statuses}
          tasks={filteredTasks}
          projectId={projectId}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
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
