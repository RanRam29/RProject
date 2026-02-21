import { useRef, useMemo, useCallback, type FC } from 'react';
import {
  eachDayOfInterval,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  parseISO,
  isValid,
  differenceInDays,
  addDays,
  isToday,
} from 'date-fns';
import type { TaskDTO, TaskStatusDTO } from '@pm/shared';
import type { GanttView } from './GanttHeader';
import { GanttTaskBar } from './GanttTaskBar';
import { GanttDependencyLines, type BarRect } from './GanttDependencyLines';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_H = 44;
const LABEL_W = 200;
const HEADER_H = 36;
const COL_W: Record<GanttView, number> = { day: 80, week: 50, month: 36, quarter: 30, year: 24 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? startOfDay(d) : null;
}

function getRangeForView(view: GanttView, year: number): { start: Date; end: Date } {
  const base = new Date(year, 0, 1);
  const now = new Date();
  switch (view) {
    case 'day':
      return {
        start: startOfWeek(addDays(now, -7), { weekStartsOn: 1 }),
        end: endOfWeek(addDays(now, 7), { weekStartsOn: 1 }),
      };
    case 'week':
      return {
        start: startOfMonth(addDays(now, -30)),
        end: endOfMonth(addDays(now, 60)),
      };
    case 'month':
      return { start: startOfYear(base), end: endOfYear(base) };
    case 'quarter':
      return { start: startOfYear(base), end: endOfYear(base) };
    case 'year':
      return { start: startOfYear(base), end: endOfYear(base) };
  }
}

function getColumns(view: GanttView, rangeStart: Date, rangeEnd: Date, allDays: Date[]): Date[] {
  if (view === 'year') {
    const months: Date[] = [];
    let c = new Date(rangeStart);
    while (c <= rangeEnd) {
      months.push(startOfMonth(c));
      c = new Date(c.getFullYear(), c.getMonth() + 1, 1);
    }
    return months;
  }
  if (view === 'quarter') {
    const weeks: Date[] = [];
    let c = startOfWeek(rangeStart, { weekStartsOn: 1 });
    while (c <= rangeEnd) { weeks.push(c); c = addDays(c, 7); }
    return weeks;
  }
  return allDays;
}

