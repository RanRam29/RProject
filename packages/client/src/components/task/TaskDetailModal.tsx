import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { useUIStore } from '../../stores/ui.store';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { TaskDTO, UpdateTaskRequest } from '@pm/shared';
import { TaskPriority, PRIORITY_CONFIG } from '@pm/shared';
import { LabelSelector } from '../label/LabelSelector';
import { CommentThread } from '../comment/CommentThread';
import { SubtaskList } from '../subtask/SubtaskList';
import { DependencyManager } from '../dependency/DependencyManager';
import { AssigneeSelector } from './AssigneeSelector';
import { ActivityFeed } from './ActivityFeed';
import { TaskAttachments } from '../file/TaskAttachments';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task?: TaskDTO | null;
  /** When creating a new task, pre-select this status */
  defaultStatusId?: string;
  /** When creating a new task, pre-fill the due date (format: YYYY-MM-DD) */
  defaultDueDate?: string;
  mode?: 'create' | 'edit';
}

export function TaskDetailModal({
  isOpen,
  onClose,
  projectId,
  task,
  defaultStatusId,
  defaultDueDate,
  mode = task ? 'edit' : 'create',
}: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
    enabled: isOpen,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NONE);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when task or mode changes
  useEffect(() => {
    if (mode === 'edit' && task) {
      setTitle(task.title);
      setDescription(
        typeof task.description === 'string' ? task.description :
        task.description && typeof task.description === 'object' && 'text' in task.description
          ? String((task.description as { text: string }).text)
          : ''
      );
      setStatusId(task.statusId);
      setAssigneeId(task.assigneeId || null);
      setPriority(task.priority || TaskPriority.NONE);
      setStartDate(task.startDate ? task.startDate.slice(0, 10) : '');
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    } else {
      setTitle('');
      setDescription('');
      setStatusId(defaultStatusId || (statuses[0]?.id ?? ''));
      setAssigneeId(null);
      setPriority(TaskPriority.NONE);
      setStartDate('');
      setDueDate(defaultDueDate || '');
    }
    setShowDeleteConfirm(false);
  }, [task, mode, isOpen, defaultStatusId, defaultDueDate, statuses]);

  // Set default status when statuses load and no status is set
  useEffect(() => {
    if (!statusId && statuses.length > 0 && mode === 'create') {
      setStatusId(defaultStatusId || statuses[0].id);
    }
  }, [statuses, statusId, mode, defaultStatusId]);

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; statusId: string; assigneeId?: string; priority?: TaskPriority; startDate?: string; dueDate?: string }) =>
      tasksApi.create(projectId, {
        title: data.title,
        description: data.description || undefined,
        statusId: data.statusId,
        assigneeId: data.assigneeId,
        priority: data.priority,
        startDate: data.startDate || undefined,
        dueDate: data.dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task created' });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create task' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTaskRequest) =>
      tasksApi.update(projectId, task!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task updated' });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to update task' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatusId: string) =>
      tasksApi.updateTaskStatus(projectId, task!.id, newStatusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Status updated' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to change status' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(projectId, task!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task deleted' });
      onClose();
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete task' });
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;

      if (mode === 'create') {
        createMutation.mutate({
          title: title.trim(),
          description: description.trim() || undefined,
          statusId,
          assigneeId: assigneeId || undefined,
          priority,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
        });
      } else if (task) {
        updateMutation.mutate({
          title: title.trim(),
          description: description.trim() || null,
          assigneeId,
          priority,
          startDate: startDate || null,
          dueDate: dueDate || null,
        });
      }
    },
    [mode, title, description, statusId, assigneeId, priority, startDate, dueDate, task, createMutation, updateMutation]
  );

  const handleStatusChange = useCallback(
    (newStatusId: string) => {
      setStatusId(newStatusId);
      if (mode === 'edit' && task) {
        statusMutation.mutate(newStatusId);
      }
    },
    [mode, task, statusMutation]
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
    display: 'block',
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: 1.5,
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <div>
        {mode === 'edit' && task && (
          showDeleteConfirm ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>Delete this task?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Task
            </Button>
          )
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={isLoading}
          disabled={!title.trim() || !statusId}
        >
          {mode === 'create' ? 'Create Task' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'New Task' : 'Edit Task'}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        <div style={fieldGroupStyle}>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            fullWidth
            autoFocus
          />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={textareaStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
          />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Status</label>
          <select
            style={selectStyle}
            value={statusId}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isFinal ? '(Done)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Assignee</label>
          <AssigneeSelector
            projectId={projectId}
            selectedAssigneeId={assigneeId}
            onChange={setAssigneeId}
          />
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Priority</label>
          <select
            style={selectStyle}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              fullWidth
            />
          </div>
        </div>

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Labels</label>
            <LabelSelector
              projectId={projectId}
              taskId={task.id}
              assignedLabels={task.labels || []}
            />
          </div>
        )}

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Subtasks</label>
            <SubtaskList
              projectId={projectId}
              parentTask={task}
              statuses={statuses}
            />
          </div>
        )}

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Dependencies</label>
            <DependencyManager projectId={projectId} task={task} />
          </div>
        )}

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Attachments</label>
            <TaskAttachments projectId={projectId} taskId={task.id} />
          </div>
        )}

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Comments</label>
            <CommentThread projectId={projectId} taskId={task.id} />
          </div>
        )}

        {mode === 'edit' && task && (
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Activity</label>
            <ActivityFeed projectId={projectId} taskId={task.id} />
          </div>
        )}

        {mode === 'edit' && task && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
            <div>Last updated: {new Date(task.updatedAt).toLocaleString()}</div>
          </div>
        )}
      </form>
    </Modal>
  );
}
