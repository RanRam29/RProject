import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationList } from './NotificationList';

const BellIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    flexShrink: 0,
    position: 'relative',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-danger)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    width: '380px',
    maxHeight: '480px',
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'scaleIn var(--transition-fast) ease',
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        style={iconBtnStyle}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notifications"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={badgeStyle}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};
