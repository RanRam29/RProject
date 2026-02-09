import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { labelsApi } from '../../api/labels.api';
import { useUIStore } from '../../stores/ui.store';
import { Button } from '../ui/Button';
import type { TaskStatusDTO, LabelDTO, CreateTaskStatusRequest, CreateLabelRequest } from '@pm/shared';

interface ProjectSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type SettingsTab = 'statuses' | 'labels';

const COLOR_PRESETS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

export function ProjectSettings({ isOpen, onClose, projectId }: ProjectSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('statuses');

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--color-bg-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn var(--transition-fast) ease',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    width: '700px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border)',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Project Settings</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
          <button style={tabStyle(activeTab === 'statuses')} onClick={() => setActiveTab('statuses')}>
            Statuses
          </button>
          <button style={tabStyle(activeTab === 'labels')} onClick={() => setActiveTab('labels')}>
            Labels
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {activeTab === 'statuses' && (
            <ProjectStatusesEditor projectId={projectId} />
          )}
          {activeTab === 'labels' && (
            <ProjectLabelsEditor projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Project Statuses Editor ─── */

function ProjectStatusesEditor({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaskStatusRequest) => tasksApi.createStatus(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      setNewName('');
      setNewColor(COLOR_PRESETS[statuses.length % COLOR_PRESETS.length]);
      addToast({ type: 'success', message: 'Status created' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to create status' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskStatusRequest> }) =>
      tasksApi.updateStatus(projectId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      setEditingId(null);
      addToast({ type: 'success', message: 'Status updated' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to update status' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteStatus(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses', projectId] });
      addToast({ type: 'success', message: 'Status deleted' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to delete status. It may have tasks assigned.' }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      color: newColor,
      sortOrder: statuses.length,
    });
  };

  const startEdit = (status: TaskStatusDTO) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { name: editName.trim(), color: editColor },
    });
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '13px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Manage task statuses for this project. Statuses with tasks cannot be deleted.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>Color</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>Name</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)', textAlign: 'center' }}>Final</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)', width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((status) => (
            <tr key={status.id}>
              <td style={tdStyle}>
                {editingId === status.id ? (
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ width: '30px', height: '26px', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                ) : (
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: status.color }} />
                )}
              </td>
              <td style={tdStyle}>
                {editingId === status.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    style={{
                      fontSize: '13px', padding: '3px 6px',
                      border: '1px solid var(--color-accent)', borderRadius: '4px',
                      outline: 'none', width: '100%',
                      backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                    }}
                  />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {status.name}
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {status.isFinal ? (
                  <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>Yes</span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>No</span>
                )}
              </td>
              <td style={tdStyle}>
                {editingId === status.id ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={saveEdit}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-success)', fontSize: '13px', fontWeight: 500 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => startEdit(status)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete status "${status.name}"? Tasks using this status must be moved first.`)) {
                          deleteMutation.mutate(status.id);
                        }
                      }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add new status row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 0',
          borderTop: statuses.length > 0 ? 'none' : '1px solid var(--color-border)',
        }}
      >
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ width: '30px', height: '26px', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New status name..."
          style={{
            flex: 1, fontSize: '13px', padding: '5px 8px',
            border: '1px solid var(--color-border)', borderRadius: '4px',
            backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        <Button variant="primary" size="sm" onClick={handleCreate} loading={createMutation.isPending}>
          Add
        </Button>
      </div>
    </div>
  );
}

/* ─── Project Labels Editor ─── */

function ProjectLabelsEditor({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PRESETS[2]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => labelsApi.list(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLabelRequest) => labelsApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      setNewName('');
      setNewColor(COLOR_PRESETS[(labels.length + 1) % COLOR_PRESETS.length]);
      addToast({ type: 'success', message: 'Label created' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to create label' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLabelRequest> }) =>
      labelsApi.update(projectId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      setEditingId(null);
      addToast({ type: 'success', message: 'Label updated' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to update label' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => labelsApi.delete(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', projectId] });
      addToast({ type: 'success', message: 'Label deleted' });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message || 'Failed to delete label' }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), color: newColor });
  };

  const startEdit = (label: LabelDTO) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, data: { name: editName.trim(), color: editColor } });
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '13px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        Manage labels for this project. Labels help categorize and filter tasks.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>Color</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)' }}>Name</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)', width: '100px' }}>Preview</th>
            <th style={{ ...tdStyle, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--color-text-secondary)', width: '100px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label.id}>
              <td style={tdStyle}>
                {editingId === label.id ? (
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ width: '30px', height: '26px', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                  />
                ) : (
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: label.color }} />
                )}
              </td>
              <td style={tdStyle}>
                {editingId === label.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                    style={{
                      fontSize: '13px', padding: '3px 6px',
                      border: '1px solid var(--color-accent)', borderRadius: '4px',
                      outline: 'none', width: '100%',
                      backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                    }}
                  />
                ) : (
                  label.name
                )}
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    borderRadius: '9999px',
                    backgroundColor: `${editingId === label.id ? editColor : label.color}20`,
                    color: editingId === label.id ? editColor : label.color,
                    border: `1px solid ${editingId === label.id ? editColor : label.color}40`,
                  }}
                >
                  {editingId === label.id ? editName || label.name : label.name}
                </span>
              </td>
              <td style={tdStyle}>
                {editingId === label.id ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={saveEdit}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-success)', fontSize: '13px', fontWeight: 500 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => startEdit(label)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: '12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete label "${label.name}"?`)) {
                          deleteMutation.mutate(label.id);
                        }
                      }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {labels.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
          No labels yet. Add one below.
        </div>
      )}

      {/* Add new label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          style={{ width: '30px', height: '26px', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New label name..."
          style={{
            flex: 1, fontSize: '13px', padding: '5px 8px',
            border: '1px solid var(--color-border)', borderRadius: '4px',
            backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
            outline: 'none',
          }}
        />
        <Button variant="primary" size="sm" onClick={handleCreate} loading={createMutation.isPending}>
          Add
        </Button>
      </div>
    </div>
  );
}
