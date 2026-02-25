import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemDefaultsApi } from '../api/system-defaults.api';
import { useUIStore } from '../stores/ui.store';
import { Button } from '../components/ui/Button';
import type { DefaultStatusConfig, DefaultLabelConfig } from '@pm/shared';

type SettingsTab = 'statuses' | 'labels';

const COLOR_PRESETS = [
  '#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<SettingsTab>('statuses');

  const { data: defaults, isLoading } = useQuery({
    queryKey: ['system-defaults'],
    queryFn: () => systemDefaultsApi.get(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { statuses: DefaultStatusConfig[]; labels: DefaultLabelConfig[] }) =>
      systemDefaultsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-defaults'] });
      addToast({ type: 'success', message: 'System defaults saved successfully' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message || 'Failed to save defaults' });
    },
  });

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: active ? 600 : 400,
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  const infoStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: 'var(--color-accent-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    marginBottom: '20px',
    lineHeight: 1.5,
  };

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>System Settings</h1>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>System Settings</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: '0 0 20px' }}>
        Manage default configuration for new projects
      </p>

      <div style={infoStyle}>
        These defaults are applied when new projects are created. Existing projects are not affected.
        To manage settings for a specific project, use the gear icon on the project page.
      </div>

      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
        <button style={tabStyle(activeTab === 'statuses')} onClick={() => setActiveTab('statuses')}>
          Default Statuses
        </button>
        <button style={tabStyle(activeTab === 'labels')} onClick={() => setActiveTab('labels')}>
          Default Labels
        </button>
      </div>

      {activeTab === 'statuses' && (
        <StatusesEditor
          initialStatuses={defaults?.statuses || []}
          labels={defaults?.labels || []}
          onSave={saveMutation.mutate}
          isSaving={saveMutation.isPending}
        />
      )}

      {activeTab === 'labels' && (
        <LabelsEditor
          initialLabels={defaults?.labels || []}
          statuses={defaults?.statuses || []}
          onSave={saveMutation.mutate}
          isSaving={saveMutation.isPending}
        />
      )}
    </div>
  );
}

/* ─── Statuses Editor ─── */

