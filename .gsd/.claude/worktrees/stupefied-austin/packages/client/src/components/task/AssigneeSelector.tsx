import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../../api/permissions.api';

interface AssigneeSelectorProps {
  projectId: string;
  selectedAssigneeId: string | null;
  onChange: (assigneeId: string | null) => void;
}

export function AssigneeSelector({ projectId, selectedAssigneeId, onChange }: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
    staleTime: 60_000,
  });

  const members = permissions.map((p) => ({
    id: p.userId,
    displayName: p.user?.displayName || p.user?.email || 'Unknown',
    email: p.user?.email || '',
  }));

  const selectedMember = members.find((m) => m.id === selectedAssigneeId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    height: '38px',
    padding: '8px 12px',
    fontSize: '14px',
    color: selectedMember ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    backgroundColor: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 50,
    maxHeight: '200px',
    overflowY: 'auto',
  };

  const itemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const avatarStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-accent)',
    flexShrink: 0,
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        style={triggerStyle}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedMember ? (
            <>
              <span style={avatarStyle}>{getInitials(selectedMember.displayName)}</span>
              {selectedMember.displayName}
            </>
          ) : (
            'Unassigned'
          )}
        </span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.5 }}>
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
        </svg>
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          <div
            style={{ ...itemStyle, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}
            onClick={() => { onChange(null); setIsOpen(false); }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Unassigned
          </div>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                ...itemStyle,
                backgroundColor: m.id === selectedAssigneeId ? 'var(--color-bg-tertiary)' : undefined,
              }}
              onClick={() => { onChange(m.id); setIsOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = m.id === selectedAssigneeId ? 'var(--color-bg-tertiary)' : 'transparent';
              }}
            >
              <span style={avatarStyle}>{getInitials(m.displayName)}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{m.displayName}</div>
                {m.email && <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{m.email}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
