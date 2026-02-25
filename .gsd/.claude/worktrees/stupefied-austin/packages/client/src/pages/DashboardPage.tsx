import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/projects.api';
import { usersApi, type MyTaskDTO } from '../api/users.api';
import { activityApi, type ActivityLogDTO } from '../api/activity.api';
import { useUIStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { PRIORITY_CONFIG } from '@pm/shared';
import type { ProjectDTO } from '@pm/shared';
import { formatAction, timeAgo } from '../utils/activity.utils';

/* ------------------------------------------------------------------ */
/*  Responsive styles injected once                                    */
/* ------------------------------------------------------------------ */

const injectCSS = `
  @media (max-width: 900px) {
    .db-main-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .db-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .db-projects-grid { grid-template-columns: 1fr !important; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ------------------------------------------------------------------ */
/*  Shared design tokens (mirrors CSS vars for inline use)             */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-elevated)',
  borderRadius: '14px',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
};

const cardHover = {
  onEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
    e.currentTarget.style.transform = 'translateY(-2px)';
  },
  onLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
    e.currentTarget.style.transform = 'translateY(0)';
  },
};

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const FolderIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  New Project Modal                                                  */
/* ------------------------------------------------------------------ */

interface NewProjectModalProps { isOpen: boolean; onClose: () => void; }

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useUIStore(s => s.addToast);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => projectsApi.create(data),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      addToast({ type: 'success', message: 'Project created!' });
      setName(''); setDescription(''); onClose();
      navigate(`/projects/${project.id}`);
    },
    onError: () => addToast({ type: 'error', message: 'Failed to create project' }),
  });

  if (!isOpen) return null;

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid var(--color-border)',
    borderRadius: '9px', fontSize: '14px',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    outline: 'none', transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: '24px', animation: 'fadeIn var(--transition-fast) ease', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ ...card, padding: '28px', width: '100%', maxWidth: '460px', animation: 'scaleIn var(--transition-fast) ease', boxShadow: 'var(--shadow-xl)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>New Project</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>Set up your workspace</p>
          </div>
          <button onClick={onClose} style={{ width: '30px', height: '30px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >&times;</button>
        </div>

        <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; createMutation.mutate({ name: name.trim(), description: description.trim() || undefined }); }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.2px' }}>
              Project Name <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website Redesign" autoFocus
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-light)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', letterSpacing: '0.2px' }}>Description</label>
            <textarea style={{ ...inp, minHeight: '76px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-light)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', border: '1.5px solid var(--color-border)', borderRadius: '9px', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >Cancel</button>
            <button type="submit" disabled={!name.trim() || createMutation.isPending}
              style={{ padding: '9px 20px', border: 'none', borderRadius: '9px', background: 'linear-gradient(135deg, #5B8DEF, #4A7ADE)', color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', transition: 'all var(--transition-fast)', opacity: !name.trim() || createMutation.isPending ? 0.6 : 1, boxShadow: '0 2px 8px rgba(91,141,239,0.3)' }}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Stats Cards                                                        */
/* ------------------------------------------------------------------ */

const STAT_CONFIGS = [
  { key: 'totalTasks',        label: 'Active Tasks',        color: '#5B8DEF', bg: '#EBF2FF', icon: '📋' },
  { key: 'overdueTasks',      label: 'Overdue',             color: '#F87171', bg: '#FEE2E2', icon: '⚠️' },
  { key: 'completedThisWeek', label: 'Done This Week',      color: '#34D399', bg: '#D1FAE5', icon: '✅' },
  { key: 'teamMembers',       label: 'Team Members',        color: '#A78BFA', bg: '#EDE9FE', icon: '👥' },
] as const;

const StatsCardsSection: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => usersApi.getMyStats(),
    staleTime: 60_000,
  });

  return (
    <div className="db-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
      {STAT_CONFIGS.map(cfg => {
        const value = stats?.[cfg.key] ?? '—';
        return (
          <div key={cfg.key} style={{ ...card, padding: '18px 20px', transition: 'all var(--transition-fast)', cursor: 'default' }}
            onMouseEnter={cardHover.onEnter} onMouseLeave={cardHover.onLeave}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
                {cfg.icon}
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-1px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '5px', fontWeight: 500 }}>{cfg.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Recent Activity Panel                                              */
/* ------------------------------------------------------------------ */

const RecentActivityPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['my-activity'],
    queryFn: () => activityApi.listUserActivity(12),
    staleTime: 30_000,
  });

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Recent Activity</h3>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isLoading ? (
          <div style={{ padding: '24px 20px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
            No recent activity yet.
          </div>
        ) : logs.map((log: ActivityLogDTO) => {
          const { verb } = formatAction(log.action, log.metadata as Record<string, unknown>);
          const initial = log.user?.displayName?.charAt(0).toUpperCase() || '?';
          return (
            <div
              key={log.id}
              onClick={() => navigate(`/projects/${log.projectId}`)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Avatar */}
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #5B8DEF, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {log.user?.avatarUrl
                  ? <img src={log.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{initial}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600 }}>{log.user?.displayName || 'Someone'}</span>
                  {' '}<span style={{ color: 'var(--color-text-secondary)' }}>{verb}</span>
                  {log.project && (
                    <> {' '}
                      <span style={{ fontWeight: 500, color: 'var(--color-accent)' }}>{log.project.name}</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', color: 'var(--color-text-tertiary)', fontSize: '11.5px' }}>
                  <ClockIcon />
                  {timeAgo(log.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  My Tasks Panel                                                     */
/* ------------------------------------------------------------------ */

const MyTasksPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data: myTasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => usersApi.getMyTasks(8),
    staleTime: 30_000,
  });

  const priorityBadge = (priority: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      URGENT: { bg: '#FEE2E2', color: '#991B1B' },
      HIGH:   { bg: '#FFE4E6', color: '#9F1239' },
      MEDIUM: { bg: '#FEF3C7', color: '#92400E' },
      LOW:    { bg: '#D1FAE5', color: '#065F46' },
    };
    const c = map[priority] ?? { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' };
    return { ...c, padding: '2px 8px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap' };
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>My Tasks</h3>
      </div>
      <div style={{ padding: '6px 0' }}>
        {isLoading ? (
          <div style={{ padding: '20px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Loading…</div>
        ) : myTasks.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>No tasks assigned.</div>
        ) : myTasks.map((task: MyTaskDTO) => {
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status?.isFinal;
          return (
            <div
              key={task.id}
              onClick={() => navigate(`/projects/${task.projectId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)', borderBottom: '1px solid transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {/* Priority dot */}
              {task.priority !== 'NONE' && (() => {
                const cfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                return cfg ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} /> : null;
              })()}

              {/* Title */}
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.status?.isFinal ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', textDecoration: task.status?.isFinal ? 'line-through' : 'none' }}>
                {task.title}
              </span>

              {/* Priority badge */}
              {task.priority && task.priority !== 'NONE' && (
                <span style={priorityBadge(task.priority)}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</span>
              )}

              {/* Project name */}
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', padding: '2px 6px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                {task.project?.name}
              </span>

              {/* Due date */}
              {task.dueDate && (
                <span style={{ fontSize: '11.5px', fontWeight: 500, color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Upcoming Deadlines Panel                                           */
/* ------------------------------------------------------------------ */

const UpcomingPanel: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400_000);

  const { data: tasks = [] } = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: () => usersApi.getMyTasks(8, { dueAfter: now.toISOString(), dueBefore: week.toISOString() }),
    staleTime: 60_000,
  });

  const dueLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.ceil((d.getTime() - now.getTime()) / 86400_000);
    if (diff <= 0) return { label: 'Today', color: 'var(--color-danger)' };
    if (diff === 1) return { label: 'Tomorrow', color: 'var(--color-warning)' };
    return { label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), color: 'var(--color-text-secondary)' };
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.2px' }}>Upcoming Deadlines</h3>
        <p style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', margin: '2px 0 0' }}>Next 7 days</p>
      </div>
      <div style={{ padding: '6px 0' }}>
        {tasks.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
            🎉 No upcoming deadlines!
          </div>
        ) : tasks.map((task: MyTaskDTO) => {
          const cfg = task.dueDate ? dueLabel(task.dueDate) : null;
          return (
            <div
              key={task.id}
              onClick={() => navigate(`/projects/${task.projectId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 18px', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>{task.title}</span>
              <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '6px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{task.project?.name}</span>
              {cfg && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Project Card                                                       */
/* ------------------------------------------------------------------ */

const PROJECT_GRADIENTS = [
  ['#5B8DEF', '#A78BFA'], ['#34D399', '#5B8DEF'], ['#FB7185', '#FBBF24'],
  ['#A78BFA', '#FB7185'], ['#38BDF8', '#34D399'], ['#FBBF24', '#FB7185'],
];

interface ProjectCardProps { project: ProjectDTO; index: number; onClick: () => void; }
const ProjectCard: React.FC<ProjectCardProps> = ({ project, index, onClick }) => {
  const [g1, g2] = PROJECT_GRADIENTS[index % PROJECT_GRADIENTS.length];
  return (
    <div
      onClick={onClick}
      style={{ ...card, padding: '18px 20px', cursor: 'pointer', transition: 'all var(--transition-fast)', display: 'flex', flexDirection: 'column', gap: '10px' }}
      onMouseEnter={cardHover.onEnter} onMouseLeave={cardHover.onLeave}
    >
      {/* Color bar */}
      <div style={{ height: '3px', borderRadius: '999px', background: `linear-gradient(90deg, ${g1}, ${g2})`, marginBottom: '4px' }} />

      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {project.name}
      </div>

      {project.description && (
        <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
          backgroundColor: project.status === 'ACTIVE' ? '#D1FAE5' : 'var(--color-bg-tertiary)',
          color: project.status === 'ACTIVE' ? '#065F46' : 'var(--color-text-secondary)',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: project.status === 'ACTIVE' ? '#34D399' : 'var(--color-text-secondary)' }} />
          {project.status}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  DashboardPage                                                      */
/* ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects', 'ACTIVE'],
    queryFn: () => projectsApi.list(1, 100, 'ACTIVE'),
  });
  const projects: ProjectDTO[] = projectsResponse?.data ?? [];

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [projects, searchQuery]);

  return (
    <>
      <style>{injectCSS}</style>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            {user?.displayName ? `Welcome back, ${user.displayName.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '3px 0 0' }}>
            Here's what's happening across your projects.
          </p>
        </div>

        {/* New project CTA */}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', border: 'none', borderRadius: '10px',
            background: 'linear-gradient(135deg, #5B8DEF, #4A7ADE)',
            color: '#fff', fontSize: '13.5px', fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 3px 12px rgba(91,141,239,0.35)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(91,141,239,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(91,141,239,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <PlusIcon />
          New Task
        </button>
      </div>

      {/* ── Stats ── */}
      <StatsCardsSection />

      {/* ── Main two-column layout (tasks+deadlines LEFT | activity RIGHT) ── */}
      <div className="db-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '18px', marginBottom: '24px' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <MyTasksPanel />
          <UpcomingPanel />
        </div>

        {/* Right column: Recent Activity */}
        <RecentActivityPanel />
      </div>

      {/* ── Projects section ── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
            {searchQuery ? `Results for "${searchQuery}"` : 'Project Overview'}
          </h2>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 11px', height: '34px', backgroundColor: 'var(--color-bg-elevated)', border: '1.5px solid var(--color-border)', borderRadius: '9px', color: 'var(--color-text-tertiary)', minWidth: '200px' }}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--color-text-primary)', flex: 1, minWidth: 0 }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <div className="db-projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {filteredProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} onClick={() => navigate(`/projects/${project.id}`)} />
            ))}

            {/* Create new card */}
            {!searchQuery && (
              <div
                onClick={() => setModalOpen(true)}
                style={{ ...card, padding: '28px 20px', cursor: 'pointer', border: '2px dashed var(--color-border)', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all var(--transition-fast)', backgroundColor: 'transparent', minHeight: '130px' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = 'var(--color-accent-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <FolderIcon />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>Create new project</span>
              </div>
            )}

            {searchQuery && filteredProjects.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
                No projects match your search.
              </div>
            )}
          </div>
        )}
      </div>

      <NewProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default DashboardPage;
