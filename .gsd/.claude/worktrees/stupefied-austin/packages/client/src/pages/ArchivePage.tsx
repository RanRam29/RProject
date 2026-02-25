import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import { BreadcrumbNav } from '../components/layout/BreadcrumbNav';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../stores/ui.store';
import type { ProjectDTO } from '@pm/shared';

/* ------------------------------------------------------------------ */
/*  Inline icons                                                       */
/* ------------------------------------------------------------------ */

const SearchIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ArchiveBoxIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const UnarchiveIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <polyline points="12 17 12 11" />
    <polyline points="9 14 12 11 15 14" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const OpenIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

interface DeleteConfirmModalProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen, projectName, onConfirm, onCancel, isPending,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'var(--color-bg-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000, padding: '24px',
        animation: 'fadeIn var(--transition-fast) ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px', width: '100%', maxWidth: '420px',
          animation: 'scaleIn var(--transition-fast) ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-danger)', margin: '0 0 12px' }}>
          Delete Project
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete <strong style={{ color: 'var(--color-text-primary)' }}>"{projectName}"</strong>?
          This will delete all tasks, history, and data. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  ArchivePage component                                              */
/* ------------------------------------------------------------------ */

const ArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProjectDTO | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects', 'ARCHIVED'],
    queryFn: () => projectsApi.list(1, 200, 'ARCHIVED'),
  });

  const archivedProjects: ProjectDTO[] = projectsResponse?.data ?? [];

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return archivedProjects;
    const q = searchQuery.toLowerCase();
    return archivedProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [archivedProjects, searchQuery]);

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.updateStatus(projectId, 'ACTIVE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      addToast({ type: 'success', message: 'Project restored to active!' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to restore project' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
      addToast({ type: 'success', message: 'Project deleted permanently' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to delete project' });
    },
  });

  // Bulk unarchive
  const handleBulkUnarchive = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => projectsApi.updateStatus(id, 'ACTIVE')));
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedIds(new Set());
      addToast({ type: 'success', message: `${ids.length} project(s) restored to active!` });
    } catch {
      addToast({ type: 'error', message: 'Failed to restore some projects' });
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => projectsApi.delete(id)));
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      addToast({ type: 'success', message: `${ids.length} project(s) deleted permanently` });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete some projects' });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all var(--transition-fast)',
    animation: 'fadeIn var(--transition-normal) ease',
  };

  return (
    <>
      <BreadcrumbNav items={[{ label: 'Archive' }]} />

      <div style={{ marginTop: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
              Archived Projects
            </h1>
            {archivedProjects.length > 0 && (
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '2px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}>
                {archivedProjects.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived..."
                style={{
                  padding: '6px 12px 6px 32px', fontSize: '13px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  outline: 'none', width: '200px',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', marginBottom: '16px',
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            color: '#fff', fontSize: '13px',
            animation: 'slideDown var(--transition-fast) ease',
          }}>
            <span style={{ fontWeight: 600 }}>{selectedIds.size} selected</span>
            <span style={{ opacity: 0.6 }}>|</span>

            <button
              onClick={handleBulkUnarchive}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <UnarchiveIcon size={12} /> Restore All
            </button>

            {bulkDeleteConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>Delete {selectedIds.size} projects?</span>
                <button
                  onClick={handleBulkDelete}
                  style={{
                    background: 'var(--color-danger)', border: 'none', color: '#fff',
                    padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                    padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                  padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <TrashIcon size={12} /> Delete All
              </button>
            )}

            <div style={{ flex: 1 }} />
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Select all / count header */}
        {filteredProjects.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '12px', padding: '0 4px',
          }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', color: 'var(--color-text-secondary)',
              cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredProjects.length && filteredProjects.length > 0}
                onChange={toggleSelectAll}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              Select All
            </label>
          </div>
        )}

        {/* Project List */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '16px', padding: '60px 20px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <ArchiveBoxIcon />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {searchQuery ? 'No matching archived projects' : 'No archived projects'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                {searchQuery
                  ? 'Try a different search term.'
                  : 'When you archive a project, it will appear here.'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  ...cardStyle,
                  borderColor: selectedIds.has(project.id)
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  backgroundColor: selectedIds.has(project.id)
                    ? 'var(--color-accent-light)'
                    : 'var(--color-bg-elevated)',
                }}
                onMouseEnter={(e) => {
                  if (!selectedIds.has(project.id)) {
                    e.currentTarget.style.borderColor = 'var(--color-border-hover, var(--color-accent))';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedIds.has(project.id)) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(project.id)}
                  onChange={() => toggleSelection(project.id)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)', cursor: 'pointer', flexShrink: 0 }}
                />

                {/* Project Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '15px', fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {project.name}
                  </div>
                  {project.description && (
                    <div style={{
                      fontSize: '13px', color: 'var(--color-text-tertiary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {project.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    {project.updatedAt && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                        Archived {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    title="Open project"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    <OpenIcon />
                  </button>

                  <button
                    onClick={() => unarchiveMutation.mutate(project.id)}
                    title="Restore project"
                    disabled={unarchiveMutation.isPending}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px',
                      height: '32px',
                      padding: '0 12px',
                      border: '1px solid var(--color-success)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-success)',
                      cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-success)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-success)';
                    }}
                  >
                    <UnarchiveIcon size={12} />
                    Restore
                  </button>

                  <button
                    onClick={() => setDeleteTarget(project)}
                    title="Delete permanently"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-tertiary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-danger)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = 'var(--color-danger)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        projectName={deleteTarget?.name || ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMutation.isPending}
      />
    </>
  );
};

export default ArchivePage;
