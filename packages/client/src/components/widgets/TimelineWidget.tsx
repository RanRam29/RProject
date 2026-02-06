import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { TaskDetailModal } from '../task/TaskDetailModal';
import type { WidgetProps } from './widget.types';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

export function TimelineWidget({ projectId }: WidgetProps) {
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const tasksWithDates = useMemo(
    () => tasks.filter((t) => t.startDate || t.dueDate),
    [tasks]
  );

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 30);
      return { minDate: today, maxDate: nextMonth, totalDays: 30 };
    }

    let min = new Date();
    let max = new Date();

    tasksWithDates.forEach((t) => {
      const start = t.startDate ? new Date(t.startDate) : null;
      const end = t.dueDate ? new Date(t.dueDate) : null;

      if (start && start < min) min = start;
      if (end && end > max) max = end;
      if (start && start > max) max = start;
      if (end && end < min) min = end;
    });

    // Add some padding
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 3);

    const total = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));
    return { minDate: min, maxDate: max, totalDays: Math.max(total, 7) };
  }, [tasksWithDates]);

  const getBarPosition = useCallback((task: TaskDTO) => {
    const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
    const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000);

    const startOffset = (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 1);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  }, [minDate, totalDays]);

  const containerStyle: React.CSSProperties = {
    padding: '12px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '8px',
    marginBottom: '8px',
    position: 'relative',
    height: '30px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: '36px',
    position: 'relative',
    borderBottom: '1px solid var(--color-border)',
  };

  const labelStyle: React.CSSProperties = {
    width: '160px',
    minWidth: '160px',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    paddingRight: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
  };

  const barAreaStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    height: '100%',
  };

  // Generate week markers
  const months: { label: string; left: string }[] = [];
  const current = new Date(minDate);
  while (current <= maxDate) {
    const offset = (current.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    months.push({
      label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      left: `${(offset / totalDays) * 100}%`,
    });
    current.setDate(current.getDate() + 7);
  }

  // Today marker position
  const todayOffset = (new Date().getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  const showTodayLine = todayOffset >= 0 && todayOffset <= totalDays;

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
          {tasksWithDates.length} task{tasksWithDates.length !== 1 ? 's' : ''} with dates
          {tasks.length > tasksWithDates.length && (
            <> &middot; {tasks.length - tasksWithDates.length} without dates</>
          )}
        </span>
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
          + Add Task
        </button>
      </div>

      {tasksWithDates.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px', margin: 0 }}>
            Add start/due dates to tasks to see them on the timeline
          </p>
          <button
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
            onClick={() => setShowCreate(true)}
          >
            Create Task with Dates
          </button>
        </div>
      ) : (
        <>
          {/* Timeline header */}
          <div style={{ display: 'flex', position: 'relative' }}>
            <div style={{ ...labelStyle, fontWeight: 600, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              Task
            </div>
            <div style={{ ...barAreaStyle, ...headerStyle }}>
              {months.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: m.left,
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Today line */}
            {showTodayLine && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(160px + (100% - 160px) * ${todayOffset / totalDays})`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: 'var(--color-danger)',
                  opacity: 0.5,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            )}

            {tasksWithDates.map((task) => {
              const status = statusMap[task.statusId];
              const pos = getBarPosition(task);
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !status?.isFinal;

              return (
                <div
                  key={task.id}
                  style={rowStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div
                    style={labelStyle}
                    onClick={() => setSelectedTask(task)}
                    title="Click to edit"
                  >
                    {status?.isFinal && (
                      <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{task.title}</span>
                    )}
                    {!status?.isFinal && task.title}
                  </div>
                  <div style={barAreaStyle}>
                    <div
                      style={{
                        position: 'absolute',
                        left: pos.left,
                        width: pos.width,
                        top: '6px',
                        height: '24px',
                        backgroundColor: isOverdue ? 'var(--color-danger)' : (status?.color || 'var(--color-accent)'),
                        borderRadius: 'var(--radius-sm)',
                        opacity: status?.isFinal ? 0.4 : 0.8,
                        minWidth: '8px',
                        cursor: 'pointer',
                        transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '6px',
                        fontSize: '11px',
                        color: 'white',
                        fontWeight: 500,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap' as const,
                      }}
                      onClick={() => setSelectedTask(task)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'scaleY(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = status?.isFinal ? '0.4' : '0.8';
                        e.currentTarget.style.transform = 'scaleY(1)';
                      }}
                      title={`${task.title}\n${task.startDate || '?'} - ${task.dueDate || '?'}${isOverdue ? '\nOverdue!' : ''}`}
                    >
                      {status?.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        mode="edit"
      />

      {/* Create Modal */}
      <TaskDetailModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId}
        mode="create"
      />
    </div>
  );
}
