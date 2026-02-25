import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

interface NotificationListProps {
  onClose: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    deleteAllNotifications,
  } = useNotifications();

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  };

  const actionBtnStyle: React.CSSProperties = {
    border: 'none',
    background: 'none',
    color: 'var(--color-accent)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'all var(--transition-fast)',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const emptyStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    color: 'var(--color-text-tertiary)',
    fontSize: '13px',
    gap: '8px',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 16px',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  };

  return (
    <>
      <div style={headerStyle}>
        <span style={titleStyle}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {unreadCount > 0 && (
            <button
              style={actionBtnStyle}
              onClick={markAllAsRead}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              style={{ ...actionBtnStyle, color: 'var(--color-text-tertiary)' }}
              onClick={deleteAllNotifications}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div style={listStyle}>
        {notifications.length === 0 ? (
          <div style={emptyStyle}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>No notifications yet</span>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div style={footerStyle}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </>
  );
};
