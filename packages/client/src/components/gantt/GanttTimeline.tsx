/**
 * GanttTimeline — Elastic, drag-to-reschedule Gantt chart
 *
 * Features:
 *  • Framer Motion drag for horizontal date-shifting
 *  • Cascade Effect: moving a blocking task cascades all successors
 *  • SVG dependency arrows connecting predecessor → successor bars
 *  • Focus Mode: dims unconnected tasks with opacity + blur
 *  • Today line, week markers, smooth spring animations
 *  • Zero regressions: pure presentational props + callback pattern
 */

import {
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type FC,
} from 'react';
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion';
import {
  addDays,
  differenceInDays,
  format,
  isValid,
  startOfDay,
  parseISO,
} from 'date-fns';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GanttTask {
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  /** derived pixel/percentage position */
  leftPct: number;
  widthPct: number;
  startDate: Date;
  endDate: Date;
  rowIndex: number;
}

interface GanttTimelineProps {
  tasks: TaskDTO[];
  statuses: TaskStatusDTO[];
  /** Called when a task bar is dragged to new dates */
  onTaskDateChange: (
    taskId: string,
    newStartDate: string | null,
    newEndDate: string | null,
    cascadedUpdates: Array<{ taskId: string; newStartDate: string | null; newEndDate: string | null }>
  ) => void;
  /** Called when user clicks a task row or bar */
  onTaskClick: (task: TaskDTO) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 200;
const MIN_BAR_WIDTH_PX = 12;
const DAY_PX = 32; // pixels per day at default zoom

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? startOfDay(d) : null;
}

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function buildDependencyGraph(tasks: TaskDTO[]): Map<string, string[]> {
  // Returns: taskId → array of taskIds it BLOCKS (successors)
  const map = new Map<string, string[]>();
  tasks.forEach((t) => {
    if (t.blocking) {
      t.blocking.forEach((dep) => {
        const existing = map.get(dep.blockingTaskId) ?? [];
        if (!existing.includes(dep.blockedTaskId)) {
          existing.push(dep.blockedTaskId);
        }
        map.set(dep.blockingTaskId, existing);
      });
    }
    if (t.blockedBy) {
      t.blockedBy.forEach((dep) => {
        const existing = map.get(dep.blockingTaskId) ?? [];
        if (!existing.includes(dep.blockedTaskId)) {
          existing.push(dep.blockedTaskId);
        }
        map.set(dep.blockingTaskId, existing);
      });
    }
  });
  return map;
}

/**
 * Topological cascade: given a set of tasks that moved by `deltaDays`,
 * return all successors that also need to shift forward/backward.
 */
function cascadeTask(
  movedTaskId: string,
  deltaDays: number,
  taskMap: Map<string, TaskDTO>,
  successors: Map<string, string[]>
): Array<{ taskId: string; newStartDate: string | null; newEndDate: string | null }> {
  const updates: Array<{ taskId: string; newStartDate: string | null; newEndDate: string | null }> = [];
  const visited = new Set<string>();

  function recurse(taskId: string, delta: number) {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const children = successors.get(taskId) ?? [];
    for (const childId of children) {
      const child = taskMap.get(childId);
      if (!child) continue;

      const childStart = safeParseDate(child.startDate);
      const childEnd = safeParseDate(child.dueDate);

      const newStart = childStart ? addDays(childStart, delta) : null;
      const newEnd = childEnd ? addDays(childEnd, delta) : null;

      updates.push({
        taskId: childId,
        newStartDate: newStart ? toISODate(newStart) : null,
        newEndDate: newEnd ? toISODate(newEnd) : null,
      });

      recurse(childId, delta);
    }
  }

  recurse(movedTaskId, deltaDays);
  return updates;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** SVG arrow from predecessor bar end to successor bar start */
const DependencyArrow: FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}> = ({ fromX, fromY, toX, toY }) => {
  const midX = fromX + (toX - fromX) * 0.5;
  const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  return (
    <path
      d={path}
      fill="none"
      stroke="var(--rp-accent-lavender)"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.7}
      markerEnd="url(#arrowhead)"
    />
  );
};

