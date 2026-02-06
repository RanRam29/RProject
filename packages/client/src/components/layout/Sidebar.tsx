import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SystemRole } from '@pm/shared';
import { Button } from '../ui/Button';

/* ------------------------------------------------------------------ */
/*  Inline SVG icon components                                         */
/* ------------------------------------------------------------------ */

const DashboardIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const TemplatesIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const AdminIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const CollapseIcon: React.FC<{ collapsed: boolean; size?: number }> = ({ collapsed, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform var(--transition-normal)',
      transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
    }}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Navigation item data                                               */
/* ------------------------------------------------------------------ */

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/templates', label: 'Templates', icon: <TemplatesIcon /> },
  { to: '/admin', label: 'Admin', icon: <AdminIcon />, adminOnly: true },
];

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                  */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, isMobile, onNavigate }) => {
  const { user } = useAuth();

  const sidebarStyle: React.CSSProperties = {
    position: isMobile ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    bottom: 0,
    width: collapsed && !isMobile ? '0px' : 'var(--sidebar-width)',
    minWidth: collapsed && !isMobile ? '0px' : 'var(--sidebar-width)',
    backgroundColor: 'var(--color-bg-elevated)',
    borderRight: collapsed && !isMobile ? 'none' : '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width var(--transition-normal), min-width var(--transition-normal)',
    zIndex: isMobile ? 1000 : 1,
    boxShadow: isMobile ? 'var(--shadow-lg)' : 'none',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'var(--color-bg-overlay)',
    zIndex: 999,
    animation: 'fadeIn var(--transition-fast) ease',
  };

  const logoAreaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 16px 20px',
    height: 'var(--topbar-height)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  const logoMarkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '-0.5px',
    flexShrink: 0,
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    letterSpacing: '-0.3px',
  };

  const collapseButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  };

  const navSectionStyle: React.CSSProperties = {
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 12px 6px',
    whiteSpace: 'nowrap',
  };

  const projectPlaceholderStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '13px',
    color: 'var(--color-text-tertiary)',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
  };

  const bottomAreaStyle: React.CSSProperties = {
    padding: '12px',
    borderTop: '1px solid var(--color-border)',
    marginTop: 'auto',
    flexShrink: 0,
  };

  const handleNavClick = () => {
    if (isMobile && onNavigate) {
      onNavigate();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div style={overlayStyle} onClick={onToggle} />
      )}

      <aside style={sidebarStyle}>
        {/* Logo area */}
        <div style={logoAreaStyle}>
          <div style={logoStyle}>
            <span style={logoMarkStyle}>PM</span>
            <span style={logoTextStyle}>ProjectMgr</span>
          </div>
          {!isMobile && (
            <button
              style={collapseButtonStyle}
              onClick={onToggle}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <CollapseIcon collapsed={collapsed} />
            </button>
          )}
        </div>

        {/* Main navigation */}
        <nav style={navSectionStyle}>
          {navItems
            .filter((item) => !item.adminOnly || user?.systemRole === SystemRole.SYS_ADMIN)
            .map((item) => (
              <SidebarNavLink key={item.to} item={item} onClick={handleNavClick} />
            ))}
        </nav>

        {/* Projects section */}
        <div style={{ padding: '0 8px' }}>
          <div style={sectionLabelStyle}>Projects</div>
          <div style={projectPlaceholderStyle}>No recent projects</div>
        </div>

        {/* New Project button at bottom */}
        <div style={bottomAreaStyle}>
          <Button variant="primary" size="sm" fullWidth onClick={handleNavClick}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusIcon size={14} />
              New Project
            </span>
          </Button>
        </div>
      </aside>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  NavLink helper                                                     */
/* ------------------------------------------------------------------ */

const SidebarNavLink: React.FC<{ item: NavItem; onClick?: () => void }> = ({ item, onClick }) => {
  const baseLinkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left',
  };

  const activeLinkStyle: React.CSSProperties = {
    ...baseLinkStyle,
    backgroundColor: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
    fontWeight: 600,
  };

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}
      onMouseEnter={(e) => {
        const link = e.currentTarget;
        if (!link.classList.contains('active')) {
          link.style.backgroundColor = 'var(--color-bg-tertiary)';
          link.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        const link = e.currentTarget;
        if (!link.classList.contains('active')) {
          link.style.backgroundColor = 'transparent';
          link.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
};
