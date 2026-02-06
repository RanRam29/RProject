import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { TaskDetailModal } from '../task/TaskDetailModal';
import { FilterBar } from '../filter/FilterBar';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useUIStore } from '../../stores/ui.store';
import { exportTasksToCSV, exportTasksToJSON } from '../../utils/export';
import type { WidgetProps } from './widget.types';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

export function TaskListWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const inlineRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } = useTaskFilters(tasks);

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string }) =>
      tasksApi.updateTaskStatus(projectId, taskId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update task status' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task deleted' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete task' });
    },
  });

  const inlineCreateMutation = useMutation({
    mutationFn: (title: string) =>
      tasksApi.create(projectId, {
        title,
        statusId: statuses[0]?.id || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setInlineTitle('');
      addToast({ type: 'success', message: 'Task created' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create task' });
    },
  });

  const handleToggle = (task: TaskDTO) => {
    const currentStatus = statusMap[task.statusId];
    if (!currentStatus) return;

    const targetStatus = currentStatus.isFinal
      ? statuses.find((s) => !s.isFinal)
      : statuses.find((s) => s.isFinal);

    if (targetStatus) {
      toggleStatusMutation.mutate({ taskId: task.id, statusId: targetStatus.id });
    }
  };

  const handleInlineCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inlineTitle.trim() || !statuses[0]) return;
      inlineCreateMutation.mutate(inlineTitle.trim());
    },
    [inlineTitle, statuses, inlineCreateMutation]
  );

  const containerStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const taskRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    transition: 'background var(--transition-fast)',
    cursor: 'pointer',
  };

  const actionBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
    opacity: 0,
    color: 'var(--color-text-secondary)',
  };

  if (isLoading) {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Loading tasks...</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <FilterBar
        projectId={projectId}
        filters={filters}
        activeCount={activeCount}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
        {/* Action bar: export + new task */}
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
            onClick={() => {
              exportTasksToCSV(filteredTasks, statuses);
              addToast({ type: 'success', message: 'Exported as CSV' });
            }}
            title="Export as CSV"
          >
            CSV
          </button>
          <button
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
            onClick={() => {
              exportTasksToJSON(filteredTasks, statuses);
              addToast({ type: 'success', message: 'Exported as JSON' });
            }}
            title="Export as JSON"
          >
            JSON
          </button>
          <button
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
            }}
            onClick={() => setShowCreate(true)}
          >
            + New Task
          </button>
        </div>

        {/* Inline quick-add */}
        <form onSubmit={handleInlineCreate} style={{ display: 'flex', gap: '6px' }}>
          <input
            ref={inlineRef}
            type="text"
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            placeholder="Quick add task... (press Enter)"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: '13px',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </form>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>
              {activeCount > 0 ? 'No tasks match the current filters.' : 'No tasks yet. Click "+ New Task" to create one.'}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const status = statusMap[task.statusId];
              return (
                <div
                  key={task.id}
                  style={taskRowStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-action-btn]');
                    btns.forEach((b) => (b.style.opacity = '1'));
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-action-btn]');
                    btns.forEach((b) => (b.style.opacity = '0'));
                  }}
                >
                  <input
                    type="checkbox"
                    checked={status?.isFinal || false}
                    onChange={() => handleToggle(task)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      textDecoration: status?.isFinal ? 'line-through' : 'none',
                      color: status?.isFinal ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedTask(task)}
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: new Date(task.dueDate) < new Date() ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {status && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: status.color + '20',
                        color: status.color,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status.name}
                    </span>
                  )}
                  <button
                    data-action-btn
                    style={{ ...actionBtnStyle }}
                    title="Edit task"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    &#9998;
                  </button>
                  <button
                    data-action-btn
                    style={{ ...actionBtnStyle, color: 'var(--color-danger)' }}
                    title="Delete task"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this task?')) {
                        deleteMutation.mutate(task.id);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-danger-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    &#215;
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Edit/Create Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        mode="edit"
      />

      <TaskDetailModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId}
        mode="create"
      />
    </div>
  );
}
