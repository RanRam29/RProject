/**
 * GanttTimeline — Extended Gantt renderer (Phase 7 Usability Overhaul)
 *
 * Tasks 2-11 implemented in one pass:
 *  • 5-view column system (day / week / month / quarter / year)
 *  • Single rowMap shared by bars AND dependency arrows — eliminates dual-counter bug
 *  • Swimlane grouping by assignee
 *  • Framer Motion drag (day/week only)
 *  • Progress fill overlay + milestone diamond
 *  • GanttTooltip on hover
 *  • Keyboard navigation (↑↓ / Enter / Esc)
 *  • Unscheduled task chip (no dates → small dashed chip)
 *  • forwardRef: scrollToToday()
 *  • Focus Mode: dims unconnected tasks
 *  • Merged toolbar: view tabs, year selector, swimlane, autoSchedule, PDF, today
 */

import {
  forwardRef,
  useRef,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  type FC,
  type KeyboardEvent,
} from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import {
  addDays,
  differenceInDays,
  format,
  isValid,
  startOfDay,
  startOfWeek,
  parseISO,
} from 'date-fns';
import type { TaskDTO, TaskStatusDTO, LaneDTO } from '@pm/shared';
import { GanttTooltip } from './GanttTooltip';
import {
  getRangeForView,
  getColumnsForView,
  colLabelForView,
  isTodayColumn,
  COL_W,
} from './ganttGridHelpers';
import type { GanttView } from './ganttGridHelpers';

// ─── Handle ───────────────────────────────────────────────────────────────────

