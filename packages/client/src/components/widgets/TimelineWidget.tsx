/**
 * TimelineWidget — Upgraded to use the new elastic GanttTimeline.
 *
 * Changes from original:
 *  • Delegates all rendering to <GanttTimeline> (Framer Motion bars, cascade, focus mode)
 *  • Wraps GanttTimeline.onTaskDateChange with optimistic updates + server mutation
 *  • Task clicks open <LivingTaskModal> instead of the plain TaskDetailModal
 *  • ZenInput (Shift+Space) for quick natural-language task creation
 *  • All existing query keys preserved: ['tasks', projectId], ['statuses', projectId]
 *  • Zero breaking changes to WidgetProps interface
 */

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { tasksApi } from '../../api/tasks.api';
import { GanttTimeline } from './GanttWidget/GanttTimeline';
import type { GanttView } from './GanttWidget/ganttGridHelpers';
import { LivingTaskModal } from '../task/LivingTaskModal';
import { ZenInput, type ZenInputResult } from '../ui/ZenInput';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { TaskDetailModal } from '../task/TaskDetailModal';
import type { WidgetProps } from './widget.types';
import type { TaskDTO } from '@pm/shared';
import { TaskPriority } from '@pm/shared';

export function TimelineWidget({ projectId }: WidgetProps) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);

  // ─── Remote state ──────────────────────────────────────────────────────────

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  // ─── Local state ──────────────────────────────────────────────────────────

  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const [ganttView, setGanttView] = useState<GanttView>('week');
  const [ganttYear, setGanttYear] = useState(() => new Date().getFullYear());
  const [groupBy, setGroupBy] = useState<'assignee' | 'status' | 'priority' | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // ─── Keyboard shortcut: Shift+Space → ZenInput ────────────────────────────

  // We attach a listener within this widget (scoped to its container).
  // AppLayout may also open ZenInput globally; this is widget-local fallback.

  // ─── Mutations ─────────────────────────────────────────────────────────────

  /** Batch-update task dates (fired by Gantt drag + cascade) */
  const dateMutation = useMutation({
    mutationFn: async (updates: Array<{
      taskId: string;
      newStartDate: string | null;
      newEndDate: string | null;
    }>) => {
      // Fire all updates in parallel; each is a simple PATCH
      await Promise.all(
        updates.map(({ taskId, newStartDate, newEndDate }) =>
          tasksApi.update(projectId, taskId, {
            startDate: newStartDate ?? undefined,
            dueDate: newEndDate ?? undefined,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      // Roll back optimistic update by re-fetching
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'error', message: 'Failed to update task dates' });
    },
  });

  // Stable ref so handleTaskDateChange never closes over a stale mutate fn
  const dateMutateRef = useRef(dateMutation.mutate);
  dateMutateRef.current = dateMutation.mutate;

  /** Create task from ZenInput natural-language result */
  const createMutation = useMutation({
    mutationFn: (result: ZenInputResult) => {
      if (!statuses[0]) throw new Error('No statuses available');
      return tasksApi.create(projectId, {
        title: result.title,
        statusId: statuses[0].id,
        dueDate: result.dueDate,
        priority: result.priority ?? TaskPriority.NONE,
        creatorId: currentUser?.id,
      } as Parameters<typeof tasksApi.create>[1]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'success', message: 'Task created' });
    },
    onError: () => {
      addToast({ type: 'error', message: 'Failed to create task' });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTimelineUpdate = useCallback(
    (taskId: string, newStartDate: string | null, newEndDate: string | null) => {
      // Optimistic update
      queryClient.setQueryData<TaskDTO[]>(['tasks', projectId], (old) => {
        if (!old) return old;
        return old.map((t) =>
          t.id === taskId
            ? { ...t, startDate: newStartDate ?? t.startDate, dueDate: newEndDate ?? t.dueDate }
            : t,
        );
      });
      // Persist to server
      dateMutateRef.current([{ taskId, newStartDate, newEndDate }]);
    },
    [projectId, queryClient],
  );

  const handleZenSubmit = useCallback(
    (result: ZenInputResult) => {
      createMutation.mutate(result);
    },
    [createMutation]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'var(--rp-bg-cream, var(--color-bg-secondary))',
      }}
      onKeyDown={(e) => {
        if (e.shiftKey && e.code === 'Space') {
          e.preventDefault();
          setZenOpen(true);
        }
      }}
      tabIndex={-1}
    >
      {/* Quick-create toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '8px 12px 0',
          flexShrink: 0,
        }}
      >
        {/* Zen create button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setZenOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            background: 'var(--rp-accent-lavender-light, #EDE9FE)',
            color: 'var(--rp-accent-lavender, #A78BFA)',
            border: '1.5px solid rgba(167,139,250,0.25)',
            borderRadius: 9999,
            cursor: 'pointer',
            letterSpacing: 0.3,
          }}
          title="Quick create (Shift+Space)"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Zen Create
        </motion.button>

        {/* Standard add task */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 700,
            background: 'var(--rp-accent-blue, var(--color-accent))',
            color: 'white',
            border: 'none',
            borderRadius: 9999,
            cursor: 'pointer',
            letterSpacing: 0.3,
          }}
        >
          + Task
        </motion.button>
      </div>

      {/* Gantt chart */}
      <div style={{ flex: 1, minHeight: 0, paddingTop: 8 }}>
        <GanttTimeline
          tasks={tasks}
          statuses={statuses}
          view={ganttView}
          year={ganttYear}
          isDragEnabled={ganttView === 'day' || ganttView === 'week'}
          groupBy={groupBy}
          focusMode={focusMode}
          autoSchedule={autoSchedule}
          pdfExporting={pdfExporting}
          onFocusModeChange={setFocusMode}
          onGroupByChange={setGroupBy}
          onViewChange={setGanttView}
          onYearChange={setGanttYear}
          onAutoScheduleChange={setAutoSchedule}
          onScrollToToday={() => {}}
          onExportPDF={async () => {
            if (pdfExporting) return;
            setPdfExporting(true);
            try {
              const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
              ]);
              const el = document.querySelector('.gantt-export-target') as HTMLElement;
              if (!el) return;
              const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
              const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
              pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
              pdf.save(`timeline-${projectId}.pdf`);
            } finally {
              setPdfExporting(false);
            }
          }}
          onTaskClick={(task) => setSelectedTask(task)}
          onTimelineUpdate={handleTimelineUpdate}
        />
      </div>

      {/* Living Task Modal (edit) */}
      <LivingTaskModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        projectId={projectId}
        task={selectedTask}
        statuses={statuses}
      />

      {/* Standard create modal (fallback for users who prefer form-based creation) */}
      <TaskDetailModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        projectId={projectId}
        mode="create"
      />

      {/* ZenInput */}
      <ZenInput
        isOpen={zenOpen}
        onClose={() => setZenOpen(false)}
        onSubmit={handleZenSubmit}
      />
    </div>
  );
}
