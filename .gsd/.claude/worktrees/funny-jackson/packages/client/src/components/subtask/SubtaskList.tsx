import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { tasksApi } from '../../api/tasks.api';
import { useUIStore } from '../../stores/ui.store';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

interface SubtaskListProps {
  projectId: string;
  parentTask: TaskDTO;
  statuses: TaskStatusDTO[];
}

// ─── Sortable Subtask Item ──────────────────────────────────
interface SortableSubtaskItemProps {
  subtask: TaskDTO;
  isDone: boolean;
  editingId: string | null;
  editTitle: string;
  onToggle: (subtask: TaskDTO) => void;
  onEditStart: (subtask: TaskDTO) => void;
  onEditChange: (value: string) => void;
  onEditSubmit: (taskId: string) => void;
  onEditCancel: () => void;
  onDelete: (taskId: string) => void;
  deleteDisabled: boolean;
}

function SortableSubtaskItem({
  subtask,
  isDone,
  editingId,
  editTitle,
  onToggle,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onDelete,
  deleteDisabled,
}: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 4px',
    borderRadius: 'var(--radius-sm)',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'var(--color-bg-tertiary)' : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  const isEditing = editingId === subtask.id;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: 'var(--color-text-tertiary)',
          background: 'none',
          border: 'none',
          padding: '0 2px',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none',
        }}
        tabIndex={-1}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(subtask)}
        style={{
          width: '16px',
          height: '16px',
          minWidth: '16px',
          borderRadius: '3px',
          border: isDone
            ? '2px solid var(--color-accent)'
            : '2px solid var(--color-border)',
          backgroundColor: isDone ? 'var(--color-accent)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
          </svg>
        )}
      </button>

      {/* Title or edit input */}
      {isEditing ? (
        <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSubmit(subtask.id);
              if (e.key === 'Escape') onEditCancel();
            }}
            autoFocus
            style={{
              flex: 1,
              padding: '2px 6px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-primary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => onEditSubmit(subtask.id)}
            style={{
              fontSize: '11px',
              color: 'var(--color-accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            Save
          </button>
        </div>
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            color: isDone ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
            cursor: 'pointer',
          }}
          onDoubleClick={() => onEditStart(subtask)}
        >
          {subtask.title}
        </span>
      )}

      {/* Actions */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '4px', opacity: 0.5 }}>
          <button
            type="button"
            onClick={() => onEditStart(subtask)}
            style={{
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 2px',
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(subtask.id)}
            disabled={deleteDisabled}
            style={{
              fontSize: '11px',
              color: 'var(--color-danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 2px',
            }}
          >
            Del
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function SubtaskList({ projectId, parentTask, statuses }: SubtaskListProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const subtasks = parentTask.subtasks || [];
  const defaultStatusId = statuses[0]?.id ?? '';
  const finalStatusIds = new Set(statuses.filter((s) => s.isFinal).map((s) => s.id));
  const completedCount = subtasks.filter((s) => finalStatusIds.has(s.statusId)).length;

  // DnD sensors — 8px activation distance to distinguish from clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      tasksApi.createSubtask(projectId, parentTask.id, {
        title,
        statusId: defaultStatusId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setNewTitle('');
      setShowCreate(false);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create subtask' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ taskId, statusId }: { taskId: string; statusId: string }) =>
      tasksApi.updateTaskStatus(projectId, taskId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update subtask' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      tasksApi.update(projectId, taskId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setEditingId(null);
      setEditTitle('');
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update subtask' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete subtask' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ taskId, sortOrder }: { taskId: string; sortOrder: number }) =>
      tasksApi.reorder(projectId, taskId, sortOrder),
    onError: () => {
      addToast({ type: 'error', message: 'Failed to reorder subtask' });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(newTitle.trim());
  };

  const toggleSubtask = useCallback((subtask: TaskDTO) => {
    const isDone = finalStatusIds.has(subtask.statusId);
    const targetStatus = isDone
      ? statuses.find((s) => !s.isFinal)?.id
      : statuses.find((s) => s.isFinal)?.id;
    if (targetStatus) {
      toggleMutation.mutate({ taskId: subtask.id, statusId: targetStatus });
    }
  }, [finalStatusIds, statuses, toggleMutation]);

  const handleEditStart = useCallback((subtask: TaskDTO) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditTitle('');
  }, []);

  const handleEditSubmit = useCallback((taskId: string) => {
    if (!editTitle.trim()) return;
    updateMutation.mutate({ taskId, title: editTitle.trim() });
  }, [editTitle, updateMutation]);

  const handleDelete = useCallback((taskId: string) => {
    deleteMutation.mutate(taskId);
  }, [deleteMutation]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate new sortOrder: place between neighbors
    let newSortOrder: number;
    if (newIndex === 0) {
      newSortOrder = (subtasks[0]?.sortOrder ?? 0) - 1;
    } else if (newIndex >= subtasks.length - 1) {
      newSortOrder = (subtasks[subtasks.length - 1]?.sortOrder ?? 0) + 1;
    } else {
      // Place between the two neighbors at the target position
      const before = newIndex > oldIndex ? subtasks[newIndex] : subtasks[newIndex - 1];
      const after = newIndex > oldIndex ? subtasks[newIndex + 1] : subtasks[newIndex];
      newSortOrder = Math.floor(((before?.sortOrder ?? 0) + (after?.sortOrder ?? 0)) / 2);
      // If they're adjacent integers, use the target's sortOrder
      if (newSortOrder === (before?.sortOrder ?? 0)) {
        newSortOrder = newIndex;
      }
    }

    reorderMutation.mutate({
      taskId: active.id as string,
      sortOrder: newSortOrder,
    });
  }, [subtasks, reorderMutation]);

  const progressPct = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;
  const subtaskIds = subtasks.map((s) => s.id);

  return (
    <div>
      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              {completedCount}/{subtasks.length} completed
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div
            style={{
              height: '4px',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? 'var(--color-success, #22C55E)' : 'var(--color-accent)',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Sortable subtask list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {subtasks.map((subtask) => (
              <SortableSubtaskItem
                key={subtask.id}
                subtask={subtask}
                isDone={finalStatusIds.has(subtask.statusId)}
                editingId={editingId}
                editTitle={editTitle}
                onToggle={toggleSubtask}
                onEditStart={handleEditStart}
                onEditChange={setEditTitle}
                onEditSubmit={handleEditSubmit}
                onEditCancel={handleEditCancel}
                onDelete={handleDelete}
                deleteDisabled={deleteMutation.isPending}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Create subtask */}
      {showCreate ? (
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
              if (e.key === 'Escape') { setShowCreate(false); setNewTitle(''); }
            }}
            placeholder="Subtask title..."
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
            onClick={handleCreate}
            disabled={!newTitle.trim() || createMutation.isPending}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              opacity: !newTitle.trim() ? 0.5 : 1,
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewTitle(''); }}
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
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            marginTop: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            background: 'none',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          + Add subtask
        </button>
      )}
    </div>
  );
}
