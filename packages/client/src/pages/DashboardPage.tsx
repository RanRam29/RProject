import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import { usersApi, type MyTaskDTO } from '../api/users.api';
import { BreadcrumbNav } from '../components/layout/BreadcrumbNav';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { PRIORITY_CONFIG } from '@pm/shared';
import type { ProjectDTO } from '@pm/shared';

/* ------------------------------------------------------------------ */
/*  Inline icons                                                       */
/* ------------------------------------------------------------------ */

const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FolderIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const SearchIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  New Project Modal                                                  */
/* ------------------------------------------------------------------ */

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      projectsApi.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      addToast({ type: 'success', message: 'Project created!' });
      setName('');
      setDescription('');
      onClose();
      navigate(`/projects/${project.id}`);
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create project' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--color-bg-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000,
    padding: '24px',
    animation: 'fadeIn var(--transition-fast) ease',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    animation: 'scaleIn var(--transition-fast) ease',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>New Project</h2>
          <button
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', border: 'none', borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent', color: 'var(--color-text-tertiary)',
              cursor: 'pointer', fontSize: '18px', transition: 'all var(--transition-fast)',
            }}
            onClick={handleClose}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Project Name *</label>
            <input
              style={inputStyle} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign" autoFocus
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional project description..."
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  My Tasks Section                                                   */
/* ------------------------------------------------------------------ */

const MyTasksSection: React.FC = () => {
  const navigate = useNavigate();
  const { data: myTasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => usersApi.getMyTasks(10),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: '16px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
        Loading your tasks...
      </div>
    );
  }

  if (myTasks.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--color-text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
        No tasks assigned to you.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {myTasks.map((task: MyTaskDTO) => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status?.isFinal;
        const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];

        return (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
            onClick={() => navigate(`/projects/${task.projectId}`)}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {priorityCfg && task.priority !== 'NONE' && (
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: priorityCfg.color, flexShrink: 0,
              }} />
            )}
            <span style={{
              flex: 1, fontSize: '13px', fontWeight: 500,
              color: task.status?.isFinal ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
              textDecoration: task.status?.isFinal ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.title}
            </span>
            <span style={{
              fontSize: '11px', color: 'var(--color-text-tertiary)',
              padding: '1px 6px', backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
            }}>
              {task.project?.name || 'Unknown'}
            </span>
            {task.status && (
              <span style={{
                fontSize: '10px', padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: task.status.color + '20',
                color: task.status.color, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {task.status.name}
              </span>
            )}
            {task.dueDate && (
              <span style={{
                fontSize: '11px', whiteSpace: 'nowrap',
                color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
              }}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DashboardPage component                                            */
/* ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const projects: ProjectDTO[] = projectsResponse?.data ?? [];

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    animation: 'fadeIn var(--transition-normal) ease',
  };

  const cardNameStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '8px',
  };

  const cardMetaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  };

  const statusBadgeStyle = (status: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: status === 'ACTIVE' ? 'var(--color-success-light)' : 'var(--color-bg-tertiary)',
    color: status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
  });

  const emptyCardStyle: React.CSSProperties = {
    ...cardStyle,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 20px',
    borderStyle: 'dashed',
    cursor: 'pointer',
  };

  return (
    <>
      <BreadcrumbNav items={[{ label: 'Dashboard' }]} />

      <div style={{ marginTop: '16px' }}>
        {/* Header with greeting and search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
            {user?.displayName ? `Welcome, ${user.displayName.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                style={{
                  padding: '6px 12px 6px 32px',
                  fontSize: '13px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  width: '200px',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }}>
                <SearchIcon />
              </span>
            </div>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusIcon size={14} />
                New Project
              </span>
            </Button>
          </div>
        </div>

        {/* My Tasks Section */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11zm5.854 10.854a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L8 9.793l5.146-5.147a.5.5 0 0 1 .708.708l-5.5 5.5z" />
            </svg>
            My Tasks
          </div>
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            maxHeight: '320px',
            overflowY: 'auto',
          }}>
            <MyTasksSection />
          </div>
        </div>

        {/* Recent Projects */}
        {!searchQuery && recentProjects.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
              </svg>
              Recent Projects
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    minWidth: '200px',
                    maxWidth: '240px',
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    flexShrink: 0,
                  }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Projects */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            {searchQuery ? `Search results for "${searchQuery}"` : 'All Projects'}
          </div>

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
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  style={cardStyle}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={cardNameStyle}>{project.name}</div>
                  {project.description && (
                    <div style={{
                      fontSize: '13px', color: 'var(--color-text-secondary)',
                      marginBottom: '12px', lineHeight: 1.4, overflow: 'hidden',
                      textOverflow: 'ellipsis', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {project.description}
                    </div>
                  )}
                  <div style={cardMetaStyle}>
                    <span style={statusBadgeStyle(project.status)}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: project.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-secondary)',
                      }} />
                      {project.status}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {!searchQuery && (
                <div
                  style={emptyCardStyle}
                  onClick={() => setModalOpen(true)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                  }}
                >
                  <FolderIcon />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                    Create a new project
                  </span>
                </div>
              )}

              {searchQuery && filteredProjects.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--color-text-tertiary)' }}>
                  No projects match your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NewProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default DashboardPage;