function StatusesEditor({
  initialStatuses,
  labels,
  onSave,
  isSaving,
}: {
  initialStatuses: DefaultStatusConfig[];
  labels: DefaultLabelConfig[];
  onSave: (data: { statuses: DefaultStatusConfig[]; labels: DefaultLabelConfig[] }) => void;
  isSaving: boolean;
}) {
  const [statuses, setStatuses] = useState<DefaultStatusConfig[]>(initialStatuses);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);

  const addStatus = () => {
    const newStatus: DefaultStatusConfig = {
      name: '',
      color: COLOR_PRESETS[statuses.length % COLOR_PRESETS.length],
      sortOrder: statuses.length,
      isFinal: false,
    };
    setStatuses([...statuses, newStatus]);
    setEditingIdx(statuses.length);
  };

  const updateStatus = (idx: number, changes: Partial<DefaultStatusConfig>) => {
    setStatuses(statuses.map((s, i) => (i === idx ? { ...s, ...changes } : s)));
  };

  const removeStatus = (idx: number) => {
    const updated = statuses.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i }));
    setStatuses(updated);
    setEditingIdx(null);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...statuses];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setStatuses(arr.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const moveDown = (idx: number) => {
    if (idx >= statuses.length - 1) return;
    const arr = [...statuses];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setStatuses(arr.map((s, i) => ({ ...s, sortOrder: i })));
  };

  const handleSave = () => {
    onSave({ statuses, labels });
  };

  const isDirty = JSON.stringify(statuses) !== JSON.stringify(initialStatuses);

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse' as const,
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left' as const,
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '14px',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Default Task Statuses ({statuses.length})
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={addStatus}>
            + Add Status
          </Button>
          {isDirty && (
            <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '40px' }}>#</th>
            <th style={thStyle}>Color</th>
            <th style={thStyle}>Name</th>
            <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Final</th>
            <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Order</th>
            <th style={{ ...thStyle, width: '60px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((status, idx) => (
            <tr key={idx}>
              <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                {idx + 1}
              </td>
              <td style={tdStyle}>
                <input
                  type="color"
                  value={status.color}
                  onChange={(e) => updateStatus(idx, { color: e.target.value })}
                  style={{
                    width: '32px',
                    height: '28px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                />
              </td>
              <td style={tdStyle}>
                {editingIdx === idx ? (
                  <input
                    value={status.name}
                    onChange={(e) => updateStatus(idx, { name: e.target.value })}
                    onBlur={() => setEditingIdx(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingIdx(null)}
                    autoFocus
                    style={{
                      fontSize: '14px',
                      padding: '4px 8px',
                      border: '1px solid var(--color-accent)',
                      borderRadius: 'var(--radius-sm)',
                      outline: 'none',
                      width: '100%',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingIdx(idx)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: status.color,
                        flexShrink: 0,
                      }}
                    />
                    {status.name || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Click to edit</span>}
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={status.isFinal}
                  onChange={(e) => updateStatus(idx, { isFinal: e.target.checked })}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'transparent',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      opacity: idx === 0 ? 0.3 : 1,
                      padding: '2px 6px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx >= statuses.length - 1}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'transparent',
                      cursor: idx >= statuses.length - 1 ? 'default' : 'pointer',
                      opacity: idx >= statuses.length - 1 ? 0.3 : 1,
                      padding: '2px 6px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    ▼
                  </button>
                </div>
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => removeStatus(idx)}
                  disabled={statuses.length <= 1}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: statuses.length <= 1 ? 'default' : 'pointer',
                    color: statuses.length <= 1 ? 'var(--color-text-tertiary)' : 'var(--color-danger)',
                    fontSize: '16px',
                    padding: '2px 4px',
                  }}
                  title="Remove status"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {statuses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
          No statuses defined. Click &quot;+ Add Status&quot; to create one.
        </div>
      )}
    </div>
  );
}

/* ─── Labels Editor ─── */

function LabelsEditor({
  initialLabels,
  statuses,
  onSave,
  isSaving,
}: {
  initialLabels: DefaultLabelConfig[];
  statuses: DefaultStatusConfig[];
  onSave: (data: { statuses: DefaultStatusConfig[]; labels: DefaultLabelConfig[] }) => void;
  isSaving: boolean;
}) {
  const [labels, setLabels] = useState<DefaultLabelConfig[]>(initialLabels);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  const addLabel = () => {
    const newLabel: DefaultLabelConfig = {
      name: '',
      color: COLOR_PRESETS[labels.length % COLOR_PRESETS.length],
    };
    setLabels([...labels, newLabel]);
    setEditingIdx(labels.length);
  };

  const updateLabel = (idx: number, changes: Partial<DefaultLabelConfig>) => {
    setLabels(labels.map((l, i) => (i === idx ? { ...l, ...changes } : l)));
  };

  const removeLabel = (idx: number) => {
    setLabels(labels.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const handleSave = () => {
    onSave({ statuses, labels });
  };

  const isDirty = JSON.stringify(labels) !== JSON.stringify(initialLabels);

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse' as const,
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left' as const,
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '14px',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          Default Labels ({labels.length})
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={addLabel}>
            + Add Label
          </Button>
          {isDirty && (
            <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Color</th>
            <th style={thStyle}>Name</th>
            <th style={{ ...thStyle, width: '100px' }}>Preview</th>
            <th style={{ ...thStyle, width: '60px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, idx) => (
            <tr key={idx}>
              <td style={tdStyle}>
                <input
                  type="color"
                  value={label.color}
                  onChange={(e) => updateLabel(idx, { color: e.target.value })}
                  style={{
                    width: '32px',
                    height: '28px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                />
              </td>
              <td style={tdStyle}>
                {editingIdx === idx ? (
                  <input
                    value={label.name}
                    onChange={(e) => updateLabel(idx, { name: e.target.value })}
                    onBlur={() => setEditingIdx(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingIdx(null)}
                    autoFocus
                    style={{
                      fontSize: '14px',
                      padding: '4px 8px',
                      border: '1px solid var(--color-accent)',
                      borderRadius: 'var(--radius-sm)',
                      outline: 'none',
                      width: '100%',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingIdx(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    {label.name || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Click to edit</span>}
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                {label.name && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 500,
                      borderRadius: '9999px',
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                      border: `1px solid ${label.color}40`,
                    }}
                  >
                    {label.name}
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                <button
                  onClick={() => removeLabel(idx)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                    fontSize: '16px',
                    padding: '2px 4px',
                  }}
                  title="Remove label"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {labels.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
          No default labels defined. Click &quot;+ Add Label&quot; to create one.
          Labels are optional — projects can always create their own.
        </div>
      )}
    </div>
  );
}
