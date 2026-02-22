import { useRef, type FC } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';
import { GanttTooltip } from './GanttTooltip';

interface GanttTaskBarProps {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  leftPct: number;
  widthPct: number;
  gridWidthPx: number;
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
  const lastOffsetX = useRef(0);

  // Milestone: diamond
  if (task.isMilestone) {
    return (
      <GanttTooltip task={task} status={status}>
        <motion.div
          style={{
            position: 'absolute',
            top: 6,
            left: `${leftPct}%`,
            marginLeft: -10,
            width: 20,
            height: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          whileHover={{ scale: 1.15 }}
          onClick={onClick}
        >
          <div style={{
            width: 14,
            height: 14,
            background: 'var(--color-warning)',
            transform: 'rotate(45deg)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s',
          }} />
        </motion.div>
      </GanttTooltip>
    );
  }

  const barColor = status?.color ?? 'var(--color-accent)';

  return (
    <GanttTooltip task={task} status={status}>
      <motion.div
        style={{
          position: 'absolute',
          top: 8,
          height: 24,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          minWidth: 12,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xs)',
          cursor: isDragEnabled ? 'grab' : 'pointer',
          outline: isOverdue ? '1px solid var(--color-danger)' : 'none',
          userSelect: 'none',
        }}
        drag={isDragEnabled ? 'x' : false}
        dragConstraints={{ left: -gridWidthPx, right: gridWidthPx }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => { lastOffsetX.current = 0; }}
        onDrag={(_e, info: PanInfo) => { lastOffsetX.current = info.offset.x; }}
        onDragEnd={(_e, info: PanInfo) => {
          const deltaDays = Math.round(info.offset.x / pxPerDay);
          if (deltaDays !== 0) onDragEnd(task, deltaDays);
        }}
        onClick={onClick}
        whileDrag={{ cursor: 'grabbing', boxShadow: 'var(--shadow-drag)' }}
        whileHover={{ filter: 'brightness(1.12)' }}
      >
        {/* Background track */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: barColor,
          opacity: 0.2,
        }} />
        {/* Progress fill */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: `${task.progressPercentage ?? 0}%`,
          background: barColor,
          opacity: 0.9,
          transition: 'width 0.3s',
        }} />
        {/* Label */}
        <span style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          fontSize: 11,
          fontWeight: 500,
          color: '#fff',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          zIndex: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}>
          {task.title}
        </span>
      </motion.div>
    </GanttTooltip>
  );
};
