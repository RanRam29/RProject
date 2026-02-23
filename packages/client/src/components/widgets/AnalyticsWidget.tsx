import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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

// ── Metric tile ───────────────────────────────────────────────────────────────

interface MetricTileProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  accentClass: string; // left-border color, e.g. 'border-l-emerald-400'
  valueClass: string;  // number color, e.g. 'text-emerald-700'
}

function MetricTile({ icon, value, label, accentClass, valueClass }: MetricTileProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl flex-1 min-w-[80px]',
        'border border-slate-200/60 border-l-[3px]',
        accentClass,
        'shadow-tile p-4 flex flex-col gap-2',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400">{icon}</span>
        <span className={`text-2xl font-bold tracking-tight ${valueClass}`}>
          {value}
        </span>
      </div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
    const statusGroups: StatusGroup[] = statuses
      .map((s) => ({
        name: s.name,
        color: s.color,
        count: tasks.filter((t) => t.statusId === s.id).length,
        isFinal: s.isFinal,
      }))
      .filter((g) => g.count > 0);

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

  const barMaxWidth = 100;

  return (
    <div className="p-6 h-full overflow-y-auto flex flex-col gap-5">

      {/* ── KPI Metric Tiles ── */}
      <div className="flex gap-3 flex-wrap">
        <MetricTile
          icon={<ListChecks size={18} strokeWidth={1.5} />}
          value={analytics.totalTasks}
          label="Total"
          accentClass="border-l-slate-400"
          valueClass="text-slate-900"
        />
        <MetricTile
          icon={<CheckCircle2 size={18} strokeWidth={1.5} />}
          value={analytics.completedTasks}
          label="Done"
          accentClass="border-l-emerald-400"
          valueClass="text-emerald-700"
        />
        <MetricTile
          icon={<AlertCircle size={18} strokeWidth={1.5} />}
          value={analytics.overdueTasks}
          label="Overdue"
          accentClass="border-l-rose-400"
          valueClass={analytics.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-900'}
        />
        <MetricTile
          icon={<Sparkles size={18} strokeWidth={1.5} />}
          value={analytics.createdThisWeek}
          label="This Week"
          accentClass="border-l-violet-400"
          valueClass="text-violet-700"
        />
      </div>

      {/* ── Completion rate ── */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Completion Rate
          </span>
          <span className="text-xs font-bold text-emerald-600">
            {analytics.completionRate}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-500 ease-out"
            style={{ width: `${analytics.completionRate}%` }}
          />
        </div>
      </div>

      {/* ── Status breakdown ── */}
      {analytics.statusGroups.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            By Status
          </p>
          <div className="flex flex-col gap-1.5">
            {analytics.statusGroups.map((group) => {
              const pct =
                analytics.totalTasks > 0
                  ? (group.count / analytics.totalTasks) * barMaxWidth
                  : 0;
              return (
                <div key={group.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs text-slate-600 w-20 shrink-0 truncate">
                    {group.name}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: group.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right shrink-0">
                    {group.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Priority breakdown ── */}
      {analytics.priorityGroups.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            By Priority
          </p>
          <div className="flex flex-col gap-1.5">
            {analytics.priorityGroups.map((group) => {
              const pct =
                analytics.totalTasks > 0
                  ? (group.count / analytics.totalTasks) * barMaxWidth
                  : 0;
              return (
                <div key={group.label} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs text-slate-600 w-20 shrink-0">
                    {group.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: group.color }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right shrink-0">
                    {group.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analytics.totalTasks === 0 && (
        <p className="text-center py-5 text-sm text-slate-400">
          No tasks yet. Create some tasks to see analytics.
        </p>
      )}
    </div>
  );
}
