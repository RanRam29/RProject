import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import type { WidgetProps } from './widget.types';

interface StatusGroup {
  name: string;
  color: string;
  count: number;
  isFinal: boolean;
}

interface PriorityGroup {
  label: string;
  color: string;
  count: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#dc2626',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NONE: '#94a3b8',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

export function AnalyticsWidget({ projectId }: WidgetProps) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => {
      const status = statuses.find((s) => s.id === t.statusId);
      return status?.isFinal;
    }).length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Group by status
    const statusGroups: StatusGroup[] = statuses.map((s) => ({
      name: s.name,
      color: s.color,
      count: tasks.filter((t) => t.statusId === s.id).length,
      isFinal: s.isFinal,
    })).filter((g) => g.count > 0);

    // Group by priority
    const priorityCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      const p = t.priority || 'NONE';
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    const priorityGroups: PriorityGroup[] = Object.entries(priorityCounts)
      .map(([key, count]) => ({
        label: PRIORITY_LABELS[key] || key,
        color: PRIORITY_COLORS[key] || '#94a3b8',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const status = statuses.find((s) => s.id === t.statusId);
      return !status?.isFinal && new Date(t.dueDate) < now;
    }).length;

    // Tasks created this week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const createdThisWeek = tasks.filter((t) => new Date(t.createdAt) > weekAgo).length;

    return {
      totalTasks,
      completedTasks,
      completionRate,
      statusGroups,
      priorityGroups,
      overdueTasks,
      createdThisWeek,
    };
  }, [tasks, statuses]);

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const statCardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-secondary)',
    flex: 1,
    minWidth: '80px',
  };

  const barMaxWidth = 100;

  return (
    <div style={containerStyle}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {analytics.totalTasks}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Total</span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>
            {analytics.completedTasks}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Done</span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: analytics.overdueTasks > 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
            {analytics.overdueTasks}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Overdue</span>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-accent)' }}>
            {analytics.createdThisWeek}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>This Week</span>
        </div>
      </div>

      {/* Completion rate progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Completion Rate
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
            {analytics.completionRate}%
          </span>
        </div>
        <div style={{
          height: '8px', borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-success)',
            width: `${analytics.completionRate}%`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Status breakdown */}
      {analytics.statusGroups.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            By Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analytics.statusGroups.map((group) => {
              const pct = analytics.totalTasks > 0 ? (group.count / analytics.totalTasks) * barMaxWidth : 0;
              return (
                <div key={group.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: group.color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '12px', color: 'var(--color-text-primary)',
                    width: '80px', flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {group.name}
                  </span>
                  <div style={{
                    flex: 1, height: '6px', borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 'var(--radius-full)',
                      backgroundColor: group.color, width: `${pct}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px', color: 'var(--color-text-tertiary)',
                    width: '24px', textAlign: 'right', flexShrink: 0,
                  }}>
                    {group.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority breakdown */}
      {analytics.priorityGroups.length > 0 && (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            By Priority
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analytics.priorityGroups.map((group) => {
              const pct = analytics.totalTasks > 0 ? (group.count / analytics.totalTasks) * barMaxWidth : 0;
              return (
                <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: group.color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '12px', color: 'var(--color-text-primary)',
                    width: '80px', flexShrink: 0,
                  }}>
                    {group.label}
                  </span>
                  <div style={{
                    flex: 1, height: '6px', borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 'var(--radius-full)',
                      backgroundColor: group.color, width: `${pct}%`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px', color: 'var(--color-text-tertiary)',
                    width: '24px', textAlign: 'right', flexShrink: 0,
                  }}>
                    {group.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analytics.totalTasks === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
          No tasks yet. Create some tasks to see analytics.
        </div>
      )}
    </div>
  );
}
