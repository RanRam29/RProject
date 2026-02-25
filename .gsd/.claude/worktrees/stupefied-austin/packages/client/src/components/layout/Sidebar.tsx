import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { projectsApi } from '../../api/projects.api';
import { SystemRole } from '@pm/shared';

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);


const TemplatesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5" rx="1"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);


const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const AdminIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Nav item data                                                      */
/* ------------------------------------------------------------------ */

interface NavItem { to: string; label: string; icon: React.ReactNode; adminOnly?: boolean; end?: boolean; }

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/templates',  label: 'Templates',  icon: <TemplatesIcon /> },
  { to: '/archive',    label: 'Archive',    icon: <ArchiveIcon /> },
  { to: '/settings',   label: 'Settings',   icon: <SettingsIcon />, adminOnly: true },
  { to: '/admin',      label: 'Admin',      icon: <AdminIcon />, adminOnly: true },
];

/* project color dots */
const DOT_COLORS = ['#5B8DEF','#34D399','#A78BFA','#FB7185','#FBBF24','#38BDF8','#F97316'];

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, isMobile, onNavigate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: recentProjectsData } = useQuery({
    queryKey: ['projects', 'sidebar'],
    queryFn: () => projectsApi.list(1, 6, 'ACTIVE'),
    staleTime: 30_000,
  });
  const recentProjects = recentProjectsData?.data ?? [];

  const handleNav = () => { if (isMobile && onNavigate) onNavigate(); };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && !collapsed && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            backgroundColor: 'var(--color-bg-overlay)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeIn var(--transition-fast) ease',
          }}
        />
      )}

      <aside style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, bottom: 0,
        width: collapsed ? '0' : 'var(--sidebar-width)',
        minWidth: collapsed ? '0' : 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: collapsed ? 'none' : '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: isMobile ? 'none' : 'width var(--transition-normal), min-width var(--transition-normal)',
        zIndex: isMobile ? 1000 : 1,
        boxShadow: isMobile && !collapsed ? 'var(--shadow-xl)' : 'none',
        flexShrink: 0,
      }}>

        {/* ── Header / Logo ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 'var(--topbar-height)', padding: '0 16px',
          borderBottom: '1px solid var(--sidebar-border)',
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', whiteSpace: 'nowrap' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #5B8DEF 0%, #A78BFA 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(91,141,239,0.35)',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '12px', letterSpacing: '-0.3px' }}>RP</span>
            </div>
            <span style={{
              fontSize: '15px', fontWeight: 700, color: 'var(--sidebar-text-active)',
              letterSpacing: '-0.3px', whiteSpace: 'nowrap',
            }}>
              RProjects
            </span>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            style={{
              width: '26px', height: '26px', border: 'none', borderRadius: '6px',
              backgroundColor: 'transparent', color: 'var(--sidebar-text)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--transition-fast)', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sidebar-bg-hover)'; e.currentTarget.style.color = 'var(--sidebar-text-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
          >
            {isMobile ? '✕' : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-normal)' }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Main Nav ── */}
        <nav style={{ padding: '14px 10px 8px', flexShrink: 0 }}>
          <SectionLabel>Menu</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '6px' }}>
            {navItems
              .filter(item => !item.adminOnly || user?.systemRole === SystemRole.SYS_ADMIN)
              .map(item => <SidebarLink key={item.to} item={item} onClick={handleNav} />)
            }
          </div>
        </nav>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--sidebar-border)', margin: '4px 12px' }} />

        {/* ── Projects section ── */}
        <div style={{ padding: '10px 10px 8px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '6px' }}>
            <SectionLabel>Projects</SectionLabel>
            <button
              onClick={() => { handleNav(); navigate('/dashboard'); }}
              style={{
                width: '18px', height: '18px', border: 'none', borderRadius: '4px',
                backgroundColor: 'transparent', color: 'var(--sidebar-section-label)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sidebar-bg-hover)'; e.currentTarget.style.color = 'var(--sidebar-text-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-section-label)'; }}
            >
              <PlusIcon />
            </button>
          </div>

          <div style={{ overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
            {recentProjects.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--sidebar-section-label)', padding: '4px 4px', fontStyle: 'italic' }}>
                No projects yet
              </p>
            ) : recentProjects.map((project, i) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}`}
                onClick={handleNav}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 8px', borderRadius: '8px',
                  fontSize: '13px', textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  backgroundColor: isActive ? 'var(--sidebar-bg-active)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.getAttribute('aria-current')) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-bg-hover)';
                    e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.getAttribute('aria-current')) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: DOT_COLORS[i % DOT_COLORS.length], flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{project.name}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* ── Footer: New Project ── */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
          <button
            onClick={() => { handleNav(); navigate('/dashboard'); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '9px 12px', border: '1.5px dashed var(--sidebar-border)',
              borderRadius: '9px', backgroundColor: 'transparent',
              color: 'var(--sidebar-text)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all var(--transition-fast)', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--sidebar-accent-bg)';
              e.currentTarget.style.borderColor = 'var(--sidebar-accent)';
              e.currentTarget.style.color = 'var(--sidebar-text-active)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--sidebar-border)';
              e.currentTarget.style.color = 'var(--sidebar-text)';
            }}
          >
            <PlusIcon />
            New Project
          </button>
        </div>
      </aside>
    </>
  );
};

/* ── Helpers ── */

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.7px',
    textTransform: 'uppercase', color: 'var(--sidebar-section-label)',
    padding: '0 4px', whiteSpace: 'nowrap',
  }}>
    {children}
  </div>
);

const SidebarLink: React.FC<{ item: NavItem; onClick?: () => void }> = ({ item, onClick }) => (
  <NavLink
    to={item.to}
    end={item.end}
    onClick={onClick}
    style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: '9px',
      padding: '8px 8px', borderRadius: '8px',
      fontSize: '13.5px', textDecoration: 'none',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
      backgroundColor: isActive ? 'var(--sidebar-bg-active)' : 'transparent',
      transition: 'all var(--transition-fast)',
      whiteSpace: 'nowrap',
    })}
    onMouseEnter={e => {
      if (!e.currentTarget.classList.contains('active')) {
        e.currentTarget.style.backgroundColor = 'var(--sidebar-bg-hover)';
        e.currentTarget.style.color = 'var(--sidebar-text-hover)';
      }
    }}
    onMouseLeave={e => {
      if (!e.currentTarget.classList.contains('active')) {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--sidebar-text)';
      }
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
    <span>{item.label}</span>
  </NavLink>
);
