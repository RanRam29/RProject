/**
 * GanttWidget — Phase 6.1 Advanced Gantt Chart
 *
 * Features:
 *  • Day / Week / Month / Quarter / Year views with year selector
 *  • Smart sort: overdue → current → future
 *  • Swimlane grouping by assignee
 *  • Task bars with dynamic progressPercentage fill
 *  • Milestone diamond rendering (isMilestone)
 *  • Auto-schedule toggle: cascades date delta to downstream dependents
 *  • Resource overload indicator (>8h/day → red ring on avatar)
 *  • SVG dependency arrows
 *  • HoverCard tooltip (title, assignee, status, progress, dates, estimatedHours)
 *  • Drag-to-reschedule restricted to Day/Week views only
 *  • Client-side PDF export via html2canvas + jspdf
 *  • Activity logged server-side for every timeline change
 *  • Zero regressions: same query keys, same WidgetProps interface
 */

import { useState, useCallback, useRef, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../../api/tasks.api';
import { GanttHeader, type GanttView } from './GanttHeader';
import { GanttGrid, type GanttGridHandle } from './GanttGrid';
import { useUIStore } from '../../../stores/ui.store';
import type { WidgetProps } from '../widget.types';
import { FilterBar } from '../../filter/FilterBar';
import { useTaskFilters } from '../../../hooks/useTaskFilters';

export const GanttWidget: FC<WidgetProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<GanttView>('week');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<GanttGridHandle>(null);

  // ── Remote data ─────────────────────────────────────────────────────────────
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  // ── Filtering ─────────────────────────────────────────────────────────────
  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } =
    useTaskFilters(tasks);

  // ── Timeline mutation (calls PATCH /tasks/:id/timeline) ─────────────────────
  const timelineMutation = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      addToast({ type: 'error', message: 'Failed to update task timeline' });
    },
  });

  // Stable ref to avoid stale closure in GanttGrid callbacks
  const timelineMutateRef = useRef(timelineMutation.mutate);
  timelineMutateRef.current = timelineMutation.mutate;

  const handleTimelineUpdate = useCallback(
    (taskId: string, newStart: string | null, newEnd: string | null) => {
      timelineMutateRef.current({ taskId, startDate: newStart, endDate: newEnd });
    },
    [],
  );

  // ── Task click → open detail modal (reuse existing pattern) ─────────────────
  const handleTaskClick = useCallback(() => {
    // Intentionally left for the consuming page/widget host to handle via WS invalidation.
    // Phase 6.1.C integration: wire to LivingTaskModal from the project page.
  }, []);

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!ganttRef.current || isExporting) return;
    setIsExporting(true);

    try {
      // Dynamically import to keep these out of the initial bundle
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(ganttRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`gantt-${projectId}-${today}.pdf`);
      addToast({ type: 'success', message: 'Gantt exported to PDF' });
    } catch {
      addToast({ type: 'error', message: 'PDF export failed' });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, projectId, addToast]);

  // ── Scroll to today
  const handleScrollToToday = useCallback(() => {
    ganttGridRef.current?.scrollToToday();
  }, []);

  // ── DnD is only enabled for Day and Week views ────────────────────────────────
  const isDragEnabled = view === 'day' || view === 'week';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-elevated)',
      overflow: 'hidden',
    }}>
      <GanttHeader
        view={view}
        onViewChange={setView}
        year={year}
        onYearChange={setYear}
        autoSchedule={autoSchedule}
        onAutoScheduleToggle={() => setAutoSchedule((v) => !v)}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onScrollToToday={handleScrollToToday}
      />

      <FilterBar
        projectId={projectId}
        filters={filters}
        activeCount={activeCount}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      <div ref={ganttRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <GanttGrid
          ref={ganttGridRef}
          tasks={filteredTasks}
          statuses={statuses}
          view={view}
          year={year}
          isDragEnabled={isDragEnabled}
          onTaskClick={handleTaskClick}
          onTimelineUpdate={handleTimelineUpdate}
        />
      </div>
    </div>
  );
};
