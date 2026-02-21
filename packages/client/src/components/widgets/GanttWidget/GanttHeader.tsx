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
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
    flexShrink: 0,
    flexWrap: 'wrap',
  }}>
    {/* View tabs */}
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-sm)',
      padding: 3,
    }}>
      {VIEWS.map((v) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          style={{
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: v === view ? 600 : 400,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            background: v === view ? 'var(--color-bg-elevated)' : 'transparent',
            color: v === view ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: v === view ? 'var(--shadow-xs)' : 'none',
            textTransform: 'capitalize',
            transition: 'all 0.15s',
          }}
        >
          {v}
        </button>
      ))}
    </div>

    {/* Year select */}
    <select
      value={year}
      onChange={(e) => onYearChange(Number(e.target.value))}
      style={{
        fontSize: 12,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '4px 8px',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
      }}
    >
      {YEAR_RANGE.map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>

    {/* Auto-schedule toggle */}
    <button
      onClick={onAutoScheduleToggle}
      title="When enabled, dragging a task automatically shifts all downstream dependent tasks"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        background: autoSchedule ? 'var(--color-accent-light)' : 'var(--color-bg-elevated)',
        color: autoSchedule ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: autoSchedule ? 'var(--color-accent)' : 'var(--color-border-hover)',
        flexShrink: 0,
        transition: 'background 0.15s',
      }} />
      Auto-Schedule
    </button>

    {/* Export PDF */}
    <button
      onClick={onExportPdf}
      disabled={isExporting}
      style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        padding: '4px 12px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: isExporting ? 'not-allowed' : 'pointer',
        background: 'var(--color-accent)',
        color: '#fff',
        opacity: isExporting ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      ↓ {isExporting ? 'Exporting…' : 'Export PDF'}
    </button>
  </div>
);
