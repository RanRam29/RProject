import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { useUIStore } from '../../stores/ui.store';
import type { TaskDTO } from '@pm/shared';

interface DependencyManagerProps {
  projectId: string;
  task: TaskDTO;
}

export function DependencyManager({ projectId, task }: DependencyManagerProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch all project tasks for the dependency picker
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const blockedBy = task.blockedBy || [];
  const blocking = task.blocking || [];

  // Build a set of already-linked task IDs
  const linkedIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(task.id); // can't depend on self
    blockedBy.forEach((d) => ids.add(d.blockingTaskId));
    blocking.forEach((d) => ids.add(d.blockedTaskId));
    // Also exclude subtasks of this task
    (task.subtasks || []).forEach((s) => ids.add(s.id));
    // Exclude parent
    if (task.parentTaskId) ids.add(task.parentTaskId);
    return ids;
  }, [task, blockedBy, blocking]);

  // Filter available tasks for adding
  const availableTasks = useMemo(() => {
    return allTasks
      .filter((t) => !linkedIds.has(t.id))
      .filter((t) => !t.parentTaskId) // only top-level tasks
      .filter((t) =>
        search.trim() === '' || t.title.toLowerCase().includes(search.toLowerCase())
      );
  }, [allTasks, linkedIds, search]);

  const addMutation = useMutation({
    mutationFn: (blockingTaskId: string) =>
      tasksApi.addDependency(projectId, task.id, { blockingTaskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setShowAdd(false);
      setSearch('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to add dependency';
      addToast({ type: 'error', message: msg });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (depId: string) =>
      tasksApi.removeDependency(projectId, task.id, depId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to remove dependency' });
    },
  });

  // Resolve task title from ID
  const getTaskTitle = (taskId: string): string => {
    const t = allTasks.find((at) => at.id === taskId);
    return t?.title || 'Unknown task';
  };

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
  };

  const removeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontSize: '14px',
    lineHeight: 1,
    color: 'var(--color-text-tertiary)',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '6px',
  };

  const hasDeps = blockedBy.length > 0 || blocking.length > 0;

  return (
    <div>
      {/* Blocked By section */}
      {blockedBy.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={sectionLabel}>Blocked by</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {blockedBy.map((dep) => (
              <span key={dep.id} style={chipStyle}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--color-danger)">
                  <path d="M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353L11.46.146zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                {getTaskTitle(dep.blockingTaskId)}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(dep.id)}
                  style={removeBtn}
                  title="Remove dependency"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Blocking section */}
      {blocking.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={sectionLabel}>Blocking</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {blocking.map((dep) => (
              <span key={dep.id} style={chipStyle}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--color-warning, #EAB308)">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                {getTaskTitle(dep.blockedTaskId)}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(dep.id)}
                  style={removeBtn}
                  title="Remove dependency"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {!hasDeps && !showAdd && (
        <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
          No dependencies.
        </div>
      )}

      {/* Add dependency */}
      {showAdd ? (
        <div style={{ marginTop: '4px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            autoFocus
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              marginBottom: '4px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowAdd(false); setSearch(''); }
            }}
          />
          <div
            style={{
              maxHeight: '150px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          >
            {availableTasks.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                No matching tasks
              </div>
            ) : (
              availableTasks.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addMutation.mutate(t.id)}
                  disabled={addMutation.isPending}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--color-text-primary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {t.title}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setSearch(''); }}
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            background: 'none',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          + Add dependency
        </button>
      )}
    </div>
  );
}
