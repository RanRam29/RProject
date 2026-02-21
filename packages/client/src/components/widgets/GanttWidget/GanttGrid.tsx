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
const MIN_COL_WIDTH = { day: 60, week: 40, month: 30, quarter: 24, year: 20 } as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? startOfDay(d) : null;
}

function getRangeForView(view: GanttView, year: number): { start: Date; end: Date } {
  const base = new Date(year, 0, 1);
  switch (view) {
    case 'day':    return { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) };
    case 'week':   return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
    case 'month':  return { start: startOfYear(base), end: endOfYear(base) };
    case 'quarter':return { start: startOfYear(base), end: endOfYear(base) };
    case 'year':   return { start: startOfYear(base), end: endOfYear(base) };
  }
}

function getColumnLabel(date: Date, view: GanttView): string {
  switch (view) {
    case 'day':    return format(date, 'EEE d');
    case 'week':   return format(date, 'EEE d');
    case 'month':  return format(date, 'd');
    case 'quarter':return format(date, 'd MMM');
    case 'year':   return format(date, 'MMM');
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

  // Column days — for year/quarter views we use every 7th day as a column marker
  // but still compute positions on a per-day basis.
  const allDays = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  // For month/quarter/year views, group days into coarser columns to avoid too many cells
  const columns = useMemo(() => {
    if (view === 'year') {
      // One column per month
      const months: Date[] = [];
      let cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        months.push(startOfMonth(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
      return months;
    }
    if (view === 'quarter') {
      // One column per week
      const weeks: Date[] = [];
      let cursor = startOfWeek(rangeStart, { weekStartsOn: 1 });
      while (cursor <= rangeEnd) {
        weeks.push(cursor);
        cursor = addDays(cursor, 7);
      }
      return weeks;
    }
    return allDays;
  }, [view, allDays, rangeStart, rangeEnd]);

  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
  const colWidth = MIN_COL_WIDTH[view];

  // ─── Smart sort: overdue → current → future ────────────────────────────────

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

  // ─── Group by assignee (swimlanes) ────────────────────────────────────────

  const swimlanes = useMemo(() => {
    const map = new Map<string, { assigneeId: string | null; displayName: string; tasks: TaskDTO[] }>();

    for (const task of sortedTasks) {
      const key = task.assigneeId ?? '__unassigned__';
      if (!map.has(key)) {
        map.set(key, {
          assigneeId: task.assigneeId,
          displayName: task.assignee?.displayName ?? 'Unassigned',
          tasks: [],
        });
      }
      map.get(key)!.tasks.push(task);
    }

    return [...map.values()];
  }, [sortedTasks]);

  // ─── Resource overload: estimatedHours per assignee per day ───────────────

  const resourceLoad = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const task of tasks) {
      if (!task.assigneeId || !task.startDate || !task.dueDate || task.estimatedHours <= 0) continue;
      const start = safeDate(task.startDate);
      const end = safeDate(task.dueDate);
      if (!start || !end) continue;
      const days = eachDayOfInterval({ start, end });
      const hoursPerDay = task.estimatedHours / Math.max(days.length, 1);
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

  // ─── Dependency lines data ────────────────────────────────────────────────

  const dependencies = useMemo(() => {
    const deps: Array<{ blockingTaskId: string; blockedTaskId: string }> = [];
    for (const task of sortedTasks) {
      for (const dep of task.blockedBy ?? []) {
        deps.push({ blockingTaskId: dep.blockingTaskId, blockedTaskId: task.id });
      }
    }
    return deps;
  }, [sortedTasks]);

  // ─── Bar rects (for dependency lines) ────────────────────────────────────

  const gridWidth = columns.length * colWidth;

  const barRects = useMemo(() => {
    const map = new Map<string, BarRect>();
    let rowIndex = 0;

    for (const lane of swimlanes) {
      rowIndex++; // header row
      for (const task of lane.tasks) {
        const taskStart = safeDate(task.startDate) ?? today;
        const taskEnd = safeDate(task.dueDate) ?? taskStart;
        const startDayOffset = Math.max(differenceInDays(taskStart, rangeStart), 0);
        const endDayOffset = Math.min(differenceInDays(taskEnd, rangeStart), totalDays - 1);
        const leftPx = (startDayOffset / totalDays) * gridWidth;
        const widthPx = Math.max(((endDayOffset - startDayOffset + 1) / totalDays) * gridWidth, 12);
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

  // ─── Render ───────────────────────────────────────────────────────────────

  const totalRows = swimlanes.reduce((acc, lane) => acc + 1 + lane.tasks.length, 0);
  const totalHeight = totalRows * ROW_HEIGHT;

  return (
    <div className="overflow-auto flex-1" ref={gridRef}>
      <div className="flex" style={{ minWidth: LABEL_WIDTH + gridWidth }}>

        {/* ── Label column ── */}
        <div className="flex-shrink-0" style={{ width: LABEL_WIDTH }}>

          {/* Header spacer */}
          <div
            className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700 h-10"
          />

          {/* Swimlanes */}
          {swimlanes.map((lane) => (
            <div key={lane.assigneeId ?? '__unassigned__'}>
              {/* Assignee row */}
              <div
                className="flex items-center gap-2 px-3 bg-slate-50 dark:bg-slate-800/60 border-b border-r border-slate-200 dark:border-slate-700"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Avatar with overload ring */}
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex-shrink-0',
                  isAssigneeOverloaded(lane.assigneeId) ? 'ring-2 ring-red-500' : '',
                ].join(' ')}
                  title={isAssigneeOverloaded(lane.assigneeId) ? `${lane.displayName} has >8h assigned on at least one day` : undefined}
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
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{task.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Date grid ── */}
        <div className="relative flex-1" style={{ width: gridWidth }}>

          {/* Column headers */}
          <div className="sticky top-0 z-10 flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 h-10">
            {columns.map((col, i) => (
              <div
                key={i}
                className={[
                  'flex-shrink-0 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700',
                  isToday(col) ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold' : '',
                ].join(' ')}
                style={{ width: colWidth, minWidth: colWidth }}
              >
                {getColumnLabel(col, view)}
              </div>
            ))}
          </div>

          {/* Grid rows + bars (relative container for absolute bars) */}
          <div className="relative" style={{ height: totalHeight }}>

            {/* Background cell grid */}
            {swimlanes.map((lane, li) => {
              const laneStart = swimlanes.slice(0, li).reduce((acc, l) => acc + 1 + l.tasks.length, 0);
              return (
                <div key={lane.assigneeId ?? `lane-${li}`}>
                  {/* Assignee header bg */}
                  <div
                    className="absolute left-0 right-0 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700"
                    style={{ top: laneStart * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                  {/* Task row backgrounds + column lines */}
                  {lane.tasks.map((_, ti) => (
                    <div
                      key={ti}
                      className="absolute left-0 right-0 border-b border-slate-200 dark:border-slate-700"
                      style={{ top: (laneStart + 1 + ti) * ROW_HEIGHT, height: ROW_HEIGHT }}
                    >
                      {/* Today column highlight */}
                      {columns.map((col, ci) => (
                        isToday(col) ? (
                          <div
                            key={ci}
                            className="absolute top-0 bottom-0 bg-indigo-50/50 dark:bg-indigo-900/10"
                            style={{ left: ci * colWidth, width: colWidth }}
                          />
                        ) : null
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Vertical column dividers */}
            {columns.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800"
                style={{ left: (i + 1) * colWidth - 1 }}
              />
            ))}

            {/* ── Task bars ── */}
            {swimlanes.map((lane, li) => {
              const laneStart = swimlanes.slice(0, li).reduce((acc, l) => acc + 1 + l.tasks.length, 0);

              return lane.tasks.map((task, ti) => {
                const rowTop = (laneStart + 1 + ti) * ROW_HEIGHT;
                const taskStart = safeDate(task.startDate) ?? today;
                const taskEnd = safeDate(task.dueDate) ?? taskStart;
                const taskStatus = statuses.find((s) => s.id === task.statusId);

                const startOffset = Math.max(differenceInDays(taskStart, rangeStart), 0);
                const endOffset = Math.min(differenceInDays(taskEnd, rangeStart), totalDays - 1);
                const leftPct = (startOffset / totalDays) * 100;
                const widthPct = Math.max(((endOffset - startOffset + 1) / totalDays) * 100, 0.5);

                const isOverdue = !!taskEnd && taskEnd < today && !taskStatus?.isFinal;

                return (
                  <div
                    key={task.id}
                    className="absolute left-0 right-0"
                    style={{ top: rowTop, height: ROW_HEIGHT }}
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
                  </div>
                );
              });
            })}

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
