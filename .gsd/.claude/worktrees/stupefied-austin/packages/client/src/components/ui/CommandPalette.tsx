import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useAuthStore } from '../../stores/auth.store';
import type { ProjectDTO } from '@pm/shared';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'navigation' | 'project' | 'action';
  action: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: isOpen,
  });

  const projects: ProjectDTO[] = projectsResponse?.data ?? [];

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View your dashboard',
        icon: '\uD83C\uDFE0',
        category: 'navigation',
        action: () => navigate('/dashboard'),
      },
      {
        id: 'nav-templates',
        label: 'Go to Templates',
        description: 'Browse project templates',
        icon: '\uD83D\uDCCB',
        category: 'navigation',
        action: () => navigate('/templates'),
      },
      {
        id: 'nav-profile',
        label: 'Go to Profile',
        description: 'Edit your profile settings',
        icon: '\uD83D\uDC64',
        category: 'navigation',
        action: () => navigate('/profile'),
      },
    ];

    if (user?.systemRole === 'SYS_ADMIN') {
      items.push({
        id: 'nav-admin',
        label: 'Go to Admin',
        description: 'System administration',
        icon: '\u2699\uFE0F',
        category: 'navigation',
        action: () => navigate('/admin'),
      });
    }

    // Add projects
    projects.forEach((p) => {
      items.push({
        id: `project-${p.id}`,
        label: p.name,
        description: p.description || 'Open project',
        icon: '\uD83D\uDCC2',
        category: 'project',
        action: () => navigate(`/projects/${p.id}`),
      });
    });

    return items;
  }, [projects, navigate, user?.systemRole]);

  // Filter by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
        }
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 9900,
    paddingTop: '15vh',
    animation: 'fadeIn var(--transition-fast) ease',
  };

  const paletteStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'navigation': return 'Navigation';
      case 'project': return 'Projects';
      case 'action': return 'Actions';
      default: return cat;
    }
  };

  // Group by category
  const grouped = filteredCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div style={overlayStyle} onClick={() => setIsOpen(false)}>
      <div style={paletteStyle} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          style={inputStyle}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyNav}
          placeholder="Type a command or search..."
        />
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
              No results found
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div style={{
                  padding: '8px 16px 4px',
                  fontSize: '11px', fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {getCategoryLabel(category)}
                </div>
                {items.map((cmd) => {
                  const thisIndex = globalIndex++;
                  const isSelected = thisIndex === selectedIndex;

                  return (
                    <div
                      key={cmd.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--color-accent-light)' : 'transparent',
                        transition: 'background var(--transition-fast)',
                      }}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(thisIndex)}
                    >
                      {cmd.icon && (
                        <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>
                          {cmd.icon}
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {cmd.label}
                        </div>
                        {cmd.description && (
                          <div style={{
                            fontSize: '12px', color: 'var(--color-text-tertiary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {cmd.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '11px', color: 'var(--color-text-tertiary)',
          display: 'flex', gap: '12px',
        }}>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '10px' }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '10px' }}>↵</kbd> Open</span>
          <span><kbd style={{ padding: '1px 4px', border: '1px solid var(--color-border)', borderRadius: '3px', fontSize: '10px' }}>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
