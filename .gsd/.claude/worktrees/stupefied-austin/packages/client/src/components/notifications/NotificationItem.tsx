import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationDTO } from '@pm/shared';

interface NotificationItemProps {
  notification: NotificationDTO;
  onClose: () => void;
}

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: 'U',
  TASK_UPDATED: 'T',
  TASK_COMMENTED: 'C',
  PROJECT_INVITED: 'P',
  PERMISSION_CHANGED: 'R',
  MENTION: '@',
};

const typeColors: Record<string, string> = {
  TASK_ASSIGNED: 'var(--color-accent)',
  TASK_UPDATED: 'var(--color-warning)',
  TASK_COMMENTED: 'var(--color-success)',
  PROJECT_INVITED: '#8b5cf6',
  PERMISSION_CHANGED: 'var(--color-danger)',
  MENTION: 'var(--color-accent)',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotifications();
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    backgroundColor: isHovered
      ? 'var(--color-bg-tertiary)'
      : notification.isRead
        ? 'transparent'
        : 'var(--color-accent-light)',
    borderBottom: '1px solid var(--color-border)',
  };

  const iconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: typeColors[notification.type] ?? 'var(--color-accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: notification.isRead ? 400 : 600,
    color: 'var(--color-text-primary)',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.3,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const timeStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--color-text-tertiary)',
    marginTop: '4px',
  };

  const deleteBtnStyle: React.CSSProperties = {
    border: 'none',
    background: 'none',
    color: 'var(--color-text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    lineHeight: 1,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity var(--transition-fast)',
    flexShrink: 0,
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={iconStyle}>
        {typeIcons[notification.type] ?? 'N'}
      </div>
      <div style={contentStyle}>
        <div style={titleStyle}>{notification.title}</div>
        {notification.body && <div style={bodyStyle}>{notification.body}</div>}
        <div style={timeStyle}>{timeAgo(notification.createdAt)}</div>
      </div>
      <button
        style={deleteBtnStyle}
        onClick={handleDelete}
        title="Dismiss"
      >
        ×
      </button>
      {!notification.isRead && (
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent)',
          flexShrink: 0,
          alignSelf: 'center',
        }} />
      )}
    </div>
  );
};