export interface GanttTimelineHandle {
  scrollToToday: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Swimlane = {
  assigneeId: string | null;
  displayName: string | null;
  laneId?: string | null;
  laneColor?: string;
  tasks: TaskDTO[];
};

export interface GanttTimelineProps {
  tasks: TaskDTO[];
  statuses: TaskStatusDTO[];
  view: GanttView;
  year: number;
  isDragEnabled: boolean;
  groupBy: 'assignee' | 'status' | 'priority' | 'lane' | 'week' | 'custom' | null;
  focusMode: boolean;
  autoSchedule: boolean;
  pdfExporting: boolean;
  onFocusModeChange: (mode: boolean) => void;
  onGroupByChange: (v: 'assignee' | 'status' | 'priority' | 'custom' | null) => void;
  lanes?: LaneDTO[];
  onCreateLane?: (name: string) => void;
  onUpdateLane?: (laneId: string, data: { name?: string; color?: string }) => void;
  onDeleteLane?: (laneId: string) => void;
  onViewChange: (v: GanttView) => void;
  onYearChange: (y: number) => void;
  onAutoScheduleChange: (v: boolean) => void;
  onScrollToToday: () => void;
  onExportPDF: () => void;
  onTaskClick: (task: TaskDTO) => void;
  onTimelineUpdate: (
    taskId: string,
    newStart: string | null,
    newEnd: string | null,
  ) => void;
  // Bulk selection (optional — provided by parent when bulk mode is active)
  selectionMode?: boolean;
  selectedTaskIds?: Set<string>;
  onTaskSelectionChange?: (taskId: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onToggleSelectionMode?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 220;
const MIN_BAR_WIDTH_PX = 12;
const VIEWS: GanttView[] = ['day', 'week', 'month', 'quarter', 'year'];

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function safeParseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? startOfDay(d) : null;
}

function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function buildDependencyGraph(tasks: TaskDTO[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const addEdge = (blockingId: string, blockedId: string) => {
    const existing = map.get(blockingId) ?? [];
    if (!existing.includes(blockedId)) existing.push(blockedId);
    map.set(blockingId, existing);
  };
  tasks.forEach((t) => {
    t.blocking?.forEach((dep) => addEdge(dep.blockingTaskId, dep.blockedTaskId));
    t.blockedBy?.forEach((dep) => addEdge(dep.blockingTaskId, dep.blockedTaskId));
  });
  return map;
}

/** Pure function — exported for unit tests (Task 13) */
export function buildRowMap(
  swimlanes: Array<{ displayName: string | null; tasks: Array<{ id: string }> }>,
): Map<string, number> {
  const map = new Map<string, number>();
  let row = 0;
  for (const lane of swimlanes) {
    if (lane.displayName !== null) row++; // swimlane header occupies a row
    for (const task of lane.tasks) {
      map.set(task.id, row);
      row++;
    }
  }
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      stroke="var(--color-accent)"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.6}
      markerEnd="url(#gantt-arrowhead)"
    />
  );
};

const GanttBar: FC<{
  task: TaskDTO;
  status: TaskStatusDTO | undefined;
  leftPx: number;
  widthPx: number;
  topPx: number;
  isDragEnabled: boolean;
  isFocused: boolean;
  isFocusMode: boolean;
  pxPerDay: number;
  onDragEnd: (taskId: string, deltaDays: number) => void;
  onTaskClick: (task: TaskDTO) => void;
}> = ({
  task,
  status,
  leftPx,
  widthPx,
  topPx,
  isDragEnabled,
  isFocused,
  isFocusMode,
  pxPerDay,
  onDragEnd,
  onTaskClick,
}) => {
    const isDone = status?.isFinal ?? false;
    const isStuck =
      !isDone && task.dueDate != null && new Date(task.dueDate) < new Date();

    const barColor = isDone
      ? 'var(--color-success)'
      : isStuck
        ? 'var(--color-danger)'
        : status?.color ?? 'var(--color-accent)';

    const motionX = useMotionValue(leftPx);

    // Animate to new leftPx on optimistic update or view change
    useEffect(() => {
      animate(motionX, leftPx, { duration: 0.25, ease: [0.4, 0, 0.2, 1] });
    }, [leftPx]); // eslint-disable-line react-hooks/exhaustive-deps

    const lastDragDeltaRef = useRef(0);

    const handleDragEnd = useCallback(
      (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const deltaDays = Math.round(info.offset.x / pxPerDay);
        if (deltaDays !== 0) {
          onDragEnd(task.id, deltaDays);
        } else {
          animate(motionX, leftPx, { duration: 0.2, ease: [0.4, 0, 0.2, 1] });
        }
      },
      [task.id, motionX, leftPx, pxPerDay, onDragEnd],
    );

    const dimStyle: React.CSSProperties =
      isFocusMode && !isFocused
        ? { opacity: 0.25, filter: 'blur(1.5px)', pointerEvents: 'none' }
        : {};

    // ── Milestone diamond ──
    if (task.isMilestone) {
      const size = 16;
      return (
        <GanttTooltip task={task} status={status}>
          <div
            style={{
              position: 'absolute',
              top: topPx + ROW_HEIGHT / 2 - size / 2,
              left: leftPx - size / 2,
              width: size,
              height: size,
              transform: 'rotate(45deg)',
              background: 'var(--color-warning)',
              borderRadius: 2,
              cursor: 'pointer',
              zIndex: 5,
              ...dimStyle,
            }}
            title={task.title}
            onClick={() => onTaskClick(task)}
          />
        </GanttTooltip>
      );
    }

    return (
      <GanttTooltip task={task} status={status}>
        <motion.div
          className="rp-gantt-bar"
          drag={isDragEnabled ? 'x' : false}
          dragMomentum={false}
          dragElastic={0.05}
          style={{
            x: motionX,
            position: 'absolute',
            top: topPx + 8,
            left: 0,
            width: widthPx,
            height: ROW_HEIGHT - 16,
            borderRadius: 8,
            backgroundColor: barColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            paddingRight: 8,
            overflow: 'hidden',
            cursor: isDragEnabled ? 'grab' : 'pointer',
            userSelect: 'none',
            boxShadow: isStuck
              ? '0 0 0 2px rgba(248,113,113,0.45)'
              : '0 2px 8px rgba(0,0,0,0.10)',
            ...dimStyle,
          }}
          whileDrag={{ scale: 1.03, zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.20)' }}
          whileHover={{ scale: 1.01 }}
          onDrag={(_, info) => {
            lastDragDeltaRef.current = info.offset.x;
          }}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            if (Math.abs(lastDragDeltaRef.current) < 6) {
              e.stopPropagation();
              lastDragDeltaRef.current = 0;
              onTaskClick(task);
            }
            lastDragDeltaRef.current = 0;
          }}
          title={`${task.title}\n${task.startDate ?? '?'} → ${task.dueDate ?? '?'}`}
        >
          {/* Progress fill overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${task.progressPercentage ?? 0}%`,
              height: '100%',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 'inherit',
              pointerEvents: 'none',
            }}
          />
          {/* Task title */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
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
      </GanttTooltip>
    );
  };

// ─── Main Component ───────────────────────────────────────────────────────────

export const GanttTimeline = forwardRef<GanttTimelineHandle, GanttTimelineProps>(
  function GanttTimeline(
    {
      tasks,
      statuses,
      view,
      year,
      isDragEnabled,
      groupBy,
      focusMode,
      autoSchedule: _autoSchedule,
      pdfExporting,
      onFocusModeChange,
      onGroupByChange,
      lanes = [],
      onCreateLane,
      onUpdateLane,
      onDeleteLane,
      onViewChange,
      onYearChange,
      onAutoScheduleChange,
      onScrollToToday,
      onExportPDF,
      onTaskClick,
      onTimelineUpdate,
      selectionMode = false,
      selectedTaskIds,
      onTaskSelectionChange,
      onSelectAll,
      onToggleSelectionMode,
    },
    ref,
  ) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
    const [focusedRow, setFocusedRow] = useState(-1);
    const [newLaneName, setNewLaneName] = useState('');
    const [creatingLane, setCreatingLane] = useState(false);
    const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
    const [editingLaneName, setEditingLaneName] = useState('');

    // ── Column system ─────────────────────────────────────────────────────────
    const { start: rangeStart, end: rangeEnd } = useMemo(
      () => getRangeForView(view, year),
      [view, year],
    );

    const columns = useMemo(
      () => getColumnsForView(view, rangeStart, rangeEnd),
      [view, rangeStart, rangeEnd],
    );

    const colW = COL_W[view];
    const totalWidth = columns.length * colW;

    const pxPerDay = useMemo(() => {
      const totalDays = Math.max(differenceInDays(rangeEnd, rangeStart), 1);
      return totalWidth / totalDays;
    }, [rangeStart, rangeEnd, totalWidth]);

    // ── Expose scrollToToday via ref ──────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        scrollToToday: () => {
          const el = scrollContainerRef.current;
          if (!el) return;
          const todayPx =
            differenceInDays(startOfDay(new Date()), rangeStart) * pxPerDay;
          el.scrollTo({
            left: Math.max(0, todayPx - el.clientWidth / 2),
            behavior: 'smooth',
          });
        },
      }),
      [rangeStart, pxPerDay],
    );

    // Auto-scroll to today when view or year changes
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const todayPx =
        differenceInDays(startOfDay(new Date()), rangeStart) * pxPerDay;
      el.scrollTo({
        left: Math.max(0, todayPx - el.clientWidth / 3),
        behavior: 'smooth',
      });
    }, [view, year]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Status map ────────────────────────────────────────────────────────────
    const statusMap = useMemo(() => {
      const m = new Map<string, TaskStatusDTO>();
      statuses.forEach((s) => m.set(s.id, s));
      return m;
    }, [statuses]);

    // ── Sort tasks (overdue first, then by due date, unscheduled last) ────────
    const sortedTasks = useMemo(() => {
      const today = startOfDay(new Date());
      return tasks
        .filter((t) => t.startDate || t.dueDate)
        .sort((a, b) => {
          const aOverdue = a.dueDate && parseISO(a.dueDate) < today;
          const bOverdue = b.dueDate && parseISO(b.dueDate) < today;
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          if (!a.dueDate && b.dueDate) return 1;
          if (a.dueDate && !b.dueDate) return -1;
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          return 0;
        });
    }, [tasks]);

    // ── Swimlanes ─────────────────────────────────────────────────────────────
    const swimlanes = useMemo<Swimlane[]>(() => {
      if (!groupBy) {
        return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
      }

      if (groupBy === 'assignee') {
        const map = new Map<string, Swimlane>();
        for (const task of sortedTasks) {
          const key = task.assigneeId ?? '__unassigned__';
          if (!map.has(key)) {
            map.set(key, {
              assigneeId: task.assigneeId ?? null,
              displayName: (task as any).assignee?.displayName ?? 'Unassigned',
              tasks: [],
            });
          }
          map.get(key)!.tasks.push(task);
        }
        return [...map.values()];
      }

      if (groupBy === 'status') {
        const map = new Map<string, Swimlane>();
        for (const task of sortedTasks) {
          const status = statusMap.get(task.statusId);
          const key = task.statusId;
          if (!map.has(key)) {
            map.set(key, {
              assigneeId: null,
              displayName: status?.name ?? 'Unknown',
              tasks: [],
            });
          }
          map.get(key)!.tasks.push(task);
        }
        return [...map.values()];
      }

      if (groupBy === 'priority') {
        const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
        const map = new Map<string, Swimlane>();
        for (const p of PRIORITY_ORDER) {
          const tasksForPriority = sortedTasks.filter((t) => t.priority === p);
          if (tasksForPriority.length > 0) {
            const label =
              p === 'NONE'
                ? 'No Priority'
                : p.charAt(0) + p.slice(1).toLowerCase();
            map.set(p, { assigneeId: null, displayName: label, tasks: tasksForPriority });
          }
        }
        return [...map.values()];
      }

      // ── LANE MODE ─────────────────────────────────────────────────────────────
      if (groupBy === 'lane') {
        if (!lanes || lanes.length === 0) {
          return [
            {
              assigneeId: null,
              displayName: 'No lanes defined. Use Custom Lanes to create some.',
              tasks: [],
            },
          ];
        }
        const laneMap = new Map<string | null, Swimlane>();
        for (const lane of [...lanes].sort((a, b) => a.sortOrder - b.sortOrder)) {
          laneMap.set(lane.id, {
            assigneeId: null,
            displayName: lane.name,
            laneColor: lane.color,
            laneId: lane.id,
            tasks: [],
          });
        }
        laneMap.set(null, {
          assigneeId: null,
          displayName: 'Unassigned',
          laneColor: '#94a3b8',
          laneId: null,
          tasks: [],
        });
        for (const task of sortedTasks) {
          const key =
            task.laneId != null && laneMap.has(task.laneId) ? task.laneId : null;
          laneMap.get(key)!.tasks.push(task);
        }
        return [...laneMap.values()].filter((l) => l.tasks.length > 0);
      }

      // ── START WEEK MODE ───────────────────────────────────────────────────────
      if (groupBy === 'week') {
        const weekMap = new Map<string, Swimlane>();
        const unscheduled: TaskDTO[] = [];
        for (const task of sortedTasks) {
          if (!task.startDate) {
            unscheduled.push(task);
            continue;
          }
          const monday = startOfWeek(parseISO(task.startDate), { weekStartsOn: 1 });
          const key = format(monday, 'yyyy-MM-dd');
          if (!weekMap.has(key)) {
            weekMap.set(key, {
              assigneeId: null,
              displayName: `Week of ${format(monday, 'MMM d')}`,
              tasks: [],
            });
          }
          weekMap.get(key)!.tasks.push(task);
        }
        const sorted = [...weekMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
        if (unscheduled.length > 0) {
          sorted.push({ assigneeId: null, displayName: 'Unscheduled', tasks: unscheduled });
        }
        return sorted;
      }

      if (groupBy === 'custom') {
        if (!lanes || lanes.length === 0) {
          return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
        }
        const laneMap = new Map<string | null, Swimlane>();
        for (const lane of [...lanes].sort((a, b) => a.sortOrder - b.sortOrder)) {
          laneMap.set(lane.id, {
            assigneeId: null,
            displayName: lane.name,
            laneColor: lane.color,
            laneId: lane.id,
            tasks: [],
          });
        }
        laneMap.set(null, {
          assigneeId: null,
          displayName: 'Unassigned',
          laneColor: '#94a3b8',
          laneId: null,
          tasks: [],
        });
        for (const task of sortedTasks) {
          const key = task.laneId != null && laneMap.has(task.laneId) ? task.laneId : null;
          laneMap.get(key)!.tasks.push(task);
        }
        return [...laneMap.values()].filter(
          (lane) => lane.tasks.length > 0 || lane.laneId !== null,
        );
      }

      return [{ assigneeId: null, displayName: null, tasks: sortedTasks }];
    }, [sortedTasks, groupBy, statusMap, lanes]);

    // ── Single rowMap — THE source of truth for row positions ─────────────────
    const rowMap = useMemo(() => buildRowMap(swimlanes), [swimlanes]);

    const totalRows = useMemo(() => {
      let count = 0;
      for (const lane of swimlanes) {
        if (lane.displayName !== null) count++;
        count += lane.tasks.length;
      }
      return count;
    }, [swimlanes]);

    const totalHeight = totalRows * ROW_HEIGHT;

    // ── Flat ordered task list (for keyboard navigation) ──────────────────────
    const rowTasks = useMemo<TaskDTO[]>(() => {
      const arr: TaskDTO[] = [];
      for (const lane of swimlanes) {
        for (const task of lane.tasks) arr.push(task);
      }
      return arr;
    }, [swimlanes]);

    // ── Dependency graph ──────────────────────────────────────────────────────
    const successorGraph = useMemo(() => buildDependencyGraph(tasks), [tasks]);

    const taskMap = useMemo(() => {
      const m = new Map<string, TaskDTO>();
      tasks.forEach((t) => m.set(t.id, t));
      return m;
    }, [tasks]);

    // ── Focus Mode: set of task IDs connected to focused task ─────────────────
    const connectedTaskIds = useMemo<Set<string>>(() => {
      if (!focusMode || !focusedTaskId) return new Set();
      const connected = new Set<string>([focusedTaskId]);
      function addSuccessors(id: string) {
        (successorGraph.get(id) ?? []).forEach((c) => {
          if (!connected.has(c)) {
            connected.add(c);
            addSuccessors(c);
          }
        });
      }
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

    // ── Dependency arrows — uses rowMap for Y positions (fixes dual-counter bug)
    const dependencyArrows = useMemo(() => {
      const arrows: Array<{
        key: string;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
      }> = [];

      tasks.forEach((task) => {
        const succs = successorGraph.get(task.id) ?? [];
        succs.forEach((succId) => {
          const fromRow = rowMap.get(task.id);
          const toRow = rowMap.get(succId);
          if (fromRow === undefined || toRow === undefined) return;

          const succTask = taskMap.get(succId);
          if (!succTask) return;

          const fromStart = safeParseDate(task.startDate);
          const fromEnd = safeParseDate(task.dueDate ?? task.startDate);
          const toStart = safeParseDate(succTask.startDate ?? succTask.dueDate);
          if (!fromEnd || !toStart) return;

          const fromLeftPx =
            differenceInDays(fromStart ?? fromEnd, rangeStart) * pxPerDay;
          const fromWidthPx = Math.max(
            MIN_BAR_WIDTH_PX,
            differenceInDays(fromEnd, fromStart ?? fromEnd) * pxPerDay,
          );

          arrows.push({
            key: `${task.id}-${succId}`,
            fromX: fromLeftPx + fromWidthPx,
            fromY: fromRow * ROW_HEIGHT + ROW_HEIGHT / 2,
            toX: differenceInDays(toStart, rangeStart) * pxPerDay,
            toY: toRow * ROW_HEIGHT + ROW_HEIGHT / 2,
          });
        });
      });

      return arrows;
    }, [tasks, successorGraph, rowMap, taskMap, rangeStart, pxPerDay]);

    // ── Bar drag handler ──────────────────────────────────────────────────────
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
        onTimelineUpdate(taskId, newStart, newEnd);
      },
      [taskMap, onTimelineUpdate],
    );

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedRow((r) => Math.min(rowTasks.length - 1, r + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedRow((r) => Math.max(0, r - 1));
        } else if (e.key === 'Enter' && focusedRow >= 0) {
          onTaskClick(rowTasks[focusedRow]);
        } else if (e.key === 'Escape') {
          setFocusedRow(-1);
        }
      },
      [focusedRow, rowTasks, onTaskClick],
    );

    // ── Today line ────────────────────────────────────────────────────────────
    const todayOffset = differenceInDays(startOfDay(new Date()), rangeStart);
    const todayLeftPx = todayOffset * pxPerDay;
    const showToday = todayOffset >= 0 && todayLeftPx <= totalWidth;

    // ── Year selector options ─────────────────────────────────────────────────
    const yearOptions = useMemo(() => {
      const cur = new Date().getFullYear();
      return Array.from({ length: 6 }, (_, i) => cur - 2 + i);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ background: 'var(--color-bg-primary)', fontFamily: 'var(--font-sans)' }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Gantt chart"
      >
        {/* ── Toolbar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: '8px 12px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            flexShrink: 0,
          }}
        >
          {/* View tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: view === v ? 600 : 400,
                  borderRadius: 6,
                  border:
                    view === v
                      ? '1.5px solid var(--color-accent)'
                      : '1.5px solid transparent',
                  background:
                    view === v ? 'var(--color-accent-light)' : 'transparent',
                  color:
                    view === v
                      ? 'var(--color-accent-text)'
                      : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 150ms ease',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Year selector — month/quarter/year views only */}
          {(view === 'month' || view === 'quarter' || view === 'year') && (
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* Today button */}
          <button
            onClick={onScrollToToday}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Today
          </button>

          <div style={{ flex: 1 }} />

          {/* Auto-schedule toggle */}
          <button
            onClick={() => onAutoScheduleChange(!_autoSchedule)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: _autoSchedule ? 600 : 400,
              borderRadius: 6,
              border: _autoSchedule
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              background: _autoSchedule ? 'var(--color-accent-light)' : 'transparent',
              color: _autoSchedule
                ? 'var(--color-accent-text)'
                : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            title="Auto-schedule: cascade dependent tasks on drag"
          >
            ⚡ Auto
          </button>

          {/* Group-by selector */}
          <select
            value={groupBy ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onGroupByChange(
                v === '' ? null : (v as 'assignee' | 'status' | 'priority' | 'custom'),
              );
            }}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              borderRadius: 6,
              border: groupBy
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              background: groupBy ? 'var(--color-accent-light)' : 'var(--color-bg-elevated)',
              color: groupBy ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontWeight: groupBy ? 600 : 400,
            }}
            title="Group rows by field"
          >
            <option value="">No grouping</option>
            <option value="assignee">👤 By Assignee</option>
            <option value="status">🔵 By Status</option>
            <option value="priority">⚡ By Priority</option>
            <option value="lane">🗂 By Lane</option>
            <option value="week">📅 By Start Week</option>
            <option value="custom">🏷 Custom Lanes</option>
          </select>

          {/* + Lane button (custom mode only) */}
          {groupBy === 'custom' && !creatingLane && (
            <button
              onClick={() => setCreatingLane(true)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1.5px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              + Lane
            </button>
          )}
          {creatingLane && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newLaneName.trim()) {
                  onCreateLane?.(newLaneName.trim());
                  setNewLaneName('');
                  setCreatingLane(false);
                }
              }}
              style={{ display: 'flex', gap: 4 }}
            >
              <input
                autoFocus
                value={newLaneName}
                onChange={(e) => setNewLaneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCreatingLane(false);
                    setNewLaneName('');
                  }
                }}
                placeholder="Lane name…"
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1.5px solid var(--color-accent)',
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  width: 140,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingLane(false);
                  setNewLaneName('');
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </form>
          )}

          {/* Focus Mode */}
          <button
            onClick={() => {
              onFocusModeChange(!focusMode);
              if (focusMode) setFocusedTaskId(null);
            }}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: focusMode ? 600 : 400,
              borderRadius: 6,
              border: focusMode
                ? '1.5px solid var(--color-accent)'
                : '1.5px solid var(--color-border)',
              background: focusMode ? 'var(--color-accent-light)' : 'transparent',
              color: focusMode
                ? 'var(--color-accent-text)'
                : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            title="Focus Mode: click a task to highlight its dependency chain"
          >
            ◎ Focus
          </button>

          {/* Bulk select toggle */}
          {onToggleSelectionMode && (
            <button
              onClick={onToggleSelectionMode}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: selectionMode ? 600 : 400,
                borderRadius: 6,
                border: selectionMode
                  ? '1.5px solid var(--color-accent)'
                  : '1.5px solid var(--color-border)',
                background: selectionMode ? 'var(--color-accent-light)' : 'transparent',
                color: selectionMode
                  ? 'var(--color-accent-text)'
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              title="Select tasks for bulk actions"
            >
              {selectionMode ? '✓ Selecting' : 'Select'}
            </button>
          )}

          {/* PDF export */}
          <button
            onClick={onExportPDF}
            disabled={pdfExporting}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: pdfExporting
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-secondary)',
              cursor: pdfExporting ? 'wait' : 'pointer',
              opacity: pdfExporting ? 0.7 : 1,
            }}
          >
            {pdfExporting ? '⟳ Exporting…' : '↓ PDF'}
          </button>
        </div>

        {/* ── Empty state ── */}
        {tasks.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
            No tasks found. Create tasks in the project to see them here.
          </div>
        ) : (
          /* ── Scrollable timeline ── */
          <div
            ref={scrollContainerRef}
            style={{ flex: 1, overflow: 'auto', position: 'relative', minHeight: 0 }}
          >
            {/* Full-width inner grid */}
            <div
              style={{
                width: totalWidth + LABEL_WIDTH,
                minHeight: '100%',
                position: 'relative',
              }}
            >
              {/* ── Sticky header row ── */}
              <div
                style={{
                  display: 'flex',
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  background: 'var(--color-bg-elevated)',
                  borderBottom: '1px solid var(--color-border)',
                  height: 36,
                }}
              >
                {/* Label column header — also sticky left */}
                <div
                  style={{
                    width: LABEL_WIDTH,
                    minWidth: LABEL_WIDTH,
                    flexShrink: 0,
                    position: 'sticky',
                    left: 0,
                    zIndex: 21,
                    background: 'var(--color-bg-elevated)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 16,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={
                        (selectedTaskIds?.size ?? 0) > 0 &&
                        selectedTaskIds?.size === swimlanes.flatMap((l) => l.tasks).length
                      }
                      ref={(el) => {
                        if (el) {
                          const total = swimlanes.flatMap((l) => l.tasks).length;
                          el.indeterminate =
                            (selectedTaskIds?.size ?? 0) > 0 &&
                            (selectedTaskIds?.size ?? 0) < total;
                        }
                      }}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 14,
                        height: 14,
                        accentColor: 'var(--color-accent)',
                        cursor: 'pointer',
                        marginRight: 6,
                        flexShrink: 0,
                      }}
                      title="Select all"
                    />
                  )}
                  Task
                </div>

                {/* Date column headers */}
                <div style={{ display: 'flex' }}>
                  {columns.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        width: colW,
                        flexShrink: 0,
                        borderRight: '1px solid var(--color-border)',
                        background: isTodayColumn(col, view)
                          ? 'rgba(91,141,239,0.08)'
                          : undefined,
                        fontSize: 11,
                        fontWeight: isTodayColumn(col, view) ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isTodayColumn(col, view)
                          ? 'var(--color-accent)'
                          : 'var(--color-text-tertiary)',
                        letterSpacing: 0.3,
                      }}
                    >
                      {colLabelForView(col, view)}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Body ── */}
              <div style={{ display: 'flex', position: 'relative', minHeight: totalHeight }}>
                {/* ── Sticky label column ── */}
                <div
                  style={{
                    width: LABEL_WIDTH,
                    minWidth: LABEL_WIDTH,
                    flexShrink: 0,
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    background: 'var(--color-bg-elevated)',
                    borderRight: '1px solid var(--color-border)',
                  }}
                >
                  {swimlanes.map((lane) => (
                    <div key={lane.assigneeId ?? '__unassigned__'}>
                      {/* Swimlane header row */}
                      {lane.displayName !== null && (
                        <div
                          style={{
                            height: ROW_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 12,
                            paddingRight: 8,
                            gap: 8,
                            background: 'var(--color-bg-secondary)',
                            borderBottom: '1px solid var(--color-border)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--color-text-secondary)',
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                          }}
                        >
                          {/* Lane color dot (custom mode only) */}
                          {lane.laneColor && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: lane.laneColor,
                                flexShrink: 0,
                              }}
                            />
                          )}

                          {/* Editable name (custom mode) vs static name */}
                          {groupBy === 'custom' && lane.laneId && editingLaneId === lane.laneId ? (
                            <input
                              autoFocus
                              value={editingLaneName}
                              onChange={(e) => setEditingLaneName(e.target.value)}
                              onBlur={() => {
                                if (
                                  editingLaneName.trim() &&
                                  editingLaneName !== lane.displayName
                                ) {
                                  onUpdateLane?.(lane.laneId!, {
                                    name: editingLaneName.trim(),
                                  });
                                }
                                setEditingLaneId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') setEditingLaneId(null);
                              }}
                              style={{
                                flex: 1,
                                fontSize: 11,
                                fontWeight: 700,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--color-accent)',
                                color: 'var(--color-text-secondary)',
                                outline: 'none',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {lane.displayName} ({lane.tasks.length})
                            </span>
                          )}

                          {/* Edit + delete icons (custom mode, non-null laneId) */}
                          {groupBy === 'custom' &&
                            lane.laneId &&
                            editingLaneId !== lane.laneId && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingLaneId(lane.laneId!);
                                    setEditingLaneName(lane.displayName ?? '');
                                  }}
                                  title="Rename lane"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 2,
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: 12,
                                    lineHeight: 1,
                                  }}
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Delete lane "${lane.displayName}"? Tasks will be unassigned.`,
                                      )
                                    ) {
                                      onDeleteLane?.(lane.laneId!);
                                    }
                                  }}
                                  title="Delete lane"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 2,
                                    color: 'var(--color-danger)',
                                    fontSize: 12,
                                    lineHeight: 1,
                                  }}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                        </div>
                      )}

                      {/* Task label rows */}
                      {lane.tasks.map((task) => {
                        const isFocused =
                          !focusMode || connectedTaskIds.has(task.id);
                        const status = statusMap.get(task.statusId);
                        const isDone = status?.isFinal ?? false;
                        const isKeyboardFocused =
                          rowTasks[focusedRow]?.id === task.id;

                        const isSelected = selectedTaskIds?.has(task.id) ?? false;
                        return (
                          <div
                            key={task.id}
                            style={{
                              height: ROW_HEIGHT,
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: 12,
                              paddingRight: 8,
                              borderBottom: '1px solid var(--color-border)',
                              cursor: 'pointer',
                              opacity: focusMode && !isFocused ? 0.28 : 1,
                              filter:
                                focusMode && !isFocused ? 'blur(1px)' : 'none',
                              transition: 'opacity 300ms ease, filter 300ms ease',
                              background: isSelected
                                ? 'var(--color-accent-light, rgba(59,130,246,0.08))'
                                : isKeyboardFocused
                                  ? 'var(--color-bg-secondary)'
                                  : undefined,
                            }}
                            onClick={() => {
                              if (selectionMode) {
                                onTaskSelectionChange?.(task.id, !isSelected);
                              } else if (focusMode) {
                                setFocusedTaskId((prev) =>
                                  prev === task.id ? null : task.id,
                                );
                              } else {
                                onTaskClick(task);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                (e.currentTarget as HTMLDivElement).style.background =
                                  'var(--color-bg-secondary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.background =
                                isSelected
                                  ? 'var(--color-accent-light, rgba(59,130,246,0.08))'
                                  : isKeyboardFocused
                                    ? 'var(--color-bg-secondary)'
                                    : 'transparent';
                            }}
                          >
                            {/* Selection checkbox (selection mode) or status dot */}
                            {selectionMode ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onTaskSelectionChange?.(task.id, e.target.checked);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: 14,
                                  height: 14,
                                  accentColor: 'var(--color-accent)',
                                  cursor: 'pointer',
                                  marginRight: 8,
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor:
                                  status?.color ?? 'var(--color-text-tertiary)',
                                flexShrink: 0,
                                marginRight: 8,
                              }}
                            />
                            )}
                            {/* Task title — always primary text color */}
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textDecoration: isDone ? 'line-through' : 'none',
                                opacity: isDone ? 0.55 : 1,
                              }}
                            >
                              {task.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* ── Bar area ── */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    minHeight: totalHeight,
                    width: totalWidth,
                  }}
                >
                  {/* Column grid backgrounds */}
                  {columns.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: i * colW,
                        top: 0,
                        bottom: 0,
                        width: colW,
                        borderRight: '1px solid var(--color-border)',
                        background: isTodayColumn(col, view)
                          ? 'rgba(91,141,239,0.04)'
                          : i % 2 === 0
                            ? 'transparent'
                            : 'rgba(0,0,0,0.012)',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Today vertical line */}
                  {showToday && (
                    <div
                      style={{
                        position: 'absolute',
                        left: todayLeftPx,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        backgroundColor: 'var(--color-danger)',
                        opacity: 0.6,
                        zIndex: 4,
                        pointerEvents: 'none',
                        borderRadius: 1,
                      }}
                    />
                  )}

                  {/* Swimlane header stripes in bar area */}
                  {groupBy &&
                    swimlanes.map((lane) => {
                      if (lane.displayName === null || lane.tasks.length === 0)
                        return null;
                      const firstTask = lane.tasks[0];
                      const headerRow = (rowMap.get(firstTask.id) ?? 1) - 1;
                      return (
                        <div
                          key={lane.assigneeId ?? '__unassigned__'}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: headerRow * ROW_HEIGHT,
                            height: ROW_HEIGHT,
                            background: 'var(--color-bg-secondary)',
                            borderBottom: '1px solid var(--color-border)',
                            pointerEvents: 'none',
                          }}
                        />
                      );
                    })}

                  {/* Row separators */}
                  {Array.from({ length: totalRows }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: i * ROW_HEIGHT,
                        height: ROW_HEIGHT,
                        borderBottom: '1px solid var(--color-border)',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* SVG dependency arrows */}
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: totalWidth,
                      height: totalHeight,
                      pointerEvents: 'none',
                      zIndex: 3,
                      overflow: 'visible',
                    }}
                  >
                    <defs>
                      <marker
                        id="gantt-arrowhead"
                        markerWidth={8}
                        markerHeight={6}
                        refX={6}
                        refY={3}
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 8 3, 0 6"
                          fill="var(--color-accent)"
                          opacity={0.8}
                        />
                      </marker>
                    </defs>
                    {dependencyArrows.map(({ key: arrowKey, ...arrowProps }) => (
                      <DependencyArrow key={arrowKey} {...arrowProps} />
                    ))}
                  </svg>

                  {/* Task bars + unscheduled chips */}
                  {tasks.map((task) => {
                    const rowIndex = rowMap.get(task.id);
                    if (rowIndex === undefined) return null;

                    const topPx = rowIndex * ROW_HEIGHT;
                    const status = statusMap.get(task.statusId);
                    const isFocused = !focusMode || connectedTaskIds.has(task.id);

                    // Scheduled bar
                    const startDate = safeParseDate(task.startDate);
                    const endDate = safeParseDate(task.dueDate ?? task.startDate);

                    // Skip tasks with no dates — hidden from Gantt entirely
                    if (!endDate) return null;

                    const effectiveStart = startDate ?? endDate;
                    const leftPx =
                      differenceInDays(effectiveStart, rangeStart) * pxPerDay;
                    const widthPx = Math.max(
                      MIN_BAR_WIDTH_PX,
                      differenceInDays(endDate, effectiveStart) * pxPerDay,
                    );

                    return (
                      <GanttBar
                        key={task.id}
                        task={task}
                        status={status}
                        leftPx={leftPx}
                        widthPx={widthPx}
                        topPx={topPx}
                        isDragEnabled={isDragEnabled}
                        isFocused={isFocused}
                        isFocusMode={focusMode}
                        pxPerDay={pxPerDay}
                        onDragEnd={handleBarDragEnd}
                        onTaskClick={onTaskClick}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

GanttTimeline.displayName = 'GanttTimeline';
