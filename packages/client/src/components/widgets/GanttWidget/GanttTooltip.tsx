import { useState, type FC, type ReactNode } from 'react';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

interface GanttTooltipProps {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  children: ReactNode;
}

export const GanttTooltip: FC<GanttTooltipProps> = ({ task, status, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: 8,
          zIndex: 100,
          width: 260,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-elevated)',
          padding: 12,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            {/* Title */}
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, margin: 0 }}>
              {task.title}
            </p>

            {/* Status */}
            {status && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Status</span>
                <span style={{
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#fff',
                  background: status.color,
                }}>
                  {status.name}
                </span>
              </div>
            )}

            {/* Assignee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--color-text-tertiary)' }}>Assignee</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {task.assignee?.displayName ?? 'Unassigned'}
              </span>
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 12, color: 'var(--color-text-tertiary)' }}>
              <span>Start: {task.startDate?.slice(0, 10) ?? '—'}</span>
              <span>Due: {task.dueDate?.slice(0, 10) ?? '—'}</span>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-tertiary)' }}>Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {task.progressPercentage ?? 0}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: 4,
                borderRadius: 2,
                background: 'var(--color-bg-tertiary)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 2,
                  width: `${task.progressPercentage ?? 0}%`,
                  background: 'var(--color-accent)',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* Estimated hours */}
            {(task.estimatedHours ?? 0) > 0 && (
              <div style={{ color: 'var(--color-text-tertiary)' }}>
                Estimated:{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {task.estimatedHours}h
                </span>
              </div>
            )}

            {/* Milestone badge */}
            {task.isMilestone && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-warning-text)',
                background: 'var(--color-warning-light)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                alignSelf: 'flex-start',
              }}>
                ◆ Milestone
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
