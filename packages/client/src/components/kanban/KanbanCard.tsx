import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskDTO } from '@pm/shared';
import { TaskPriority, PRIORITY_CONFIG } from '@pm/shared';

interface KanbanCardProps {
  task: TaskDTO;
  projectId: string;
  isDragging?: boolean;
  onClick?: () => void;
}

export const KanbanCard = memo(function KanbanCard({
  task,
  isDragging = false,
  onClick,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const isBeingDragged = isDragging || isSortableDragging;

  const computedTransform = isBeingDragged
    ? `${CSS.Transform.toString(transform)} rotate(2deg)`
    : CSS.Transform.toString(transform);

  const computedTransition = transition || 'box-shadow var(--transition-fast), opacity var(--transition-fast)';

  const style: React.CSSProperties = {
    transform: computedTransform,
    transition: computedTransition,
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    cursor: 'grab',
    border: '1px solid var(--color-border)',
    boxShadow: isBeingDragged ? 'var(--shadow-drag)' : 'var(--shadow-sm)',
    opacity: isSortableDragging ? 0.4 : 1,
    userSelect: 'none' as const,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    lineHeight: 1.4,
    marginBottom: '8px',
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  };

  const dueDateStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const subtaskBadgeStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px 6px',
    fontSize: '11px',
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => {
        if (!isBeingDragged) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isBeingDragged) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', ...titleStyle }}>
        {task.priority && task.priority !== TaskPriority.NONE && (
          <span
            style={{
              width: '8px',
              height: '8px',
              minWidth: '8px',
              borderRadius: '50%',
              backgroundColor: PRIORITY_CONFIG[task.priority].color,
              marginTop: '5px',
            }}
            title={PRIORITY_CONFIG[task.priority].label}
          />
        )}
        <span>{task.title}</span>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {task.labels.slice(0, 3).map((tl) => (
            <span
              key={tl.id}
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 500,
                borderRadius: '9999px',
                backgroundColor: `${tl.label?.color || '#6B7280'}20`,
                color: tl.label?.color || '#6B7280',
                border: `1px solid ${tl.label?.color || '#6B7280'}40`,
                lineHeight: '16px',
              }}
            >
              {tl.label?.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--color-text-tertiary)',
                lineHeight: '18px',
              }}
            >
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      <div style={metaStyle}>
        {task.dueDate && (
          <span style={{
            ...dueDateStyle,
            color: isOverdue ? 'var(--color-danger)' : undefined,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 1a.5.5 0 0 0-1 0V2H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-1.5V1a.5.5 0 0 0-1 0V2h-7V1zM1 6v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6H1z" />
            </svg>
            {formatDate(task.dueDate)}
          </span>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <span style={subtaskBadgeStyle}>
            {task.subtasks.filter((s) => s.statusId).length}/{task.subtasks.length}
          </span>
        )}

        {task.blockedBy && task.blockedBy.length > 0 && (
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-danger)' }}
            title={`Blocked by ${task.blockedBy.length} task(s)`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            </svg>
          </span>
        )}

        {task.comments && task.comments.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1H2z" />
            </svg>
            {task.comments.length}
          </span>
        )}

        {task.assigneeId && (
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--color-accent)',
              marginLeft: 'auto',
            }}
          >
            U
          </div>
        )}
      </div>
    </div>
  );
});
