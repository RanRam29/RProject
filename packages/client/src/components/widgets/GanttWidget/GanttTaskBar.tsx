import { useRef, type FC } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';
import { GanttTooltip } from './GanttTooltip';

interface GanttTaskBarProps {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  /** Left offset as percentage of the grid width */
  leftPct: number;
  /** Width as percentage of the grid width */
  widthPct: number;
  /** Pixel width of the grid area (for drag → day conversion) */
  gridWidthPx: number;
  /** Total days in the visible range */
  totalDays: number;
  isDragEnabled: boolean;
  isOverdue: boolean;
  onClick: () => void;
  onDragEnd: (task: TaskDTO, deltaDays: number) => void;
}

export const GanttTaskBar: FC<GanttTaskBarProps> = ({
  task,
  status,
  leftPct,
  widthPct,
  gridWidthPx,
  totalDays,
  isDragEnabled,
  isOverdue,
  onClick,
  onDragEnd,
}) => {
  const pxPerDay = gridWidthPx / Math.max(totalDays, 1);
  // Track accumulated drag offset in px (info.offset.x is the total pan from start)
  const lastOffsetX = useRef(0);

  // ── Milestone: render as a diamond ────────────────────────────────────────
  if (task.isMilestone) {
    return (
      <GanttTooltip task={task} status={status}>
        <div
          className="absolute top-1.5 flex items-center justify-center cursor-pointer"
          style={{ left: `${leftPct}%`, width: 28, height: 28, marginLeft: -14 }}
          onClick={onClick}
        >
          <div className="w-5 h-5 bg-amber-500 dark:bg-amber-400 rotate-45 shadow-md hover:scale-110 transition-transform" />
        </div>
      </GanttTooltip>
    );
  }

  // ── Normal task bar ────────────────────────────────────────────────────────
  return (
    <GanttTooltip task={task} status={status}>
      <motion.div
        className={[
          'absolute top-2 h-6 rounded-md overflow-hidden shadow-sm select-none',
          isDragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          isOverdue ? 'ring-1 ring-red-400' : '',
        ].join(' ')}
        style={{
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          minWidth: 12,
        }}
        drag={isDragEnabled ? 'x' : false}
        dragConstraints={{ left: -gridWidthPx, right: gridWidthPx }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => {
          lastOffsetX.current = 0;
        }}
        onDrag={(_e, info: PanInfo) => {
          lastOffsetX.current = info.offset.x;
        }}
        onDragEnd={(_e, info: PanInfo) => {
          // Use info.offset.x — total displacement from drag start (already accounts for full delta)
          const deltaX = info.offset.x;
          const deltaDays = Math.round(deltaX / pxPerDay);
          if (deltaDays !== 0) {
            onDragEnd(task, deltaDays);
          }
        }}
        onClick={onClick}
        whileHover={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        {/* Progress fill track */}
        <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/40" />

        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
          style={{ width: `${task.progressPercentage ?? 0}%` }}
        />

        {/* Label */}
        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white dark:text-white z-10 truncate">
          {task.title}
        </span>
      </motion.div>
    </GanttTooltip>
  );
};
