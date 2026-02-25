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

import { useState, useCallback, useRef, useMemo, type FC } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../../api/tasks.api';
import { lanesApi } from '../../../api/lanes.api';
import { permissionsApi } from '../../../api/permissions.api';
import { type GanttView } from './ganttGridHelpers';
import { type GanttTimelineHandle, GanttTimeline } from './GanttTimeline';
import { BulkActionToolbar } from '../../kanban/BulkActionToolbar';
import { useUIStore } from '../../../stores/ui.store';
import type { WidgetProps } from '../widget.types';
import { FilterBar } from '../../filter/FilterBar';
import { useTaskFilters } from '../../../hooks/useTaskFilters';
import type { TaskDTO } from '@pm/shared';
import { LivingTaskModal } from '../../task/LivingTaskModal';

export const GanttWidget: FC<WidgetProps> = ({ projectId }) => {
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<GanttView>('week');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [groupBy, setGroupBy] = useState<'assignee' | 'status' | 'priority' | 'custom' | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // ── Task detail modal state ──────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);

  // ── Bulk selection state ─────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [ganttPageSize, setGanttPageSize] = useState<20 | 50 | 100>(20);
  const [ganttPage, setGanttPage] = useState(1);

  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttGridRef = useRef<GanttTimelineHandle>(null);

  // ── Remote data ─────────────────────────────────────────────────────────────
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => permissionsApi.list(projectId),
    staleTime: 60_000,
  });

  const members = useMemo(
    () => permissions.map((p) => ({ id: p.userId, displayName: p.user?.displayName || p.user?.email || 'Unknown' })),
    [permissions],
  );

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', projectId],
    queryFn: () => tasksApi.getStatuses(projectId),
  });

  const { data: lanes = [] } = useQuery({
    queryKey: ['lanes', projectId],
    queryFn: () => lanesApi.list(projectId),
  });

  const createLaneMutation = useMutation({
    mutationFn: (name: string) => lanesApi.create(projectId, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lanes', projectId] }),
    onError: () => addToast({ type: 'error', message: 'Failed to create lane' }),
  });

  const updateLaneMutation = useMutation({
    mutationFn: ({ laneId, data }: { laneId: string; data: { name?: string; color?: string } }) =>
      lanesApi.update(projectId, laneId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lanes', projectId] }),
    onError: () => addToast({ type: 'error', message: 'Failed to update lane' }),
  });

  const deleteLaneMutation = useMutation({
    mutationFn: (laneId: string) => lanesApi.delete(projectId, laneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lanes', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: () => addToast({ type: 'error', message: 'Failed to delete lane' }),
  });

  // ── Filtering ────────────────────────────────────────────────────────────────
  const { filters, filteredTasks, updateFilter, clearFilters, activeCount } =
    useTaskFilters(tasks);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const ganttTotalPages = Math.max(1, Math.ceil(filteredTasks.length / ganttPageSize));
  const ganttSafePage = Math.min(ganttPage, ganttTotalPages);
  const ganttPagedTasks = filteredTasks.slice((ganttSafePage - 1) * ganttPageSize, ganttSafePage * ganttPageSize);

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

  // ── Bulk operations mutation ─────────────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: (data: {
      taskIds: string[];
      operation: 'move' | 'assign' | 'delete' | 'setPriority';
      statusId?: string;
      assigneeId?: string | null;
      priority?: string;
    }) => tasksApi.bulkOperation(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      setSelectedTaskIds(new Set());
      setSelectionMode(false);
      const labels: Record<string, string> = { move: 'moved', assign: 'assigned', delete: 'deleted', setPriority: 'updated' };
      addToast({ type: 'success', message: `${variables.taskIds.length} task${variables.taskIds.length !== 1 ? 's' : ''} ${labels[variables.operation]}` });
    },
    onError: () => addToast({ type: 'error', message: 'Bulk operation failed' }),
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
        lanes={lanes}
      />

      {/* Bulk action toolbar */}
      {selectionMode && selectedTaskIds.size > 0 && (
        <div style={{ padding: '8px 12px 0' }}>
          <BulkActionToolbar
            selectedCount={selectedTaskIds.size}
            statuses={statuses ?? []}
            members={members}
            onMove={(statusId) => bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'move', statusId })}
            onAssign={(assigneeId) => bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'assign', assigneeId })}
            onSetPriority={(priority) => bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'setPriority', priority })}
            onDelete={() => bulkMutation.mutate({ taskIds: [...selectedTaskIds], operation: 'delete' })}
            onClearSelection={() => { setSelectedTaskIds(new Set()); setSelectionMode(false); }}
          />
        </div>
      )}

      <div ref={ganttRef} className="flex-1 min-h-0 overflow-auto">
        <GanttTimeline
          ref={ganttGridRef}
          tasks={ganttPagedTasks}
          statuses={statuses ?? []}
          view={view}
          year={year}
          isDragEnabled={view === 'day' || view === 'week'}
          groupBy={groupBy}
          focusMode={focusMode}
          autoSchedule={autoSchedule}
          pdfExporting={pdfExporting}
          onFocusModeChange={setFocusMode}
          onGroupByChange={setGroupBy}
          lanes={lanes}
          onCreateLane={(name) => createLaneMutation.mutate(name)}
          onUpdateLane={(laneId, data) => updateLaneMutation.mutate({ laneId, data })}
          onDeleteLane={(laneId) => deleteLaneMutation.mutate(laneId)}
          onViewChange={setView}
          onYearChange={setYear}
          onAutoScheduleChange={setAutoSchedule}
          onScrollToToday={() => ganttGridRef.current?.scrollToToday()}
          onExportPDF={handleExportPDF}
          onTaskClick={handleTaskClick}
          onTimelineUpdate={(taskId: string, start: string | null, end: string | null) =>
            mutation.mutate({ taskId, startDate: start, endDate: end })
          }
          selectionMode={selectionMode}
          selectedTaskIds={selectedTaskIds}
          onTaskSelectionChange={(taskId, checked) => {
            setSelectedTaskIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(taskId); else next.delete(taskId);
              return next;
            });
          }}
          onSelectAll={(checked) => {
            setSelectedTaskIds(
              checked
                ? new Set(ganttPagedTasks.filter((t) => t.startDate || t.dueDate).map((t) => t.id))
                : new Set(),
            );
          }}
          onToggleSelectionMode={() => {
            setSelectionMode((v) => !v);
            setSelectedTaskIds(new Set());
          }}
        />
      </div>

      {/* ── Pagination bar ── */}
      {filteredTasks.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          flexShrink: 0,
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>Show</span>
            {([20, 50, 100] as const).map((n) => (
              <button
                key={n}
                onClick={() => { setGanttPageSize(n); setGanttPage(1); }}
                style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  borderRadius: 6,
                  border: `1px solid ${ganttPageSize === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: ganttPageSize === n ? 'var(--color-accent)' : 'transparent',
                  color: ganttPageSize === n ? 'white' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: ganttPageSize === n ? 600 : 400,
                }}
              >{n}</button>
            ))}
            <span>per page · {filteredTasks.length} total</span>
          </div>

          {/* Page navigation */}
          {ganttTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setGanttPage(1)} disabled={ganttSafePage === 1}
                style={{ padding: '2px 8px', fontSize: '12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: ganttSafePage === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', cursor: ganttSafePage === 1 ? 'default' : 'pointer' }}>«</button>
              <button onClick={() => setGanttPage((p) => Math.max(1, p - 1))} disabled={ganttSafePage === 1}
                style={{ padding: '2px 8px', fontSize: '12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: ganttSafePage === 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', cursor: ganttSafePage === 1 ? 'default' : 'pointer' }}>‹</button>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '0 6px' }}>{ganttSafePage} / {ganttTotalPages}</span>
              <button onClick={() => setGanttPage((p) => Math.min(ganttTotalPages, p + 1))} disabled={ganttSafePage === ganttTotalPages}
                style={{ padding: '2px 8px', fontSize: '12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: ganttSafePage === ganttTotalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', cursor: ganttSafePage === ganttTotalPages ? 'default' : 'pointer' }}>›</button>
              <button onClick={() => setGanttPage(ganttTotalPages)} disabled={ganttSafePage === ganttTotalPages}
                style={{ padding: '2px 8px', fontSize: '12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: ganttSafePage === ganttTotalPages ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', cursor: ganttSafePage === ganttTotalPages ? 'default' : 'pointer' }}>»</button>
            </div>
          )}
        </div>
      )}

      {selectedTask &&
        createPortal(
          <LivingTaskModal
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            projectId={projectId}
            task={selectedTask}
            statuses={statuses ?? []}
          />,
          document.body,
        )}
    </div>
  );
};
