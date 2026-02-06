import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

interface KanbanColumnProps {
  status: TaskStatusDTO;
  tasks: TaskDTO[];
  isOverlay: boolean;
  projectId: string;
  onTaskClick: (task: TaskDTO) => void;
  onAddTask: () => void;
}

export function KanbanColumn({
  status,
  tasks,
  isOverlay,
  projectId,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const columnStyle: React.CSSProperties = {
    minWidth: '280px',
    maxWidth: '320px',
    flex: '0 0 280px',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: 'calc(100vh - 200px)',
    transition: 'background-color var(--transition-fast)',
    border: isOver || isOverlay
      ? '2px dashed var(--color-accent)'
      : '2px solid transparent',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 4px 8px',
  };

  const statusDotStyle: React.CSSProperties = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: status.color,
    marginRight: '8px',
    flexShrink: 0,
  };

  const titleGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--color-text-primary)',
  };

  const countStyle: React.CSSProperties = {
    marginLeft: '8px',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-full)',
    padding: '0 8px',
    lineHeight: '20px',
  };

  const addButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'var(--color-text-secondary)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
    lineHeight: 1,
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    flex: 1,
    minHeight: '40px',
  };

  return (
    <div style={columnStyle} ref={setNodeRef}>
      <div style={headerStyle}>
        <div style={titleGroupStyle}>
          <div style={statusDotStyle} />
          <span style={titleStyle}>{status.name}</span>
          <span style={countStyle}>{tasks.length}</span>
        </div>
        <button
          style={addButtonStyle}
          onClick={onAddTask}
          title="Add task"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          +
        </button>
      </div>

      <div style={listStyle}>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            projectId={projectId}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}
