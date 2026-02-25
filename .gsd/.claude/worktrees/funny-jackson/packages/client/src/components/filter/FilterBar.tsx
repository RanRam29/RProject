import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { labelsApi } from '../../api/labels.api';
import { tasksApi } from '../../api/tasks.api';
import { permissionsApi } from '../../api/permissions.api';
import { PRIORITY_CONFIG, TaskPriority } from '@pm/shared';
import type { TaskFilters } from '../../hooks/useTaskFilters';

interface FilterBarProps {
  projectId: string;
  filters: TaskFilters;
  activeCount: number;
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  onClear: () => void;
}

export function FilterBar({ projectId, filters, activeCount, onFilterChange, onClear }: FilterBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', projectId],
    queryFn: () => labelsApi.list(projectId),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
  });

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const priorities = Object.entries(PRIORITY_CONFIG).filter(
    ([key]) => key !== TaskPriority.NONE
  );

  return (
    <div style={barStyle}>
      {/* Search */}
      <div style={{ ...searchWrap, borderColor: searchFocused ? 'var(--color-accent)' : 'var(--color-border)' }}>
        <span style={searchIcon}>&#128269;</span>
        <input
          ref={searchRef}
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search tasks... ( / )"
          style={searchInput}
        />
        {filters.search && (
          <button style={clearBtn} onClick={() => onFilterChange('search', '')} title="Clear search">
            &#215;
          </button>
        )}
      </div>

      {/* Status */}
      <select
        value={filters.statusId}
        onChange={(e) => onFilterChange('statusId', e.target.value)}
        style={{
          ...selectStyle,
          ...(filters.statusId ? activeSelectStyle : {}),
        }}
      >
        <option value="">All Statuses</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={filters.priority}
        onChange={(e) => onFilterChange('priority', e.target.value)}
        style={{
          ...selectStyle,
          ...(filters.priority ? activeSelectStyle : {}),
        }}
      >
        <option value="">All Priorities</option>
        {priorities.map(([key, config]) => (
          <option key={key} value={key}>{config.label}</option>
        ))}
      </select>

      {/* Assignee */}
      <select
        value={filters.assigneeId}
        onChange={(e) => onFilterChange('assigneeId', e.target.value)}
        style={{
          ...selectStyle,
          ...(filters.assigneeId ? activeSelectStyle : {}),
        }}
      >
        <option value="">All Assignees</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.user?.displayName || m.user?.email || m.userId}
          </option>
        ))}
      </select>

      {/* Label */}
      <select
        value={filters.labelId}
        onChange={(e) => onFilterChange('labelId', e.target.value)}
        style={{
          ...selectStyle,
          ...(filters.labelId ? activeSelectStyle : {}),
        }}
      >
        <option value="">All Labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      {/* Active filter count + Clear */}
      {activeCount > 0 && (
        <button style={clearAllBtn} onClick={onClear}>
          Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const barStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '8px 12px',
  alignItems: 'center',
  flexWrap: 'wrap',
  borderBottom: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-primary)',
};

const searchWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-elevated)',
  transition: 'border-color var(--transition-fast)',
  minWidth: 0,
  flex: '1 1 180px',
};

const searchIcon: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-tertiary)',
  flexShrink: 0,
};

const searchInput: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
  flex: 1,
  minWidth: 0,
};

const clearBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  fontSize: '14px',
  padding: '0 2px',
  lineHeight: 1,
};

const selectStyle: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: '12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-elevated)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  outline: 'none',
  maxWidth: 150,
  minWidth: 0,
  flex: '1 1 100px',
};

const activeSelectStyle: React.CSSProperties = {
  borderColor: 'var(--color-accent)',
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-accent-light, rgba(59, 130, 246, 0.1))',
};

const clearAllBtn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'transparent',
  color: 'var(--color-accent)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  marginLeft: 'auto',
};
