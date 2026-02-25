import { useState } from 'react';
import type { TaskStatusDTO } from '@pm/shared';
import { TaskPriority, PRIORITY_CONFIG } from '@pm/shared';

interface BulkActionToolbarProps {
  selectedCount: number;
  statuses: TaskStatusDTO[];
  members: Array<{ id: string; displayName: string }>;
  onMove: (statusId: string) => void;
  onAssign: (assigneeId: string | null) => void;
  onSetPriority: (priority: string) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  statuses,
  members,
  onMove,
  onAssign,
  onSetPriority,
  onDelete,
  onClearSelection,
}: BulkActionToolbarProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'var(--color-accent)',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontSize: '13px',
    animation: 'slideDown var(--transition-fast) ease',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    minWidth: '180px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 50,
    maxHeight: '200px',
    overflowY: 'auto',
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const actionBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    position: 'relative',
  };

  return (
    <div style={toolbarStyle}>
      <span style={{ fontWeight: 600 }}>{selectedCount} selected</span>
      <span style={{ opacity: 0.6 }}>|</span>

      {/* Move */}
      <div style={{ position: 'relative' }}>
        <button
          style={actionBtnStyle}
          onClick={() => setActiveAction(activeAction === 'move' ? null : 'move')}
        >
          Move to...
        </button>
        {activeAction === 'move' && (
          <div style={dropdownStyle}>
            {statuses.map((s) => (
              <div
                key={s.id}
                style={dropdownItemStyle}
                onClick={() => { onMove(s.id); setActiveAction(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign */}
      <div style={{ position: 'relative' }}>
        <button
          style={actionBtnStyle}
          onClick={() => setActiveAction(activeAction === 'assign' ? null : 'assign')}
        >
          Assign to...
        </button>
        {activeAction === 'assign' && (
          <div style={dropdownStyle}>
            <div
              style={{ ...dropdownItemStyle, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}
              onClick={() => { onAssign(null); setActiveAction(null); }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              Unassign
            </div>
            {members.map((m) => (
              <div
                key={m.id}
                style={dropdownItemStyle}
                onClick={() => { onAssign(m.id); setActiveAction(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {m.displayName}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div style={{ position: 'relative' }}>
        <button
          style={actionBtnStyle}
          onClick={() => setActiveAction(activeAction === 'priority' ? null : 'priority')}
        >
          Set Priority
        </button>
        {activeAction === 'priority' && (
          <div style={dropdownStyle}>
            {Object.values(TaskPriority).map((p) => (
              <div
                key={p}
                style={dropdownItemStyle}
                onClick={() => { onSetPriority(p); setActiveAction(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PRIORITY_CONFIG[p].color }} />
                {PRIORITY_CONFIG[p].label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      {showDeleteConfirm ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px' }}>Delete {selectedCount} tasks?</span>
          <button
            style={{ ...actionBtnStyle, background: 'var(--color-danger)' }}
            onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
          >
            Confirm
          </button>
          <button
            style={actionBtnStyle}
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          style={{ ...actionBtnStyle, background: 'rgba(255,255,255,0.1)' }}
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete
        </button>
      )}

      <div style={{ flex: 1 }} />
      <button
        style={actionBtnStyle}
        onClick={onClearSelection}
      >
        Clear Selection
      </button>
    </div>
  );
}
