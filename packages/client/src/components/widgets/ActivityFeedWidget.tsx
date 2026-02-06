import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../../api/activity.api';
import type { ActivityLogDTO } from '../../api/activity.api';
import type { WidgetProps } from './widget.types';

const ACTION_LABELS: Record<string, { verb: string; icon: string }> = {
  'task.created': { verb: 'created a task', icon: '+' },
  'task.updated': { verb: 'updated a task', icon: '~' },
  'task.deleted': { verb: 'deleted a task', icon: '-' },
  'comment.created': { verb: 'commented on a task', icon: '#' },
};

function formatAction(log: ActivityLogDTO): { verb: string; icon: string; detail: string } {
  const config = ACTION_LABELS[log.action] || { verb: log.action, icon: '?' };
  const title = (log.metadata as Record<string, string>)?.title
    || (log.metadata as Record<string, string>)?.taskTitle
    || '';
  return { ...config, detail: title };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityFeedWidget({ projectId }: WidgetProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => activityApi.list(projectId),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div style={emptyStyle}>
        <span style={{ color: 'var(--color-text-tertiary)' }}>Loading activity...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={emptyStyle}>
        <span style={{ fontSize: 28 }}>&#128203;</span>
        <p style={{ color: 'var(--color-text-tertiary)', margin: '8px 0 0' }}>No activity yet</p>
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
          Activity will appear here as team members work on tasks
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {logs.map((log) => {
        const { verb, icon, detail } = formatAction(log);
        const initial = log.user?.displayName?.charAt(0).toUpperCase() || '?';

        return (
          <div key={log.id} style={rowStyle}>
            <div style={avatarStyle}>
              {log.user?.avatarUrl ? (
                <img src={log.user.avatarUrl} alt="" style={avatarImgStyle} />
              ) : (
                <span style={avatarInitialStyle}>{initial}</span>
              )}
            </div>
            <div style={contentStyle}>
              <div style={textLineStyle}>
                <span style={nameStyle}>{log.user?.displayName || 'Unknown'}</span>
                <span style={verbStyle}>{verb}</span>
              </div>
              {detail && <span style={detailStyle}>{detail}</span>}
            </div>
            <div style={iconCol}>
              <span style={actionIconStyle}>{icon}</span>
            </div>
            <span style={timeStyle}>{timeAgo(log.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  padding: '8px 12px',
  overflowY: 'auto',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  textAlign: 'center',
  padding: '24px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 6px',
  borderRadius: 'var(--radius-md)',
  transition: 'background var(--transition-fast)',
};

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  backgroundColor: 'var(--color-accent)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
};

const avatarImgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const avatarInitialStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'white',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
};

const textLineStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  alignItems: 'baseline',
  fontSize: '13px',
};

const nameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  whiteSpace: 'nowrap',
};

const verbStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
};

const detailStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-text-tertiary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const iconCol: React.CSSProperties = {
  flexShrink: 0,
};

const actionIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--color-bg-tertiary)',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
};

const timeStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-text-tertiary)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};
