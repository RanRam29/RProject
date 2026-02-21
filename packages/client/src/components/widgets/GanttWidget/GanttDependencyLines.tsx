import type { FC } from 'react';

export interface BarRect {
  taskId: string;
  left: number;
  top: number;
  width: number;
}

interface GanttDependencyLinesProps {
  dependencies: Array<{ blockingTaskId: string; blockedTaskId: string }>;
  barRects: Map<string, BarRect>;
  totalWidth: number;
  totalHeight: number;
}

export const GanttDependencyLines: FC<GanttDependencyLinesProps> = ({
  dependencies,
  barRects,
  totalWidth,
  totalHeight,
}) => {
  if (dependencies.length === 0) return null;

  return (
    <svg
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 20 }}
      width={totalWidth}
      height={totalHeight}
    >
      <defs>
        <marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--color-text-tertiary)" />
        </marker>
      </defs>
      {dependencies.map(({ blockingTaskId, blockedTaskId }) => {
        const src = barRects.get(blockingTaskId);
        const tgt = barRects.get(blockedTaskId);
        if (!src || !tgt) return null;
        const sx = src.left + src.width;
        const sy = src.top;
        const tx = tgt.left;
        const ty = tgt.top;
        const cx1 = sx + Math.abs(tx - sx) * 0.5;
        const cx2 = tx - Math.abs(tx - sx) * 0.5;
        return (
          <path
            key={`${blockingTaskId}-${blockedTaskId}`}
            d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`}
            stroke="var(--color-text-tertiary)"
            strokeWidth={1.5}
            fill="none"
            markerEnd="url(#gantt-arrow)"
          />
        );
      })}
    </svg>
  );
};