/** A single draggable Gantt bar */
const GanttBar: FC<{
  ganttTask: GanttTask;
  totalWidthPx: number;
  isFocused: boolean;
  isFocusMode: boolean;
  onDragEnd: (taskId: string, deltaDays: number) => void;
  onClick: () => void;
}> = ({ ganttTask, totalWidthPx, isFocused, isFocusMode, onDragEnd, onClick }) => {
  const { task, status, leftPct, widthPct } = ganttTask;
  const isDone = status?.isFinal ?? false;
  const isStuck =
    !isDone &&
    task.dueDate != null &&
    new Date(task.dueDate) < new Date();

  const barColor = isDone
    ? 'var(--rp-accent-mint)'
    : isStuck
    ? 'var(--rp-accent-coral)'
    : status?.color ?? 'var(--rp-accent-blue)';

  const leftPx = (leftPct / 100) * totalWidthPx;
  const widthPx = Math.max((widthPct / 100) * totalWidthPx, MIN_BAR_WIDTH_PX);

  const motionX = useMotionValue(0);

  // Snap x back to 0 after drag settles
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const deltaPx = info.offset.x;
      const deltaDays = Math.round(deltaPx / DAY_PX);
      // Animate bar back to 0 (actual position update comes from parent re-render)
      animate(motionX, 0, { duration: 0.25, ease: [0.4, 0, 0.2, 1] });
      if (deltaDays !== 0) {
        onDragEnd(task.id, deltaDays);
      }
    },
    [task.id, motionX, onDragEnd]
  );

  const dimStyle: React.CSSProperties =
    isFocusMode && !isFocused
      ? { opacity: 0.25, filter: 'blur(1.5px)', pointerEvents: 'none' }
      : { opacity: 1, filter: 'none' };

  return (
    <motion.div
      className="rp-gantt-bar"
      drag="x"
      dragMomentum={false}
      dragElastic={0.05}
      style={{
        x: motionX,
        position: 'absolute',
        left: leftPx,
        width: widthPx,
        top: 8,
        height: ROW_HEIGHT - 16,
        borderRadius: 8,
        backgroundColor: barColor,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 8,
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isStuck
          ? '0 0 0 2px rgba(251,113,133,0.4)'
          : '0 2px 8px rgba(0,0,0,0.10)',
        ...dimStyle,
        transition: 'box-shadow 200ms ease, filter 300ms ease, opacity 300ms ease',
      }}
      whileDrag={{ scale: 1.03, zIndex: 20, boxShadow: 'var(--rp-shadow-float)' }}
      whileHover={{ scale: 1.01 }}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        // Only fire click if not a drag
        if (Math.abs((motionX.get())) < 4) {
          e.stopPropagation();
          onClick();
        }
      }}
      title={`${task.title}\n${task.startDate ?? '?'} → ${task.dueDate ?? '?'}`}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'white',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: 0.2,
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {task.title}
      </span>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function GanttTimeline({
  tasks,
  statuses,
  onTaskDateChange,
  onTaskClick,
}: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width - LABEL_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build status map
  const statusMap = useMemo(() => {
    const m = new Map<string, TaskStatusDTO>();
    statuses.forEach((s) => m.set(s.id, s));
    return m;
  }, [statuses]);

  // Filter tasks that have at least one date
  const tasksWithDates = useMemo(
    () => tasks.filter((t) => t.startDate || t.dueDate),
    [tasks]
  );

  // Compute timeline bounds (with 3-day padding on each side)
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: today, timelineEnd: addDays(today, 30), totalDays: 30 };
    }

    let earliest = new Date(8640000000000000);
    let latest = new Date(-8640000000000000);

    tasksWithDates.forEach((t) => {
      const s = safeParseDate(t.startDate);
      const e = safeParseDate(t.dueDate);
      if (s && s < earliest) earliest = s;
      if (s && s > latest) latest = s;
      if (e && e < earliest) earliest = e;
      if (e && e > latest) latest = e;
    });

    const start = addDays(startOfDay(earliest), -3);
    const end = addDays(startOfDay(latest), 4);
    const days = Math.max(differenceInDays(end, start), 7);
    return { timelineStart: start, timelineEnd: end, totalDays: days };
  }, [tasksWithDates]);

  // Build GanttTask data
  const ganttTasks: GanttTask[] = useMemo(() => {
    return tasksWithDates.map((task, idx) => {
      const rawStart = safeParseDate(task.startDate);
      const rawEnd = safeParseDate(task.dueDate);

      const startDate = rawStart ?? rawEnd ?? startOfDay(new Date());
      const endDate = rawEnd ?? addDays(startDate, 1);

      const startOffset = differenceInDays(startDate, timelineStart);
      const duration = Math.max(differenceInDays(endDate, startDate), 1);

      const leftPct = (startOffset / totalDays) * 100;
      const widthPct = Math.max((duration / totalDays) * 100, (1 / totalDays) * 100);

      return {
        task,
        status: statusMap.get(task.statusId),
        leftPct,
        widthPct,
        startDate,
        endDate,
        rowIndex: idx,
      };
    });
  }, [tasksWithDates, timelineStart, totalDays, statusMap]);

  // Dependency graph (taskId → successor taskIds)
  const successorGraph = useMemo(() => buildDependencyGraph(tasks), [tasks]);

  // Task map for cascade computation
  const taskMap = useMemo(() => {
    const m = new Map<string, TaskDTO>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  // Set of all task IDs connected to the focused task (predecessors + successors)
  const connectedTaskIds = useMemo<Set<string>>(() => {
    if (!focusMode || !focusedTaskId) return new Set();
    const connected = new Set<string>([focusedTaskId]);

    // Forward: successors
    function addSuccessors(id: string) {
      const children = successorGraph.get(id) ?? [];
      children.forEach((c) => {
        if (!connected.has(c)) {
          connected.add(c);
          addSuccessors(c);
        }
      });
    }
    // Backward: predecessors (reverse lookup)
    function addPredecessors(id: string) {
      tasks.forEach((t) => {
        const succs = successorGraph.get(t.id) ?? [];
        if (succs.includes(id) && !connected.has(t.id)) {
          connected.add(t.id);
          addPredecessors(t.id);
        }
      });
    }

    addSuccessors(focusedTaskId);
    addPredecessors(focusedTaskId);
    return connected;
  }, [focusMode, focusedTaskId, successorGraph, tasks]);

  // Week markers for header
  const weekMarkers = useMemo(() => {
    const markers: { label: string; leftPct: number }[] = [];
    let cur = new Date(timelineStart);
    while (cur <= timelineEnd) {
      const offset = differenceInDays(cur, timelineStart);
      markers.push({
        label: format(cur, 'MMM d'),
        leftPct: (offset / totalDays) * 100,
      });
      cur = addDays(cur, 7);
    }
    return markers;
  }, [timelineStart, timelineEnd, totalDays]);

  // Today marker
  const todayOffset = differenceInDays(startOfDay(new Date()), timelineStart);
  const todayLeftPct = (todayOffset / totalDays) * 100;
  const showToday = todayOffset >= 0 && todayOffset <= totalDays;

  // Dependency arrows: compute SVG coordinates
  const dependencyArrows = useMemo(() => {
    const arrows: Array<{
      key: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }> = [];

    const barAreaWidth = containerWidth;

    ganttTasks.forEach((gt) => {
      const succs = successorGraph.get(gt.task.id) ?? [];
      succs.forEach((succId) => {
        const succGT = ganttTasks.find((g) => g.task.id === succId);
        if (!succGT) return;

        // fromX = right edge of predecessor bar
        const fromX = ((gt.leftPct + gt.widthPct) / 100) * barAreaWidth;
        const fromY = gt.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        // toX = left edge of successor bar
        const toX = (succGT.leftPct / 100) * barAreaWidth;
        const toY = succGT.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        arrows.push({ key: `${gt.task.id}-${succId}`, fromX, fromY, toX, toY });
      });
    });

    return arrows;
  }, [ganttTasks, successorGraph, containerWidth]);

  // Handle bar drag end
  const handleBarDragEnd = useCallback(
    (taskId: string, deltaDays: number) => {
      const task = taskMap.get(taskId);
      if (!task) return;

      const newStart = task.startDate
        ? toISODate(addDays(parseISO(task.startDate), deltaDays))
        : null;
      const newEnd = task.dueDate
        ? toISODate(addDays(parseISO(task.dueDate), deltaDays))
        : null;

      // Compute cascade
      const cascaded = cascadeTask(taskId, deltaDays, taskMap, successorGraph);

      onTaskDateChange(taskId, newStart, newEnd, cascaded);
    },
    [taskMap, successorGraph, onTaskDateChange]
  );

  const totalHeight = ganttTasks.length * ROW_HEIGHT;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--rp-bg-cream, var(--color-bg-secondary))',
        borderRadius: 'var(--rp-radius-card)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: 'var(--rp-text-muted, var(--color-text-secondary))',
            fontWeight: 500,
          }}
        >
          {tasksWithDates.length} task{tasksWithDates.length !== 1 ? 's' : ''} on timeline
        </span>

        <button
          onClick={() => {
            setFocusMode((v) => !v);
            if (focusMode) setFocusedTaskId(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 'var(--rp-radius-pill)',
            border: focusMode
              ? '1.5px solid var(--rp-accent-lavender)'
              : '1.5px solid var(--color-border)',
            background: focusMode ? 'var(--rp-accent-lavender-light)' : 'transparent',
            color: focusMode
              ? 'var(--rp-accent-lavender)'
              : 'var(--rp-text-muted, var(--color-text-secondary))',
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
          title="Focus Mode: click a task to highlight its dependencies"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={12} cy={12} r={3} />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          Focus Mode
        </button>
      </div>

      {/* ── Timeline content ── */}
      {tasksWithDates.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            color: 'var(--color-text-tertiary)',
            fontSize: 14,
          }}
        >
          <svg
            width={40}
            height={40}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.4}
          >
            <rect x={3} y={4} width={18} height={18} rx={2} />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Add start or due dates to tasks to see them here
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
          }}
        >
          {/* ── Header row ── */}
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--color-bg-elevated)',
              borderBottom: '1px solid var(--color-border)',
              height: 32,
            }}
          >
            {/* Label column */}
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, flexShrink: 0 }} />

            {/* Date markers */}
            <div style={{ flex: 1, position: 'relative', height: 32 }}>
              {weekMarkers.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${m.leftPct}%`,
                    top: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    whiteSpace: 'nowrap',
                    letterSpacing: 0.3,
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Body: rows + SVG arrows ── */}
          <div style={{ display: 'flex', position: 'relative', minHeight: totalHeight }}>
            {/* Label column */}
            <div
              style={{
                width: LABEL_WIDTH,
                minWidth: LABEL_WIDTH,
                flexShrink: 0,
                position: 'sticky',
                left: 0,
                zIndex: 5,
                background: 'var(--color-bg-elevated)',
              }}
            >
              {ganttTasks.map((gt) => {
                const isFocused = !focusMode || connectedTaskIds.has(gt.task.id);
                const isDone = gt.status?.isFinal ?? false;
                return (
                  <div
                    key={gt.task.id}
                    style={{
                      height: ROW_HEIGHT,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 16,
                      paddingRight: 12,
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      opacity: focusMode && !isFocused ? 0.28 : 1,
                      filter: focusMode && !isFocused ? 'blur(1px)' : 'none',
                      transition: 'opacity 300ms ease, filter 300ms ease',
                    }}
                    onClick={() => {
                      if (focusMode) {
                        setFocusedTaskId((prev) =>
                          prev === gt.task.id ? null : gt.task.id
                        );
                      } else {
                        onTaskClick(gt.task);
                      }
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        'var(--color-bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    {/* Status dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: gt.status?.color ?? 'var(--color-text-tertiary)',
                        flexShrink: 0,
                        marginRight: 8,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--rp-text-charcoal, var(--color-text-primary))',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.55 : 1,
                      }}
                    >
                      {gt.task.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bar area */}
            <div style={{ flex: 1, position: 'relative', minHeight: totalHeight }}>
              {/* Grid background lines */}
              {weekMarkers.map((m, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${m.leftPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'var(--color-border)',
                    opacity: 0.5,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Today line */}
              {showToday && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${todayLeftPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: 'var(--rp-accent-coral, var(--color-danger))',
                    opacity: 0.7,
                    zIndex: 4,
                    pointerEvents: 'none',
                    borderRadius: 1,
                  }}
                />
              )}

              {/* Row stripe backgrounds */}
              {ganttTasks.map((gt, i) => (
                <div
                  key={gt.task.id}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: i * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                />
              ))}

              {/* SVG dependency arrows layer */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: totalHeight,
                  pointerEvents: 'none',
                  zIndex: 3,
                  overflow: 'visible',
                }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth={8}
                    markerHeight={6}
                    refX={6}
                    refY={3}
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 8 3, 0 6"
                      fill="var(--rp-accent-lavender)"
                      opacity={0.8}
                    />
                  </marker>
                </defs>
                {dependencyArrows.map(({ key: arrowKey, ...arrowProps }) => (
                  <DependencyArrow key={arrowKey} {...arrowProps} />
                ))}
              </svg>

              {/* Gantt bars */}
              {ganttTasks.map((gt) => {
                const isFocused = !focusMode || connectedTaskIds.has(gt.task.id);
                return (
                  <div
                    key={gt.task.id}
                    style={{
                      position: 'absolute',
                      top: gt.rowIndex * ROW_HEIGHT,
                      left: 0,
                      right: 0,
                      height: ROW_HEIGHT,
                      zIndex: 5,
                    }}
                  >
                    <GanttBar
                      ganttTask={gt}
                      totalWidthPx={containerWidth}
                      isFocused={isFocused}
                      isFocusMode={focusMode}
                      onDragEnd={handleBarDragEnd}
                      onClick={() => onTaskClick(gt.task)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
