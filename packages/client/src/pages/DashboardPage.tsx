import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactGridLayout, { Responsive } from 'react-grid-layout';
const WidthProvider = (ReactGridLayout as any).WidthProvider;
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { projectsApi } from '../api/projects.api';
import { useAuthStore } from '../stores/auth.store';
import type { ProjectDTO } from '@pm/shared';

// Components
import { PlusIcon, SearchIcon, FolderIcon, card } from '../components/dashboard/shared';
import { NewProjectModal } from '../components/dashboard/NewProjectModal';
import { StatsCardsWidget } from '../components/dashboard/StatsCardsWidget';
import { MyTasksWidget } from '../components/dashboard/MyTasksWidget';
import { UpcomingWidget } from '../components/dashboard/UpcomingWidget';
import { ActivityWidget } from '../components/dashboard/ActivityWidget';
import { VelocityWidget } from '../components/dashboard/VelocityWidget';
import { DistributionWidget } from '../components/dashboard/DistributionWidget';
import { ProjectCard } from '../components/dashboard/ProjectCard';

const ResponsiveGridLayout = WidthProvider(Responsive);

const injectCSS = `
  @media (max-width: 640px) {
    .db-projects-grid { grid-template-columns: 1fr !important; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .react-grid-item.react-grid-placeholder {
    background: var(--color-accent) !important;
    opacity: 0.2 !important;
    border-radius: var(--radius-lg);
  }
  .react-grid-item > .react-resizable-handle {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .react-grid-item:hover > .react-resizable-handle {
    opacity: 1;
  }
`;

// Initial default layout configuration
const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 2, static: true },
    { i: 'tasks', x: 0, y: 2, w: 4, h: 5 },
    { i: 'upcoming', x: 4, y: 2, w: 4, h: 5 },
    { i: 'distribution', x: 8, y: 2, w: 4, h: 5 },
    { i: 'velocity', x: 0, y: 7, w: 8, h: 5 },
    { i: 'activity', x: 8, y: 7, w: 4, h: 5 },
  ],
  md: [
    { i: 'stats', x: 0, y: 0, w: 10, h: 2, static: true },
    { i: 'tasks', x: 0, y: 2, w: 5, h: 5 },
    { i: 'upcoming', x: 5, y: 2, w: 5, h: 5 },
    { i: 'distribution', x: 0, y: 7, w: 5, h: 5 },
    { i: 'velocity', x: 5, y: 7, w: 5, h: 5 },
    { i: 'activity', x: 0, y: 12, w: 10, h: 5 },
  ],
  sm: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 2, static: true },
    { i: 'tasks', x: 0, y: 2, w: 6, h: 4 },
    { i: 'upcoming', x: 0, y: 6, w: 6, h: 4 },
    { i: 'distribution', x: 0, y: 10, w: 6, h: 4 },
    { i: 'velocity', x: 0, y: 14, w: 6, h: 4 },
    { i: 'activity', x: 0, y: 18, w: 6, h: 4 },
  ]
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Try to load user's custom layout from localStorage
  const [layouts, setLayouts] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_dashboard_layouts');
      return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
    } catch {
      return DEFAULT_LAYOUTS;
    }
  });

  const onLayoutChange = (_layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('pm_dashboard_layouts', JSON.stringify(allLayouts));
  };

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
            Customize your workflow. Drag to rearrange panels.
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
          New Project
        </button>
      </div>

      {/* ── Grid Layout ── */}
      <div style={{ margin: '0 -10px', marginBottom: '24px' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={onLayoutChange}
          draggableHandle=".drag-handle"
          margin={[20, 20]}
        >
          {/* Keyed panels */}
          <div key="stats" style={{ cursor: 'default' }}>
            <StatsCardsWidget />
          </div>
          <div key="tasks" className="drag-handle" style={{ cursor: 'grab' }}>
            <MyTasksWidget />
          </div>
          <div key="upcoming" className="drag-handle" style={{ cursor: 'grab' }}>
            <UpcomingWidget />
          </div>
          <div key="distribution" className="drag-handle" style={{ cursor: 'grab' }}>
            <DistributionWidget />
          </div>
          <div key="velocity" className="drag-handle" style={{ cursor: 'grab' }}>
            <VelocityWidget />
          </div>
          <div key="activity" className="drag-handle" style={{ cursor: 'grab' }}>
            <ActivityWidget />
          </div>
        </ResponsiveGridLayout>
      </div>


      {/* ── Projects section ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
            {searchQuery ? `Results for "${searchQuery}"` : 'Recent Projects'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 11px', height: '34px', backgroundColor: 'var(--color-bg-elevated)', border: '1.5px solid var(--color-border)', borderRadius: '9px', color: 'var(--color-text-tertiary)', minWidth: '200px' }}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search active projects..."
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
