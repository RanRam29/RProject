import type { FC } from 'react';

export interface BarRect {
  taskId: string;
  left: number;   // px from grid left
  top: number;    // px from grid top (center of bar)
  width: number;  // px
}

interface GanttDependencyLinesProps {
  /** For each "blockingTaskId → blockedTaskId" dependency */
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
      className="absolute inset-0 pointer-events-none overflow-visible z-20"
      width={totalWidth}
      height={totalHeight}
    >
      <defs>
        <marker
          id="gantt-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path
            d="M0,0 L0,6 L8,3 z"
            className="fill-slate-400 dark:fill-slate-500"
          />
        </marker>
      </defs>

      {dependencies.map(({ blockingTaskId, blockedTaskId }) => {
        const src = barRects.get(blockingTaskId);
        const tgt = barRects.get(blockedTaskId);
        if (!src || !tgt) return null;

        // Start from the right edge of the source bar, center vertically
        const sx = src.left + src.width;
        const sy = src.top;
        // End at the left edge of the target bar, center vertically
        const tx = tgt.left;
        const ty = tgt.top;

        // Cubic Bezier with horizontal control points for smooth routing
        const cx1 = sx + Math.abs(tx - sx) * 0.5;
        const cy1 = sy;
        const cx2 = tx - Math.abs(tx - sx) * 0.5;
        const cy2 = ty;

        return (
          <path
            key={`${blockingTaskId}-${blockedTaskId}`}
            d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`}
            className="stroke-slate-400 dark:stroke-slate-500 fill-none"
            strokeWidth={1.5}
            strokeDasharray={sy === ty ? undefined : undefined}
            markerEnd="url(#gantt-arrowhead)"
          />
        );
      })}
    </svg>
  );
};
