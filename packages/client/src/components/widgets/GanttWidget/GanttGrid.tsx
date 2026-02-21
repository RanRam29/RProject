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

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 200;
const HEADER_HEIGHT = 40;
const COL_WIDTH: Record<GanttView, number> = {
  day: 80,
  week: 50,
  month: 34,
  quarter: 28,
  year: 22,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? startOfDay(d) : null;
}

function getRangeForView(view: GanttView, year: number): { start: Date; end: Date } {
  const base = new Date(year, 0, 1);
  switch (view) {
    case 'day':
      return {
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
      };
    case 'week':
      return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
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
    let cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      months.push(startOfMonth(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return months;
  }
  if (view === 'quarter') {
    const weeks: Date[] = [];
    let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });
    while (cursor <= rangeEnd) {
      weeks.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }
  return allDays;
}

function getColumnLabel(date: Date, view: GanttView): string {
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
  const gridRef = useRef<HTMLDivElement>(null);
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
  const colWidth = COL_WIDTH[view];
  // Grid width is based on columns × colWidth for the header,
  // but bar positions use totalDays for pixel-accurate placement.
  const gridWidth = Math.max(columns.length * colWidth, 1);

  // ─── Smart sort: overdue → current → future ───────────────────────────────

  const sortedTasks = useMemo(() => {
    const withDates = tasks.filter((t) => t.startDate || t.dueDate);
    return [...withDates].sort((a, b) => {
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
    });
  }, [tasks, statuses, today]);

  // ─── Swimlanes ────────────────────────────────────────────────────────────

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

  // ─── Resource overload ────────────────────────────────────────────────────

  const resourceLoad = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const task of tasks) {
      if (!task.assigneeId || !task.startDate || !task.dueDate || (task.estimatedHours ?? 0) <= 0) continue;
      const start = safeDate(task.startDate);
      const end = safeDate(task.dueDate);
      if (!start || !end) continue;
      const days = eachDayOfInterval({ start, end });
      const hoursPerDay = (task.estimatedHours ?? 0) / Math.max(days.length, 1);
      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        const assigneeMap = map.get(task.assigneeId) ?? new Map<string, number>();
        assigneeMap.set(key, (assigneeMap.get(key) ?? 0) + hoursPerDay);
        map.set(task.assigneeId, assigneeMap);
      }
    }
    return map;
  }, [tasks]);

  const isAssigneeOverloaded = useCallback(
    (assigneeId: string | null) => {
      if (!assigneeId) return false;
      const days = resourceLoad.get(assigneeId);
      if (!days) return false;
      return [...days.values()].some((h) => h > 8);
    },
    [resourceLoad],
  );

  // ─── Dependencies ────────────────────────────────────────────────────────

  const dependencies = useMemo(() => {
    const deps: Array<{ blockingTaskId: string; blockedTaskId: string }> = [];
    for (const task of sortedTasks) {
      for (const dep of task.blockedBy ?? []) {
        deps.push({ blockingTaskId: dep.blockingTaskId, blockedTaskId: task.id });
      }
    }
    return deps;
  }, [sortedTasks]);

  // ─── Bar rects (pixel positions for dependency lines) ────────────────────

  const barRects = useMemo(() => {
    const map = new Map<string, BarRect>();
    let rowIndex = 0;

    for (const lane of swimlanes) {
      rowIndex++; // lane header row
      for (const task of lane.tasks) {
        const taskStart = safeDate(task.startDate) ?? today;
        const taskEnd = safeDate(task.dueDate) ?? taskStart;
        const startOffset = Math.max(differenceInDays(taskStart, rangeStart), 0);
        const endOffset = Math.min(differenceInDays(taskEnd, rangeStart), totalDays - 1);
        const pxPerDay = gridWidth / totalDays;
        const leftPx = startOffset * pxPerDay;
        const widthPx = Math.max((endOffset - startOffset + 1) * pxPerDay, 12);
        const topPx = rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        map.set(task.id, { taskId: task.id, left: leftPx, top: topPx, width: widthPx });
        rowIndex++;
      }
    }
    return map;
  }, [swimlanes, rangeStart, totalDays, gridWidth, today]);

  // ─── Drag handler ─────────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (task: TaskDTO, deltaDays: number) => {
      const oldStart = safeDate(task.startDate);
      const oldEnd = safeDate(task.dueDate);
      const newStart = oldStart ? format(addDays(oldStart, deltaDays), 'yyyy-MM-dd') : null;
      const newEnd = oldEnd ? format(addDays(oldEnd, deltaDays), 'yyyy-MM-dd') : null;
      onTimelineUpdate(task.id, newStart, newEnd);
    },
    [onTimelineUpdate],
  );

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (swimlanes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm h-full">
        No tasks with start or due dates found. Add dates to tasks to see them here.
      </div>
    );
  }

  // ─── Layout dims ─────────────────────────────────────────────────────────

  const totalRows = swimlanes.reduce((acc, lane) => acc + 1 + lane.tasks.length, 0);
  const totalHeight = totalRows * ROW_HEIGHT;
  // px per day used for bar positioning
  const pxPerDay = gridWidth / totalDays;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    // outer: fills available space, scrolls both axes
    <div className="w-full h-full overflow-auto" ref={gridRef}>
      {/*
        Inner container: sets the total canvas width so horizontal scroll works.
        LABEL_WIDTH (fixed) + gridWidth (all columns).
      */}
      <div style={{ minWidth: LABEL_WIDTH + gridWidth, position: 'relative' }}>

        {/* ══ STICKY HEADER ROW ══════════════════════════════════════════════ */}
        <div
          className="flex sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"
          style={{ height: HEADER_HEIGHT }}
        >
          {/* Label column header */}
          <div
            className="flex-shrink-0 border-r border-slate-200 dark:border-slate-700"
            style={{ width: LABEL_WIDTH }}
          />

          {/* Date column headers — must NOT wrap */}
          <div
            className="flex flex-nowrap overflow-hidden"
            style={{ width: gridWidth, minWidth: gridWidth }}
          >
            {columns.map((col, i) => {
              const highlight = isToday(col);
              return (
                <div
                  key={i}
                  className={[
                    'flex-shrink-0 flex items-center justify-center text-xs border-r border-slate-200 dark:border-slate-700 select-none',
                    highlight
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400',
                  ].join(' ')}
                  style={{ width: colWidth, minWidth: colWidth, height: HEADER_HEIGHT }}
                >
                  {getColumnLabel(col, view)}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ BODY (label column + grid area side-by-side) ════════════════════ */}
        <div className="flex" style={{ height: totalHeight }}>

          {/* ── Label column ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex flex-col" style={{ width: LABEL_WIDTH }}>
            {swimlanes.map((lane) => (
              <div key={lane.assigneeId ?? '__unassigned__'}>
                {/* Lane header */}
                <div
                  className="flex items-center gap-2 px-3 bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    className={[
                      'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
                      isAssigneeOverloaded(lane.assigneeId) ? 'ring-2 ring-red-500' : '',
                    ].join(' ')}
                    title={
                      isAssigneeOverloaded(lane.assigneeId)
                        ? `${lane.displayName} has >8h assigned on at least one day`
                        : undefined
                    }
                  >
                    {lane.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {lane.displayName}
                  </span>
                </div>

                {/* Task label rows */}
                {lane.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center px-3 border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onTaskClick(task)}
                  >
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── Grid area ────────────────────────────────────────────────── */}
          <div
            className="relative flex-shrink-0"
            style={{ width: gridWidth, height: totalHeight }}
          >
            {/* ── Background rows ── */}
            {(() => {
              const rows: React.ReactNode[] = [];
              let rowIdx = 0;
              for (const lane of swimlanes) {
                // Lane header bg
                rows.push(
                  <div
                    key={`lane-header-${lane.assigneeId}`}
                    className="absolute left-0 right-0 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700"
                    style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />,
                );
                rowIdx++;
                // Task row bgs
                for (const task of lane.tasks) {
                  rows.push(
                    <div
                      key={`row-${task.id}`}
                      className="absolute left-0 right-0 border-b border-slate-100 dark:border-slate-800/60"
                      style={{ top: rowIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                    />,
                  );
                  rowIdx++;
                }
              }
              return rows;
            })()}

            {/* ── Vertical column dividers ── */}
            {columns.map((col, i) => (
              <div
                key={`vline-${i}`}
                className={[
                  'absolute top-0 bottom-0 border-r',
                  isToday(col)
                    ? 'border-indigo-300 dark:border-indigo-700'
                    : 'border-slate-100 dark:border-slate-800',
                ].join(' ')}
                style={{ left: (i + 1) * colWidth - 1, width: 1 }}
              />
            ))}

            {/* ── Today highlight column ── */}
            {columns.map((col, i) =>
              isToday(col) ? (
                <div
                  key={`today-${i}`}
                  className="absolute top-0 bottom-0 bg-indigo-50/40 dark:bg-indigo-900/10 pointer-events-none"
                  style={{ left: i * colWidth, width: colWidth }}
                />
              ) : null,
            )}

            {/* ── Task bars ── */}
            {(() => {
              const bars: React.ReactNode[] = [];
              let rowIdx = 0;
              for (const lane of swimlanes) {
                rowIdx++; // skip lane header row
                for (const task of lane.tasks) {
                  const rowTop = rowIdx * ROW_HEIGHT;
                  const taskStart = safeDate(task.startDate) ?? today;
                  const taskEnd = safeDate(task.dueDate) ?? taskStart;
                  const taskStatus = statuses.find((s) => s.id === task.statusId);

                  const startOffset = Math.max(differenceInDays(taskStart, rangeStart), 0);
                  const endOffset = Math.min(differenceInDays(taskEnd, rangeStart), totalDays - 1);

                  // Use pixel percentages relative to gridWidth
                  const leftPct = (startOffset * pxPerDay / gridWidth) * 100;
                  const widthPct = Math.max(((endOffset - startOffset + 1) * pxPerDay / gridWidth) * 100, 0.5);

                  const isOverdue = !!taskEnd && taskEnd < today && !taskStatus?.isFinal;

                  bars.push(
                    <div
                      key={task.id}
                      className="absolute left-0"
                      style={{ top: rowTop, height: ROW_HEIGHT, width: '100%' }}
                    >
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
                  rowIdx++;
                }
              }
              return bars;
            })()}

            {/* ── Dependency arrows ── */}
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
