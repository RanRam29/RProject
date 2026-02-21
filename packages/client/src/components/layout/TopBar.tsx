import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { NotificationBell } from '../notifications/NotificationBell';
import { useUIStore } from '../../stores/ui.store';

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const QuestionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  TopBar                                                             */
/* ------------------------------------------------------------------ */

interface TopBarProps {
  onMenuClick: () => void;
  children?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useUIStore(s => s.isMobile);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  /* ── Icon button style ── */
  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '34px', height: '34px',
    border: 'none', borderRadius: '8px',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      height: 'var(--topbar-height)', padding: '0 16px 0 8px',
      backgroundColor: 'var(--color-bg-elevated)',
      boxShadow: 'var(--shadow-topbar)',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
      gap: '8px',
    }}>

      {/* ── Left: Menu toggle ── */}
      <button
        style={iconBtn}
        onClick={onMenuClick}
        title="Toggle sidebar"
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
      >
        <MenuIcon />
      </button>

      {/* ── Center: Search bar ── */}
      <div style={{ flex: 1, maxWidth: '480px', margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px',
          height: '36px',
          backgroundColor: 'var(--color-bg-primary)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '9px',
          color: 'var(--color-text-tertiary)',
          cursor: 'text',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        }}
          onClick={() => {
            /* Trigger command palette */
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
            document.dispatchEvent(event);
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-accent)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px var(--color-accent-light)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <SearchIcon />
          <span style={{ fontSize: '13px', flex: 1, userSelect: 'none' }}>Search...</span>
          {!isMobile && (
            <span style={{
              fontSize: '10px', fontWeight: 600, padding: '2px 5px',
              borderRadius: '4px', border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)', letterSpacing: '0.3px',
              userSelect: 'none',
            }}>
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>

        {/* Help */}
        {!isMobile && (
          <button
            style={iconBtn}
            title="Help"
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <QuestionIcon />
          </button>
        )}

        {/* Theme toggle */}
        <button
          style={iconBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* ── User avatar dropdown ── */}
        <div ref={dropdownRef} style={{ position: 'relative', marginLeft: '4px' }}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '4px 8px 4px 4px', border: 'none', borderRadius: '9px',
              backgroundColor: 'transparent', cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {/* Avatar circle */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #5B8DEF 0%, #A78BFA 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0,
              }}>
                {userInitials}
              </div>
            )}
            {!isMobile && (
              <>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  {user?.displayName ?? ''}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }}>
                  <ChevronDown />
                </span>
              </>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: '210px',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px',
              zIndex: 200,
              animation: 'scaleIn var(--transition-fast) ease',
            }}>
              {/* User info */}
              <div style={{
                padding: '10px 12px 10px',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #5B8DEF 0%, #A78BFA 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {userInitials}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{user?.displayName}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <DropdownItem
                icon={<UserIcon />}
                label="Profile"
                onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
              />
              {/* Sign out */}
              <DropdownItem
                icon={<LogoutIcon />}
                label="Sign out"
                danger
                onClick={async () => { setDropdownOpen(false); await logout(); }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/* ── Dropdown item helper ── */
const DropdownItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '9px',
      width: '100%', padding: '8px 10px',
      border: 'none', borderRadius: '8px',
      backgroundColor: 'transparent',
      color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
      fontSize: '13px', fontWeight: 500,
      cursor: 'pointer', transition: 'all var(--transition-fast)', textAlign: 'left',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.backgroundColor = danger ? 'var(--color-danger-light)' : 'var(--color-bg-tertiary)';
      e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-primary)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.backgroundColor = 'transparent';
      e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-secondary)';
    }}
  >
    {icon}
    {label}
  </button>
);