function colLabel(date: Date, view: GanttView): string {
  switch (view) {
    case 'day':     return format(date, 'EEE d');
    case 'week':    return format(date, 'EEE d');
    case 'month':   return format(date, 'd');
    case 'quarter': return format(date, 'd MMM');
    case 'year':    return format(date, 'MMM');
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttGridProps {
  tasks: TaskDTO[];
  statuses: TaskStatusDTO[];
  view: GanttView;
  year: number;
  isDragEnabled: boolean;
  onTaskClick: (task: TaskDTO) => void;
  onTimelineUpdate: (taskId: string, newStart: string | null, newEnd: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GanttGrid: FC<GanttGridProps> = ({
  tasks,
  statuses,
  view,
  year,
  isDragEnabled,
  onTaskClick,
  onTimelineUpdate,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start: rangeStart, end: rangeEnd } = getRangeForView(view, year);
  const today = startOfDay(new Date());

  const allDays = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const columns = useMemo(
    () => getColumns(view, rangeStart, rangeEnd, allDays),
    [view, rangeStart, rangeEnd, allDays],
  );

  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
  const colWidth = COL_W[view];
  const gridWidth = columns.length * colWidth;
  const pxPerDay = gridWidth / Math.max(totalDays, 1);

  // ── Sort: overdue → current → future → unscheduled ────────────────────────
  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => {
    const aHas = !!(a.startDate || a.dueDate);
    const bHas = !!(b.startDate || b.dueDate);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (!aHas && !bHas) return 0;
    const aEnd = safeDate(a.dueDate);
    const bEnd = safeDate(b.dueDate);
    const aStatus = statuses.find((s) => s.id === a.statusId);
    const bStatus = statuses.find((s) => s.id === b.statusId);
    const aOverdue = aEnd && aEnd < today && !aStatus?.isFinal;
    const bOverdue = bEnd && bEnd < today && !bStatus?.isFinal;
    const aFuture = (safeDate(a.startDate) ?? today) > today;
    const bFuture = (safeDate(b.startDate) ?? today) > today;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aFuture && !bFuture) return 1;
    if (!aFuture && bFuture) return -1;
    return (aEnd?.getTime() ?? 0) - (bEnd?.getTime() ?? 0);
  }), [tasks, statuses, today]);

  // ── Swimlanes ─────────────────────────────────────────────────────────────
  const swimlanes = useMemo(() => {
    const map = new Map<string, { assigneeId: string | null; displayName: string; tasks: TaskDTO[] }>();
    for (const task of sortedTasks) {
      const key = task.assigneeId ?? '__unassigned__';
      if (!map.has(key)) {
        map.set(key, {
          assigneeId: task.assigneeId ?? null,
          displayName: task.assignee?.displayName ?? 'Unassigned',
          tasks: [],
        });
      }
      map.get(key)!.tasks.push(task);
    }
    return [...map.values()];
  }, [sortedTasks]);

  // ── Resource overload ─────────────────────────────────────────────────────
  const overloadedAssignees = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const task of tasks) {
      if (!task.assigneeId || !task.startDate || !task.dueDate || (task.estimatedHours ?? 0) <= 0) continue;
      const s = safeDate(task.startDate);
      const e = safeDate(task.dueDate);
      if (!s || !e) continue;
      const days = eachDayOfInterval({ start: s, end: e });
      const hpd = (task.estimatedHours ?? 0) / Math.max(days.length, 1);
      for (const day of days) {
        const k = format(day, 'yyyy-MM-dd');
        const am = map.get(task.assigneeId) ?? new Map<string, number>();
        am.set(k, (am.get(k) ?? 0) + hpd);
        map.set(task.assigneeId, am);
      }
    }
    const overloaded = new Set<string>();
    map.forEach((days, id) => {
      if ([...days.values()].some((h) => h > 8)) overloaded.add(id);
    });
    return overloaded;
  }, [tasks]);

  // ── Dependencies ──────────────────────────────────────────────────────────
  const dependencies = useMemo(() => {
    const deps: Array<{ blockingTaskId: string; blockedTaskId: string }> = [];
    for (const task of sortedTasks) {
      for (const dep of task.blockedBy ?? []) {
        deps.push({ blockingTaskId: dep.blockingTaskId, blockedTaskId: task.id });
      }
    }
    return deps;
  }, [sortedTasks]);

  // ── Bar rects ─────────────────────────────────────────────────────────────
  const barRects = useMemo(() => {
    const map = new Map<string, BarRect>();
    let rowIdx = 0;
    for (const lane of swimlanes) {
      rowIdx++;
      for (const task of lane.tasks) {
        if (!task.startDate && !task.dueDate) { rowIdx++; continue; }
        const ts = safeDate(task.startDate) ?? safeDate(task.dueDate) ?? today;
        const te = safeDate(task.dueDate) ?? ts;
        const so = Math.max(differenceInDays(ts, rangeStart), 0);
        const eo = Math.min(differenceInDays(te, rangeStart), totalDays - 1);
        map.set(task.id, {
          taskId: task.id,
          left: so * pxPerDay,
          top: rowIdx * ROW_H + ROW_H / 2,
          width: Math.max((eo - so + 1) * pxPerDay, 12),
        });
        rowIdx++;
      }
    }
    return map;
  }, [swimlanes, rangeStart, totalDays, pxPerDay, today]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((task: TaskDTO, deltaDays: number) => {
    const os = safeDate(task.startDate);
    const oe = safeDate(task.dueDate);
    onTimelineUpdate(
      task.id,
      os ? format(addDays(os, deltaDays), 'yyyy-MM-dd') : null,
      oe ? format(addDays(oe, deltaDays), 'yyyy-MM-dd') : null,
    );
  }, [onTimelineUpdate]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (tasks.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: 13,
        height: '100%',
      }}>
        No tasks yet. Create tasks in the Kanban or Task List view to see them here.
      </div>
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const totalRows = swimlanes.reduce((acc, lane) => acc + 1 + lane.tasks.length, 0);
  const totalHeight = totalRows * ROW_H;
  const totalCanvasWidth = LABEL_W + gridWidth;

  // Today column index
  const todayColIdx = columns.findIndex((c) => isToday(c));

  return (
    // Outer scroll container
    <div
      ref={scrollRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Canvas — sets scroll width */}
      <div style={{ width: totalCanvasWidth, position: 'relative' }}>

        {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          height: HEADER_H,
          background: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {/* Label header spacer */}
          <div style={{
            width: LABEL_W,
            minWidth: LABEL_W,
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }} />

          {/* Date columns — MUST be flex row, no wrap */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            width: gridWidth,
            minWidth: gridWidth,
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {columns.map((col, i) => {
              const highlight = isToday(col);
              return (
                <div
                  key={i}
                  style={{
                    width: colWidth,
                    minWidth: colWidth,
                    flexShrink: 0,
                    height: HEADER_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: highlight ? 700 : 400,
                    color: highlight ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    background: highlight ? 'var(--color-accent-light)' : 'transparent',
                    borderRight: '1px solid var(--color-border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {colLabel(col, view)}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', height: totalHeight }}>

          {/* Label column */}
          <div style={{
            width: LABEL_W,
            minWidth: LABEL_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {swimlanes.map((lane) => (
              <div key={lane.assigneeId ?? '__unassigned__'}>
                {/* Lane header */}
                <div style={{
                  height: ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px',
                  background: 'var(--color-bg-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                  borderRight: '1px solid var(--color-border)',
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--color-accent-light)',
                    color: 'var(--color-accent-text)',
                    outline: lane.assigneeId && overloadedAssignees.has(lane.assigneeId)
                      ? '2px solid var(--color-danger)' : 'none',
                    outlineOffset: 1,
                  }}
                    title={lane.assigneeId && overloadedAssignees.has(lane.assigneeId)
                      ? `${lane.displayName} has >8h/day assigned` : undefined}
                  >
                    {lane.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {lane.displayName}
                  </span>
                </div>

                {/* Task label rows */}
                {lane.tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      height: ROW_H,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      borderBottom: '1px solid var(--color-border)',
                      borderRight: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      fontSize: 12,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Grid area */}
          <div style={{
            position: 'relative',
            width: gridWidth,
            minWidth: gridWidth,
            flexShrink: 0,
            height: totalHeight,
          }}>
            {/* Background rows */}
            {(() => {
              const rows: React.ReactNode[] = [];
              let ri = 0;
              for (const lane of swimlanes) {
                rows.push(
                  <div key={`lh-${lane.assigneeId}`} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: ri * ROW_H,
                    height: ROW_H,
                    background: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                  }} />,
                );
                ri++;
                for (const task of lane.tasks) {
                  rows.push(
                    <div key={`tr-${task.id}`} style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: ri * ROW_H,
                      height: ROW_H,
                      borderBottom: '1px solid var(--color-border)',
                      background: 'transparent',
                    }} />,
                  );
                  ri++;
                }
              }
              return rows;
            })()}

            {/* Today highlight */}
            {todayColIdx >= 0 && (
              <div style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: todayColIdx * colWidth,
                width: colWidth,
                background: 'var(--color-accent-light)',
                opacity: 0.35,
                pointerEvents: 'none',
                zIndex: 1,
              }} />
            )}

            {/* Vertical column lines */}
            {columns.map((_, i) => (
              <div key={`vl-${i}`} style={{
                position: 'absolute',
                top: 0, bottom: 0,
                left: (i + 1) * colWidth - 1,
                width: 1,
                background: 'var(--color-border)',
                pointerEvents: 'none',
              }} />
            ))}

            {/* Task bars */}
            {(() => {
              const bars: React.ReactNode[] = [];
              let ri = 0;
              for (const lane of swimlanes) {
                ri++;
                for (const task of lane.tasks) {
                  const rowTop = ri * ROW_H;
                  const taskStatus = statuses.find((s) => s.id === task.statusId);
                  const hasDate = !!(task.startDate || task.dueDate);

                  if (!hasDate) {
                    bars.push(
                      <div key={task.id} style={{
                        position: 'absolute',
                        left: 0, width: '100%',
                        top: rowTop, height: ROW_H,
                        zIndex: 2,
                      }}>
                        <div
                          style={{
                            position: 'absolute',
                            top: 10, left: 4, right: 4, height: 22,
                            borderRadius: 4,
                            border: '2px dashed var(--color-border-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s',
                          }}
                          onClick={() => onTaskClick(task)}
                          title="No dates set — click to edit"
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-hover)')}
                        >
                          <span style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {task.title} (unscheduled)
                          </span>
                        </div>
                      </div>,
                    );
                  } else {
                    const ts = safeDate(task.startDate) ?? safeDate(task.dueDate) ?? today;
                    const te = safeDate(task.dueDate) ?? ts;
                    const rawStart = differenceInDays(ts, rangeStart);
                    const rawEnd = differenceInDays(te, rangeStart);

                    if (rawEnd < 0 || rawStart >= totalDays) { ri++; continue; }

                    const so = Math.max(rawStart, 0);
                    const eo = Math.min(rawEnd, totalDays - 1);
                    const leftPct = (so * pxPerDay / gridWidth) * 100;
                    const widthPct = Math.max(((eo - so + 1) * pxPerDay / gridWidth) * 100, 0.5);
                    const isOverdue = !!te && te < today && !taskStatus?.isFinal;

                    bars.push(
                      <div key={task.id} style={{
                        position: 'absolute',
                        left: 0, width: '100%',
                        top: rowTop, height: ROW_H,
                        zIndex: 2,
                      }}>
                        <GanttTaskBar
                          task={task}
                          status={taskStatus}
                          leftPct={leftPct}
                          widthPct={widthPct}
                          gridWidthPx={gridWidth}
                          totalDays={totalDays}
                          isDragEnabled={isDragEnabled}
                          isOverdue={isOverdue}
                          onClick={() => onTaskClick(task)}
                          onDragEnd={handleDragEnd}
                        />
                      </div>,
                    );
                  }
                  ri++;
                }
              }
              return bars;
            })()}

            {/* Dependency arrows */}
            <GanttDependencyLines
              dependencies={dependencies}
              barRects={barRects}
              totalWidth={gridWidth}
              totalHeight={totalHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
