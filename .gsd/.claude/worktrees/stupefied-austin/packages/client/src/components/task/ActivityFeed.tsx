import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityLogDTO } from '../../api/activity.api';

interface ActivityFeedProps {
  projectId: string;
  taskId: string;
}

const ACTION_LABELS: Record<string, string> = {
  'task.created': 'created this task',
  'task.updated': 'updated this task',
  'task.deleted': 'deleted this task',
  'task.status.changed': 'changed the status',
  'comment.created': 'added a comment',
  'task.bulk.move': 'moved tasks in bulk',
  'task.bulk.assign': 'assigned tasks in bulk',
  'task.bulk.delete': 'deleted tasks in bulk',
  'task.bulk.setPriority': 'changed priority in bulk',
};

const ActionIcon: React.FC<{ action: string }> = ({ action }) => {
  if (action.includes('created')) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
      </svg>
    );
  }
  if (action.includes('comment')) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1H2z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z" />
    </svg>
  );
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityFeed({ projectId, taskId }: ActivityFeedProps) {
  const { data: allActivities = [], isLoading } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => activityApi.list(projectId, 1, 100),
    staleTime: 30_000,
  });

  // Filter to activities relevant to this task
  const activities = allActivities.filter(
    (a: ActivityLogDTO) =>
      (a.metadata as Record<string, unknown>)?.taskId === taskId ||
      ((a.metadata as Record<string, unknown>)?.taskIds as string[] | undefined)?.includes(taskId)
  );

  const containerStyle: React.CSSProperties = {
    maxHeight: '300px',
    overflowY: 'auto',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    padding: '8px 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '13px',
  };

  const iconStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
    marginTop: '2px',
  };

  if (isLoading) {
    return <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>Loading activity...</div>;
  }

  if (activities.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', padding: '8px 0' }}>No activity recorded yet.</div>;
  }

  return (
    <div style={containerStyle}>
      {activities.map((activity: ActivityLogDTO) => (
        <div key={activity.id} style={itemStyle}>
          <div style={iconStyle}>
            <ActionIcon action={activity.action} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {activity.user?.displayName || 'Unknown'}
              </span>{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {ACTION_LABELS[activity.action] || activity.action}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
              {formatTimeAgo(activity.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
