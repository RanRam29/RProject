import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labelsApi } from '../../api/labels.api';
import { useUIStore } from '../../stores/ui.store';
import type { LabelDTO, TaskLabelDTO } from '@pm/shared';

interface LabelSelectorProps {
  projectId: string;
  taskId: string;
  assignedLabels: TaskLabelDTO[];
}

export function LabelSelector({ projectId, taskId, assignedLabels }: LabelSelectorProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [newLabelName, setNewLabelName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: projectLabels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => labelsApi.list(projectId),
  });

  const assignedLabelIds = new Set(assignedLabels.map((tl) => tl.labelId));

  const assignMutation = useMutation({
    mutationFn: (labelId: string) => labelsApi.assignToTask(projectId, taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to assign label' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (labelId: string) => labelsApi.removeFromTask(projectId, taskId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to remove label' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => labelsApi.create(projectId, { name }),
    onSuccess: (newLabel) => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      setNewLabelName('');
      setShowCreate(false);
      // Auto-assign the newly created label
      assignMutation.mutate(newLabel.id);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create label' });
    },
  });

  const toggleLabel = (label: LabelDTO) => {
    if (assignedLabelIds.has(label.id)) {
      removeMutation.mutate(label.id);
    } else {
      assignMutation.mutate(label.id);
    }
  };

  const handleCreateSubmit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newLabelName.trim()) return;
    createMutation.mutate(newLabelName.trim());
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  };

  const chipStyle = (color: string, isActive: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: 'var(--radius-full, 9999px)',
    cursor: 'pointer',
    border: isActive ? `2px solid ${color}` : '1px solid var(--color-border)',
    backgroundColor: isActive ? `${color}20` : 'transparent',
    color: isActive ? color : 'var(--color-text-secondary)',
    transition: 'all 0.15s ease',
    userSelect: 'none' as const,
  });

  const dotStyle = (color: string): React.CSSProperties => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: color,
  });

  return (
    <div>
      <div style={containerStyle}>
        {projectLabels.map((label) => (
          <button
            key={label.id}
            type="button"
            style={chipStyle(label.color, assignedLabelIds.has(label.id))}
            onClick={() => toggleLabel(label)}
          >
            <span style={dotStyle(label.color)} />
            {label.name}
          </button>
        ))}

        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              padding: '3px 8px',
              fontSize: '12px',
              color: 'var(--color-text-tertiary)',
              background: 'none',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-full, 9999px)',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        )}
      </div>

      {showCreate && (
        <div
          style={{ display: 'flex', gap: '6px', marginTop: '8px' }}
        >
          <input
            type="text"
            value={newLabelName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateSubmit(e);
              }
            }}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            autoFocus
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleCreateSubmit}
            disabled={!newLabelName.trim() || createMutation.isPending}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              opacity: !newLabelName.trim() ? 0.5 : 1,
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewLabelName(''); }}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
