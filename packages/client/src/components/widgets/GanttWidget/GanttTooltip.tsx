import { useState, type FC, type ReactNode } from 'react';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

interface GanttTooltipProps {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  children: ReactNode;
}

export const GanttTooltip: FC<GanttTooltipProps> = ({ task, status, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-lg bg-white dark:bg-slate-800 p-4 shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none">
          <div className="space-y-2 text-sm">
            {/* Title */}
            <p className="font-semibold text-slate-900 dark:text-white leading-snug">{task.title}</p>

            {/* Status badge */}
            {status && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs">Status</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: status.color }}
                >
                  {status.name}
                </span>
              </div>
            )}

            {/* Assignee */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">Assignee</span>
              <span className="text-slate-700 dark:text-slate-300 text-xs">
                {task.assignee?.displayName ?? 'Unassigned'}
              </span>
            </div>

            {/* Dates */}
            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Start: {task.startDate?.slice(0, 10) ?? '—'}</span>
              <span>Due: {task.dueDate?.slice(0, 10) ?? '—'}</span>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Progress</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {task.progressPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${task.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Estimated hours */}
            {task.estimatedHours > 0 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Estimated: <span className="font-medium text-slate-700 dark:text-slate-300">{task.estimatedHours}h</span>
              </div>
            )}

            {/* Milestone badge */}
            {task.isMilestone && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                ◆ Milestone
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
