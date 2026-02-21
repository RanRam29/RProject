import type { FC } from 'react';

export type GanttView = 'day' | 'week' | 'month' | 'quarter' | 'year';

const VIEWS: GanttView[] = ['day', 'week', 'month', 'quarter', 'year'];
const YEAR_RANGE = [2024, 2025, 2026, 2027];

interface GanttHeaderProps {
  view: GanttView;
  onViewChange: (v: GanttView) => void;
  year: number;
  onYearChange: (y: number) => void;
  autoSchedule: boolean;
  onAutoScheduleToggle: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
}

export const GanttHeader: FC<GanttHeaderProps> = ({
  view,
  onViewChange,
  year,
  onYearChange,
  autoSchedule,
  onAutoScheduleToggle,
  onExportPdf,
  isExporting,
}) => (
  <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 flex-wrap">

    {/* View tabs */}
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
      {VIEWS.map((v) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={
            v === view
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm rounded px-3 py-1 text-sm font-medium capitalize'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1 text-sm capitalize'
          }
        >
          {v}
        </button>
      ))}
    </div>

    {/* Year select */}
    <select
      value={year}
      onChange={(e) => onYearChange(Number(e.target.value))}
      className="text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
    >
      {YEAR_RANGE.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>

    {/* Auto-schedule toggle */}
    <button
      onClick={onAutoScheduleToggle}
      title="When enabled, dragging a task automatically shifts all downstream dependent tasks"
      className={[
        'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors',
        autoSchedule
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
      ].join(' ')}
    >
      <span className={[
        'w-3 h-3 rounded-full border transition-colors',
        autoSchedule ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-slate-400',
      ].join(' ')} />
      Auto-Schedule
    </button>

    {/* Export PDF */}
    <button
      onClick={onExportPdf}
      disabled={isExporting}
      className="ml-auto flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md transition-colors"
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {isExporting ? 'Exporting…' : 'Export PDF'}
    </button>
  </div>
);
