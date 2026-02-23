/**
 * GanttWidget — Phase 7 Gantt Usability Overhaul
 *
 * Features:
 *  • Optimistic timeline updates with rollback on error
 *  • Cascade feedback toast when auto-schedule reschedules dependents
 *  • LivingTaskModal for full task detail on click
 *  • PDF export with progress flag (pdfExporting)
 *  • FilterBar integration via useTaskFilters
 *  • swimlaneMode, focusMode, autoSchedule toggles
 *  • GanttTimeline ref forwarded for scrollToToday
 *  • Zero regressions: same query keys, same WidgetProps interface
 */

import { useState, useCallback, useRef, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../../api/tasks.api';
import { type GanttView } from './GanttHeader';
import { type GanttGridHandle } from './GanttGrid';
import { useUIStore } from '../../../stores/ui.store';
import type { WidgetProps } from '../widget.types';
import { FilterBar } from '../../filter/FilterBar';
import { useTaskFilters } from '../../../hooks/useTaskFilters';
import type { TaskDTO } from '@pm/shared';
import { LivingTaskModal } from '../../task/LivingTaskModal';
// @ts-ignore — GanttTimeline will be created in the next task
import { GanttTimeline } from './GanttTimeline';

export const GanttWidget: FC<WidgetProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<GanttView>('week');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [swimlaneMode, setSwimlaneMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // ── Task detail modal state ──────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);

  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<GanttGridHandle>(null);

  // ── Remote data ─────────────────────────────────────────────────────────────
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  // ── Filtering ────────────────────────────────────────────────────────────────
  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } =
    useTaskFilters(tasks);

  // ── Timeline mutation with optimistic updates + rollback ─────────────────────
  const mutation = useMutation({
    mutationFn: ({
      taskId,
      startDate,
      endDate,
    }: {
      taskId: string;
      startDate: string | null;
      endDate: string | null;
    }) =>
      tasksApi.updateTimeline(projectId, taskId, {
        startDate,
        endDate,
        autoSchedule,
      }),
    onMutate: async ({ taskId, startDate, endDate }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
      const snapshot = queryClient.getQueryData<TaskDTO[]>(['tasks', projectId]);
      queryClient.setQueryData(['tasks', projectId], (old: TaskDTO[] = []) =>
        old.map((t) =>
          t.id === taskId ? { ...t, startDate, dueDate: endDate } : t,
        ),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(['tasks', projectId], ctx.snapshot);
      }
      addToast({ type: 'error', message: 'Failed to update task timeline' });
    },
    onSuccess: (data, { taskId }) => {
      const cascaded = (data?.updated ?? []).filter((u) => u.taskId !== taskId);
      if (autoSchedule && cascaded.length > 0) {
        addToast({
          type: 'success',
          message: `Rescheduled ${cascaded.length} dependent task${cascaded.length > 1 ? 's' : ''}`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  // ── Task click handler ───────────────────────────────────────────────────────
  const handleTaskClick = useCallback((task: TaskDTO) => {
    setSelectedTask(task);
  }, []);

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!ganttRef.current || pdfExporting) return;
    setPdfExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(ganttRef.current, {
        scale: 1.5,
        useCORS: true,
      });
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        canvas.width,
        canvas.height,
      );
      pdf.save(`gantt-${projectId}.pdf`);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-elevated)] overflow-hidden">
      <FilterBar
        projectId={projectId}
        filters={filters}
        activeCount={activeCount}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      <div ref={ganttRef} className="flex-1 min-h-0 overflow-hidden">
        <GanttTimeline
          ref={ganttGridRef}
          tasks={filteredTasks}
          statuses={statuses ?? []}
          view={view}
          year={year}
          isDragEnabled={view === 'day' || view === 'week'}
          swimlaneMode={swimlaneMode}
          focusMode={focusMode}
          autoSchedule={autoSchedule}
          pdfExporting={pdfExporting}
          onFocusModeChange={setFocusMode}
          onSwimlaneToggle={() => setSwimlaneMode((v) => !v)}
          onViewChange={setView}
          onYearChange={setYear}
          onAutoScheduleChange={setAutoSchedule}
          onScrollToToday={() => ganttGridRef.current?.scrollToToday()}
          onExportPDF={handleExportPDF}
          onTaskClick={handleTaskClick}
          onTimelineUpdate={(taskId: string, start: string | null, end: string | null) =>
            mutation.mutate({ taskId, startDate: start, endDate: end })
          }
        />
      </div>

      {selectedTask && (
        <LivingTaskModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          task={selectedTask}
          statuses={statuses ?? []}
        />
      )}
    </div>
  );
};
