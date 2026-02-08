import { useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { permissionsApi } from '../../api/permissions.api';
import { TaskDetailModal } from '../task/TaskDetailModal';
import { TaskImportModal } from '../import/TaskImportModal';
import { FilterBar } from '../filter/FilterBar';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useUIStore } from '../../stores/ui.store';
import { exportTasksToCSV, exportTasksToJSON } from '../../utils/export';
import type { WidgetProps } from './widget.types';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';
import { PRIORITY_CONFIG } from '@pm/shared';

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

export function TaskListWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const inlineRef = useRef<HTMLInputElement>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
    staleTime: 60_000,
  });

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {};
    permissions.forEach((p) => {
      map[p.userId] = p.user?.displayName || p.user?.email || 'Unknown';
    });
    return map;
  }, [permissions]);

  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } = useTaskFilters(tasks);

  const statusMap: Record<string, TaskStatusDTO> = {};
  statuses.forEach((s) => {
    statusMap[s.id] = s;
  });

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status': {
          const sa = statusMap[a.statusId]?.sortOrder ?? 0;
          const sb = statusMap[b.statusId]?.sortOrder ?? 0;
          cmp = sa - sb;
          break;
        }
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case 'assignee': {
          const na = a.assignee?.displayName || memberMap[a.assigneeId || ''] || '';
          const nb = b.assignee?.displayName || memberMap[b.assigneeId || ''] || '';
          cmp = na.localeCompare(nb);
          break;
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredTasks, sortField, sortDirection, statusMap, memberMap]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, fontSize: '10px', marginLeft: '4px' }}>{'\u2195'}</span>;
    }
    return <span style={{ fontSize: '10px', marginLeft: '4px' }}>{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  const containerStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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

      <div style={{ padding: '8px 12px 0', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
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
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: 'transparent',
            color: 'var(--color-text-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
          }}
          onClick={() => setShowImport(true)}
          title="Import tasks from PDF or Excel"
        >
          Import
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
      <div style={{ padding: '8px 12px' }}>
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
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {sortedTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)' }}>
            {activeCount > 0 ? 'No tasks match the current filters.' : 'No tasks yet. Click "+ New Task" to create one.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '36px', cursor: 'default' }}></th>
                <th style={thStyle} onClick={() => handleSort('title')}>
                  Title <SortIcon field="title" />
                </th>
                <th style={{ ...thStyle, width: '120px' }} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
                <th style={{ ...thStyle, width: '100px' }} onClick={() => handleSort('priority')}>
                  Priority <SortIcon field="priority" />
                </th>
                <th style={{ ...thStyle, width: '140px' }} onClick={() => handleSort('assignee')}>
                  Assignee <SortIcon field="assignee" />
                </th>
                <th style={{ ...thStyle, width: '100px' }} onClick={() => handleSort('dueDate')}>
                  Due Date <SortIcon field="dueDate" />
                </th>
                <th style={{ ...thStyle, width: '60px', cursor: 'default' }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const status = statusMap[task.statusId];
                const assigneeName = task.assignee?.displayName || memberMap[task.assigneeId || ''] || '';
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !status?.isFinal;
                const priorityCfg = PRIORITY_CONFIG[task.priority];

                return (
                  <tr
                    key={task.id}
                    style={{ transition: 'background var(--transition-fast)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                      const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-action-btn]');
                      btns.forEach((b) => (b.style.opacity = '1'));
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-action-btn]');
                      btns.forEach((b) => (b.style.opacity = '0'));
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={status?.isFinal || false}
                        onChange={() => handleToggle(task)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                      />
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        cursor: 'pointer',
                        fontWeight: 500,
                        textDecoration: status?.isFinal ? 'line-through' : 'none',
                        color: status?.isFinal ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                        maxWidth: '300px',
                      }}
                      onClick={() => setSelectedTask(task)}
                    >
                      {task.title}
                    </td>
                    <td style={tdStyle}>
                      {status && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: status.color + '20',
                            color: status.color,
                            fontWeight: 500,
                          }}
                        >
                          {status.name}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {task.priority && task.priority !== 'NONE' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: priorityCfg?.color,
                              flexShrink: 0,
                            }}
                          />
                          {priorityCfg?.label}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {assigneeName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span
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
                              flexShrink: 0,
                            }}
                          >
                            {assigneeName.charAt(0).toUpperCase()}
                          </span>
                          {assigneeName}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-tertiary)', fontSize: '12px' }}>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : ''}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          data-action-btn
                          style={actionBtnStyle}
                          title="Edit task"
                          onClick={() => setSelectedTask(task)}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-light)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          &#215;
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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

      <TaskImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        projectId={projectId}
      />
    </div>
  );
}
